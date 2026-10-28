/**
 * JualanLab promotion pop-up (D-103): a picture shown once per device when UntungLab opens. Best-effort, like
 * "What's new": if storage is blocked it is remembered for this visit only.
 */

/** Bump the id (and the picture) for the next promotion; each id is shown once. */
export const PROMO_ID = 'jualanlab-trial-1';
export const PROMO_IMAGE = './promo/jualanlab-promo.jpg';
/** smeLab shows the waiting list before launch and "start free" after it; the tag is counted there (D-102). */
export const PROMO_URL = 'https://smelab.untunglab.space/?src=ulpopup';
const KEY = 'untunglab.promoSeen';

let seenThisVisit: string | null = null;

export function promoSeen(storage: Pick<Storage, 'getItem'> | null = safeStorage()): boolean {
  if (seenThisVisit === PROMO_ID) return true;
  try {
    return storage?.getItem(KEY) === PROMO_ID;
  } catch {
    return false;
  }
}

export function markPromoSeen(storage: Pick<Storage, 'setItem'> | null = safeStorage()): void {
  seenThisVisit = PROMO_ID;
  try {
    storage?.setItem(KEY, PROMO_ID);
  } catch {
    /* private mode or blocked storage: remembered for this visit only */
  }
}

/**
 * Show it once the language is chosen, never together with "What's new" (that note goes first), and not on the
 * screens a JualanLab link opens. The picture must have loaded: offline, it waits for the next visit.
 */
export function shouldShowPromo(input: { seen: boolean; languageChosen: boolean; whatsNewShowing: boolean; imageReady: boolean; path: string }): boolean {
  if (input.seen || !input.languageChosen || input.whatsNewShowing || !input.imageReady) return false;
  return !['/hantar-jualanlab', '/rancang-batch'].includes(input.path);
}

/** Test helper. */
export function resetPromoForTests(): void {
  seenThisVisit = null;
}

function safeStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}
