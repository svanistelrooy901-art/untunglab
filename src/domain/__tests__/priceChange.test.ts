import { describe, expect, it } from 'vitest';
import { comparePurchases } from '../priceChange';
import { UnitError } from '../units';

describe('price-history change uses normalised unit cost (Doc 03 §11)', () => {
  it('price only: RM20/1kg to RM25/1kg = +RM5/kg, +25%', () => {
    const r = comparePurchases(
      { purchasePrice: 20, packageQuantity: 1, packageUnit: 'kg' },
      { purchasePrice: 25, packageQuantity: 1, packageUnit: 'kg' },
    );
    expect(r.displayUnit).toBe('kg');
    expect(r.absoluteChangePerDisplayUnit).toBeCloseTo(5, 10);
    expect(r.percentChange).toBeCloseTo(25, 10);
  });

  it('C09: package only, RM60/2kg to RM60/1kg = normalised +100% while package price delta is 0', () => {
    const r = comparePurchases(
      { purchasePrice: 60, packageQuantity: 2, packageUnit: 'kg' },
      { purchasePrice: 60, packageQuantity: 1, packageUnit: 'kg' },
    );
    expect(r.packagePriceDelta).toBe(0);
    expect(r.previousPerDisplayUnit).toBeCloseTo(30, 10);
    expect(r.currentPerDisplayUnit).toBeCloseTo(60, 10);
    expect(r.absoluteChangePerDisplayUnit).toBeCloseTo(30, 10);
    expect(r.percentChange).toBeCloseTo(100, 10);
  });

  it('decrease keeps its sign: RM40/kg to RM30/kg = −RM10/kg, −25%', () => {
    const r = comparePurchases(
      { purchasePrice: 40, packageQuantity: 1, packageUnit: 'kg' },
      { purchasePrice: 30, packageQuantity: 1, packageUnit: 'kg' },
    );
    expect(r.absoluteChangePerDisplayUnit).toBeCloseTo(-10, 10);
    expect(r.percentChange).toBeCloseTo(-25, 10);
    expect(r.packagePriceDelta).toBe(-10);
  });

  it('compares across compatible units (500 g pack vs 1 kg pack)', () => {
    const r = comparePurchases(
      { purchasePrice: 10, packageQuantity: 500, packageUnit: 'g' }, // RM20/kg
      { purchasePrice: 25, packageQuantity: 1, packageUnit: 'kg' }, // RM25/kg
    );
    expect(r.percentChange).toBeCloseTo(25, 10);
  });

  it('percent is null when the previous unit cost is zero (baseline)', () => {
    const r = comparePurchases(
      { purchasePrice: 0, packageQuantity: 1, packageUnit: 'kg' },
      { purchasePrice: 25, packageQuantity: 1, packageUnit: 'kg' },
    );
    expect(r.percentChange).toBeNull();
  });

  it('works for counted units such as boxes', () => {
    const r = comparePurchases(
      { purchasePrice: 60, packageQuantity: 20, packageUnit: 'kotak' },
      { purchasePrice: 80, packageQuantity: 20, packageUnit: 'kotak' },
    );
    expect(r.displayUnit).toBe('kotak');
    expect(r.absoluteChangePerDisplayUnit).toBeCloseTo(1, 10);
  });

  it('refuses to compare incompatible units', () => {
    expect(() =>
      comparePurchases(
        { purchasePrice: 10, packageQuantity: 1, packageUnit: 'kg' },
        { purchasePrice: 10, packageQuantity: 1, packageUnit: 'l' },
      ),
    ).toThrow(UnitError);
  });
});
