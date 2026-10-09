import { afterEach, describe, expect, it } from 'vitest';
import { en } from '../en';
import { dateLocale, getLang, hasChosenLang, resetLangForTests, setLang } from '../lang';
import { ms, t } from '../ms';

type Tree = { [k: string]: string | Tree };
const flat = (o: Tree, p = ''): Record<string, string> =>
  Object.entries(o).reduce<Record<string, string>>((a, [k, v]) => (typeof v === 'string' ? { ...a, [`${p}${k}`]: v } : { ...a, ...flat(v, `${p}${k}.`) }), {});
const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]!).sort();

afterEach(() => {
  setLang('ms');
  resetLangForTests();
});

describe('dictionaries', () => {
  const m = flat(ms as unknown as Tree);
  const e = flat(en as unknown as Tree);

  it('English has exactly the Malay keys', () => {
    expect(Object.keys(e).sort()).toEqual(Object.keys(m).sort());
  });
  it('no English text is empty, and every {placeholder} survives translation', () => {
    for (const key of Object.keys(m)) {
      expect(e[key]!.trim(), key).not.toBe('');
      expect(placeholders(e[key]!), key).toEqual(placeholders(m[key]!));
    }
  });
  it('unit suggestions have the same number of options in both languages', () => {
    expect(en.form.unitOptions.split(',')).toHaveLength(ms.form.unitOptions.split(',').length);
  });
  it('Malay mode keeps technical terms in English (D-83)', () => {
    expect(ms.nav.sandaran).toBe('Backup');
    expect(ms.bahan.pemetaanTajuk).toContain('Mapping');
    const text = Object.values(m).join(' ');
    expect(text).not.toMatch(/\b[Ss]andaran\b/);
    expect(text).not.toMatch(/\b[Pp]emetaan\b/);
  });
});

describe('language state', () => {
  it('starts in Bahasa Melayu with nothing chosen', () => {
    expect(getLang()).toBe('ms');
    expect(hasChosenLang()).toBe(false);
    expect(t('nav.bahan')).toBe('Bahan');
    expect(dateLocale()).toBe('ms-MY');
  });
  it('choosing English switches every t() and marks the choice as made', () => {
    setLang('en');
    expect(getLang()).toBe('en');
    expect(hasChosenLang()).toBe(true);
    expect(t('nav.bahan')).toBe('Ingredients');
    expect(t('status.watch')).toBe('Needs Attention');
    expect(dateLocale()).toBe('en-GB');
  });
  it('can go back to Bahasa Melayu', () => {
    setLang('en');
    setLang('ms');
    expect(t('nav.bahan')).toBe('Bahan');
  });
});
