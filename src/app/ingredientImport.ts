import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import { parseNumber } from './forms';

/**
 * Excel import for Bahan (D-87). Everything here is pure: bytes and rows in, a plan out. The screen decides what to show
 * and the database layer applies it. Nothing is written until the user confirms the preview.
 */

export const TEMPLATE_HEADERS = ['name', 'price', 'quantity', 'unit'] as const;

// ---------- template ----------

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const col = (i: number) => String.fromCharCode(65 + i);

export interface TemplateOptions {
  headers: string[];
  units: string[];
  rows: { name: string; unit: string }[];
}

/** A minimal .xlsx: header row, the prefilled names and units (price and quantity blank), and a unit dropdown. */
export function buildTemplate(o: TemplateOptions): Uint8Array {
  const text = (ref: string, s: string, style = 0) => `<c r="${ref}" t="inlineStr"${style ? ` s="${style}"` : ''}><is><t xml:space="preserve">${esc(s)}</t></is></c>`;
  const head = `<row r="1">${o.headers.map((h, i) => text(`${col(i)}1`, h, 1)).join('')}</row>`;
  const body = o.rows.map((r, n) => `<row r="${n + 2}">${text(`A${n + 2}`, r.name)}${text(`D${n + 2}`, r.unit)}</row>`).join('');
  const last = Math.max(o.rows.length + 1, 300);
  const sheet =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>` +
    `<cols><col min="1" max="1" width="30" customWidth="1"/><col min="2" max="3" width="22" customWidth="1"/><col min="4" max="4" width="14" customWidth="1"/></cols>` +
    `<sheetData>${head}${body}</sheetData>` +
    `<dataValidations count="1"><dataValidation type="list" allowBlank="1" showErrorMessage="1" sqref="D2:D${last}"><formula1>"${esc(o.units.join(','))}"</formula1></dataValidation></dataValidations>` +
    `</worksheet>`;
  const styles =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>` +
    `<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFD9F2EE"/></patternFill></fill></fills>` +
    `<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>` +
    `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
    `<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs>` +
    `<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>` +
    `</styleSheet>`;
  return zipSync({
    '[Content_Types].xml': strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
        `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>` +
        `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
        `<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>` +
        `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`,
    ),
    '_rels/.rels': strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    ),
    'xl/workbook.xml': strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
        `<sheets><sheet name="Bahan" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    ),
    'xl/_rels/workbook.xml.rels': strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>` +
        `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    ),
    'xl/styles.xml': strToU8(styles),
    'xl/worksheets/sheet1.xml': strToU8(sheet),
  });
}

// ---------- reading ----------

const unesc = (s: string) =>
  s
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number(d)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');

/** All text runs inside a fragment (rich text and plain), with phonetic hints left out. */
function textOf(fragment: string): string {
  const clean = fragment.replace(/<rPh\b[\s\S]*?<\/rPh>/g, '');
  let out = '';
  for (const m of clean.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)) out += m[1];
  return unesc(out);
}

function colIndex(ref: string): number {
  let n = 0;
  for (const ch of ref.replace(/[^A-Za-z]/g, '').toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

/** Rows of the first worksheet as text. Row numbers stay true: a row left out of the file comes back empty. */
export function parseWorkbook(bytes: Uint8Array): string[][] {
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(bytes);
  } catch {
    throw new Error('not_workbook');
  }
  const sheetName = Object.keys(files)
    .filter((n) => /^xl\/worksheets\/sheet\d+\.xml$/.test(n))
    .sort((a, b) => Number(a.match(/\d+/)![0]) - Number(b.match(/\d+/)![0]))[0];
  if (!sheetName) throw new Error('not_workbook');
  const shared: string[] = [];
  const sst = files['xl/sharedStrings.xml'];
  if (sst) for (const m of strFromU8(sst).matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)) shared.push(textOf(m[1] ?? ''));

  const grid = new Map<number, Map<number, string>>();
  let maxRow = 0;
  for (const m of strFromU8(files[sheetName]!).matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
    const attrs = m[1] ?? '';
    const ref = /\br="([A-Za-z]+)(\d+)"/.exec(attrs);
    if (!ref) continue;
    const type = /\bt="([^"]*)"/.exec(attrs)?.[1] ?? '';
    const inner = m[2] ?? '';
    const v = /<v\b[^>]*>([\s\S]*?)<\/v>/.exec(inner)?.[1];
    let value = '';
    if (type === 'inlineStr') value = textOf(inner);
    else if (type === 's') value = v === undefined ? '' : (shared[Number(v)] ?? '');
    else value = v === undefined ? '' : unesc(v);
    const r = Number(ref[2]);
    maxRow = Math.max(maxRow, r);
    const row = grid.get(r) ?? new Map<number, string>();
    row.set(colIndex(ref[1]!), value);
    grid.set(r, row);
  }
  const out: string[][] = [];
  for (let r = 1; r <= maxRow; r++) {
    const row = grid.get(r);
    if (!row) {
      out.push([]);
      continue;
    }
    const width = Math.max(...row.keys()) + 1;
    out.push(Array.from({ length: width }, (_, c) => row.get(c) ?? ''));
  }
  return out;
}

/** CSV with comma or semicolon separator and quoted cells. */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, '');
  const first = src.split(/\r?\n/, 1)[0] ?? '';
  const sep = first.includes(';') && !first.includes(',') ? ';' : ',';
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]!;
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') (cell += '"', i++);
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === sep) (row.push(cell), (cell = ''));
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(cell);
      cell = '';
      rows.push(row);
      row = [];
    } else cell += ch;
  }
  if (cell !== '' || row.length > 0) (row.push(cell), rows.push(row));
  return rows;
}

// ---------- plan ----------

export interface ExistingIngredient {
  id: string;
  name: string;
  purchasePrice: number;
  packageQuantity: number;
  packageUnit: string;
}

export interface RowPlan {
  row: number;
  name: string;
  price: number;
  qty: number;
  unit: string;
  action: 'create' | 'update';
  existingId?: string;
}

export type ProblemReason = 'name_missing' | 'price_invalid' | 'qty_invalid' | 'unit_invalid' | 'duplicate_in_file';
export interface ImportProblem {
  row: number;
  name: string;
  reason: ProblemReason;
}

export interface ImportPlan {
  rows: RowPlan[];
  problems: ImportProblem[];
  /** Completely empty rows. */
  blank: number;
  /** Rows with only a name and unit: the prefilled template rows the user did not fill. */
  notFilled: number;
  /** Rows that match an existing ingredient exactly. */
  unchanged: number;
}

const key = (name: string) => name.trim().replace(/\s+/g, ' ').toLowerCase();

function number(text: string): number | null {
  const s = text.trim().replace(/^rm\s*/i, '').replace(/\s+/g, '');
  const n = parseNumber(s);
  if (n !== null) return n;
  return /^[-+]?\d*\.?\d+(e[-+]?\d+)?$/i.test(s) && Number.isFinite(Number(s)) ? Number(s) : null;
}

export function planImport(rows: string[][], ctx: { units: string[]; existing: ExistingIngredient[] }): ImportPlan {
  const units = new Map(ctx.units.map((u) => [u.trim().toLowerCase(), u.trim().toLowerCase()]));
  const existing = new Map(ctx.existing.map((e) => [key(e.name), e]));
  const plan: ImportPlan = { rows: [], problems: [], blank: 0, notFilled: 0, unchanged: 0 };
  const seen = new Set<string>();
  const startsWithHeader = /nama|name/i.test(rows[0]?.[0] ?? '') && /harga|price/i.test(rows[0]?.[1] ?? '');

  // Empty rows after the last filled one (a sheet formatted down to row 300) are not worth reporting.
  let end = rows.length;
  while (end > 0 && (rows[end - 1] ?? []).every((c) => c.trim() === '')) end--;

  rows.slice(0, end).forEach((cells, i) => {
    if (i === 0 && startsWithHeader) return;
    const [nameRaw = '', priceRaw = '', qtyRaw = '', unitRaw = ''] = cells.map((c) => c.trim());
    const row = i + 1;
    if (nameRaw === '' && priceRaw === '' && qtyRaw === '' && unitRaw === '') return void plan.blank++;
    if (nameRaw !== '' && priceRaw === '' && qtyRaw === '') return void plan.notFilled++;

    const problem = (reason: ProblemReason) => plan.problems.push({ row, name: nameRaw, reason });
    if (nameRaw === '') return problem('name_missing');
    const price = number(priceRaw);
    if (price === null || price < 0) return problem('price_invalid');
    const qty = number(qtyRaw);
    if (qty === null || qty <= 0) return problem('qty_invalid');
    const unit = units.get(unitRaw.toLowerCase());
    if (!unit) return problem('unit_invalid');
    const k = key(nameRaw);
    if (seen.has(k)) return problem('duplicate_in_file');
    seen.add(k);

    const found = existing.get(k);
    if (found) {
      if (found.purchasePrice === price && found.packageQuantity === qty && found.packageUnit.trim().toLowerCase() === unit) return void plan.unchanged++;
      plan.rows.push({ row, name: found.name, price, qty, unit, action: 'update', existingId: found.id });
    } else {
      plan.rows.push({ row, name: nameRaw.replace(/\s+/g, ' '), price, qty, unit, action: 'create' });
    }
  });
  return plan;
}
