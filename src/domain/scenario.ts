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

/**
 * The price a percentage change would produce, rounded to the sen. Preview and Apply both use this value,
 * so what the user sees is exactly what gets stored.
 */
export function scenarioPrice(currentPrice: number, pct: number): number {
  if (!Number.isFinite(currentPrice) || currentPrice < 0) throw new RangeError('Current price must be zero or more');
  if (!Number.isFinite(pct) || pct <= -100) throw new RangeError('Scenario change must be a finite percentage above −100%');
  const raw = (currentPrice * (100 + pct)) / 100;
  return Math.round((raw + Number.EPSILON * Math.max(1, raw)) * 100) / 100;
}

/**
 * One menu costed with two versions of one ingredient, through the same `computeMenuCost` path.
 * What-If passes live vs. changed; History Review passes the exact previous vs. current record.
 */
export function compareIngredientVersions(
  menu: MenuInput,
  business: BusinessInput,
  ingredientId: string,
  before: IngredientSource,
  after: IngredientSource,
  thresholds?: StatusThresholds,
): { before: MenuCostResult; after: MenuCostResult } {
  const withVersion = (version: IngredientSource): MenuInput => ({
    ...menu,
    ingredients: menu.ingredients.map((line) => (line.ingredient?.id === ingredientId ? { ...line, ingredient: { ...version, id: ingredientId } } : line)),
  });
  return {
    before: computeMenuCost(withVersion(before), business, thresholds),
    after: computeMenuCost(withVersion(after), business, thresholds),
  };
}
