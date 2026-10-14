import { beforeEach, describe, expect, it } from 'vitest';
import { WHATS_NEW_ID, markWhatsNewSeen, resetWhatsNewForTests, shouldShowWhatsNew, whatsNewSeen } from '../whatsNew';

function memoryStorage() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
}

describe("what's new (D-98)", () => {
  beforeEach(() => resetWhatsNewForTests());

  it('is shown once: after it is closed it stays closed', () => {
    const s = memoryStorage();
    expect(whatsNewSeen(s)).toBe(false);
    markWhatsNewSeen(s);
    resetWhatsNewForTests();
    expect(whatsNewSeen(s)).toBe(true);
    expect(s.getItem('untunglab.whatsNewSeen')).toBe(WHATS_NEW_ID);
  });

  it('blocked storage: remembered for this visit only, never throws', () => {
    const broken = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
    expect(whatsNewSeen(broken)).toBe(false);
    markWhatsNewSeen(broken);
    expect(whatsNewSeen(broken)).toBe(true);
  });

  it('waits for the language choice and a first menu; skipped on the new screens themselves', () => {
    const base = { seen: false, languageChosen: true, menuCount: 3, path: '/' };
    expect(shouldShowWhatsNew(base)).toBe(true);
    expect(shouldShowWhatsNew({ ...base, seen: true })).toBe(false);
    expect(shouldShowWhatsNew({ ...base, languageChosen: false })).toBe(false);
    expect(shouldShowWhatsNew({ ...base, menuCount: 0 })).toBe(false);
    expect(shouldShowWhatsNew({ ...base, menuCount: undefined })).toBe(false);
    expect(shouldShowWhatsNew({ ...base, path: '/rancang-batch' })).toBe(false);
    expect(shouldShowWhatsNew({ ...base, path: '/hantar-jualanlab' })).toBe(false);
  });
});
