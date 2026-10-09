import { strToU8, zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { buildTemplate, parseCsv, parseWorkbook, planImport, TEMPLATE_HEADERS, type ExistingIngredient } from '../ingredientImport';

const UNITS = ['kg', 'g', 'l', 'ml', 'biji', 'pek'];
const HEAD = ['Nama bahan', 'Harga beli (RM)', 'Kuantiti dalam pek', 'Unit pek'];
const none: ExistingIngredient[] = [];
const ex = (name: string, price: number, qty: number, unit: string): ExistingIngredient => ({ id: name, name, purchasePrice: price, packageQuantity: qty, packageUnit: unit });

describe('template', () => {
  const sample = [{ name: 'Tepung gandum', unit: 'kg' }, { name: 'Telur', unit: 'biji' }];
  it('round-trips: headers, prefilled names and units, price and quantity left blank (no sample prices)', () => {
    const bytes = buildTemplate({ headers: HEAD, units: UNITS, rows: sample });
    const rows = parseWorkbook(bytes);
    expect(rows[0]).toEqual(HEAD);
    expect(rows[1]).toEqual(['Tepung gandum', '', '', 'kg']);
    expect(rows[2]).toEqual(['Telur', '', '', 'biji']);
  });
  it('carries a unit dropdown covering the app units', () => {
    const bytes = buildTemplate({ headers: HEAD, units: UNITS, rows: sample });
    const { unzipSync, strFromU8 } = require('fflate') as typeof import('fflate');
    const sheet = strFromU8(unzipSync(bytes)['xl/worksheets/sheet1.xml']!);
    expect(sheet).toContain('type="list"');
    expect(sheet).toContain('kg,g,l,ml,biji,pek');
  });
  it('escapes XML characters in names', () => {
    const bytes = buildTemplate({ headers: HEAD, units: UNITS, rows: [{ name: 'Susu & krim <A>', unit: 'l' }] });
    expect(parseWorkbook(bytes)[1]?.[0]).toBe('Susu & krim <A>');
  });
  it('exports the header constant used by the screen', () => {
    expect(TEMPLATE_HEADERS).toHaveLength(4);
  });
});

describe('reading workbooks written by other programs', () => {
  const xml = (s: string) => strToU8(s);
  function book(sheet: string, shared?: string[]) {
    const files: Record<string, Uint8Array> = {
      '[Content_Types].xml': xml('<Types/>'),
      'xl/workbook.xml': xml('<workbook/>'),
      'xl/worksheets/sheet1.xml': xml(`<worksheet><sheetData>${sheet}</sheetData></worksheet>`),
    };
    if (shared) files['xl/sharedStrings.xml'] = xml(`<sst>${shared.map((s) => `<si><t>${s}</t></si>`).join('')}</sst>`);
    return zipSync(files);
  }
  it('shared strings, numbers, and skipped cells (Excel and Google Sheets style)', () => {
    const rows = parseWorkbook(book('<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c></row><row r="2"><c r="A2" t="s"><v>2</v></c><c r="B2"><v>12.5</v></c><c r="D2" t="s"><v>3</v></c></row>', ['Nama', 'Harga', 'Gula', 'kg']));
    expect(rows[0]).toEqual(['Nama', 'Harga']);
    expect(rows[1]).toEqual(['Gula', '12.5', '', 'kg']);
  });
  it('inline strings, rich text runs, and entities', () => {
    const rows = parseWorkbook(book('<row r="1"><c r="A1" t="inlineStr"><is><r><t>Cili </t></r><r><t>&amp; bawang</t></r></is></c></row>'));
    expect(rows[0]).toEqual(['Cili & bawang']);
  });
  it('rows left out of the file become empty rows so row numbers stay true', () => {
    const rows = parseWorkbook(book('<row r="1"><c r="A1" t="inlineStr"><is><t>a</t></is></c></row><row r="3"><c r="A3" t="inlineStr"><is><t>c</t></is></c></row>'));
    expect(rows).toHaveLength(3);
    expect(rows[1]).toEqual([]);
    expect(rows[2]).toEqual(['c']);
  });
  it('something that is not a workbook is refused', () => {
    expect(() => parseWorkbook(strToU8('hello'))).toThrow();
    expect(() => parseWorkbook(zipSync({ 'a.txt': strToU8('x') }))).toThrow();
  });
});

describe('csv', () => {
  it('handles quotes, commas inside quotes, and a semicolon separator', () => {
    expect(parseCsv('Nama,Harga\n"Gula, halus",3.5\n')).toEqual([['Nama', 'Harga'], ['Gula, halus', '3.5']]);
    expect(parseCsv('Nama;Harga\nGula;3,5')).toEqual([['Nama', 'Harga'], ['Gula', '3,5']]);
  });
});

describe('planImport', () => {
  const plan = (rows: string[][], existing = none) => planImport(rows, { units: UNITS, existing });
  it('creates a new ingredient from a complete row', () => {
    const p = plan([HEAD, ['Gula', '3,50', '1', 'KG']]);
    expect(p.rows).toEqual([{ row: 2, name: 'Gula', price: 3.5, qty: 1, unit: 'kg', action: 'create' }]);
    expect(p.problems).toEqual([]);
  });
  it('skips blank rows and untouched prefilled rows (name and unit only), without calling them problems', () => {
    const p = plan([HEAD, [], ['', '', '', ''], ['Telur', '', '', 'biji'], ['Gula', '3', '1', 'kg']]);
    expect(p.rows.map((r) => r.name)).toEqual(['Gula']);
    expect(p.problems).toEqual([]);
    expect(p.blank).toBe(2);
    expect(p.notFilled).toBe(1);
  });
  it('the same name (any case, extra spaces) updates the price instead of adding a second ingredient', () => {
    const p = plan([HEAD, ['  gula  ', '4', '1', 'kg']], [ex('Gula', 3.5, 1, 'kg')]);
    expect(p.rows).toEqual([{ row: 2, name: 'Gula', price: 4, qty: 1, unit: 'kg', action: 'update', existingId: 'Gula' }]);
  });
  it('an identical row changes nothing and is only counted', () => {
    const p = plan([HEAD, ['Gula', '3.5', '1', 'kg']], [ex('Gula', 3.5, 1, 'kg')]);
    expect(p.rows).toEqual([]);
    expect(p.unchanged).toBe(1);
  });
  it('lists every problem row with its own reason and still keeps the good rows', () => {
    const p = plan([HEAD, ['', '3', '1', 'kg'], ['Cili', 'abc', '1', 'kg'], ['Bawang', '3', '0', 'kg'], ['Lada', '3', '1', 'tan'], ['Gula', '3', '1', 'kg'], ['Garam', '-1', '1', 'kg']]);
    expect(p.rows.map((r) => r.name)).toEqual(['Gula']);
    expect(p.problems.map((x) => [x.row, x.reason])).toEqual([
      [2, 'name_missing'], [3, 'price_invalid'], [4, 'qty_invalid'], [5, 'unit_invalid'], [7, 'price_invalid'],
    ]);
  });
  it('a name repeated in the file is a problem on the later row', () => {
    const p = plan([HEAD, ['Gula', '3', '1', 'kg'], ['gula', '4', '1', 'kg']]);
    expect(p.rows).toHaveLength(1);
    expect(p.problems).toEqual([{ row: 3, name: 'gula', reason: 'duplicate_in_file' }]);
  });
  it('works when the header row is missing (first row is data)', () => {
    const p = plan([['Gula', '3', '1', 'kg']]);
    expect(p.rows).toHaveLength(1);
  });
  it('RM0 price is allowed; quantity must be more than zero', () => {
    expect(plan([HEAD, ['Air', '0', '1', 'l']]).rows).toHaveLength(1);
  });
});

describe('trailing empty rows', () => {
  it('are not reported as skipped', () => {
    const p = planImport([HEAD, ['Gula', '3', '1', 'kg'], [], ['', '', '', ''], []], { units: UNITS, existing: none });
    expect(p.blank).toBe(0);
    expect(p.rows).toHaveLength(1);
  });
});
