import { existsSync, readdirSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ROUTES } from '../routes';

describe('Manual', () => {
  it('is listed under Lagi (not in the bottom bar)', () => {
    const r = ROUTES.find((x) => x.path === '/manual');
    expect(r).toBeDefined();
    expect(r?.primary).toBe(false);
  });
  it.each(['public/manual/UntungLab-Manual.pdf', 'public/manual/UntungLab-Manual-EN.pdf'])('ships the PDF the page links to: %s', (f) => {
    expect(existsSync(f)).toBe(true);
    expect(statSync(f).size).toBeGreaterThan(100_000);
  });
  it('has the same screenshots in both languages', () => {
    const ms = readdirSync('manual/shots').sort();
    expect(readdirSync('manual/shots-en').sort()).toEqual(ms);
  });
});
