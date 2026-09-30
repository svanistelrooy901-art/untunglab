import { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatPct, formatRM } from '../../domain';
import { loadCostingData, localDate } from '../../db';
import { t } from '../../i18n/ms';
import { saveBackupFile } from '../backupFile';
import { StatusBadge, issueText } from '../components/MenuResultView';
import { EmptyState, Loading, PageHeader, btnPrimary } from '../components/ui';
import { useData, useLive } from '../data';
import { buildReport, menuReportCsv } from '../report';

export function LaporanPage() {
  const ctx = useData();
  const data = useLive((c) => loadCostingData(c));
  const [saved, setSaved] = useState(false);
  const [failed, setFailed] = useState(false);
  if (!data) return <Loading />;
  const report = buildReport(data);
  const nameOf = (ref: string | undefined) =>
    data.ingredients.find((i) => i.id === ref)?.name ?? data.packaging.find((p) => p.id === ref)?.name ?? data.equipment.find((e) => e.id === ref)?.name ?? t('menu.hilang');

  async function exportCsv() {
    setSaved(false);
    setFailed(false);
    try {
      const name = t('laporan.fail').replace('{date}', localDate(ctx.now()));
      if (await saveBackupFile(name, menuReportCsv(report), 'text/csv')) setSaved(true);
    } catch {
      setFailed(true);
    }
  }

  if (report.menus.length === 0 && report.incomplete.length === 0) {
    return (
      <section>
        <PageHeader title={t('laporan.title')} />
        <EmptyState
          title={t('laporan.kosongTajuk')}
          body={t('laporan.kosongIsi')}
          action={
            <Link to="/menu/baru" className={btnPrimary}>
              {t('menu.tambah')}
            </Link>
          }
        />
      </section>
    );
  }

  return (
    <section>
      <PageHeader
        title={t('laporan.title')}
        action={
          <button type="button" className={btnPrimary} onClick={() => void exportCsv()}>
            {t('laporan.eksport')}
          </button>
        }
      />
      <p className="mt-1 text-sm text-muted">{t('laporan.intro')}</p>
      {saved && (
        <p role="status" className="mt-2 text-sm font-medium text-healthy">
          ✓ {t('laporan.eksportBerjaya')}
        </p>
      )}
      {failed && (
        <p role="alert" className="mt-2 text-sm font-medium text-loss">
          {t('common.gagalSimpan')}
        </p>
      )}

      <h2 className="mt-5 text-sm font-bold">{t('laporan.ringkasan')}</h2>
      <div className="mt-2 flex flex-wrap gap-2" data-testid="laporan-ringkasan">
        {(['loss', 'low', 'watch', 'healthy'] as const).map((s) =>
          report.byStatus[s] > 0 ? (
            <span key={s} className="inline-flex items-center gap-2">
              <span className="text-sm font-semibold">{report.byStatus[s]}×</span>
              <StatusBadge status={s} />
            </span>
          ) : null,
        )}
      </div>
      <p className="mt-2 text-xs text-muted">{t('laporan.tiadaJumlah')}</p>

      {report.menus.length > 0 && (
        <ul className="mt-3 overflow-hidden rounded-2xl border border-border bg-surface" data-testid="laporan-menu">
          {report.menus.map((r, n) => (
            <li key={r.menuId} className={n > 0 ? 'border-t border-border' : ''}>
              <details className="px-4">
                <summary className="flex min-h-14 cursor-pointer flex-col justify-center py-2">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-[15px] font-semibold">{r.name}</span>
                    <span className="shrink-0 text-sm text-muted">{formatRM(r.sellingPrice)}</span>
                  </span>
                  <span className="mt-1 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs text-muted">
                      {t('terms.kosSebenar')} {formatRM(r.fullCost)} · {t('terms.anggaranUntung')}{' '}
                      <span className={r.profit < 0 ? 'font-semibold text-loss' : ''}>{formatRM(r.profit)}</span> · {formatPct(r.marginPct)}
                    </span>
                    <StatusBadge status={r.status} />
                  </span>
                </summary>
                <dl className="pb-3 text-sm">
                  <dt className="sr-only">{t('laporan.butiran')}</dt>
                  {(
                    [
                      ['Bahan', r.ingredients],
                      ['Pembungkusan', r.packaging],
                      [t('terms.nilaiMasa'), r.labour],
                      [t('terms.utilitiPengeluaran'), r.utilities],
                      [t('terms.kosOperasiBersama'), r.sharedOperating],
                      ...(r.other > 0 ? ([['Kos Lain', r.other]] as [string, number][]) : []),
                    ] as [string, number][]
                  ).map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-3 py-0.5">
                      <dt className="text-muted">{label}</dt>
                      <dd>{formatRM(value)}</dd>
                    </div>
                  ))}
                  <Link to={`/menu/${r.menuId}`} className="mt-1 inline-flex min-h-11 items-center font-semibold text-primary">
                    {t('dash.lihatMenu')} →
                  </Link>
                </dl>
              </details>
            </li>
          ))}
        </ul>
      )}

      {report.incomplete.length > 0 && (
        <>
          <h2 className="mt-6 text-sm font-bold">{t('laporan.belumLengkap')}</h2>
          <ul className="mt-2 overflow-hidden rounded-2xl border border-border bg-surface">
            {report.incomplete.map((m, n) => (
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
      <p className="mt-4 text-xs text-muted">{t('laporan.eksportNota')}</p>
    </section>
  );
}
