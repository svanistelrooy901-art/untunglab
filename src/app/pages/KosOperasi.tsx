import { useState } from 'react';
import { energyKwh, formatPct, formatRM, type OperatingCategory } from '../../domain';
import {
  currentTariff,
  ensureBusiness,
  getBusiness,
  listEquipment,
  getCostProfile,
  listOperatingCosts,
  resetOperatingDetail,
  saveCostProfile,
  saveOperatingCost,
  setTariff,
  updateBusinessProfile,
  type OperatingCostRow,
} from '../../db';
import { t } from '../../i18n/ms';
import { Badge, Field, Loading, PageHeader, Sheet, btnPrimary, btnQuiet, btnSecondary } from '../components/ui';
import { useData, useLive } from '../data';
import { buildOverview, type OverviewLine } from '../operatingView';
import { validateElectricity, validateProfile, validateSimple, validateTariff, validateWater, validateWorkspace } from '../operatingForms';

const ADVANCED: readonly OperatingCategory[] = ['ruang_kerja', 'elektrik', 'air'];

export function KosOperasiPage() {
  const profile = useLive((c) => getCostProfile(c));
  const rows = useLive((c) => listOperatingCosts(c));
  const [editing, setEditing] = useState<OperatingCategory | null>(null);

  if (!profile || !rows) return <Loading />;
  const overview = buildOverview(rows, profile.expectedMonthlySales);
  const rowOf = (c: OperatingCategory) => rows.find((r) => r.category === c) ?? null;

  return (
    <section>
      <PageHeader title={t('ops.title')} />
      <p className="mt-1 text-sm text-muted">{t('ops.intro')}</p>
      {(() => {
        const done = overview.lines.filter((l) => l.entered).length;
        const all = done === overview.lines.length;
        return (
          <p role="status" className={`mt-2 text-sm font-semibold ${all ? 'text-healthy' : 'text-watch'}`} data-testid="ops-kemajuan">
            {all ? `✓ ${t('ops.semuaDiisi')}` : t('ops.kemajuan').replace('{n}', String(done)).replace('{total}', String(overview.lines.length))}
          </p>
        );
      })()}

      <SettingsCard />

      <div className="mt-4 rounded-2xl border border-border bg-surface p-4">
        <h2 className="text-sm font-bold">{t('ops.ringkasanTajuk')}</h2>
        <div className="mt-2 flex items-baseline justify-between gap-3">
          <span className="text-sm text-muted">{t('ops.jumlahBersama')}</span>
          <span className="text-lg font-bold">{formatRM(overview.sharedTotal)}</span>
        </div>
        {overview.allocation.ok ? (
          <div className="mt-1">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm text-muted">{t('ops.kadar')}</span>
              <span className="text-lg font-bold text-primary">{formatPct(overview.allocation.ratePct)}</span>
            </div>
            <p className="mt-1 text-xs text-muted">{t('ops.kadarNota')}</p>
          </div>
        ) : (
          <p role="status" className="mt-2 rounded-xl border border-watch-line bg-watch-soft p-3 text-sm text-watch">
            {overview.allocation.reason === 'expected_sales_missing' ? t('ops.perluJualan') : t('ops.perluBetulkan')}
          </p>
        )}
      </div>

      <ul className="mt-4 overflow-hidden rounded-2xl border border-border bg-surface">
        {overview.lines.map((line, n) => (
          <li key={line.category} className={n > 0 ? 'border-t border-border' : ''}>
            <CategoryRow line={line} row={rowOf(line.category)} onOpen={() => setEditing(line.category)} />
          </li>
        ))}
      </ul>

      <Sheet open={editing !== null} title={editing ? t(`ops.cat.${editing}`) : ''} onClose={() => setEditing(null)}>
        {editing && <CategoryForm key={editing} category={editing} row={rowOf(editing)} onDone={() => setEditing(null)} />}
      </Sheet>
    </section>
  );
}

function summaryOf(row: OperatingCostRow | null): string | null {
  if (!row || row.mode !== 'detailed' || !row.detail) return null;
  const d = row.detail;
  if (d.kind === 'workspace') {
    const useArea = d.method === 'area' || (d.method === undefined && d.homeArea !== undefined && d.businessArea !== undefined);
    return useArea && d.homeArea && d.businessArea !== undefined
      ? `${formatRM(d.monthlyHomeCost)} × (${d.businessArea} ÷ ${d.homeArea})`
      : `${formatRM(d.monthlyHomeCost)} × ${d.businessUsePct ?? 0}%`;
  }
  if (d.kind === 'water') return `${formatRM(d.averageMonthlyBill)} × ${d.businessUsePct}%`;
  return t('ops.rumus.elektrik');
}

function CategoryRow({ line, row, onOpen }: { line: OverviewLine; row: OperatingCostRow | null; onOpen: () => void }) {
  const summary = summaryOf(row);
  return (
    <button type="button" onClick={onOpen} className="flex min-h-16 w-full items-center justify-between gap-3 px-4 py-2 text-left">
      <span className="min-w-0">
        <span className="flex items-center gap-2 text-[15px] font-medium">
          {t(`ops.cat.${line.category}`)}
          {line.entered && <Badge>{line.mode === 'detailed' ? t('ops.modTepat') : t('ops.modMudah')}</Badge>}
        </span>
        {line.error ? (
          <span className="block text-xs font-medium text-loss">⚠ {t(`ops.err.${line.error}`)}</span>
        ) : summary ? (
          <span className="block truncate text-xs text-muted">{summary}</span>
        ) : !line.entered ? (
          <span className="block text-xs text-muted">{t('ops.belumIsi')}</span>
        ) : null}
      </span>
      <span className="flex shrink-0 items-center gap-2 text-right">
        {line.entered ? (
          <span>
            <span className="block text-sm font-semibold">{line.error ? '—' : formatRM(line.amount)}</span>
            <span className="block text-xs text-muted">{t('ops.rmSebulan')}</span>
          </span>
        ) : null}
        <span className={`inline-flex min-h-9 items-center rounded-full px-3 text-sm font-semibold ${line.entered ? 'text-primary' : 'bg-primary text-white'}`}>
          {line.entered ? t('ops.sunting') : `+ ${t('ops.isi')}`}
        </span>
        <span aria-hidden="true" className="text-lg text-muted">›</span>
      </span>
    </button>
  );
}

function SettingsCard() {
  const ctx = useData();
  const profile = useLive((c) => getCostProfile(c));
  const business = useLive((c) => getBusiness(c));
  if (!profile || !business) return null;
  return <SettingsForm ctx={ctx} initial={{ time: profile.valueOfTimePerHour, sales: profile.expectedMonthlySales, name: business.name, type: business.businessType }} />;
}

function SettingsForm({ ctx, initial }: { ctx: ReturnType<typeof useData>; initial: { time: number | null; sales: number | null; name: string | null; type: string | null } }) {
  const [name, setName] = useState(initial.name ?? '');
  const [type, setType] = useState(initial.type ?? '');
  const [time, setTime] = useState(initial.time === null ? '' : String(initial.time));
  const [sales, setSales] = useState(initial.sales === null ? '' : String(initial.sales));
  const [submitted, setSubmitted] = useState(false);
  const [saved, setSaved] = useState(false);
  const [failed, setFailed] = useState(false);

  const check = validateProfile({ time, sales });
  const errors = submitted && !check.ok ? check.errors : {};

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (!check.ok) return;
    try {
      await updateBusinessProfile(ctx, { name, businessType: type });
      await saveCostProfile(ctx, check.value);
      setFailed(false);
      setSaved(true);
    } catch {
      setFailed(true);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="mt-4 rounded-2xl border border-border bg-surface p-4">
      <h2 className="text-sm font-bold">{t('ops.tetapanTajuk')}</h2>
      <div className="grid gap-x-3 sm:grid-cols-2">
        <Field label={t('ops.namaBisnes')} value={name} onChange={(e) => (setSaved(false), setName(e.target.value))} autoComplete="off" />
        <Field label={t('ops.jenisBisnes')} value={type} onChange={(e) => (setSaved(false), setType(e.target.value))} autoComplete="off" />
        <Field label={t('ops.nilaiMasa')} inputMode="decimal" value={time} onChange={(e) => (setSaved(false), setTime(e.target.value))} error={errors.time} tip={t('tip2.nilaiMasa')} />
        <Field label={t('ops.jualanBulanan')} inputMode="decimal" value={sales} onChange={(e) => (setSaved(false), setSales(e.target.value))} error={errors.sales} tip={t('tip2.jualan')} />
      </div>
      {failed && <p role="alert" className="mt-2 text-sm font-medium text-loss">{t('common.gagalSimpan')}</p>}
      <div className="mt-3 flex items-center gap-3">
        <button type="submit" className={btnPrimary}>{t('common.simpan')}</button>
        {saved && <span role="status" className="text-sm font-medium text-healthy">✓ {t('ops.disimpan')}</span>}
      </div>
    </form>
  );
}

// ---------- per-category editor ----------

function CategoryForm({ category, row, onDone }: { category: OperatingCategory; row: OperatingCostRow | null; onDone: () => void }) {
  const ctx = useData();
  const canAdvance = ADVANCED.includes(category);
  const [tab, setTab] = useState<'simple' | 'detailed'>(row?.mode === 'detailed' && canAdvance ? 'detailed' : 'simple');
  const [simple, setSimple] = useState(row ? String(row.simpleAmount) : '');
  const [submitted, setSubmitted] = useState(false);
  const [failed, setFailed] = useState(false);

  const d = row?.detail;
  // Workspace state
  const ws = d?.kind === 'workspace' ? d : null;
  const [home, setHome] = useState(ws ? String(ws.monthlyHomeCost) : '');
  const [wsMethod, setWsMethod] = useState<'pct' | 'area'>(ws?.method === 'area' || (ws && ws.method === undefined && ws.homeArea !== undefined && ws.businessArea !== undefined) ? 'area' : 'pct');
  const [wsPct, setWsPct] = useState(ws?.businessUsePct !== undefined ? String(ws.businessUsePct) : '');
  const [homeArea, setHomeArea] = useState(ws?.homeArea !== undefined ? String(ws.homeArea) : '');
  const [bizArea, setBizArea] = useState(ws?.businessArea !== undefined ? String(ws.businessArea) : '');
  // Water state
  const wt = d?.kind === 'water' ? d : null;
  const [bill, setBill] = useState(wt ? String(wt.averageMonthlyBill) : '');
  const [waterPct, setWaterPct] = useState(wt ? String(wt.businessUsePct) : '');
  // Electricity state
  const el = d?.kind === 'electricity' ? d : null;
  const [shared, setShared] = useState(el ? String(el.sharedMonthlyAmount) : '');

  const simpleCheck = validateSimple(simple);
  const wsCheck = validateWorkspace({ home, method: wsMethod, pct: wsPct, homeArea, businessArea: bizArea });
  const waterCheck = validateWater({ bill, pct: waterPct });
  const elCheck = validateElectricity({ shared });

  const detailedCheck = category === 'ruang_kerja' ? wsCheck : category === 'air' ? waterCheck : category === 'elektrik' ? elCheck : null;

  /** "Tiada kos ini": an explicit RM0, so a category is never left blank by accident (D-70). */
  async function saveSimple(amount: number) {
    setFailed(false);
    try {
      const business = await ensureBusiness(ctx);
      await saveOperatingCost(ctx, { businessId: business.id, category, active: true, classification: 'shared', mode: 'simple', simpleAmount: amount });
      onDone();
    } catch {
      setFailed(true);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    setFailed(false);
    const business = await ensureBusiness(ctx);
    const common = { businessId: business.id, category, active: true, classification: 'shared' as const };
    try {
      if (tab === 'simple') {
        if (!simpleCheck.ok) return;
        // Only the Mudah amount and mode change; stored Lebih Tepat details are kept (Doc 04 §4).
        await saveOperatingCost(ctx, { ...common, mode: 'simple', simpleAmount: simpleCheck.value });
      } else {
        if (!detailedCheck || !detailedCheck.ok) return;
        await saveOperatingCost(ctx, {
          ...common,
          mode: 'detailed',
          simpleAmount: simpleCheck.ok ? simpleCheck.value : (row?.simpleAmount ?? 0),
          detail: detailedCheck.value.detail,
        });
      }
      onDone();
    } catch {
      setFailed(true);
    }
  }

  return (
    <form onSubmit={save} noValidate>
      {canAdvance && (
        <div role="tablist" className="mt-3 grid grid-cols-2 gap-1 rounded-xl bg-canvas p-1">
          {(['simple', 'detailed'] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={tab === m}
              onClick={() => setTab(m)}
              className={`min-h-11 rounded-lg text-sm font-semibold ${tab === m ? 'bg-surface text-primary shadow-sm' : 'text-muted'}`}
            >
              {m === 'simple' ? t('ops.modMudah') : t('ops.kiraTepat')}
            </button>
          ))}
        </div>
      )}

      {tab === 'simple' && (
        <Field
          label={t('ops.jumlahSebulan')}
          inputMode="decimal"
          value={simple}
          onChange={(e) => setSimple(e.target.value)}
          error={submitted && !simpleCheck.ok ? simpleCheck.error : undefined}
          hint={canAdvance && row?.detail ? t('ops.kekalNota') : undefined}
        />
      )}
      {tab === 'simple' && (
        <div className="mt-2">
          <button type="button" className={btnQuiet} onClick={() => void saveSimple(0)}>
            {t('ops.tiadaKos')}
          </button>
          <p className="text-xs text-muted">{t('ops.tiadaKosNota')}</p>
        </div>
      )}

      <fieldset data-testid="medan-tepat">
      {tab === 'detailed' && category === 'ruang_kerja' && (
        <WorkspaceFields
          {...{ home, setHome, wsMethod, setWsMethod, wsPct, setWsPct, homeArea, setHomeArea, bizArea, setBizArea }}
          errors={submitted && !wsCheck.ok ? wsCheck.errors : {}}
          result={wsCheck.ok ? wsCheck.value : null}
        />
      )}
      {tab === 'detailed' && category === 'air' && (
        <div>
          <Field label={t('ops.billAir')} inputMode="decimal" value={bill} onChange={(e) => setBill(e.target.value)} error={submitted && !waterCheck.ok ? waterCheck.errors.bill : undefined} />
          <PercentField label={t('ops.peratusAir')} tip={t('tip2.peratusAir')} value={waterPct} setValue={setWaterPct} error={submitted && !waterCheck.ok ? waterCheck.errors.pct : undefined} />
          <Result monthly={waterCheck.ok ? waterCheck.value.monthly : null} formula={t('ops.rumus.air')} />
        </div>
      )}
      {tab === 'detailed' && category === 'elektrik' && <ElectricityFields shared={shared} setShared={setShared} error={submitted && !elCheck.ok ? elCheck.errors.shared : undefined} monthly={elCheck.ok ? elCheck.value.monthly : null} />}
      </fieldset>

      {(category === 'ruang_kerja' || tab === 'detailed') && <p className="mt-3 text-xs text-muted">{category === 'ruang_kerja' ? t('ops.anggaranNota') : ''}</p>}
      {failed && <p role="alert" className="mt-3 text-sm font-medium text-loss">{t('common.gagalSimpan')}</p>}
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="submit" className={btnPrimary}>{t('common.simpan')}</button>
        <button type="button" className={btnSecondary} onClick={onDone}>{t('common.batal')}</button>
        {row?.detail && (
          <button
            type="button"
            className={btnQuiet}
            onClick={async () => {
              await resetOperatingDetail(ctx, row.businessId, category);
              onDone();
            }}
          >
            {t('ops.resetTepat')}
          </button>
        )}
      </div>
    </form>
  );
}

function Result({ monthly, formula }: { monthly: number | null; formula: string }) {
  return (
    <div className="mt-3 rounded-xl bg-primary-soft p-3" aria-live="polite">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="text-muted">{t('ops.hasilKira')}</span>
        <span className="text-base font-bold text-primary">{monthly === null ? '—' : `${formatRM(monthly)} ${t('ops.rmSebulan')}`}</span>
      </div>
      <p className="mt-1 text-xs text-muted">{formula}</p>
    </div>
  );
}

/** Quick chips plus a custom input (Doc 02 §7, §8). */
function PercentField({ label, tip, value, setValue, error }: { label: string; tip: string; value: string; setValue: (v: string) => void; error?: string | undefined }) {
  const chips = [10, 15, 20, 25];
  const custom = value.trim() !== '' && !chips.includes(Number(value));
  return (
    <div>
      <Field label={label} inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} error={error} tip={tip} />
      <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label={label}>
        {chips.map((c) => (
          <button key={c} type="button" aria-pressed={Number(value) === c && value.trim() !== ''} onClick={() => setValue(String(c))} className={chipClass(Number(value) === c && value.trim() !== '')}>
            {c}%
          </button>
        ))}
        <button type="button" aria-pressed={custom} onClick={() => setValue('')} className={chipClass(custom)}>
          {t('ops.lainLain')}
        </button>
      </div>
    </div>
  );
}

const chipClass = (on: boolean) => `min-h-11 min-w-14 rounded-full border px-4 text-sm font-semibold ${on ? 'border-primary bg-primary-soft text-primary' : 'border-border-strong bg-surface text-ink'}`;

function WorkspaceFields(p: {
  home: string; setHome: (v: string) => void;
  wsMethod: 'pct' | 'area'; setWsMethod: (m: 'pct' | 'area') => void;
  wsPct: string; setWsPct: (v: string) => void;
  homeArea: string; setHomeArea: (v: string) => void;
  bizArea: string; setBizArea: (v: string) => void;
  errors: Partial<Record<'home' | 'pct' | 'area', string>>;
  result: { monthly: number; derivedPct: number } | null;
}) {
  return (
    <div>
      <Field label={t('ops.kosRumah')} inputMode="decimal" value={p.home} onChange={(e) => p.setHome(e.target.value)} error={p.errors.home} />
      <div role="radiogroup" aria-label={t('ops.peratusRuang')} className="mt-3 flex gap-2">
        {(['pct', 'area'] as const).map((m) => (
          <button key={m} type="button" role="radio" aria-checked={p.wsMethod === m} onClick={() => p.setWsMethod(m)} className={chipClass(p.wsMethod === m)}>
            {m === 'pct' ? t('ops.ikutPeratus') : t('ops.ikutKeluasan')}
          </button>
        ))}
      </div>
      {p.wsMethod === 'pct' ? (
        <PercentField label={t('ops.peratusRuang')} tip={t('tip2.peratusRuang')} value={p.wsPct} setValue={p.setWsPct} error={p.errors.pct} />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('ops.keluasanRumah')} inputMode="decimal" value={p.homeArea} onChange={(e) => p.setHomeArea(e.target.value)} error={p.errors.area} />
          <Field label={t('ops.keluasanBisnes')} inputMode="decimal" value={p.bizArea} onChange={(e) => p.setBizArea(e.target.value)} />
        </div>
      )}
      <Result
        monthly={p.result?.monthly ?? null}
        formula={`${p.wsMethod === 'pct' ? t('ops.rumus.ruangPeratus') : t('ops.rumus.ruangKeluasan')}${p.result ? ` · ${formatPct(p.result.derivedPct)}` : ''}`}
      />
    </div>
  );
}

function ElectricityFields({ shared, setShared, error, monthly }: { shared: string; setShared: (v: string) => void; error?: string | undefined; monthly: number | null }) {
  const ctx = useData();
  const tariff = useLive((c) => currentTariff(c));
  const equipment = useLive((c) => listEquipment(c));
  const [rate, setRate] = useState('');
  const [rateError, setRateError] = useState<string>();
  const [rateSaved, setRateSaved] = useState(false);
  return (
    <div>
      <p role="note" className="mt-3 rounded-xl border border-watch-line bg-watch-soft p-3 text-sm text-watch">⚠ {t('ops.elektrikAmaran')}</p>
      <Field label={t('ops.elektrikAm')} inputMode="decimal" value={shared} onChange={(e) => setShared(e.target.value)} error={error} hint={t('ops.elektrikAmNota')} />
      <Result monthly={monthly} formula={t('ops.rumus.elektrik')} />

      <div className="mt-4 rounded-xl border border-border p-3">
        <h3 className="text-sm font-bold">{t('ops.alatSenaraiTajuk')}</h3>
        <p className="text-xs text-muted">{t('ops.alatSenaraiNota')}</p>
        {equipment && equipment.length === 0 && <p className="mt-2 text-sm text-muted">{t('ops.alatTiada')}</p>}
        <ul className="mt-2 divide-y divide-border">
          {(equipment ?? []).map((e) => (
            <li key={e.id} className="flex items-baseline justify-between gap-3 py-2 text-sm">
              <span>{e.name} · {e.powerWatts.toLocaleString('en-US')} W</span>
              <span className="font-semibold">{tariff ? `${formatRM(energyKwh(e.powerWatts, 60) * tariff.ratePerKwh)} / ${t('ops.alatKosJam')}` : '—'}</span>
            </li>
          ))}
        </ul>
        {!tariff && equipment && equipment.length > 0 && <p className="mt-1 text-xs text-muted">{t('ops.alatPerluKadar')}</p>}
      </div>

      <div className="mt-4 rounded-xl border border-border p-3">
        <Field
          label={t('ops.tarifLabel')}
          inputMode="decimal"
          value={rate}
          onChange={(e) => (setRateSaved(false), setRate(e.target.value))}
          error={rateError}
          tip={t('tip2.tarif')}
          hint={t('ops.tarifCadangan')}
        />
        <p className="mt-1 text-xs text-muted">
          {tariff ? `${t('ops.tarifSemasa')}: RM${tariff.ratePerKwh} / kWh` : t('ops.tarifBelum')}
        </p>
        <div className="mt-2 flex items-center gap-3">
          <button
            type="button"
            className={btnSecondary}
            onClick={async () => {
              const v = validateTariff(rate);
              if (!v.ok) return setRateError(v.error);
              setRateError(undefined);
              await setTariff(ctx, v.value);
              setRate('');
              setRateSaved(true);
            }}
          >
            {t('ops.simpanTarif')}
          </button>
          {rateSaved && <span role="status" className="text-sm font-medium text-healthy">✓ {t('ops.disimpan')}</span>}
        </div>
      </div>
    </div>
  );
}
