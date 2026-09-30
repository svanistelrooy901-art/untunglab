import { Link } from 'react-router-dom';
import { formatPct, formatRM } from '../../domain';
import { listAllHistory, loadCostingData } from '../../db';
import { t } from '../../i18n/ms';
import { StatusBadge, issueText } from '../components/MenuResultView';
import { EmptyState, Loading, PageHeader, btnPrimary } from '../components/ui';
import { useLive } from '../data';
import { buildDashboard, type InsightItem } from '../insights';
import { signedPct, unitRM } from '../signed';
import { SetupChecklist } from './Mula';

const SEVERITY_STYLE: Record<InsightItem['severity'], string> = {
  critical: 'border-loss-line bg-loss-soft',
  warning: 'border-watch-line bg-watch-soft',
  info: 'border-border bg-surface',
};
const SEVERITY_ICON: Record<InsightItem['severity'], string> = { critical: '✕', warning: '!', info: 'i' };

const list = (menus: { name: string }[]) => menus.map((m) => m.name).join(', ');

function insightCopy(i: InsightItem): { title: string; detail: string; cta: string } {
  switch (i.type) {
    case 'loss':
      return {
        title: i.menus.length === 1 ? t('dash.rugi1').replace('{name}', i.menus[0]!.name) : t('dash.rugiN').replace('{n}', String(i.menus.length)),
        detail: i.menus.length === 1 ? t('dash.rugiButiran') : `${list(i.menus)}. ${t('dash.rugiButiran')}`,
        cta: t('dash.lihatMenu'),
      };
    case 'price_move':
      return {
        title: (i.direction === 'up' ? t('dash.hargaNaik') : t('dash.hargaTurun')).replace('{name}', i.name).replace('{pct}', signedPct(i.percent).replace('+', '')),
        detail: `${t('dash.hargaButiran').replace('{from}', unitRM(i.fromAmount)).replace('{to}', unitRM(i.toAmount)).replace('{unit}', i.displayUnit)} ${t('dash.terjejas').replace('{n}', String(i.affected.length))}: ${list(i.affected)}.`,
        cta: t('dash.lihatKesan'),
      };
    case 'incomplete':
      return {
        title: i.menus.length === 1 ? t('dash.belumLengkap1').replace('{name}', i.menus[0]!.name) : t('dash.belumLengkapN').replace('{n}', String(i.menus.length)),
        detail: t('dash.belumLengkapButiran'),
        cta: t('dash.lihatMenu'),
      };
  }
}

/** Leads with what needs action, then the margin ranking. Every number comes from the shared costing engine (M04). */
export function DashboardPage() {
  const data = useLive(async (c) => ({ costing: await loadCostingData(c), history: await listAllHistory(c) }));
  if (!data) return <Loading />;
  const d = buildDashboard(data.costing, data.history);
  const nameOf = (ref: string | undefined) => data.costing.ingredients.find((i) => i.id === ref)?.name ?? data.costing.packaging.find((p) => p.id === ref)?.name ?? data.costing.equipment.find((e) => e.id === ref)?.name ?? t('menu.hilang');

  if (d.menuCount === 0) {
    return (
      <section>
        <SetupChecklist />
        <div className="mt-6">
          <EmptyState
            title={t('dash.kosongTajuk')}
            body={t('dash.kosongIsi')}
            action={
              <Link to="/menu/baru" className={btnPrimary}>
                {t('menu.tambah')}
              </Link>
            }
          />
        </div>
      </section>
    );
  }

  return (
    <section>
      <PageHeader title={t('dash.title')} />
      <p className="mt-1 text-sm text-muted">{t('dash.intro')}</p>

      <h2 className="mt-5 text-sm font-bold">{t('dash.perhatianTajuk')}</h2>
      {d.insights.length === 0 ? (
        <p className="mt-2 rounded-2xl border border-healthy-line bg-healthy-soft px-4 py-3 text-sm font-medium text-healthy">
          <span aria-hidden="true">✓ </span>
          {t('dash.tiadaPerhatian')}
        </p>
      ) : (
        <ul className="mt-2 space-y-2" data-testid="insights">
          {d.insights.map((i, n) => {
            const c = insightCopy(i);
            return (
              <li key={`${i.type}-${n}`} className={`rounded-2xl border px-4 py-3 ${SEVERITY_STYLE[i.severity]}`}>
                <p className="flex items-start gap-2 text-[15px] font-semibold">
                  <span aria-hidden="true" className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full border border-current text-xs">
                    {SEVERITY_ICON[i.severity]}
                  </span>
                  {c.title}
                </p>
                <p className="mt-1 text-sm text-muted">{c.detail}</p>
                <Link to={i.to} className="mt-1 inline-flex min-h-11 items-center text-sm font-semibold text-primary">
                  {c.cta} →
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {d.ranking.length > 0 && (
        <>
          <h2 className="mt-6 text-sm font-bold">{t('dash.kedudukanTajuk')}</h2>
          <p className="text-xs text-muted">{t('dash.kedudukanNota')}</p>
          <ol className="mt-2 overflow-hidden rounded-2xl border border-border bg-surface" data-testid="ranking">
            {d.ranking.map((r, n) => (
              <li key={r.menuId} className={n > 0 ? 'border-t border-border' : ''}>
                <Link to={`/menu/${r.menuId}`} className="block px-4 py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-[15px] font-semibold">
                      {n + 1}. {r.name}
                    </span>
                    <span className="shrink-0 text-sm text-muted">{formatRM(r.sellingPrice)}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs text-muted">
                      {t('terms.kosSebenar')} {formatRM(r.fullCost)} · {t('terms.anggaranUntung')}{' '}
                      <span className={r.profit < 0 ? 'font-semibold text-loss' : ''}>{formatRM(r.profit)}</span> · {formatPct(r.marginPct)}
                    </span>
                    <StatusBadge status={r.status} />
                  </div>
                </Link>
              </li>
            ))}
          </ol>
        </>
      )}

      {d.incomplete.length > 0 && (
        <>
          <h2 className="mt-6 text-sm font-bold">{t('dash.belumLengkapTajuk')}</h2>
          <ul className="mt-2 overflow-hidden rounded-2xl border border-border bg-surface">
            {d.incomplete.map((m, n) => (
              <li key={m.menuId} className={n > 0 ? 'border-t border-border' : ''}>
                <Link to={`/menu/${m.menuId}`} className="block px-4 py-3">
                  <span className="block text-[15px] font-semibold">{m.name}</span>
                  <span className="mt-0.5 block text-xs font-medium text-watch">
                    {m.issues[0] ? issueText(m.issues[0], nameOf) : ''}
                    {m.issues.length > 1 && ` (+${m.issues.length - 1})`}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
