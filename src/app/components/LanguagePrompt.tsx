import { useLangState } from '../../i18n/lang';
import { t } from '../../i18n/ms';
import { LanguageChoice } from '../pages/Tetapan';

/** Shown once, the first time the app opens (also for people who already use it). Either choice closes it. */
export function LanguagePrompt() {
  const { chosen } = useLangState();
  if (chosen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center" data-testid="language-prompt">
      <div role="dialog" aria-modal="true" aria-labelledby="lang-title" className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-xl">
        <h2 id="lang-title" className="text-lg font-bold">{t('bahasa.tajuk')}</h2>
        <p className="mt-1 mb-5 text-sm text-muted">{t('bahasa.isi')}</p>
        <LanguageChoice />
      </div>
    </div>
  );
}
