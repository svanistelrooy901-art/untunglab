import { t } from '../../i18n/ms';
import { PageHeader, btnPrimary, btnSecondary } from '../components/ui';

/** Relative so it works under both untunglab.space and the github.io sub-path. */
export const MANUAL_URL = `${import.meta.env.BASE_URL}manual/UntungLab-Manual.pdf`;

export function ManualPage() {
  return (
    <section>
      <PageHeader title={t('nav.manual')} />
      <div className="mt-4 rounded-2xl border border-border bg-surface p-5">
        <p className="text-sm text-muted">{t('manual.intro')}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <a href={MANUAL_URL} download="UntungLab-Manual.pdf" className={btnPrimary}>{t('manual.muatTurun')}</a>
          <a href={MANUAL_URL} target="_blank" rel="noopener" className={btnSecondary}>{t('manual.buka')}</a>
        </div>
        <p className="mt-3 text-xs text-muted">{t('manual.nota')}</p>
      </div>
    </section>
  );
}
