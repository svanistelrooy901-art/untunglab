import { describe, expect, it } from 'vitest';
import {
  batchElectricityCost,
  computeMenuCost,
  energyKwh,
  ingredientCostFromSource,
  menuSummary,
  packagingUnitCost,
} from '../costing';
import { formatPct, formatRM, MINUS } from '../format';
import type { MenuCostResult, MenuInput } from '../types';
import { business, chickenSandwich, deepFreeze, nasiLemak } from './fixtures';

function complete(r: MenuCostResult) {
  if (!r.complete) throw new Error(`expected a complete result, got issues: ${JSON.stringify(r.issues)}`);
  return r;
}

const bareMenu = (over: Partial<MenuInput> = {}): MenuInput => ({
  sellingPrice: 10,
  yield: 1,
  productionMinutesPerBatch: 0,
  ingredients: [],
  packaging: [],
  equipment: [],
  ...over,
});

describe('calculation acceptance (Doc 06 §2)', () => {
  it('C01: RM25 / 5kg flour, recipe uses 250g = RM1.25', () => {
    const flour = { id: 'tepung', purchasePrice: 25, packageQuantity: 5, packageUnit: 'kg' };
    expect(ingredientCostFromSource(flour, 250, 'g')).toBeCloseTo(1.25, 12);
  });

  it('C02: RM25/hour, 60 min batch, yield 10 = RM2.50 labour per portion', () => {
    const r = complete(computeMenuCost(nasiLemak(), business()));
    expect(r.perPortion.labour).toBeCloseTo(2.5, 12);
  });

  it('C05: 2000W oven x 45min x RM0.50/kWh = RM0.75 per batch', () => {
    expect(energyKwh(2000, 45)).toBeCloseTo(1.5, 12);
    expect(batchElectricityCost([{ watts: 2000, durationMinutes: 45 }], 0.5)).toBeCloseTo(0.75, 12);
  });

  it('C06: oven 0.75 + mixer 0.0625 + induction 0.125 = RM0.9375 per batch before display rounding', () => {
    const lines = [
      { watts: 2000, durationMinutes: 45 },
      { watts: 500, durationMinutes: 15 },
      { watts: 1500, durationMinutes: 10 },
    ];
    expect(batchElectricityCost(lines, 0.5)).toBeCloseTo(0.9375, 12);

    // Doc 03 §7: at yield 20 = RM0.046875 per unit, unrounded.
    const r = complete(computeMenuCost(nasiLemak({ equipment: lines, yield: 20 }), business()));
    expect(r.perPortion.utilities).toBeCloseTo(0.046875, 12);
  });

  it('C07 and C08: RM600 opex / RM6,000 sales = 10%, and RM25 x 10% = RM2.50 allocated', () => {
    const r = complete(
      computeMenuCost(nasiLemak({ sellingPrice: 25 }), business({ sharedMonthlyOperatingCost: 600, expectedMonthlySales: 6000 })),
    );
    expect(r.operatingCostRate).toBeCloseTo(0.1, 12);
    expect(r.perPortion.sharedOperating).toBeCloseTo(2.5, 12);
  });
});

describe('full-menu regression (Doc 06 §3)', () => {
  it('M01: Nasi Lemak cost 12.44, profit −0.44, margin −3.7%, Menu Ini Rugi', () => {
    const r = complete(computeMenuCost(nasiLemak(), business()));
    expect(r.perPortion.ingredients).toBeCloseTo(6.84, 10);
    expect(r.perPortion.packaging).toBeCloseTo(0.7, 10);
    expect(r.perPortion.labour).toBeCloseTo(2.5, 10);
    expect(r.perPortion.sharedOperating).toBeCloseTo(2.4, 10);
    expect(r.fullCost).toBeCloseTo(12.44, 10);
    expect(r.profit).toBeCloseTo(-0.44, 10);
    expect(r.status).toBe('loss');
    expect(formatRM(r.fullCost)).toBe('RM12.44');
    expect(formatRM(r.profit)).toBe(`${MINUS}RM0.44`);
    expect(formatPct(r.marginPct)).toBe(`${MINUS}3.7%`);
  });

  it('M02: Chicken Sandwich cost 10.20, profit 4.80, margin 32%, Margin Rendah', () => {
    const r = complete(computeMenuCost(chickenSandwich(), business()));
    expect(r.perPortion.ingredients).toBeCloseTo(4, 10);
    expect(r.perPortion.sharedOperating).toBeCloseTo(3, 10);
    expect(r.fullCost).toBeCloseTo(10.2, 10);
    expect(r.profit).toBeCloseTo(4.8, 10);
    expect(r.marginPct).toBeCloseTo(32, 8);
    expect(r.status).toBe('low');
    expect(formatPct(r.marginPct)).toBe('32.0%');
  });

  it('M03: a stale cached cost on the recipe row never beats the live ingredient source', () => {
    const line = {
      ref: 'tepung',
      // Source price has since risen to RM30 / 5kg, so 250g now costs RM1.50.
      ingredient: { id: 'tepung', purchasePrice: 30, packageQuantity: 5, packageUnit: 'kg' },
      quantity: 250,
      unit: 'g',
      cachedCost: 1.25,
    };
    const r = complete(computeMenuCost(bareMenu({ ingredients: [line] }), business()));
    expect(r.batch.ingredients).toBeCloseTo(1.5, 12);
    expect(r.warnings).toEqual([]);
  });

  it('M03: the cached cost is used only as an orphan fallback, and flagged', () => {
    const orphan = { ref: 'tepung', ingredient: null, quantity: 250, unit: 'g', cachedCost: 1.25 };
    const r = complete(computeMenuCost(bareMenu({ ingredients: [orphan] }), business()));
    expect(r.batch.ingredients).toBeCloseTo(1.25, 12);
    expect(r.warnings).toEqual([{ code: 'orphan_cost_fallback', ref: 'tepung' }]);
  });

  it('M03: an orphan line with no cached cost makes the result incomplete instead of costing zero', () => {
    const orphan = { ref: 'tepung', ingredient: null, quantity: 250, unit: 'g' };
    const r = computeMenuCost(bareMenu({ ingredients: [orphan] }), business());
    expect(r.complete).toBe(false);
    expect(r.issues).toEqual([{ code: 'ingredient_missing', ref: 'tepung' }]);
  });

  it('M04: dashboard rows and menu detail come from the same result', () => {
    const menus = [nasiLemak(), chickenSandwich()];
    const detail = menus.map((m) => computeMenuCost(m, business()));
    const dashboard = menus.map((m) => menuSummary(computeMenuCost(m, business())));
    detail.forEach((d, i) => {
      const c = complete(d);
      expect(dashboard[i]).toEqual({
        fullCost: c.fullCost,
        profit: c.profit,
        marginPct: c.marginPct,
        status: c.status,
      });
    });
  });
});

describe('packaging semantics (Doc 03 §3)', () => {
  it('unit cost = purchase price / usable units: RM60 / 20 boxes = RM3', () => {
    expect(packagingUnitCost(60, 20)).toBe(3);
  });

  it('one RM3 box per sold unit contributes RM3 per portion, not divided by yield again', () => {
    const menu = bareMenu({
      yield: 10,
      packaging: [{ packaging: { id: 'kotak', purchasePrice: 60, purchaseQuantity: 20 }, quantityUsed: 1, semantics: 'per_portion' }],
    });
    expect(complete(computeMenuCost(menu, business())).perPortion.packaging).toBeCloseTo(3, 12);
  });

  it('batch-level packaging must declare batch semantics and is then divided by yield', () => {
    const menu = bareMenu({
      yield: 10,
      packaging: [{ packaging: { id: 'kotak', purchasePrice: 60, purchaseQuantity: 20 }, quantityUsed: 1, semantics: 'per_batch' }],
    });
    expect(complete(computeMenuCost(menu, business())).perPortion.packaging).toBeCloseTo(0.3, 12);
  });
});

describe('full cost formula (Doc 03 §10)', () => {
  it('adds the optional direct other/wastage cost and reports food cost %', () => {
    const base = complete(computeMenuCost(nasiLemak(), business()));
    const withOther = complete(computeMenuCost(nasiLemak({ otherCostPerPortion: 0.5 }), business()));
    expect(withOther.fullCost).toBeCloseTo(base.fullCost + 0.5, 12);
    expect(base.foodCostPct).toBeCloseTo((6.84 / 12) * 100, 8);
  });
});

describe('incomplete states never divide by zero or assume zero overhead (Doc 03 §8)', () => {
  const noNaN = (r: MenuCostResult) => {
    const walk = (v: unknown): void => {
      if (typeof v === 'number') expect(Number.isFinite(v)).toBe(true);
      else if (v && typeof v === 'object') Object.values(v).forEach(walk);
    };
    walk(r);
  };

  it.each([
    ['zero', 0],
    ['missing', undefined],
    ['null', null],
    ['negative', -100],
    ['not a number', Number.NaN],
  ])('expected monthly sales %s is an actionable incomplete state', (_label, sales) => {
    const r = computeMenuCost(nasiLemak(), business({ expectedMonthlySales: sales }));
    expect(r.complete).toBe(false);
    expect(r.issues).toContainEqual({ code: 'expected_sales_missing' });
    expect(r.perPortion.sharedOperating).toBeUndefined();
    expect('fullCost' in r).toBe(false);
    noNaN(r);
  });

  it('still reports the components that can be calculated', () => {
    const r = computeMenuCost(nasiLemak(), business({ expectedMonthlySales: 0 }));
    expect(r.perPortion.ingredients).toBeCloseTo(6.84, 10);
    expect(r.perPortion.labour).toBeCloseTo(2.5, 10);
  });

  it('a yield of zero is reported, not divided by', () => {
    const r = computeMenuCost(nasiLemak({ yield: 0 }), business());
    expect(r.complete).toBe(false);
    expect(r.issues).toContainEqual({ code: 'yield_invalid' });
    noNaN(r);
  });

  it('a selling price of zero is reported, not divided by', () => {
    const r = computeMenuCost(nasiLemak({ sellingPrice: 0 }), business());
    expect(r.complete).toBe(false);
    expect(r.issues).toContainEqual({ code: 'selling_price_invalid' });
    noNaN(r);
  });

  it('incompatible units on a recipe line are reported with the ingredient reference', () => {
    const bad = {
      ref: 'susu',
      ingredient: { id: 'susu', purchasePrice: 8, packageQuantity: 1, packageUnit: 'l' },
      quantity: 200,
      unit: 'g',
    };
    const r = computeMenuCost(bareMenu({ ingredients: [bad] }), business());
    expect(r.complete).toBe(false);
    expect(r.issues).toContainEqual({ code: 'incompatible_units', ref: 'susu' });
  });
});

describe('determinism and purity', () => {
  it('gives identical results for identical input and does not mutate its input', () => {
    const menu = deepFreeze(nasiLemak());
    const biz = deepFreeze(business());
    expect(computeMenuCost(menu, biz)).toEqual(computeMenuCost(menu, biz));
  });
});

describe('missing setup values are named, never guessed (Phase 6, D-30, D-32)', () => {
  const codes = (r: MenuCostResult) => r.issues.map((i) => i.code);

  it('Nilai Masa not entered + production time > 0 is incomplete', () => {
    const r = computeMenuCost(bareMenu({ productionMinutesPerBatch: 30 }), business({ valueOfTimePerHour: null }));
    expect(r.complete).toBe(false);
    expect(codes(r)).toContain('nilai_masa_missing');
  });

  it('Nilai Masa not entered but no production time costs no labour and stays complete', () => {
    const r = complete(computeMenuCost(bareMenu({ productionMinutesPerBatch: 0 }), business({ valueOfTimePerHour: null })));
    expect(r.perPortion.labour).toBe(0);
  });

  it('a Nilai Masa of RM0 is a real value: complete with zero labour', () => {
    const r = complete(computeMenuCost(bareMenu({ productionMinutesPerBatch: 60 }), business({ valueOfTimePerHour: 0 })));
    expect(r.perPortion.labour).toBe(0);
  });

  it('tariff not set + equipment in use is incomplete', () => {
    const r = computeMenuCost(
      bareMenu({ equipment: [{ watts: 2000, durationMinutes: 45 }] }),
      business({ electricityTariffPerKwh: null }),
    );
    expect(r.complete).toBe(false);
    expect(codes(r)).toContain('electricity_tariff_missing');
  });

  it('tariff not set but no equipment is fine', () => {
    complete(computeMenuCost(bareMenu(), business({ electricityTariffPerKwh: null })));
  });

  it('equipment with zero duration needs no tariff', () => {
    complete(computeMenuCost(bareMenu({ equipment: [{ watts: 2000, durationMinutes: 0 }] }), business({ electricityTariffPerKwh: null })));
  });

  it('C05 still holds with a real tariff', () => {
    const r = complete(computeMenuCost(bareMenu({ equipment: [{ watts: 2000, durationMinutes: 45 }] }), business({ electricityTariffPerKwh: 0.5 })));
    expect(r.batch.utilities).toBeCloseTo(0.75, 12);
  });

  it('a packaging line whose item no longer exists is named, not skipped', () => {
    const r = computeMenuCost(bareMenu({ packaging: [{ packaging: null, ref: 'kotak-x', quantityUsed: 1, semantics: 'per_portion' }] }), business());
    expect(r.complete).toBe(false);
    expect(r.issues).toContainEqual({ code: 'packaging_missing', ref: 'kotak-x' });
  });

  it('an equipment line whose appliance no longer exists is named, not skipped', () => {
    const r = computeMenuCost(bareMenu({ equipment: [{ watts: null, ref: 'oven-x', durationMinutes: 30 }] }), business());
    expect(r.complete).toBe(false);
    expect(r.issues).toContainEqual({ code: 'equipment_missing', ref: 'oven-x' });
  });

  it('reports every missing thing at once', () => {
    const r = computeMenuCost(
      bareMenu({ productionMinutesPerBatch: 30, equipment: [{ watts: 500, durationMinutes: 10 }] }),
      business({ valueOfTimePerHour: null, electricityTariffPerKwh: null, expectedMonthlySales: null }),
    );
    expect(codes(r).sort()).toEqual(['electricity_tariff_missing', 'expected_sales_missing', 'nilai_masa_missing']);
  });
});

describe('mandatory Kos Operasi categories (D-70)', () => {
  it('missing categories make the menu incomplete with one named issue, and no allocation is invented', () => {
    const r = computeMenuCost(bareMenu(), business({ missingOperatingCategories: ['air', 'gas'] }));
    expect(r.complete).toBe(false);
    expect(r.issues).toEqual([{ code: 'operating_costs_missing', ref: 'air,gas' }]);
  });
  it('an empty list changes nothing', () => {
    expect(computeMenuCost(bareMenu(), business({ missingOperatingCategories: [] })).complete).toBe(true);
  });
  it('missing categories and missing sales are both named, each once', () => {
    const r = computeMenuCost(bareMenu(), business({ missingOperatingCategories: ['air'], expectedMonthlySales: null }));
    expect(r.issues.map((i) => i.code).sort()).toEqual(['expected_sales_missing', 'operating_costs_missing']);
  });
});
