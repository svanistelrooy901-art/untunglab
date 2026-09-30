import {
  UnitError,
  compareIngredientVersions,
  comparePurchases,
  normalisedUnitCost,
  perDisplayUnit,
  scenarioPrice,
  sortHistory,
  type IngredientSource,
  type MenuCostResult,
} from '../domain';
import type { CostingData, Ingredient, PriceHistoryRecord } from '../db';
import { businessInputFrom, menuInputFrom } from './menuAssembly';
import { parseNumber } from './forms';

export type ScenarioChange = { kind: 'pct'; pct: number } | { kind: 'price'; price: number };

export function parseScenarioInput(text: string, kind: 'pct' | 'price'): { ok: true; change: ScenarioChange } | { ok: false } {
  const n = parseNumber(text);
  if (n === null) return { ok: false };
  if (kind === 'pct') return n > -100 ? { ok: true, change: { kind: 'pct', pct: n } } : { ok: false };
  return n >= 0 ? { ok: true, change: { kind: 'price', price: n } } : { ok: false };
}

export interface MenuImpact {
  menuId: string;
  name: string;
  before: MenuCostResult;
  after: MenuCostResult;
  /** Both states are complete and their status differs. */
  statusChanged: boolean;
}

export interface UnitCost {
  amount: number;
  unit: string;
}

export interface ScenarioView {
  ingredient: Ingredient;
  beforePrice: number;
  afterPrice: number;
  beforeUnit: UnitCost;
  afterUnit: UnitCost;
  /** Change in normalised unit cost. Null when it cannot be compared. */
  unitPct: number | null;
  changed: boolean;
  menus: MenuImpact[];
  statusChangeCount: number;
}

const sourceOf = (i: Ingredient): IngredientSource => ({
  id: i.id,
  purchasePrice: i.purchasePrice,
  packageQuantity: i.packageQuantity,
  packageUnit: i.packageUnit,
  packMappings: i.packMappings,
});

const unitOf = (s: IngredientSource): UnitCost =>
  perDisplayUnit(normalisedUnitCost(s.purchasePrice, s.packageQuantity, s.packageUnit, s.packMappings));

function impact(data: CostingData, ingredient: Ingredient, before: IngredientSource, after: IngredientSource, changed: boolean): ScenarioView {
  const business = businessInputFrom(data);
  const menus: MenuImpact[] = data.menus
    .filter((m) => m.active && m.ingredients.some((l) => l.ingredientId === ingredient.id))
    .map((m) => {
      const r = compareIngredientVersions(menuInputFrom(m, data), business, ingredient.id, before, after);
      return {
        menuId: m.menuId,
        name: m.name,
        before: r.before,
        after: r.after,
        statusChanged: r.before.complete && r.after.complete && r.before.status !== r.after.status,
      };
    });
  let unitPct: number | null = null;
  try {
    unitPct = comparePurchases(before, after).percentChange;
  } catch (e) {
    if (!(e instanceof UnitError)) throw e;
  }
  return {
    ingredient,
    beforePrice: before.purchasePrice,
    afterPrice: after.purchasePrice,
    beforeUnit: unitOf(before),
    afterUnit: unitOf(after),
    unitPct,
    changed,
    menus,
    statusChangeCount: menus.filter((m) => m.statusChanged).length,
  };
}

/** Normal What-If: the live ingredient with only its price replaced. Reads only; nothing is written. */
export function whatIf(data: CostingData, ingredientId: string, change: ScenarioChange): ScenarioView | null {
  const ingredient = data.ingredients.find((i) => i.id === ingredientId);
  if (!ingredient) return null;
  const before = sourceOf(ingredient);
  const price = change.kind === 'pct' ? scenarioPrice(ingredient.purchasePrice, change.pct) : scenarioPrice(change.price, 0);
  return impact(data, ingredient, before, { ...before, purchasePrice: price }, price !== before.purchasePrice);
}

/**
 * History Review: the exact transition from the record before `recordId` to that record, applied to today's
 * menus. Null for a baseline record (nothing before it) or an unknown record.
 */
export function historyReview(
  data: CostingData,
  history: readonly PriceHistoryRecord[],
  ingredientId: string,
  recordId: string,
): ScenarioView | null {
  const ingredient = data.ingredients.find((i) => i.id === ingredientId);
  if (!ingredient) return null;
  const ordered = sortHistory(history.filter((r) => r.ingredientId === ingredientId));
  const index = ordered.findIndex((r) => r.id === recordId);
  const current = ordered[index];
  const previous = ordered[index - 1];
  if (index < 1 || !current || !previous) return null;
  const snap = (r: PriceHistoryRecord): IngredientSource => ({
    id: ingredientId,
    purchasePrice: r.purchasePrice,
    packageQuantity: r.packageQuantity,
    packageUnit: r.packageUnit,
    packMappings: r.packMappings,
  });
  return impact(data, ingredient, snap(previous), snap(current), true);
}
