import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { QUICK_SCENARIO_PCTS, formatPct, formatRM } from '../../domain';
import { listAllHistory, loadCostingData, updateIngredient } from '../../db';
import { t } from '../../i18n/ms';
import { StatusBadge, issueText } from '../components/MenuResultView';
import { EmptyState, Field, Loading, PageHeader, Sheet, btnPrimary, btnQuiet, btnSecondary } from '../components/ui';
import { useData, useLive } from '../data';
import { historyReview, parseScenarioInput, whatIf, type MenuImpact, type ScenarioChange, type ScenarioView } from '../scenarioView';
import { signedPct, signedRM, unitRM } from '../signed';

type Source = { kind: 'none' } | { kind: 'chip'; pct: number } | { kind: 'pct'; text: string } | { kind: 'price'; text: string };

function changeOf(src: Source): { change: ScenarioChange | null; invalid: boolean } {
  if (src.kind === 'none') return { change: null, invalid: false };
  if (src.kind === 'chip') return { change: { kind: 'pct', pct: src.pct }, invalid: false };
  if (src.text.trim() === '') return { change: null, invalid: false };
  const parsed = parseScenarioInput(src.text, src.kind);
  return parsed.ok ? { change: parsed.change, invalid: false } : { change: null, invalid: true };
}

const arrow = (a: string, b: string) => `${a} → ${b}`;

function ImpactCard({ m, nameOf }: { m: MenuImpact; nameOf: (ref: string | undefined) => string }) {
  const { before: b, after: a } = m;
  const first = !a.complete ? a.issues[0] : !b.complete ? b.issues[0] : undefined;
  return (
    <li className="rounded-2xl border border-border bg-surface px-4 py-3">
      <Link to={`/menu/${m.menuId}`} className="text-[15px] font-semibold">
        {m.name}
      </Link>
      {b.complete && a.complete ? (
        <>
          <dl className="mt-2 space-y-1 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted">{t('terms.kosSebenar')}</dt>
              <dd className="font-medium">{arrow(formatRM(b.fullCost), formatRM(a.fullCost))}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">{t('kesan.untung')}</dt>
              <dd className={`font-medium ${a.profit < 0 ? 'text-loss' : ''}`}>
                {arrow(formatRM(b.profit), formatRM(a.profit))} ({signedRM(a.profit - b.profit)})
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">{t('terms.margin')}</dt>
              <dd className="font-medium">{arrow(formatPct(b.marginPct), formatPct(a.marginPct))}</dd>
            </div>
          </dl>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={b.status} />
            <span aria-hidden="true">→</span>
            <StatusBadge status={a.status} />
          </div>
        </>
      ) : (
        <p className="mt-1 text-xs font-medium text-watch">
          {t('kesan.belumLengkap')}
          {first && `: ${issueText(first, nameOf)}`}
        </p>
      )}
    </li>
  );
}

function Results({ view, nameOf }: { view: ScenarioView; nameOf: (ref: string | undefined) => string }) {
  return (
    <div className="mt-5" data-testid="hasil">
      <h2 className="text-sm font-bold">{t('kesan.ringkasTajuk')}</h2>
      <p className="mt-1 text-sm">
        {view.ingredient.name}: <span className="font-semibold">{arrow(unitRM(view.beforeUnit.amount), unitRM(view.afterUnit.amount))}</span> {t('kesan.setiap')} {view.afterUnit.unit}
        {view.unitPct !== null ? ` (${signedPct(view.unitPct)})` : ` · ${t('kesan.unitBerbeza')}`}
      </p>
      <p className="mt-1 text-sm text-muted">
        {t('kesan.menuTerjejas').replace('{n}', String(view.menus.length))}
        {view.statusChangeCount > 0 && ` · ${t('kesan.statusBerubah').replace('{n}', String(view.statusChangeCount))}`}
      </p>
      {view.menus.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-muted">{t('kesan.tiadaMenu')}</p>
      ) : (
        <>
          <p className="mt-3 text-xs text-muted">
            {t('kesan.sebelum')} → {t('kesan.selepas')}
          </p>
          <ul className="mt-1 space-y-3">
            {view.menus.map((m) => (
              <ImpactCard key={m.menuId} m={m} nameOf={nameOf} />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export function KesanHargaPage() {
  const ctx = useData();
  const [params, setParams] = useSearchParams();
  const [src, setSrc] = useState<Source>({ kind: 'none' });
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const data = useLive(async (c) => ({ costing: await loadCostingData(c), history: await listAllHistory(c) }));
  if (!data) return <Loading />;

  const { costing, history } = data;
  const ingredients = costing.ingredients.filter((i) => i.active);
  const ingredientId = params.get('bahan') ?? '';
  const recordId = params.get('rekod');
  const selected = costing.ingredients.find((i) => i.id === ingredientId) ?? null;
  const nameOf = (ref: string | undefined) => costing.ingredients.find((i) => i.id === ref)?.name ?? costing.packaging.find((p) => p.id === ref)?.name ?? costing.equipment.find((e) => e.id === ref)?.name ?? t('menu.hilang');

  const pick = (id: string) => {
    setSrc({ kind: 'none' });
    setDone(null);
    setFailed(false);
    setParams(id ? { bahan: id } : {});
  };

  if (ingredients.length === 0 && !selected) {
    return (
      <section>
        <PageHeader title={t('kesan.title')} />
        <EmptyState
          title={t('kesan.tiadaBahanTajuk')}
          body={t('kesan.tiadaBahanIsi')}
          action={
            <Link to="/bahan" className={btnPrimary}>
              {t('bahan.tambah')}
            </Link>
          }
        />
      </section>
    );
  }

  const picker = (
    <div className="mt-4">
      <label htmlFor="kesan-bahan" className="text-sm font-medium">
        {t('kesan.bahan')}
      </label>
      <select
        id="kesan-bahan"
        value={selected?.id ?? ''}
        onChange={(e) => pick(e.target.value)}
        className="mt-1 min-h-11 w-full rounded-xl border border-border-strong bg-surface px-3 text-base"
      >
        <option value="">{t('kesan.pilih')}</option>
        {[...ingredients, ...(selected && !selected.active ? [selected] : [])].map((i) => (
          <option key={i.id} value={i.id}>
            {i.name}
          </option>
        ))}
      </select>
    </div>
  );

  // ---- History Review: read-only, exact previous/current transition ----
  if (selected && recordId) {
    const view = historyReview(costing, history, selected.id, recordId);
    const record = history.find((r) => r.id === recordId);
    return (
      <section>
        <PageHeader title={t('kesan.title')} />
        {picker}
        <div className="mt-4 rounded-2xl border border-border bg-surface px-4 py-3">
          <p className="text-sm font-bold">{t('kesan.semakan')}</p>
          {view && record ? (
            <p className="mt-1 text-sm text-muted">
              {t('kesan.semakanIsi').replace('{date}', record.purchaseDate).replace('{from}', unitRM(view.beforePrice)).replace('{to}', unitRM(view.afterPrice))}
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted">{t('kesan.semakanTiada')}</p>
          )}
          <button type="button" className={`${btnSecondary} mt-3`} onClick={() => setParams({ bahan: selected.id })}>
            {t('kesan.simulasiBaharu')}
          </button>
        </div>
        {view && <Results view={view} nameOf={nameOf} />}
      </section>
    );
  }

  // ---- Normal What-If ----
  const { change, invalid } = changeOf(src);
  const view = selected && change ? whatIf(costing, selected.id, change) : null;
  const pctText = src.kind === 'pct' ? src.text : src.kind === 'chip' ? String(src.pct) : view && selected && selected.purchasePrice > 0 ? String(Math.round(((view.afterPrice / selected.purchasePrice - 1) * 100) * 10) / 10) : '';
  const priceText = src.kind === 'price' ? src.text : view ? view.afterPrice.toFixed(2) : '';

  const apply = async () => {
    if (!selected || !view || !view.changed) return;
    try {
      await updateIngredient(ctx, selected.id, { purchasePrice: view.afterPrice }, { sourceType: 'scenario_apply' });
      setDone(t('kesan.berjaya').replace('{name}', selected.name).replace('{to}', formatRM(view.afterPrice)));
      setFailed(false);
      setSrc({ kind: 'none' });
    } catch {
      setFailed(true);
    }
    setConfirming(false);
  };

  return (
    <section>
      <PageHeader title={t('kesan.title')} />
      <p className="mt-1 text-sm text-muted">{t('kesan.intro')}</p>
      {picker}

      {done && (
        <p role="status" className="mt-4 rounded-2xl border border-healthy-line bg-healthy-soft px-4 py-3 text-sm font-medium text-healthy">
          <span aria-hidden="true">✓ </span>
          {done}{' '}
          <Link to="/jejak-harga" className="font-semibold underline">
            {t('kesan.lihatJejak')}
          </Link>
        </p>
      )}
      {failed && (
        <p role="alert" className="mt-4 text-sm font-medium text-loss">
          {t('kesan.gagal')}
        </p>
      )}

      {selected && (
        <>
          <p className="mt-4 text-sm">
            <span className="text-muted">{t('kesan.hargaSekarang')}: </span>
            <span className="font-semibold">
              {unitRM(selected.purchasePrice)} / {selected.packageQuantity} {selected.packageUnit}
            </span>
          </p>

          <p className="mt-4 text-sm font-medium" id="chip-label">
            {t('kesan.chipTajuk')}
          </p>
          <div role="group" aria-labelledby="chip-label" className="mt-1 flex flex-wrap gap-2">
            {QUICK_SCENARIO_PCTS.map((p) => (
              <button
                key={p}
                type="button"
                aria-pressed={src.kind === 'chip' && src.pct === p}
                onClick={() => setSrc({ kind: 'chip', pct: p })}
                className={`inline-flex min-h-11 min-w-16 items-center justify-center rounded-xl border px-4 text-sm font-semibold ${
                  src.kind === 'chip' && src.pct === p ? 'border-primary bg-primary text-white' : 'border-border-strong bg-surface'
                }`}
              >
                +{p}%
              </button>
            ))}
            <button
              type="button"
              aria-pressed={src.kind === 'pct' || src.kind === 'price'}
              onClick={() => setSrc({ kind: 'pct', text: '' })}
              className={`inline-flex min-h-11 items-center justify-center rounded-xl border px-4 text-sm font-semibold ${
                src.kind === 'pct' || src.kind === 'price' ? 'border-primary bg-primary text-white' : 'border-border-strong bg-surface'
              }`}
            >
              {t('kesan.lain')}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field
              label={t('kesan.peratus')}
              hint={t('kesan.peratusHint')}
              inputMode="decimal"
              value={pctText}
              onChange={(e) => setSrc({ kind: 'pct', text: e.target.value })}
              error={invalid && src.kind === 'pct' ? t('kesan.salah') : undefined}
            />
            <Field
              label={t('kesan.hargaBaharu')}
              inputMode="decimal"
              value={priceText}
              onChange={(e) => setSrc({ kind: 'price', text: e.target.value })}
              error={invalid && src.kind === 'price' ? t('kesan.salah') : undefined}
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button type="button" className={btnSecondary} onClick={() => setSrc({ kind: 'none' })} disabled={src.kind === 'none'}>
              {t('kesan.reset')}
            </button>
            <button type="button" className={btnPrimary} disabled={!view?.changed} onClick={() => setConfirming(true)}>
              {t('kesan.guna')}
            </button>
          </div>
          <p className="mt-2 text-xs text-muted">{t('kesan.simulasi')}</p>

          {!view && !invalid && <p className="mt-4 text-sm text-muted">{t('kesan.belumUbah')}</p>}
          {view && !view.changed && <p className="mt-4 text-sm text-muted">{t('kesan.tiadaPerubahan')}</p>}
          {view && view.changed && <Results view={view} nameOf={nameOf} />}

          <Sheet open={confirming} title={t('kesan.sahTajuk')} onClose={() => setConfirming(false)}>
            {view && (
              <>
                <p className="mt-3 text-sm">
                  {t('kesan.sahIsi').replace('{name}', selected.name).replace('{from}', formatRM(view.beforePrice)).replace('{to}', formatRM(view.afterPrice))}
                </p>
                <div className="mt-5 flex gap-2">
                  <button type="button" className={btnQuiet} onClick={() => setConfirming(false)}>
                    {t('common.batal')}
                  </button>
                  <button type="button" className={btnPrimary} onClick={() => void apply()}>
                    {t('kesan.sahYa')}
                  </button>
                </div>
              </>
            )}
          </Sheet>
        </>
      )}
    </section>
  );
}
