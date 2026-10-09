import { getLang, type Lang } from '../../i18n/lang';
import { t } from '../../i18n/ms';
import { PageHeader, btnPrimary, btnSecondary } from '../components/ui';

/** Relative so it works under both untunglab.space and the github.io sub-path. The manual follows the app language. */
export const manualFile = (lang: Lang) => (lang === 'en' ? 'UntungLab-Manual-EN.pdf' : 'UntungLab-Manual.pdf');

export function ManualPage() {
  const file = manualFile(getLang());
  const url = `${import.meta.env.BASE_URL}manual/${file}`;
  return (
    <section>
      <PageHeader title={t('nav.manual')} />
      <div className="mt-4 rounded-2xl border border-border bg-surface p-5">
        <p className="text-sm text-muted">{t('manual.intro')}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <a href={url} download={file} className={btnPrimary}>{t('manual.muatTurun')}</a>
          <a href={url} target="_blank" rel="noopener" className={btnSecondary}>{t('manual.buka')}</a>
        </div>
        <p className="mt-3 text-xs text-muted">{t('manual.nota')}</p>
        <p className="mt-3 text-sm"><a href="mailto:admin@digitalsambal.space" className="font-medium text-primary underline">{t('manual.hubungi')}</a></p>
      </div>
    </section>
  );
}
