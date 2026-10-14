/**
 * Plan a Batch (D-97): how many batches each chosen menu needs, and what to buy for them.
 *
 * Pure: no storage, no screen code. Every cost comes from the engine's own functions (`ingredientCostFromSource`,
 * `packagingUnitCost`), every unit change from `convertQuantity`. A line that cannot be worked out is named as an
 * issue and its item shows no number; nothing is guessed, dropped or read as zero.
 */
import { ingredientCostFromSource, packagingUnitCost } from './costing';
import type { MenuInput } from './types';
import { UnitError, baseUnitOf, convertQuantity } from './units';

export interface BatchPlanMenuInput {
  menuId: string;
  name: string;
  /** Engine input for the menu (a variation already includes its base lines). */
  input: MenuInput;
  /** Pieces to make. 0 = not in this batch. */
  pieces: number;
}

export interface BatchPlanInput {
  menus: BatchPlanMenuInput[];
  /** Ingredient id to name, for the list and for naming issues. */
  ingredientNames: ReadonlyMap<string, string>;
  /** Packaging id to name. */
  packagingNames: ReadonlyMap<string, string>;
}

export interface BatchPlanMenuResult {
  menuId: string;
  name: string;
  pieces: number;
  /** Portions per batch, as saved on the menu. */
  yield: number;
  /** pieces ÷ yield, never rounded (1.5 = one and a half batches). Null when the yield cannot be used. */
  batches: number | null;
}

export interface ShoppingLine {
  ingredientId: string;
  name: string;
  /** The engine's base unit for this ingredient: g, ml, or the counted pack unit. */
  unit: string;
  /** Total needed, in `unit`. Null when any line for this ingredient could not be worked out (see issues). */
  needed: number | null;
  /** The pack as bought, exactly as entered on the ingredient. */
  packQuantity: number;
  packUnit: string;
  /** Whole packs to buy: needed ÷ pack size, rounded up. */
  packsToBuy: number | null;
  /** Cost of the amount used (not of the packs bought), from the engine. */
  estimatedCost: number | null;
  menuIds: string[];
}

export interface PackagingPlanLine {
  packagingId: string;
  name: string;
  /** Units needed: per-portion quantity × pieces, plus per-batch quantity × batches. */
  needed: number | null;
  /** Usable units in one purchase. */
  packQuantity: number;
  packsToBuy: number | null;
  estimatedCost: number | null;
  menuIds: string[];
}

export type BatchIssueCode =
  | 'pieces_invalid'
  | 'yield_invalid'
  | 'ingredient_missing'
  | 'packaging_missing'
  | 'incompatible_units'
  | 'invalid_quantity';

export interface BatchIssue {
  code: BatchIssueCode;
  menuId: string;
  menuName: string;
  /** The ingredient or packaging concerned. Null for a menu-level issue or an item that no longer exists. */
  itemName: string | null;
  /** The unit that could not be converted (incompatible_units). */
  unit?: string;
}

export interface BatchPlanResult {
  menus: BatchPlanMenuResult[];
  shopping: ShoppingLine[];
  packaging: PackagingPlanLine[];
  issues: BatchIssue[];
  /** Sum of `estimatedCost` over the shopping list. Null when anything needed for it is not calculated. */
  ingredientCost: number | null;
  /** Sum of packaging `estimatedCost`. Null when anything needed for it is not calculated. */
  packagingCost: number | null;
}

/** Tolerance so floating-point noise (2.0000000000000004 packs) does not add a pack (same idea as D-09). */
const EPSILON = 1e-9;

/** Whole packs that cover `needed` when one pack holds `perPack`. */
export function packsToBuy(needed: number, perPack: number): number {
  if (!Number.isFinite(needed) || needed < 0) throw new UnitError('invalid_quantity', `Invalid amount: ${needed}`);
  if (!Number.isFinite(perPack) || perPack <= 0) throw new UnitError('invalid_quantity', `Invalid pack size: ${perPack}`);
  return Math.max(0, Math.ceil(needed / perPack - EPSILON));
}

interface Acc<T> {
  line: T;
  sum: number;
  cost: number;
  broken: boolean;
}

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, 'ms', { sensitivity: 'base' });

export function planBatch(plan: BatchPlanInput): BatchPlanResult {
  const menus: BatchPlanMenuResult[] = [];
  const issues: BatchIssue[] = [];
  const ingredients = new Map<string, Acc<ShoppingLine>>();
  const packaging = new Map<string, Acc<PackagingPlanLine>>();
  let ingredientsComplete = true;
  let packagingComplete = true;

  const unitIssue = (e: unknown, base: Omit<BatchIssue, 'code'>): BatchIssue => {
    if (!(e instanceof UnitError)) throw e;
    return e.code === 'invalid_quantity' ? { code: 'invalid_quantity', ...base } : { code: 'incompatible_units', ...base };
  };

  for (const m of plan.menus) {
    const at = { menuId: m.menuId, menuName: m.name };
    if (!Number.isFinite(m.pieces) || m.pieces < 0) {
      issues.push({ code: 'pieces_invalid', ...at, itemName: null });
      ingredientsComplete = false;
      packagingComplete = false;
      continue;
    }
    if (m.pieces === 0) continue;

    const y = m.input.yield;
    if (!Number.isFinite(y) || y <= 0) {
      menus.push({ menuId: m.menuId, name: m.name, pieces: m.pieces, yield: y, batches: null });
      issues.push({ code: 'yield_invalid', ...at, itemName: null });
      if (m.input.ingredients.length > 0) ingredientsComplete = false;
      if (m.input.packaging.length > 0) packagingComplete = false;
      continue;
    }
    const batches = m.pieces / y;
    menus.push({ menuId: m.menuId, name: m.name, pieces: m.pieces, yield: y, batches });

    for (const line of m.input.ingredients) {
      const src = line.ingredient;
      const ref = line.ref ?? src?.id;
      const itemName = (ref !== undefined ? plan.ingredientNames.get(ref) : undefined) ?? null;
      if (!src) {
        issues.push({ code: 'ingredient_missing', ...at, itemName });
        ingredientsComplete = false;
        continue;
      }
      let acc = ingredients.get(src.id);
      try {
        if (!acc) {
          acc = {
            line: {
              ingredientId: src.id,
              name: itemName ?? src.id,
              unit: baseUnitOf(src.packageUnit),
              needed: null,
              packQuantity: src.packageQuantity,
              packUnit: src.packageUnit,
              packsToBuy: null,
              estimatedCost: null,
              menuIds: [],
            },
            sum: 0,
            cost: 0,
            broken: false,
          };
          ingredients.set(src.id, acc);
        }
        if (!acc.line.menuIds.includes(m.menuId)) acc.line.menuIds.push(m.menuId);
        if (!Number.isFinite(line.quantity) || line.quantity < 0) throw new UnitError('invalid_quantity', `Invalid quantity: ${line.quantity}`);
        const quantity = line.quantity * batches;
        const needed = convertQuantity(quantity, line.unit, acc.line.unit, src.packMappings ?? []);
        const cost = ingredientCostFromSource(src, quantity, line.unit);
        acc.sum += needed;
        acc.cost += cost;
      } catch (e) {
        issues.push(unitIssue(e, { ...at, itemName, unit: line.unit }));
        if (acc) acc.broken = true;
        ingredientsComplete = false;
      }
    }

    for (const line of m.input.packaging) {
      const src = line.packaging;
      const ref = line.ref ?? src?.id;
      const itemName = (ref !== undefined ? plan.packagingNames.get(ref) : undefined) ?? null;
      if (!src) {
        issues.push({ code: 'packaging_missing', ...at, itemName });
        packagingComplete = false;
        continue;
      }
      let acc = packaging.get(src.id);
      if (!acc) {
        acc = {
          line: { packagingId: src.id, name: itemName ?? src.id, needed: null, packQuantity: src.purchaseQuantity, packsToBuy: null, estimatedCost: null, menuIds: [] },
          sum: 0,
          cost: 0,
          broken: false,
        };
        packaging.set(src.id, acc);
      }
      if (!acc.line.menuIds.includes(m.menuId)) acc.line.menuIds.push(m.menuId);
      try {
        if (!Number.isFinite(line.quantityUsed) || line.quantityUsed < 0) {
          throw new UnitError('invalid_quantity', `Invalid packaging quantity: ${line.quantityUsed}`);
        }
        const quantity = line.semantics === 'per_portion' ? line.quantityUsed * m.pieces : line.quantityUsed * batches;
        const unitCost = packagingUnitCost(src.purchasePrice, src.purchaseQuantity);
        acc.sum += quantity;
        acc.cost += unitCost * quantity;
      } catch (e) {
        issues.push(unitIssue(e, { ...at, itemName }));
        acc.broken = true;
        packagingComplete = false;
      }
    }
  }

  const shopping: ShoppingLine[] = [];
  for (const acc of ingredients.values()) {
    // Not broken means every line was costed, so the engine has already accepted the pack size (above zero).
    if (!acc.broken) {
      const perPack = convertQuantity(acc.line.packQuantity, acc.line.packUnit, acc.line.unit);
      acc.line.needed = acc.sum;
      acc.line.packsToBuy = packsToBuy(acc.sum, perPack);
      acc.line.estimatedCost = acc.cost;
    }
    shopping.push(acc.line);
  }

  const pack: PackagingPlanLine[] = [];
  for (const acc of packaging.values()) {
    if (!acc.broken) {
      acc.line.needed = acc.sum;
      acc.line.packsToBuy = packsToBuy(acc.sum, acc.line.packQuantity);
      acc.line.estimatedCost = acc.cost;
    }
    pack.push(acc.line);
  }

  // A total is only given when every part of it is known; a partial sum is never shown as the total.
  const total = (lines: { estimatedCost: number | null }[], complete: boolean): number | null => {
    if (!complete) return null;
    let sum = 0;
    for (const l of lines) {
      if (l.estimatedCost === null) return null;
      sum += l.estimatedCost;
    }
    return sum;
  };

  return {
    menus,
    shopping: shopping.sort(byName),
    packaging: pack.sort(byName),
    issues,
    ingredientCost: total(shopping, ingredientsComplete),
    packagingCost: total(pack, packagingComplete),
  };
}
