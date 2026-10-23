/**
 * "What's new" notes shown once per device after an update (D-98). Best-effort, like the backup reminder:
 * if storage is blocked the note is remembered for this visit only.
 */

/** Bump the id for the next announcement; each id is shown once. */
export const WHATS_NEW_ID = 'jualanlab-launch';
const KEY = 'untunglab.whatsNewSeen';

let seenThisVisit: string | null = null;

export function whatsNewSeen(storage: Pick<Storage, 'getItem'> | null = safeStorage()): boolean {
  if (seenThisVisit === WHATS_NEW_ID) return true;
  try {
    return storage?.getItem(KEY) === WHATS_NEW_ID;
  } catch {
    return false;
  }
}

export function markWhatsNewSeen(storage: Pick<Storage, 'setItem'> | null = safeStorage()): void {
  seenThisVisit = WHATS_NEW_ID;
  try {
    storage?.setItem(KEY, WHATS_NEW_ID);
  } catch {
    /* private mode or blocked storage: remembered for this visit only */
  }
}

/**
 * Show it once the language is chosen (never on top of the language prompt), once the person has at least one menu
 * (the new screens need menus; a brand-new user sees it after making their first one), and not when they arrived
 * through one of the new screens themselves (for example a Rancang Batch link from JualanLab).
 */
export function shouldShowWhatsNew(input: { seen: boolean; languageChosen: boolean; menuCount: number | undefined; path: string }): boolean {
  if (input.seen || !input.languageChosen) return false;
  if (input.menuCount === undefined || input.menuCount < 1) return false;
  return !['/hantar-jualanlab', '/rancang-batch'].includes(input.path);
}

/** Test helper. */
export function resetWhatsNewForTests(): void {
  seenThisVisit = null;
}

function safeStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}
