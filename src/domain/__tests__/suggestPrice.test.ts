import { describe, expect, it } from 'vitest';
import { computeMenuCost } from '../costing';
import { suggestPrice, SUGGEST_MARGIN_CHIPS } from '../suggestPrice';
import { business, nasiLemak } from './fixtures';

const biz = (over = {}) => business({ sharedMonthlyOperatingCost: 500, expectedMonthlySales: 4000, ...over }); // r = 12.5%

describe('suggestPrice (D-76)', () => {
  it('round-trips: the suggested price yields exactly the target margin through the one engine', () => {
    for (const m of [10, 20, 30, 40, 50]) {
      const s = suggestPrice(nasiLemak(), biz(), m);
      if (!s.ok) throw new Error('expected ok');
      const r = computeMenuCost(nasiLemak({ sellingPrice: s.price }), biz());
      if (!r.complete) throw new Error('incomplete');
      expect(r.marginPct).toBeCloseTo(m, 9);
    }
  });

  it('closed form: P = base / (1 - r - m)', () => {
    const s = suggestPrice(nasiLemak(), biz(), 30);
    if (!s.ok) throw new Error('expected ok');
    expect(s.price).toBeCloseTo(s.baseCostPerPortion / (1 - 0.125 - 0.3), 9);
    expect(s.operatingRate).toBeCloseTo(0.125, 12);
  });

  it('does not depend on the menu\'s current selling price', () => {
    const a = suggestPrice(nasiLemak({ sellingPrice: 1 }), biz(), 30);
    const b = suggestPrice(nasiLemak({ sellingPrice: 99 }), biz(), 30);
    expect(a).toEqual(b);
  });

  it('infeasible when operating rate + margin >= 100%', () => {
    const s = suggestPrice(nasiLemak(), biz({ sharedMonthlyOperatingCost: 3000 }), 30); // r = 75%
    expect(s).toEqual({ ok: false, reason: 'infeasible' });
  });

  it('incomplete inputs return the engine issues, never a guess', () => {
    const s = suggestPrice(nasiLemak(), biz({ expectedMonthlySales: null }), 30);
    expect(s.ok).toBe(false);
    if (!s.ok && s.reason === 'incomplete') expect(s.issues.length).toBeGreaterThan(0);
    else throw new Error('expected incomplete');
  });

  it('rejects an invalid target margin', () => {
    for (const m of [Number.NaN, -1, 100, 150]) expect(suggestPrice(nasiLemak(), biz(), m)).toEqual({ ok: false, reason: 'invalid_target' });
  });

  it('chips are 20-50 in steps of 10', () => {
    expect(SUGGEST_MARGIN_CHIPS).toEqual([20, 30, 40, 50]);
  });
});
