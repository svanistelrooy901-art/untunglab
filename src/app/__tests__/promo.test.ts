import { beforeEach, describe, expect, it } from 'vitest';
import { PROMO_ID, PROMO_URL, markPromoSeen, promoSeen, resetPromoForTests, shouldShowPromo } from '../promo';

function memoryStorage() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
}

describe('JualanLab promotion (D-103)', () => {
  beforeEach(() => resetPromoForTests());

  it('is shown once: after it is closed it stays closed', () => {
    const s = memoryStorage();
    expect(promoSeen(s)).toBe(false);
    markPromoSeen(s);
    resetPromoForTests();
    expect(promoSeen(s)).toBe(true);
    expect(s.getItem('untunglab.promoSeen')).toBe(PROMO_ID);
  });

  it('blocked storage: remembered for this visit only, never throws', () => {
    const broken = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
    expect(promoSeen(broken)).toBe(false);
    markPromoSeen(broken);
    expect(promoSeen(broken)).toBe(true);
  });

  it('waits for the language, the picture and "What\'s new"; skipped on the JualanLab screens', () => {
    const base = { seen: false, languageChosen: true, whatsNewShowing: false, imageReady: true, path: '/' };
    expect(shouldShowPromo(base)).toBe(true);
    expect(shouldShowPromo({ ...base, seen: true })).toBe(false);
    expect(shouldShowPromo({ ...base, languageChosen: false })).toBe(false);
    expect(shouldShowPromo({ ...base, whatsNewShowing: true })).toBe(false);
    expect(shouldShowPromo({ ...base, imageReady: false })).toBe(false);
    expect(shouldShowPromo({ ...base, path: '/rancang-batch' })).toBe(false);
    expect(shouldShowPromo({ ...base, path: '/hantar-jualanlab' })).toBe(false);
  });

  it('links to smeLab with a source tag smeLab accepts (D-102)', () => {
    const src = new URL(PROMO_URL).searchParams.get('src') ?? '';
    expect(src).toMatch(/^[a-z0-9_-]{1,20}$/);
  });
});
