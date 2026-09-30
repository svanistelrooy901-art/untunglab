import { describe, expect, it } from 'vitest';
import { historyChanges, purchaseDataChanged, sortHistory } from '../priceHistory';

const e = (id: string, seq: number, purchaseDate: string, purchasePrice: number, packageQuantity: number, packageUnit: string) => ({
  id,
  seq,
  purchaseDate,
  purchasePrice,
  packageQuantity,
  packageUnit,
});

describe('purchaseDataChanged (Doc 06 §4)', () => {
  const base = { purchasePrice: 60, packageQuantity: 2, packageUnit: 'kg' };
  it('detects price, package quantity and package unit changes', () => {
    expect(purchaseDataChanged(base, { ...base, purchasePrice: 62 })).toBe(true);
    expect(purchaseDataChanged(base, { ...base, packageQuantity: 1 })).toBe(true);
    expect(purchaseDataChanged(base, { ...base, packageUnit: 'g' })).toBe(true);
  });
  it('ignores identical purchase data and unit casing/whitespace', () => {
    expect(purchaseDataChanged(base, { ...base })).toBe(false);
    expect(purchaseDataChanged(base, { ...base, packageUnit: ' KG ' })).toBe(false);
  });
});

describe('sortHistory', () => {
  it('orders by date, then seq, without mutating the input', () => {
    const input = [e('c', 3, '2026-09-02', 1, 1, 'kg'), e('a', 1, '2026-09-01', 1, 1, 'kg'), e('b', 2, '2026-09-02', 1, 1, 'kg')];
    const copy = [...input];
    expect(sortHistory(input).map((r) => r.id)).toEqual(['a', 'b', 'c']);
    expect(input).toEqual(copy);
  });
});

describe('historyChanges compares normalised unit cost (Doc 03 §11, C09)', () => {
  it('first record is the baseline', () => {
    const [first] = historyChanges([e('a', 1, '2026-09-01', 60, 2, 'kg')]);
    expect(first?.kind).toBe('baseline');
  });

  it('RM60/2kg to RM60/1kg is +100% with no package price change', () => {
    const out = historyChanges([e('a', 1, '2026-09-01', 60, 2, 'kg'), e('b', 2, '2026-09-10', 60, 1, 'kg')]);
    const change = out[1];
    expect(change?.kind).toBe('change');
    if (change?.kind !== 'change') throw new Error('expected change');
    expect(change.comparison.packagePriceDelta).toBe(0);
    expect(change.comparison.percentChange).toBeCloseTo(100, 9);
    expect(change.comparison.previousPerDisplayUnit).toBeCloseTo(30, 9);
    expect(change.comparison.currentPerDisplayUnit).toBeCloseTo(60, 9);
  });

  it('a price drop keeps its negative sign', () => {
    const out = historyChanges([e('a', 1, '2026-09-01', 60, 1, 'kg'), e('b', 2, '2026-09-05', 45, 1, 'kg')]);
    const c = out[1];
    if (c?.kind !== 'change') throw new Error('expected change');
    expect(c.comparison.percentChange).toBeCloseTo(-25, 9);
    expect(c.comparison.absoluteChangePerDisplayUnit).toBeCloseTo(-15, 9);
  });

  it('kg to g package definitions compare on the same base unit', () => {
    const out = historyChanges([e('a', 1, '2026-09-01', 30, 1, 'kg'), e('b', 2, '2026-09-02', 15, 500, 'g')]);
    const c = out[1];
    if (c?.kind !== 'change') throw new Error('expected change');
    expect(c.comparison.percentChange).toBeCloseTo(0, 9);
  });

  it('flags incompatible units instead of guessing', () => {
    const out = historyChanges([e('a', 1, '2026-09-01', 30, 1, 'kg'), e('b', 2, '2026-09-02', 10, 1, 'l')]);
    expect(out[1]?.kind).toBe('incompatible_units');
  });

  it('sorts unordered input before comparing', () => {
    const out = historyChanges([e('b', 2, '2026-09-10', 60, 1, 'kg'), e('a', 1, '2026-09-01', 60, 2, 'kg')]);
    expect(out.map((o) => o.entry.id)).toEqual(['a', 'b']);
    expect(out[0]?.kind).toBe('baseline');
  });
});
