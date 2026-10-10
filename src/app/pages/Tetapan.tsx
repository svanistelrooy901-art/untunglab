import { useState } from 'react';
import { LICENSE_API_URL } from '../../license/config';
import { setUsagePingOff, usagePingOff } from '../usagePing';
import { setLang, useLangState, type Lang } from '../../i18n/lang';
import { t } from '../../i18n/ms';
import { PageHeader } from '../components/ui';

const OPTIONS: { lang: Lang; label: 'tetapan.ms' | 'tetapan.en' }[] = [
  { lang: 'ms', label: 'tetapan.ms' },
  { lang: 'en', label: 'tetapan.en' },
];

export function LanguageChoice({ onPick }: { onPick?: () => void }) {
  const { lang } = useLangState();
  return (
    <div role="radiogroup" aria-label={t('tetapan.bahasaTajuk')} className="grid gap-3 sm:grid-cols-2">
      {OPTIONS.map((o) => {
        const on = lang === o.lang;
        return (
          <button
            key={o.lang}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => {
              setLang(o.lang);
              onPick?.();
            }}
            className={`min-h-14 rounded-xl border px-4 text-base font-semibold ${on ? 'border-primary bg-primary-soft text-primary' : 'border-border-strong bg-surface text-ink hover:bg-canvas'}`}
          >
            {t(o.label)}
          </button>
        );
      })}
    </div>
  );
}

function UsageCountChoice() {
  const [on, setOn] = useState(() => {
    try {
      return !usagePingOff(localStorage);
    } catch {
      return true;
    }
  });
  return (
    <div className="mt-4 rounded-2xl border border-border bg-surface p-5">
      <h2 className="text-base font-semibold">{t('tetapan.kiraanTajuk')}</h2>
      <p className="mt-1 mb-4 text-sm text-muted">{t('tetapan.kiraanIsi')}</p>
      <label className="flex min-h-11 items-center gap-3 text-sm">
        <input
          type="checkbox"
          checked={on}
          onChange={(e) => {
            setOn(e.target.checked);
            try {
              setUsagePingOff(localStorage, !e.target.checked);
            } catch {
              /* blocked storage: the choice holds for this visit only */
            }
          }}
          className="size-5"
        />
        {t('tetapan.kiraanSuis')}
      </label>
    </div>
  );
}

export function TetapanPage() {
  return (
    <section>
      <PageHeader title={t('tetapan.title')} />
      <div className="mt-4 rounded-2xl border border-border bg-surface p-5">
        <h2 className="text-base font-semibold">{t('tetapan.bahasaTajuk')}</h2>
        <p className="mt-1 mb-4 text-sm text-muted">{t('tetapan.bahasaIsi')}</p>
        <LanguageChoice />
      </div>
      {LICENSE_API_URL ? <UsageCountChoice /> : null}
    </section>
  );
}
