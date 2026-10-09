import { useSyncExternalStore } from 'react';

export type Lang = 'ms' | 'en';

/** The person's language choice. Bahasa Melayu is the default until they pick (Doc 00 §3). */
const KEY = 'ul-app-lang';

function readStored(): { lang: Lang; chosen: boolean } {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'en' || v === 'ms') return { lang: v, chosen: true };
  } catch {
    /* storage blocked: stay on the default and still let the person choose for this visit */
  }
  return { lang: 'ms', chosen: false };
}

let state = readStored();
const listeners = new Set<() => void>();

export const getLang = (): Lang => state.lang;
export const hasChosenLang = (): boolean => state.chosen;

function apply() {
  if (typeof document !== 'undefined') document.documentElement.lang = state.lang === 'en' ? 'en' : 'ms';
}
apply();

export function setLang(lang: Lang): void {
  state = { lang, chosen: true };
  try {
    localStorage.setItem(KEY, lang);
  } catch {
    /* the choice still holds until the page is closed */
  }
  apply();
  for (const l of [...listeners]) l();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export const useLangState = () => useSyncExternalStore(subscribe, () => state);

/** Locale for dates and numbers that follows the app language. */
export const dateLocale = (): string => (state.lang === 'en' ? 'en-GB' : 'ms-MY');

/** Test helper: back to "nothing chosen yet". */
export function resetLangForTests(): void {
  state = { lang: 'ms', chosen: false };
}
