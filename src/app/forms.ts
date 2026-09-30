import { formatRM, normalisedUnitCost, perDisplayUnit, type PackMapping } from '../domain';
import { t } from '../i18n/ms';

/**
 * Accepts "15", "15.5", "15,5" and "1,000.50". A lone comma followed by exactly three digits is a thousands
 * separator; otherwise it is a decimal comma. Returns null for anything else.
 */
export function parseNumber(text: string): number | null {
  const s = text.trim();
  if (s === '') return null;
  let normalised = s;
  if (s.includes(',') && s.includes('.')) normalised = s.replace(/,/g, '');
  else if (/^-?\d{1,3}(,\d{3})+$/.test(s)) normalised = s.replace(/,/g, '');
  else if ((s.match(/,/g) ?? []).length === 1) normalised = s.replace(',', '.');
  if (!/^-?\d+(\.\d+)?$/.test(normalised) && !/^-?\.\d+$/.test(normalised)) return null;
  const n = Number(normalised);
  return Number.isFinite(n) ? n : null;
}

export type FormResult<T, K extends string> = { ok: true; value: T } | { ok: false; errors: Partial<Record<K, string>> };

function money(text: string): number | null {
  const n = parseNumber(text);
  return n !== null && n >= 0 ? n : null;
}

function positive(text: string): number | null {
  const n = parseNumber(text);
  return n !== null && n > 0 ? n : null;
}

export interface IngredientFormValue {
  name: string;
  purchasePrice: number;
  packageQuantity: number;
  packageUnit: string;
}

export function validateIngredientForm(f: { name: string; price: string; quantity: string; unit: string }): FormResult<
  IngredientFormValue,
  'name' | 'price' | 'quantity' | 'unit'
> {
  const errors: Partial<Record<'name' | 'price' | 'quantity' | 'unit', string>> = {};
  const price = money(f.price);
  const quantity = positive(f.quantity);
  if (f.name.trim() === '') errors.name = t('form.errName');
  if (price === null) errors.price = t('form.errPrice');
  if (quantity === null) errors.quantity = t('form.errQuantity');
  if (f.unit.trim() === '') errors.unit = t('form.errUnit');
  if (Object.keys(errors).length > 0 || price === null || quantity === null) return { ok: false, errors };
  return { ok: true, value: { name: f.name.trim(), purchasePrice: price, packageQuantity: quantity, packageUnit: f.unit.trim() } };
}

export interface PackagingFormValue {
  name: string;
  purchasePrice: number;
  purchaseQuantity: number;
  purchaseUnit: string;
}

export function validatePackagingForm(f: { name: string; price: string; quantity: string; unit: string }): FormResult<
  PackagingFormValue,
  'name' | 'price' | 'quantity' | 'unit'
> {
  const r = validateIngredientForm(f);
  if (!r.ok) return r;
  return {
    ok: true,
    value: { name: r.value.name, purchasePrice: r.value.purchasePrice, purchaseQuantity: r.value.packageQuantity, purchaseUnit: r.value.packageUnit },
  };
}

export function validateEquipmentForm(f: { name: string; watts: string }): FormResult<{ name: string; powerWatts: number }, 'name' | 'watts'> {
  const errors: Partial<Record<'name' | 'watts', string>> = {};
  const watts = positive(f.watts);
  if (f.name.trim() === '') errors.name = t('form.errName');
  if (watts === null) errors.watts = t('form.errWatts');
  if (Object.keys(errors).length > 0 || watts === null) return { ok: false, errors };
  return { ok: true, value: { name: f.name.trim(), powerWatts: watts } };
}

export interface MappingRow {
  pack: string;
  unit: string;
  per: string;
}

/** Blank rows are ignored; a row must be fully filled with a positive number. */
export function parseMappings(rows: MappingRow[]): FormResult<PackMapping[], 'mapping'> {
  const out: PackMapping[] = [];
  for (const r of rows) {
    if (r.pack.trim() === '' && r.unit.trim() === '' && r.per.trim() === '') continue;
    const per = positive(r.per);
    if (r.pack.trim() === '' || r.unit.trim() === '' || per === null) return { ok: false, errors: { mapping: t('form.errMapping') } };
    out.push({ pack: r.pack.trim(), unit: r.unit.trim(), unitsPerPack: per });
  }
  return { ok: true, value: out };
}

/** "RM30.00 / kg": the unit cost people read, derived by the domain, never stored. */
export function unitCostLabel(price: number, quantity: number, unit: string, mappings: PackMapping[] = []): string | null {
  try {
    const shown = perDisplayUnit(normalisedUnitCost(price, quantity, unit, mappings));
    const decimals = shown.amount > 0 && shown.amount < 0.01 ? 4 : 2;
    return `${formatRM(shown.amount, decimals)} / ${shown.unit}`;
  } catch {
    return null;
  }
}
