import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLangState } from '../../i18n/lang';
import { t } from '../../i18n/ms';
import { useLive } from '../data';
import { markWhatsNewSeen, shouldShowWhatsNew, whatsNewSeen } from '../whatsNew';
import { btnPrimary, btnQuiet } from './ui';

/** One-time note after the update that connects UntungLab to JualanLab (D-98). */
export function WhatsNew() {
  const { chosen } = useLangState();
  const location = useLocation();
  const navigate = useNavigate();
  const menuCount = useLive((ctx) => ctx.db.menus.count());
  const [seen, setSeen] = useState(() => whatsNewSeen());

  // Arriving straight on one of the new screens (for example a batch link from JualanLab) counts as seen.
  useEffect(() => {
    if (!seen && ['/hantar-jualanlab', '/rancang-batch'].includes(location.pathname)) {
      markWhatsNewSeen();
      setSeen(true);
    }
  }, [seen, location.pathname]);

  if (!shouldShowWhatsNew({ seen, languageChosen: chosen, menuCount, path: location.pathname })) return null;

  const close = (then?: () => void) => {
    markWhatsNewSeen();
    setSeen(true);
    then?.();
  };

  const points = [t('baharu.p1'), t('baharu.p2'), t('baharu.p3')];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center" data-testid="whats-new">
      <div role="dialog" aria-modal="true" aria-labelledby="whats-new-title" className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-2xl bg-surface p-6 shadow-xl">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">{t('baharu.label')}</p>
        <h2 id="whats-new-title" className="mt-1 text-lg font-bold">{t('baharu.tajuk')}</h2>
        <p className="mt-2 text-sm text-muted">{t('baharu.isi')}</p>
        <p className="mt-3 rounded-xl border border-watch-line bg-watch-soft p-3 text-sm font-semibold text-watch" data-testid="jualanlab-belum-lancar">
          {t('jualanlab.belumLancar')}
        </p>
        <ul className="mt-4 space-y-3">
          {points.map((p, i) => (
            <li key={i} className="flex gap-3 text-sm">
              <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary">{i + 1}</span>
              <span>{p}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 rounded-xl bg-canvas p-3 text-sm text-muted">{t('baharu.mana')}</p>
        <div className="mt-5 flex flex-col gap-2">
          {/* Until JualanLab launches, nothing here leads into it; Rancang Batch works fully inside UntungLab. */}
          <button type="button" className={btnPrimary} onClick={() => close(() => navigate('/rancang-batch'))}>
            {t('baharu.cuba')}
          </button>
          <button type="button" className={btnQuiet} onClick={() => close()}>
            {t('baharu.nanti')}
          </button>
        </div>
      </div>
    </div>
  );
}
