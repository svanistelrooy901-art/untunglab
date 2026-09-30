import { describe, expect, it } from 'vitest';
import {
  parseMappings,
  parseNumber,
  unitCostLabel,
  validateEquipmentForm,
  validateIngredientForm,
  validatePackagingForm,
} from '../forms';

describe('parseNumber', () => {
  it.each([
    ['15', 15],
    [' 15.5 ', 15.5],
    ['15,5', 15.5],
    ['1,000', 1000],
    ['1,000.50', 1000.5],
    ['0', 0],
  ])('%s -> %s', (text, expected) => expect(parseNumber(text)).toBe(expected));

  it.each(['', '  ', 'abc', '1.2.3', 'RM5', '1e400', '-'])('rejects %j', (text) => expect(parseNumber(text)).toBeNull());

  it('keeps a negative sign so validators can reject it', () => {
    expect(parseNumber('-3')).toBe(-3);
  });
});

describe('validateIngredientForm', () => {
  const ok = { name: 'Ayam', price: '60', quantity: '2', unit: 'kg' };
  it('accepts valid input and returns numbers', () => {
    expect(validateIngredientForm(ok)).toEqual({ ok: true, value: { name: 'Ayam', purchasePrice: 60, packageQuantity: 2, packageUnit: 'kg' } });
  });
  it('accepts a zero price (free ingredient) but not a zero quantity', () => {
    expect(validateIngredientForm({ ...ok, price: '0' }).ok).toBe(true);
    const r = validateIngredientForm({ ...ok, quantity: '0' });
    expect(r.ok).toBe(false);
  });
  it('reports every wrong field in Bahasa Melayu, naming the field', () => {
    const r = validateIngredientForm({ name: ' ', price: '-1', quantity: 'abc', unit: '' });
    if (r.ok) throw new Error('expected errors');
    expect(Object.keys(r.errors).sort()).toEqual(['name', 'price', 'quantity', 'unit']);
    expect(r.errors.name).toMatch(/nama/i);
    expect(r.errors.price).toMatch(/harga/i);
  });
});

describe('validatePackagingForm', () => {
  it('needs name, price >= 0, quantity > 0, unit', () => {
    expect(validatePackagingForm({ name: 'Kotak', price: '20', quantity: '50', unit: 'pcs' }).ok).toBe(true);
    const r = validatePackagingForm({ name: '', price: '', quantity: '0', unit: '' });
    if (r.ok) throw new Error('expected errors');
    expect(Object.keys(r.errors).sort()).toEqual(['name', 'price', 'quantity', 'unit']);
  });
});

describe('validateEquipmentForm', () => {
  it('needs a name and a wattage above zero', () => {
    expect(validateEquipmentForm({ name: 'Oven', watts: '2000' })).toEqual({ ok: true, value: { name: 'Oven', powerWatts: 2000 } });
    const r = validateEquipmentForm({ name: '', watts: '0' });
    if (r.ok) throw new Error('expected errors');
    expect(Object.keys(r.errors).sort()).toEqual(['name', 'watts']);
  });
});

describe('parseMappings', () => {
  it('parses "1 pek = 12 biji" lines', () => {
    expect(parseMappings([{ pack: 'pek', unit: 'biji', per: '12' }])).toEqual({ ok: true, value: [{ pack: 'pek', unit: 'biji', unitsPerPack: 12 }] });
  });
  it('skips fully blank rows and rejects half-filled or non-positive rows', () => {
    expect(parseMappings([{ pack: '', unit: '', per: '' }])).toEqual({ ok: true, value: [] });
    expect(parseMappings([{ pack: 'pek', unit: '', per: '12' }]).ok).toBe(false);
    expect(parseMappings([{ pack: 'pek', unit: 'biji', per: '0' }]).ok).toBe(false);
  });
});

describe('unitCostLabel', () => {
  it('shows per kg for weight packages', () => {
    expect(unitCostLabel(60, 2, 'kg')).toBe('RM30.00 / kg');
    expect(unitCostLabel(15, 500, 'g')).toBe('RM30.00 / kg');
  });
  it('shows per litre for volume and per counted unit otherwise', () => {
    expect(unitCostLabel(10, 2, 'l')).toBe('RM5.00 / l');
    expect(unitCostLabel(12, 30, 'biji')).toBe('RM0.40 / biji');
  });
  it('shows small unit costs with enough digits', () => {
    expect(unitCostLabel(2, 100, 'pcs')).toBe('RM0.02 / pcs');
    expect(unitCostLabel(1, 300, 'pcs')).toBe('RM0.0033 / pcs');
  });
  it('returns null when the data cannot be costed', () => {
    expect(unitCostLabel(10, 0, 'kg')).toBeNull();
  });
});
