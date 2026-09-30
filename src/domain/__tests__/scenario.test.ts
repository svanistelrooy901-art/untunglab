import { describe, expect, it } from 'vitest';
import { computeMenuCost } from '../costing';
import { QUICK_SCENARIO_PCTS, compareScenario, scenarioIngredient } from '../scenario';
import type { MenuCostResult } from '../types';
import { business, chickenSandwich, deepFreeze, nasiLemak } from './fixtures';

function complete(r: MenuCostResult) {
  if (!r.complete) throw new Error('expected complete');
  return r;
}

describe('scenario calculation (Doc 03 §12, Doc 06 §6)', () => {
  it('offers the quick chips +5, +10, +20 and +30%', () => {
    expect([...QUICK_SCENARIO_PCTS]).toEqual([5, 10, 20, 30]);
  });

  it('chips calculate without touching live data (inputs are frozen and unchanged)', () => {
    const menu = deepFreeze(chickenSandwich());
    const biz = deepFreeze(business());
    for (const pct of QUICK_SCENARIO_PCTS) {
      expect(() => compareScenario(menu, biz, 'ayam', pct)).not.toThrow();
    }
    expect(menu.ingredients[0]!.ingredient!.purchasePrice).toBe(15);
  });

  it('chicken +10%: sandwich ingredients 4.00 to 4.12, profit 4.80 to 4.68, margin 31.2%', () => {
    const { current, scenario } = compareScenario(chickenSandwich(), business(), 'ayam', 10);
    const c = complete(current);
    const s = complete(scenario);
    expect(c.perPortion.ingredients).toBeCloseTo(4.0, 10);
    expect(s.perPortion.ingredients).toBeCloseTo(4.12, 10);
    expect(s.profit).toBeCloseTo(4.68, 10);
    expect(s.marginPct).toBeCloseTo(31.2, 8);
    expect(s.status).toBe('low');
  });

  it.each([
    [5, 0.06],
    [10, 0.12],
    [20, 0.24],
    [30, 0.36],
  ])('chicken +%i%% raises the sandwich cost per portion by RM%f', (pct, delta) => {
    const { current, scenario } = compareScenario(chickenSandwich(), business(), 'ayam', pct);
    expect(complete(scenario).fullCost - complete(current).fullCost).toBeCloseTo(delta, 10);
  });

  it('Nasi Lemak is already a loss and gets worse: −RM0.44 to −RM0.62 at +10%', () => {
    const { scenario } = compareScenario(nasiLemak(), business(), 'ayam', 10);
    const s = complete(scenario);
    expect(s.profit).toBeCloseTo(-0.62, 10);
    expect(s.status).toBe('loss');
  });

  it('shared operating cost does not move, because it follows the selling price', () => {
    const { current, scenario } = compareScenario(chickenSandwich(), business(), 'ayam', 30);
    expect(complete(scenario).perPortion.sharedOperating).toBeCloseTo(complete(current).perPortion.sharedOperating, 12);
  });

  it('current and scenario use the same engine: a 0% scenario equals the current result', () => {
    const { current, scenario } = compareScenario(chickenSandwich(), business(), 'ayam', 0);
    expect(scenario).toEqual(current);
    expect(current).toEqual(computeMenuCost(chickenSandwich(), business()));
  });

  it('a scenario equals running the engine on an ingredient with the scaled price', () => {
    const menu = chickenSandwich();
    const scaled = {
      ...menu,
      ingredients: menu.ingredients.map((l) =>
        l.ingredient?.id === 'ayam' ? { ...l, ingredient: scenarioIngredient(l.ingredient, 20) } : l,
      ),
    };
    expect(compareScenario(menu, business(), 'ayam', 20).scenario).toEqual(computeMenuCost(scaled, business()));
  });

  it('an ingredient the menu does not use changes nothing', () => {
    const { current, scenario } = compareScenario(chickenSandwich(), business(), 'tidak-ada', 30);
    expect(scenario).toEqual(current);
  });

  it('scales the purchase price and leaves package data alone', () => {
    const src = { id: 'ayam', purchasePrice: 15, packageQuantity: 1, packageUnit: 'kg' };
    expect(scenarioIngredient(src, 10)).toEqual({ ...src, purchasePrice: 16.5 });
  });

  it('rejects a scenario that would make the price zero or negative', () => {
    const src = { id: 'ayam', purchasePrice: 15, packageQuantity: 1, packageUnit: 'kg' };
    expect(() => scenarioIngredient(src, -100)).toThrow();
    expect(() => scenarioIngredient(src, Number.NaN)).toThrow();
  });
});

describe('scenarioPrice and compareIngredientVersions (Phase 8)', () => {
  it('scenario price is rounded to the sen, so Apply stores exactly what the preview showed', async () => {
    const { scenarioPrice } = await import('../scenario');
    expect(scenarioPrice(15, 20)).toBe(18);
    expect(scenarioPrice(13.33, 10)).toBe(14.66); // 14.663
    expect(scenarioPrice(13.33, 7)).toBe(14.26); // 14.2631
    expect(scenarioPrice(40, -25)).toBe(30); // Doc 03 §11 decrease example
    expect(() => scenarioPrice(15, -100)).toThrow(RangeError);
  });

  it('comparing two versions of an ingredient matches the percentage scenario and mutates nothing', async () => {
    const { compareIngredientVersions } = await import('../scenario');
    const menu = deepFreeze(chickenSandwich());
    const biz = deepFreeze(business());
    const src = menu.ingredients[0]!.ingredient!;
    const viaVersions = compareIngredientVersions(menu, biz, src.id, src, { ...src, purchasePrice: src.purchasePrice * 1.1 });
    const viaPct = compareScenario(menu, biz, src.id, 10);
    expect(complete(viaVersions.after).profit).toBeCloseTo(complete(viaPct.scenario).profit, 10);
    expect(complete(viaVersions.before).profit).toBeCloseTo(4.8, 10);
  });

  it('a package-size-only change moves the menu cost', async () => {
    const { compareIngredientVersions } = await import('../scenario');
    const menu = chickenSandwich();
    const src = menu.ingredients[0]!.ingredient!;
    const { before, after } = compareIngredientVersions(menu, business(), src.id, src, { ...src, packageQuantity: src.packageQuantity / 2 });
    expect(complete(after).fullCost).toBeGreaterThan(complete(before).fullCost);
  });
});
