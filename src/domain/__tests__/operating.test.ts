import { describe, expect, it } from 'vitest';
import {
  OperatingCostError,
  allocateOperating,
  allocatedOperatingCost,
  businessPctFromArea,
  finalMonthlyAmount,
  resolveOperatingCosts,
  setMode,
  sharedOperatingTotal,
  waterMonthlyCost,
  workspaceMonthlyCost,
} from '../operating';
import type { OperatingCostEntry } from '../types';

const entry = (over: Partial<OperatingCostEntry> & Pick<OperatingCostEntry, 'category'>): OperatingCostEntry => ({
  mode: 'simple',
  simpleAmount: 0,
  active: true,
  classification: 'shared',
  ...over,
});

describe('Kos Operasi calculations (Doc 06 §2 and §5)', () => {
  it('C03: RM2,000 housing x 15% = RM300/month workspace', () => {
    expect(workspaceMonthlyCost(2000, 15)).toBeCloseTo(300, 12);
  });

  it('C04: RM50 water x 30% = RM15/month', () => {
    expect(waterMonthlyCost(50, 30)).toBeCloseTo(15, 12);
  });

  it('C07: RM600 opex / RM6,000 sales = 10% rate', () => {
    const r = allocateOperating(600, 6000);
    expect(r).toEqual({ ok: true, rate: 0.1, ratePct: 10 });
  });

  it('C08: RM25 sell x 10% rate = RM2.50 allocated', () => {
    expect(allocatedOperatingCost(25, 0.1)).toBeCloseTo(2.5, 12);
  });

  it('Ruang Kerja by floor area derives the same % as the manual percentage', () => {
    expect(businessPctFromArea(15, 100)).toBeCloseTo(15, 12);
    const manual = entry({
      category: 'ruang_kerja',
      mode: 'detailed',
      detail: { kind: 'workspace', monthlyHomeCost: 2000, businessUsePct: 15 },
    });
    const byArea = entry({
      category: 'ruang_kerja',
      mode: 'detailed',
      detail: { kind: 'workspace', monthlyHomeCost: 2000, homeArea: 100, businessArea: 15 },
    });
    expect(finalMonthlyAmount(byArea)).toBeCloseTo(finalMonthlyAmount(manual), 12);
    expect(finalMonthlyAmount(byArea)).toBeCloseTo(300, 12);
  });

  it('water detailed mode calculates bill x business-use %', () => {
    const water = entry({
      category: 'air',
      mode: 'detailed',
      detail: { kind: 'water', averageMonthlyBill: 50, businessUsePct: 30 },
    });
    expect(finalMonthlyAmount(water)).toBeCloseTo(15, 12);
  });

  it('rejects impossible percentages and areas instead of guessing', () => {
    expect(() => workspaceMonthlyCost(2000, 101)).toThrow(OperatingCostError);
    expect(() => workspaceMonthlyCost(2000, -1)).toThrow(OperatingCostError);
    expect(() => businessPctFromArea(120, 100)).toThrow(OperatingCostError);
    expect(() => businessPctFromArea(10, 0)).toThrow(OperatingCostError);
  });
});

describe('Mudah and Lebih Tepat are two ways to one value (Doc 02 §6)', () => {
  const workspace = entry({
    category: 'ruang_kerja',
    simpleAmount: 250,
    detail: { kind: 'workspace', monthlyHomeCost: 2000, businessUsePct: 15 },
  });

  it('produces exactly one final value per category, whichever mode is on', () => {
    expect(finalMonthlyAmount(workspace)).toBe(250);
    expect(finalMonthlyAmount(setMode(workspace, 'detailed'))).toBeCloseTo(300, 12);
  });

  it('switching modes changes the mode only and keeps the advanced data', () => {
    const detailed = setMode(workspace, 'detailed');
    const back = setMode(detailed, 'simple');
    expect(back).toEqual(workspace);
    expect(back.detail).toEqual(workspace.detail);
    expect(finalMonthlyAmount(back)).toBe(250);
  });

  it('switching modes does not add cost rows: the shared total counts the category once', () => {
    const rows = [workspace, entry({ category: 'gas', simpleAmount: 45 })];
    expect(sharedOperatingTotal(rows)).toBe(295);
    expect(sharedOperatingTotal([setMode(rows[0]!, 'detailed'), rows[1]!])).toBeCloseTo(345, 12);
  });

  it('refuses two rows for the same category', () => {
    expect(() => resolveOperatingCosts([workspace, { ...workspace, simpleAmount: 10 }])).toThrow(OperatingCostError);
  });

  it('refuses a detail that does not belong to the category', () => {
    const wrong = entry({
      category: 'air',
      mode: 'detailed',
      detail: { kind: 'workspace', monthlyHomeCost: 2000, businessUsePct: 15 },
    });
    expect(() => finalMonthlyAmount(wrong)).toThrow(OperatingCostError);
    expect(() => finalMonthlyAmount(entry({ category: 'gas', mode: 'detailed' }))).toThrow(OperatingCostError);
  });

  it('shared electricity in Lebih Tepat is the remaining general amount only', () => {
    const elektrik = entry({
      category: 'elektrik',
      mode: 'detailed',
      simpleAmount: 200,
      detail: { kind: 'electricity', sharedMonthlyAmount: 120 },
    });
    expect(finalMonthlyAmount(elektrik)).toBe(120);
  });
});

describe('never double-count (Doc 03 §9)', () => {
  it('a cost classified as direct production utility is excluded from shared overhead', () => {
    const rows = [
      entry({ category: 'elektrik', simpleAmount: 200, classification: 'direct' }),
      entry({ category: 'internet_telefon', simpleAmount: 100 }),
    ];
    expect(sharedOperatingTotal(rows)).toBe(100);
  });

  it('inactive costs are excluded', () => {
    expect(sharedOperatingTotal([entry({ category: 'gas', simpleAmount: 45, active: false })])).toBe(0);
  });

  it('totals the reference business: RM300 + 15 + 120 + 100 + 45 + 20 = RM600', () => {
    const rows = [
      entry({ category: 'ruang_kerja', mode: 'detailed', detail: { kind: 'workspace', monthlyHomeCost: 2000, businessUsePct: 15 } }),
      entry({ category: 'air', mode: 'detailed', detail: { kind: 'water', averageMonthlyBill: 50, businessUsePct: 30 } }),
      entry({ category: 'elektrik', simpleAmount: 120 }),
      entry({ category: 'internet_telefon', simpleAmount: 100 }),
      entry({ category: 'gas', simpleAmount: 45 }),
      entry({ category: 'kos_lain', simpleAmount: 20 }),
    ];
    expect(sharedOperatingTotal(rows)).toBeCloseTo(600, 10);
  });
});

describe('expected sales of zero or missing is incomplete, not zero overhead (Doc 03 §8)', () => {
  it.each([0, undefined, null, -1, Number.NaN, Number.POSITIVE_INFINITY])('%s', (sales) => {
    expect(allocateOperating(600, sales)).toEqual({ ok: false, reason: 'expected_sales_missing' });
  });

  it('a valid sales figure with no operating costs is a real 0% rate', () => {
    expect(allocateOperating(0, 3000)).toEqual({ ok: true, rate: 0, ratePct: 0 });
  });
});
