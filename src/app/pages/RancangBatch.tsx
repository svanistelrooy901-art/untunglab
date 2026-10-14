import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { formatRM } from '../../domain';
import { loadCostingData, type CostingData } from '../../db';
import { t } from '../../i18n/ms';
import { readBatchListLink, type BatchList, type DecodeResult } from '../../link';
import { batchLine, batchPlanText, issueText, linkErrorText, packSize, parsePieces, planFor, prefillFromBatchList, shownQuantity } from '../batchPlanView';
import { EmptyState, Field, Loading, PageHeader, btnPrimary, btnSecondary } from '../components/ui';
import { useLive } from '../data';
import { computeAllMenus } from '../menuAssembly';
import { malaysiaDate } from '../priceListBuild';

/**
 * Plan a Batch (D-97). Opened by hand, or from JualanLab with `#/rancang-batch?d=<payload>`, which fills the quantities.
 * Read only: nothing is stored, no cost or menu changes, and free-plan limits do not apply.
 */
export function RancangBatchPage() {
  const data = useLive((c) => loadCostingData(c));
  const { search } = useLocation();
  // The payload is in the fragment; readBatchListLink finds it in the full address.
  const link = useMemo(() => (new URLSearchParams(search).has('d') ? readBatchListLink(window.location.href) : null), [search]);
  if (!data) return <Loading />;
  return <Planner key={search} data={data} link={link} />;
}

const inputClass = 'min-h-11 w-24 rounded-xl border bg-surface px-3 text-right text-base';

function Planner({ data, link }: { data: CostingData; link: DecodeResult<BatchList> | null }) {
  const active = useMemo(
    () => [...computeAllMenus(data).values()].filter((c) => c.menu.active).sort((a, b) => a.menu.name.localeCompare(b.menu.name, 'ms', { sensitivity: 'base' })),
    [data],
  );
  const prefill = useMemo(() => (link?.ok ? prefillFromBatchList(link.value, new Set(active.map((c) => c.menu.id))) : null), [link, active]);
  const [date, setDate] = useState(() => (link?.ok ? link.value.batchDate : malaysiaDate(new Date())));
  const [qty, setQty] = useState<Record<string, string>>(() => Object.fromEntries([...(prefill?.quantities ?? [])].map(([id, n]) => [id, String(n)])));
  const [copy, setCopy] = useState<'idle' | 'ok' | 'fail'>('idle');

  const rows = active.map((c) => ({ c, text: qty[c.menu.id] ?? '', pieces: parsePieces(qty[c.menu.id] ?? '') }));
  const pieces = new Map(rows.filter((r) => r.pieces !== null && r.pieces > 0).map((r) => [r.c.menu.id, r.pieces!]));
  const plan = planFor(active, data, pieces);
  const notCalculated = prefill?.notCalculated ?? [];
  const unitOf = (id: string) => data.packaging.find((p) => p.id === id)?.purchaseUnit ?? '';
  const text = batchPlanText({ date, plan, packagingUnit: unitOf, notCalculated });
  const hasSomething = plan.menus.length > 0 || notCalculated.length > 0;

  async function copyText() {
    setCopy('idle');
    try {
      await navigator.clipboard.writeText(text);
      setCopy('ok');
    } catch {
      setCopy('fail');
    }
  }

  return (
    <section>
      <PageHeader title={t('batch.title')} />
      <p className="mt-1 text-sm text-muted">{t('batch.intro')}</p>

      {link && !link.ok && (
        <div role="alert" className="mt-3 rounded-xl border border-loss-line bg-loss-soft p-3 text-sm text-loss" data-testid="batch-ralat-pautan">
          <p className="font-semibold">{linkErrorText(link.error)}</p>
          <p className="mt-1">{t('batch.ralatNota')}</p>
        </div>
      )}
      {link?.ok && (
        <p className="mt-3 rounded-xl bg-primary-soft p-3 text-sm" data-testid="batch-dari-jualanlab">
          {prefill && prefill.quantities.size === 0 && link.value.items.length > 0 ? t('batch.tiadaPadanan') : t('batch.dariJualanLab')}
        </p>
      )}

      <Field label={t('batch.tarikh')} type="date" value={date} onChange={(e) => setDate(e.target.value)} />

      {active.length === 0 ? (
        <EmptyState title={t('batch.kosongTajuk')} body={t('batch.kosongIsi')} action={<Link to="/menu/baru" className={btnPrimary}>{t('menu.tambah')}</Link>} />
      ) : (
        <>
          <h2 className="mt-6 text-base font-bold">{t('batch.menuTajuk')}</h2>
          <p className="text-xs text-muted">{t('batch.menuNota')}</p>
          <ul className="mt-2 overflow-hidden rounded-2xl border border-border bg-surface" data-testid="batch-menu">
            {rows.map(({ c, text: value, pieces: n }, i) => {
              const id = `pcs-${c.menu.id}`;
              const bad = n === null;
              return (
                <li key={c.menu.id} className={`px-4 py-2 ${i > 0 ? 'border-t border-border' : ''}`}>
                  <div className="flex items-center justify-between gap-3">
                    <label htmlFor={id} className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold">{c.menu.baseMenuId ? '↳ ' : ''}{c.menu.name}</span>
                      {c.menu.category && <span className="block truncate text-xs text-muted">{c.menu.category}</span>}
                    </label>
                    <input
                      id={id}
                      inputMode="numeric"
                      autoComplete="off"
                      aria-label={t('batch.unitLabel').replace('{name}', c.menu.name)}
                      aria-invalid={bad || undefined}
                      aria-describedby={bad ? `${id}-e` : undefined}
                      placeholder="0"
                      value={value}
                      onChange={(e) => setQty((q) => ({ ...q, [c.menu.id]: e.target.value }))}
                      className={`${inputClass} ${bad ? 'border-loss' : 'border-border-strong'}`}
                    />
                  </div>
                  {bad && <p id={`${id}-e`} className="mt-1 text-sm font-medium text-loss">{t('batch.errUnit')}</p>}
                </li>
              );
            })}
          </ul>
        </>
      )}

      {active.length > 0 && plan.menus.length === 0 && <p className="mt-4 text-sm text-muted">{t('batch.pilihDulu')}</p>}

      {plan.menus.length > 0 && (
        <>
          <h2 className="mt-6 text-base font-bold">{t('batch.batchTajuk')}</h2>
          <ul className="mt-2 overflow-hidden rounded-2xl border border-border bg-surface" data-testid="batch-bilangan">
            {plan.menus.map((m, i) => (
              <li key={m.menuId} className={`px-4 py-2.5 ${i > 0 ? 'border-t border-border' : ''}`}>
                <p className="text-[15px] font-semibold">{m.name}</p>
                <p className={`text-sm ${m.batches === null ? 'font-medium text-loss' : 'text-muted'}`}>{batchLine(m)}</p>
              </li>
            ))}
          </ul>

          {plan.shopping.length > 0 && (
            <>
              <h2 className="mt-6 text-base font-bold">{t('batch.beliTajuk')}</h2>
              <ul className="mt-2 overflow-hidden rounded-2xl border border-border bg-surface" data-testid="batch-beli">
                {plan.shopping.map((s, i) => (
                  <li key={s.ingredientId} className={`px-4 py-2.5 ${i > 0 ? 'border-t border-border' : ''}`}>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="truncate text-[15px] font-semibold">{s.name}</span>
                      {s.estimatedCost !== null && <span className="shrink-0 text-sm text-muted">{formatRM(s.estimatedCost)}</span>}
                    </div>
                    {s.needed === null || s.packsToBuy === null ? (
                      <p className="text-sm font-medium text-loss">{t('batch.belumDikira')}</p>
                    ) : (
                      <p className="text-sm text-muted">
                        {t('batch.perlu').replace('{amount}', `${shownQuantity(s.needed)} ${s.unit}`)} ·{' '}
                        <span className="font-semibold text-ink">{t('batch.beli').replace('{packs}', String(s.packsToBuy)).replace('{size}', packSize(s.packQuantity, s.packUnit))}</span>
                      </p>
                    )}
                  </li>
                ))}
              </ul>
              <Total label={t('batch.jumlahBahan')} value={plan.ingredientCost} />
              <p className="mt-1 text-xs text-muted">{t('batch.kosNota')}</p>
            </>
          )}

          {plan.packaging.length > 0 && (
            <>
              <h2 className="mt-6 text-base font-bold">{t('batch.packTajuk')}</h2>
              <ul className="mt-2 overflow-hidden rounded-2xl border border-border bg-surface" data-testid="batch-pack">
                {plan.packaging.map((p, i) => (
                  <li key={p.packagingId} className={`px-4 py-2.5 ${i > 0 ? 'border-t border-border' : ''}`}>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="truncate text-[15px] font-semibold">{p.name}</span>
                      {p.estimatedCost !== null && <span className="shrink-0 text-sm text-muted">{formatRM(p.estimatedCost)}</span>}
                    </div>
                    {p.needed === null || p.packsToBuy === null ? (
                      <p className="text-sm font-medium text-loss">{t('batch.belumDikira')}</p>
                    ) : (
                      <p className="text-sm text-muted">
                        {t('batch.perlu').replace('{amount}', shownQuantity(p.needed))} ·{' '}
                        <span className="font-semibold text-ink">{t('batch.beli').replace('{packs}', String(p.packsToBuy)).replace('{size}', packSize(p.packQuantity, unitOf(p.packagingId)))}</span>
                      </p>
                    )}
                  </li>
                ))}
              </ul>
              <Total label={t('batch.jumlahPack')} value={plan.packagingCost} />
            </>
          )}

          {plan.issues.length > 0 && (
            <div role="alert" className="mt-6 rounded-2xl border border-watch-line bg-watch-soft p-4 text-sm text-watch" data-testid="batch-isu">
              <h2 className="text-base font-bold">{t('batch.isuTajuk')}</h2>
              <ul className="mt-1 list-inside list-disc space-y-1">
                {plan.issues.map((x, i) => <li key={i}>{issueText(x)}</li>)}
              </ul>
            </div>
          )}
        </>
      )}

      {notCalculated.length > 0 && (
        <div className="mt-6 rounded-2xl border border-border bg-surface p-4" data-testid="batch-tidak-dikira">
          <h2 className="text-base font-bold">{t('batch.tidakDikiraTajuk')}</h2>
          <p className="text-xs text-muted">{t('batch.tidakDikiraNota')}</p>
          <ul className="mt-2 space-y-1 text-sm">
            {notCalculated.map((x, i) => <li key={i}>{x.name} × {x.quantity}</li>)}
          </ul>
        </div>
      )}

      {hasSomething && (
        <div className="mt-6">
          <button type="button" className={`${btnSecondary} w-full`} onClick={() => void copyText()}>
            {t('batch.salin')}
          </button>
          {copy === 'ok' && <p role="status" className="mt-2 text-sm font-medium text-healthy">✓ {t('batch.disalin')}</p>}
          {copy === 'fail' && (
            <div role="alert" className="mt-2">
              <p className="text-sm font-medium text-loss">{t('batch.salinGagal')}</p>
              <textarea readOnly value={text} rows={10} onFocus={(e) => e.currentTarget.select()} className="mt-2 w-full rounded-xl border border-border-strong bg-surface p-3 font-mono text-xs" />
            </div>
          )}
        </div>
      )}
    </section>
  );
}

/** A total only when every part of it is known; otherwise "—" and why (missing = named, not zero). */
function Total({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="mt-2 px-1 text-sm">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-semibold">{label}</span>
        <span className="font-bold">{value !== null ? formatRM(value) : '—'}</span>
      </div>
      {value === null && <p className="text-xs text-muted">{t('batch.jumlahBelum')}</p>}
    </div>
  );
}
