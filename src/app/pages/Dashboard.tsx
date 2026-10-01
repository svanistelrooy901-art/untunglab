import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { StatusCode } from '../../domain';
import { formatPct, formatRM } from '../../domain';
import { dismissInsight, listAllHistory, listDismissedInsightKeys, loadCostingData } from '../../db';
import { t } from '../../i18n/ms';
import { StatusBadge, issueText } from '../components/MenuResultView';
import { EmptyState, Loading, PageHeader, btnPrimary } from '../components/ui';
import { useData, useLive } from '../data';
import { backupReminder } from '../backupReminder';
import { lastBackupAt } from '../backupFile';
import { buildDashboard, type InsightItem } from '../insights';
import { signedPct, unitRM } from '../signed';
import { SetupChecklist } from './Mula';

/** Tinted card + icon chip per insight. The title and detail carry the meaning; colour only adds emphasis. */
const TONE = {
  loss: { card: 'border-loss-line bg-[#fef2f2]', chip: 'bg-loss-soft text-loss', text: 'text-loss' },
  up: { card: 'border-low-line bg-[#fff7ed]', chip: 'bg-low-soft text-low', text: 'text-low' },
  down: { card: 'border-primary-line bg-primary-soft', chip: 'bg-[#ccfbf1] text-primary', text: 'text-primary' },
  incomplete: { card: 'border-watch-line bg-[#fefce8]', chip: 'bg-watch-soft text-watch', text: 'text-watch' },
} as const;

function toneOf(i: InsightItem): keyof typeof TONE {
  if (i.type === 'loss') return 'loss';
  if (i.type === 'incomplete') return 'incomplete';
  return i.direction === 'up' ? 'up' : 'down';
}

const svg = (children: ReactNode, size = 22) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);
const IconDown = (p: { size?: number }) => svg(<><polyline points="22 17 13.5 8.5 8.5 13.5 2 7" /><polyline points="16 17 22 17 22 11" /></>, p.size);
const IconUp = (p: { size?: number }) => svg(<><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></>, p.size);
const IconWarn = (p: { size?: number }) => svg(<><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></>, p.size);
const IconCheck = (p: { size?: number }) => svg(<><path d="M22 11.1V12a10 10 0 1 1-5.9-9.1" /><polyline points="22 4 12 14.01 9 11.01" /></>, p.size);
const TONE_ICON = { loss: IconDown, up: IconUp, down: IconDown, incomplete: IconWarn } as const;

/** Bar colour per status. Width is the margin itself (0 to 100%), with a small floor so a loss is still visible. */
const BAR: Record<StatusCode, string> = {
  loss: 'linear-gradient(90deg,#dc2626,#f87171)',
  low: 'linear-gradient(90deg,#ea580c,#fdba74)',
  watch: 'linear-gradient(90deg,#d97706,#fcd34d)',
  healthy: 'linear-gradient(90deg,#0f766e,#75f8e8)',
};
const barWidth = (marginPct: number) => `${Math.min(100, Math.max(4, marginPct))}%`;

function Tile({ label, value, sub, tone, icon, testId }: { label: string; value: number; sub: string; tone: 'healthy' | 'loss' | 'watch'; icon: ReactNode; testId: string }) {
  const style = { healthy: 'bg-healthy-soft text-healthy', loss: 'bg-loss-soft text-loss', watch: 'bg-low-soft text-low' }[tone];
  const chip = { healthy: 'bg-[#bbf7d0]', loss: 'bg-[#fecaca]', watch: 'bg-[#fed7aa]' }[tone];
  return (
    <div data-testid={testId} className={`flex min-w-0 flex-1 flex-col gap-1.5 rounded-2xl p-3.5 ${style}`}>
      <span className={`inline-flex size-8 items-center justify-center rounded-[10px] ${chip}`}>{icon}</span>
      <span className="text-[28px] leading-none font-extrabold">{value}</span>
      <span className="text-xs font-semibold">{label}</span>
      <span className="text-[11px] text-muted">{sub}</span>
    </div>
  );
}

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
  const ctx = useData();
  const data = useLive(async (c) => ({ costing: await loadCostingData(c), history: await listAllHistory(c), dismissed: await listDismissedInsightKeys(c) }));
  if (!data) return <Loading />;
  const d = buildDashboard(data.costing, data.history, data.dismissed);
  const nameOf = (ref: string | undefined) => data.costing.ingredients.find((i) => i.id === ref)?.name ?? data.costing.packaging.find((p) => p.id === ref)?.name ?? data.costing.equipment.find((e) => e.id === ref)?.name ?? t('menu.hilang');

  const reminder = backupReminder({ hasData: data.costing.ingredients.length > 0 || d.menuCount > 0, lastBackupAt: lastBackupAt(), now: ctx.now() });
  const reminderCard = reminder.kind !== 'none' && (
    <p className="mt-3 rounded-2xl border border-watch-line bg-watch-soft px-4 py-3 text-sm" data-testid="peringatan-sandaran">
      <span aria-hidden="true">! </span>
      {reminder.kind === 'never' ? t('sandaran.peringatanNever') : t('sandaran.peringatanStale').replace('{n}', String(reminder.days))}{' '}
      <Link to="/sandaran" className="inline-flex min-h-11 items-center font-semibold text-primary underline">
        {t('sandaran.peringatanCta')}
      </Link>
    </p>
  );

  if (d.menuCount === 0) {
    return (
      <section>
        {reminderCard}
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

  const sm = d.summary;
  const heroLines = [
    // "Most profitable" is only said when the best menu really makes a profit.
    sm.best && sm.best.marginPct > 0 ? t('dash.hero.terbaik').replace('{name}', sm.best.name).replace('{pct}', formatPct(sm.best.marginPct)) : sm.best ? '' : t('dash.hero.tiada'),
    sm.loss > 0 ? t('dash.hero.rugi').replace('{n}', String(sm.loss)) : sm.incomplete > 0 ? t('dash.hero.belumLengkap').replace('{n}', String(sm.incomplete)) : sm.best ? t('dash.hero.semuaOk') : '',
  ].filter(Boolean);

  return (
    <section>
      <PageHeader title={t('dash.title')} />
      <p className="mt-1 text-sm text-muted">{t('dash.intro')}</p>
      {reminderCard}

      <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-3 lg:grid-cols-[3fr_2fr]">
        <div
          data-testid="hero-margin"
          className="relative overflow-hidden rounded-3xl bg-[linear-gradient(135deg,#011416_0%,#06353a_55%,#0f766e_100%)] p-5 text-white"
        >
          <span aria-hidden="true" className="pointer-events-none absolute -top-10 -right-10 size-44 rounded-full bg-[radial-gradient(circle,rgba(117,248,232,.35),rgba(117,248,232,0)_70%)]" />
          <p className="text-[13px] font-semibold text-brand-muted">{t('dash.hero.purata')}</p>
          <p className="mt-1 flex flex-wrap items-baseline gap-x-2">
            <span data-testid="purata-margin" className="text-[52px] leading-none font-extrabold tracking-tight text-brand-mint">
              {sm.averageMarginPct === null ? '—' : formatPct(sm.averageMarginPct)}
            </span>
            <span className="text-[13px] font-semibold">{t('dash.hero.daripada').replace('{n}', String(sm.completeCount))}</span>
          </p>
          <p className="mt-2 max-w-md text-[13px] leading-relaxed text-[#cfe3e1]">{heroLines.join(' ')}</p>
        </div>
        <div className="flex gap-2.5">
          <Tile testId="kad-untung" label={t('dash.kad.untung')} value={sm.profitable} sub={t('dash.kad.untungNota')} tone="healthy" icon={<IconCheck size={18} />} />
          <Tile testId="kad-rugi" label={t('dash.kad.rugi')} value={sm.loss} sub={t('dash.kad.rugiNota')} tone="loss" icon={<IconDown size={18} />} />
          <Tile testId="kad-belum" label={t('dash.kad.belum')} value={sm.incomplete} sub={t('dash.kad.belumNota')} tone="watch" icon={<IconWarn size={18} />} />
        </div>
      </div>

      <div className="mt-5 grid grid-cols-[minmax(0,1fr)] items-start gap-x-6 lg:grid-cols-2">
        <div>
          <h2 className="text-base font-extrabold">{t('dash.perhatianTajuk')}</h2>
          {d.insights.length === 0 ? (
            <p className="mt-2 rounded-2xl border border-healthy-line bg-healthy-soft px-4 py-3 text-sm font-medium text-healthy">
              <span aria-hidden="true">✓ </span>
              {t('dash.tiadaPerhatian')}
            </p>
          ) : (
            <ul className="mt-2 space-y-2.5" data-testid="insights">
              {d.insights.map((i, n) => {
                const c = insightCopy(i);
                const tone = TONE[toneOf(i)];
                const Icon = TONE_ICON[toneOf(i)];
                return (
                  <li key={`${i.type}-${n}`} className={`relative flex items-start gap-3.5 rounded-[18px] border p-4 ${tone.card}`}>
                    <span className={`inline-flex size-11 shrink-0 items-center justify-center rounded-[14px] ${tone.chip}`}>
                      <Icon />
                    </span>
                    <div className={`min-w-0 grow ${i.type === 'price_move' ? 'pr-8' : ''}`}>
                      <p className={`text-[15px] font-bold ${tone.text}`}>{c.title}</p>
                      <p className="mt-1 text-[13px] leading-snug text-[#334155]">{c.detail}</p>
                      <Link to={i.to} className={`mt-1 inline-flex min-h-11 items-center gap-1 text-[13px] font-bold ${tone.text}`}>
                        {c.cta} →
                      </Link>
                    </div>
                    {i.type === 'price_move' && (
                      <button
                        type="button"
                        aria-label={t('dash.tutupAmaran')}
                        title={t('dash.tutupAmaran')}
                        onClick={() => void dismissInsight(ctx, i.key)}
                        className="absolute top-0 right-0 inline-flex size-11 items-center justify-center rounded-full text-lg text-muted hover:text-ink"
                      >
                        <span aria-hidden="true">×</span>
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {d.ranking.length > 0 && (
          <div className="mt-6 lg:mt-0">
            <h2 className="text-base font-extrabold">{t('dash.kedudukanTajuk')}</h2>
            <p className="text-xs text-muted">{t('dash.kedudukanNota')}</p>
            <ol className="mt-2 overflow-hidden rounded-[20px] border border-border bg-surface px-4 py-1.5" data-testid="ranking">
              {d.ranking.map((r, n) => (
                <li key={r.menuId} className={n > 0 ? 'border-t border-border' : ''}>
                  <Link to={`/menu/${r.menuId}`} className="block py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="grow truncate text-sm font-semibold">
                        {n + 1}. {r.name}
                      </span>
                      <StatusBadge status={r.status} />
                      <span className={`min-w-14 shrink-0 text-right text-[15px] font-extrabold ${r.status === 'loss' ? 'text-loss' : 'text-primary'}`}>{formatPct(r.marginPct)}</span>
                    </div>
                    <div className="mt-2 h-2.5 rounded-full bg-[#e4efed]" aria-hidden="true">
                      <div className="h-2.5 rounded-full" style={{ width: barWidth(r.marginPct), background: BAR[r.status] }} />
                    </div>
                    <p className="mt-1.5 text-xs text-muted">
                      {t('terms.kosSebenar')} {formatRM(r.fullCost)} · {t('terms.anggaranUntung')}{' '}
                      <span className={r.profit < 0 ? 'font-semibold text-loss' : ''}>{formatRM(r.profit)}</span> · {formatRM(r.sellingPrice)}
                    </p>
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>

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
