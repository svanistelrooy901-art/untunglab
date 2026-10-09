import { describe, expect, it } from 'vitest';
import { appliancesCounted, finalMonthlyAmount, guidedMonthlyCost, otherItemsTotal, sharedOperatingTotal, OperatingCostError } from '../operating';
import type { OperatingCostEntry } from '../types';

const entry = (over: Partial<OperatingCostEntry>): OperatingCostEntry => ({ category: 'air', mode: 'simple', simpleAmount: 0, active: true, classification: 'shared', ...over });

describe('guided amount (bill × % the business uses)', () => {
  it('RM120 bill × 10% = RM12', () => {
    expect(guidedMonthlyCost(120, 10)).toBeCloseTo(12, 10);
  });
  it('refuses a negative bill or a percentage outside 0 to 100', () => {
    expect(() => guidedMonthlyCost(-1, 10)).toThrow(OperatingCostError);
    expect(() => guidedMonthlyCost(100, 101)).toThrow(OperatingCostError);
    expect(() => guidedMonthlyCost(100, -1)).toThrow(OperatingCostError);
    expect(() => guidedMonthlyCost(Number.NaN, 10)).toThrow(OperatingCostError);
  });
  it('a Mudah row with guided inputs uses them, not the stored simple amount', () => {
    const e = entry({ simpleAmount: 999, guided: { monthlyBill: 80, businessUsePct: 15 } });
    expect(finalMonthlyAmount(e)).toBeCloseTo(12, 10);
  });
  it('a Mudah row without guided inputs keeps the old direct amount (existing data is unchanged)', () => {
    expect(finalMonthlyAmount(entry({ simpleAmount: 45 }))).toBe(45);
  });
  it('an inactive row is zero even with guided inputs', () => {
    expect(finalMonthlyAmount(entry({ active: false, guided: { monthlyBill: 80, businessUsePct: 15 } }))).toBe(0);
  });
  it('a broken guided row is an error, never silently zero', () => {
    expect(() => finalMonthlyAmount(entry({ guided: { monthlyBill: 80, businessUsePct: 150 } }))).toThrow(OperatingCostError);
  });
  it('flows into the shared total', () => {
    const rows = [entry({ category: 'air', guided: { monthlyBill: 100, businessUsePct: 5 } }), entry({ category: 'gas', simpleAmount: 20 })];
    expect(sharedOperatingTotal(rows)).toBeCloseTo(25, 10);
  });
});

describe('Kos Lain as a list of named costs', () => {
  it('adds up the items', () => {
    expect(otherItemsTotal([{ id: 'a', name: 'Penghantaran', monthlyAmount: 150 }, { id: 'b', name: 'Iklan', monthlyAmount: 50.5 }])).toBeCloseTo(200.5, 10);
  });
  it('no items is RM0', () => {
    expect(otherItemsTotal([])).toBe(0);
  });
  it('rejects a negative amount or a blank name', () => {
    expect(() => otherItemsTotal([{ id: 'a', name: 'Iklan', monthlyAmount: -1 }])).toThrow(OperatingCostError);
    expect(() => otherItemsTotal([{ id: 'a', name: '  ', monthlyAmount: 5 }])).toThrow(OperatingCostError);
  });
  it('the row amount is the item total when items exist', () => {
    const e = entry({ category: 'kos_lain', simpleAmount: 999, items: [{ id: 'a', name: 'Penghantaran', monthlyAmount: 150 }, { id: 'b', name: 'Iklan', monthlyAmount: 50 }] });
    expect(finalMonthlyAmount(e)).toBe(200);
  });
  it('an empty item list is an explicit RM0, not the old amount', () => {
    expect(finalMonthlyAmount(entry({ category: 'kos_lain', simpleAmount: 999, items: [] }))).toBe(0);
  });
});

describe('equipment electricity is counted once (D-84)', () => {
  it('counts when Elektrik is guided (the share is general electricity only)', () => {
    expect(appliancesCounted([entry({ category: 'elektrik', guided: { monthlyBill: 200, businessUsePct: 5 } })])).toBe(true);
  });
  it('still counts in Lebih Tepat', () => {
    expect(appliancesCounted([entry({ category: 'elektrik', mode: 'detailed', detail: { kind: 'electricity', sharedMonthlyAmount: 30 } })])).toBe(true);
  });
  it('an old Mudah direct amount (whole bill) does not count equipment, as before (D-71)', () => {
    expect(appliancesCounted([entry({ category: 'elektrik', simpleAmount: 100 })])).toBe(false);
  });
  it('an inactive or missing Elektrik row does not count', () => {
    expect(appliancesCounted([entry({ category: 'elektrik', active: false, guided: { monthlyBill: 200, businessUsePct: 5 } })])).toBe(false);
    expect(appliancesCounted([])).toBe(false);
  });
});
