import { existsSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ROUTES } from '../routes';

describe('Manual', () => {
  it('is listed under Lagi (not in the bottom bar)', () => {
    const r = ROUTES.find((x) => x.path === '/manual');
    expect(r).toBeDefined();
    expect(r?.primary).toBe(false);
  });
  it('ships the PDF the page links to', () => {
    const f = 'public/manual/UntungLab-Manual.pdf';
    expect(existsSync(f)).toBe(true);
    expect(statSync(f).size).toBeGreaterThan(100_000);
  });
});
