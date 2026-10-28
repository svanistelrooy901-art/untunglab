import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useLangState } from '../../i18n/lang';
import { t } from '../../i18n/ms';
import { useLive } from '../data';
import { PROMO_IMAGE, PROMO_URL, markPromoSeen, promoSeen, shouldShowPromo } from '../promo';
import { shouldShowWhatsNew, whatsNewSeen } from '../whatsNew';
import { btnPrimary, btnQuiet } from './ui';

/** JualanLab promotion picture, shown once per device (D-103). */
export function JualanLabPromo() {
  const { chosen } = useLangState();
  const location = useLocation();
  const menuCount = useLive((ctx) => ctx.db.menus.count());
  const [seen, setSeen] = useState(() => promoSeen());
  const [imageReady, setImageReady] = useState(false);

  // Load the picture first, so the pop-up never opens empty (offline it simply waits for another visit).
  useEffect(() => {
    if (seen) return;
    const img = new Image();
    img.onload = () => setImageReady(true);
    img.src = PROMO_IMAGE;
  }, [seen]);

  const whatsNewShowing = shouldShowWhatsNew({ seen: whatsNewSeen(), languageChosen: chosen, menuCount, path: location.pathname });
  if (!shouldShowPromo({ seen, languageChosen: chosen, whatsNewShowing, imageReady, path: location.pathname })) return null;

  const close = () => {
    markPromoSeen();
    setSeen(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center" data-testid="jualanlab-promo" onClick={close}>
      <div role="dialog" aria-modal="true" aria-label={t('promo.label')} className="relative w-full max-w-sm pt-14" onClick={(e) => e.stopPropagation()}>
        {/* Above the card, so it never covers the picture. */}
        <button
          type="button"
          onClick={close}
          aria-label={t('promo.tutup')}
          className="absolute right-0 top-1 flex size-11 items-center justify-center rounded-full bg-white/90 text-2xl leading-none text-ink shadow"
        >
          ×
        </button>
        <div className="max-h-[calc(94dvh-3.5rem)] overflow-y-auto rounded-2xl bg-surface shadow-xl">
        <img src={PROMO_IMAGE} alt={t('promo.alt')} width={1080} height={1350} className="block h-auto w-full rounded-t-2xl" />
        <div className="flex flex-col gap-2 p-4">
          <a href={PROMO_URL} target="_blank" rel="noopener" className={btnPrimary} onClick={close} data-testid="promo-daftar">
            {t('promo.daftar')}
          </a>
          <button type="button" className={btnQuiet} onClick={close}>
            {t('promo.nanti')}
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}
