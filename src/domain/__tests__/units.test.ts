import { describe, expect, it } from 'vitest';
import {
  UnitError,
  convertQuantity,
  costForUsage,
  dimensionOf,
  normalisedUnitCost,
  perDisplayUnit,
} from '../units';

describe('unit conversion (Doc 03 §1)', () => {
  it('converts kg to g and back', () => {
    expect(convertQuantity(5, 'kg', 'g')).toBe(5000);
    expect(convertQuantity(250, 'g', 'kg')).toBeCloseTo(0.25, 12);
  });

  it('converts L to ml and back', () => {
    expect(convertQuantity(2, 'l', 'ml')).toBe(2000);
    expect(convertQuantity(500, 'ml', 'L')).toBeCloseTo(0.5, 12);
  });

  it('classifies dimensions', () => {
    expect(dimensionOf('kg')).toBe('mass');
    expect(dimensionOf('ML')).toBe('volume');
    expect(dimensionOf('kotak')).toBe('count');
  });

  it('never silently converts incompatible dimensions', () => {
    expect(() => convertQuantity(100, 'g', 'ml')).toThrow(UnitError);
    expect(() => convertQuantity(1, 'kotak', 'g')).toThrow(UnitError);
    expect(() => convertQuantity(1, 'kotak', 'biji')).toThrow(UnitError);
  });

  it('converts between pack and unit only through an explicit mapping', () => {
    const mappings = [{ pack: 'pek', unit: 'biji', unitsPerPack: 12 }];
    expect(convertQuantity(2, 'pek', 'biji', mappings)).toBe(24);
    expect(convertQuantity(6, 'biji', 'pek', mappings)).toBe(0.5);
  });

  it('rejects negative or non-finite quantities', () => {
    expect(() => convertQuantity(-1, 'g', 'kg')).toThrow(UnitError);
    expect(() => convertQuantity(Number.NaN, 'g', 'kg')).toThrow(UnitError);
  });
});

describe('normalised unit cost (Doc 03 §1)', () => {
  it('RM25 / 5 kg = RM5/kg = RM0.005/g', () => {
    const n = normalisedUnitCost(25, 5, 'kg');
    expect(n.baseUnit).toBe('g');
    expect(n.perBaseUnit).toBeCloseTo(0.005, 12);
    expect(perDisplayUnit(n)).toEqual({ amount: expect.closeTo(5, 10), unit: 'kg' });
  });

  it('RM60 / 20 boxes = RM3/box, and 1 box costs RM3.00', () => {
    const n = normalisedUnitCost(60, 20, 'kotak');
    expect(n.perBaseUnit).toBe(3);
    expect(costForUsage(n, 1, 'kotak')).toBe(3);
  });

  it('prices usage through a pack mapping', () => {
    const n = normalisedUnitCost(12, 1, 'pek'); // RM12 per pek
    expect(costForUsage(n, 3, 'biji', [{ pack: 'pek', unit: 'biji', unitsPerPack: 12 }])).toBeCloseTo(3, 12);
  });

  it('rejects a zero or negative package quantity', () => {
    expect(() => normalisedUnitCost(25, 0, 'kg')).toThrow(UnitError);
    expect(() => normalisedUnitCost(25, -1, 'kg')).toThrow(UnitError);
  });
});
