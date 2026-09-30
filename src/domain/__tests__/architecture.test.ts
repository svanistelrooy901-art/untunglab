import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const dir = join(__dirname, '..');
const sources = readdirSync(dir)
  .filter((f) => f.endsWith('.ts'))
  .map((f) => ({ file: f, text: readFileSync(join(dir, f), 'utf8') }));

describe('calculation domain stays framework-independent (Doc 05 §1, Doc 07 §6)', () => {
  it('finds the domain modules', () => {
    expect(sources.length).toBeGreaterThan(5);
  });

  it.each(['react', 'react-dom', 'react-router', 'dexie', 'vite'])('no domain file imports %s', (pkg) => {
    for (const { file, text } of sources) {
      expect(text, file).not.toMatch(new RegExp(`from\\s+['"]${pkg}[/'"]`));
    }
  });

  it('no domain file touches browser or storage APIs', () => {
    for (const { file, text } of sources) {
      expect(text, file).not.toMatch(/\b(window|document|localStorage|sessionStorage|indexedDB|navigator)\b/);
    }
  });

  it('no domain file imports from the app or storage layers', () => {
    for (const { file, text } of sources) {
      expect(text, file).not.toMatch(/from\s+['"][./]*(app|db|i18n)\//);
    }
  });

  it('only display formatting uses Math.abs; costs and deltas keep their sign (Doc 03 §14)', () => {
    for (const { file, text } of sources) {
      if (file === 'format.ts') continue;
      expect(text, file).not.toContain('Math.abs');
    }
  });
});
