import { computeMenuCost } from './costing';
import type { BusinessInput, IngredientSource, MenuCostResult, MenuInput, StatusThresholds } from './types';

/** Quick scenario chips (Doc 02 §12). "Custom" is any other finite percentage. */
export const QUICK_SCENARIO_PCTS = [5, 10, 20, 30] as const;

/**
 * A scenario substitutes only the changed value (Doc 03 §12): the purchase price scaled by `pct`.
 * Package data is untouched, and the input is never mutated.
 */
export function scenarioIngredient(source: IngredientSource, pct: number): IngredientSource {
  if (!Number.isFinite(pct) || pct <= -100) {
    throw new RangeError('Scenario change must be a finite percentage above −100%');
  }
  return { ...source, purchasePrice: (source.purchasePrice * (100 + pct)) / 100 };
}

/**
 * Current and scenario go through the same `computeMenuCost` path. Nothing is written anywhere:
 * live data only changes when the caller applies the change explicitly.
 */
export function compareScenario(
  menu: MenuInput,
  business: BusinessInput,
  ingredientId: string,
  pct: number,
  thresholds?: StatusThresholds,
): { current: MenuCostResult; scenario: MenuCostResult } {
  const scenarioMenu: MenuInput = {
    ...menu,
    ingredients: menu.ingredients.map((line) =>
      line.ingredient?.id === ingredientId ? { ...line, ingredient: scenarioIngredient(line.ingredient, pct) } : line,
    ),
  };
  return {
    current: computeMenuCost(menu, business, thresholds),
    scenario: computeMenuCost(scenarioMenu, business, thresholds),
  };
}
