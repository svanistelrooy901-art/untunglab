import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const dir = join(__dirname, '..');
const sources = readdirSync(dir)
  .filter((f) => f.endsWith('.ts'))
  .map((f) => ({ file: f, text: readFileSync(join(dir, f), 'utf8') }));

describe('storage layer boundaries', () => {
  it('finds the db modules', () => {
    expect(sources.map((s) => s.file)).toEqual(expect.arrayContaining(['db.ts', 'repo.ts', 'types.ts']));
  });
  it.each(['react', 'react-dom', 'react-router', 'vite'])('db layer does not import %s', (pkg) => {
    for (const { file, text } of sources) expect(text, file).not.toMatch(new RegExp(`from\\s+['"]${pkg}[/'"]`));
  });
  it('db layer does not import the app or i18n layers', () => {
    for (const { file, text } of sources) expect(text, file).not.toMatch(/from\s+['"][./]*(app|i18n)\//);
  });
  it('no profitability formula lives in the db layer (Doc 03 §12)', () => {
    for (const { file, text } of sources) expect(text, file).not.toMatch(/sellingPrice\s*-|marginPct|computeMenuCost/);
  });
});
