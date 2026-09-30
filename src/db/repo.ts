import { normalisedUnitCost, purchaseDataChanged, sortHistory, type PackMapping } from '../domain';
import { UntungLabDB } from './db';
import type {
  Business,
  BusinessCostProfile,
  Ingredient,
  OperatingCostRow,
  PriceHistoryRecord,
  PriceSourceType,
} from './types';

/** Injectable clock and id source so tests are deterministic. */
export interface Context {
  db: UntungLabDB;
  now: () => Date;
  newId: () => string;
}

export function createContext(db: UntungLabDB, overrides: Partial<Omit<Context, 'db'>> = {}): Context {
  return {
    db,
    now: overrides.now ?? (() => new Date()),
    newId: overrides.newId ?? (() => crypto.randomUUID()),
  };
}

export type RepoErrorCode = 'invalid_ingredient' | 'invalid_input' | 'not_found';

export class RepoError extends Error {
  constructor(
    public readonly code: RepoErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'RepoError';
  }
}

/** Local calendar date, YYYY-MM-DD. A Malaysian user's "today" is the device's date, not UTC's. */
export function localDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// ---------- business ----------

export async function ensureBusiness(ctx: Context): Promise<Business> {
  const { db } = ctx;
  return db.transaction('rw', db.businesses, db.costProfiles, async () => {
    const existing = await db.businesses.toCollection().first();
    if (existing) return existing;
    const at = ctx.now().toISOString();
    const business: Business = {
      id: ctx.newId(),
      name: null,
      businessType: null,
      targetMargin: null,
      targetProfit: null,
      createdAt: at,
      updatedAt: at,
    };
    const profile: BusinessCostProfile = {
      businessId: business.id,
      valueOfTimePerHour: null,
      expectedMonthlySales: null,
      allocationMethod: 'revenue_percentage',
      updatedAt: at,
    };
    await db.businesses.add(business);
    await db.costProfiles.add(profile);
    return business;
  });
}

// ---------- operating costs ----------

/** One row per (business, category). Saving again updates that row and keeps any stored detail. */
export async function saveOperatingCost(
  ctx: Context,
  input: Omit<OperatingCostRow, 'id' | 'updatedAt'>,
): Promise<OperatingCostRow> {
  const { db } = ctx;
  return db.transaction('rw', db.operatingCosts, async () => {
    const existing = await db.operatingCosts.where('[businessId+category]').equals([input.businessId, input.category]).first();
    const detail = input.detail ?? existing?.detail;
    const row: OperatingCostRow = {
      ...input,
      ...(detail ? { detail } : {}),
      id: existing?.id ?? ctx.newId(),
      updatedAt: ctx.now().toISOString(),
    };
    await db.operatingCosts.put(row);
    return row;
  });
}

// ---------- ingredients and Jejak Harga ----------

export interface NewIngredient {
  name: string;
  purchasePrice: number;
  packageQuantity: number;
  packageUnit: string;
  packMappings?: PackMapping[];
  customFlag?: boolean;
  supplier?: string | null;
  notes?: string | null;
  purchaseDate?: string;
}

export interface IngredientPatch {
  name?: string;
  purchasePrice?: number;
  packageQuantity?: number;
  packageUnit?: string;
  packMappings?: PackMapping[];
  active?: boolean;
}

export interface PriceChangeOptions {
  supplier?: string | null;
  notes?: string | null;
  purchaseDate?: string;
  sourceType?: Extract<PriceSourceType, 'manual' | 'scenario_apply' | 'import'>;
}

function validatePurchase(name: string, price: number, qty: number, unit: string, mappings: PackMapping[]) {
  if (name.trim() === '') throw new RepoError('invalid_ingredient', 'Name is required');
  if (unit.trim() === '') throw new RepoError('invalid_ingredient', 'Package unit is required');
  try {
    return normalisedUnitCost(price, qty, unit, mappings);
  } catch (e) {
    throw new RepoError('invalid_ingredient', e instanceof Error ? e.message : 'Invalid purchase data');
  }
}

function historyRecord(
  ctx: Context,
  ingredientId: string,
  seq: number,
  purchaseDate: string,
  p: { purchasePrice: number; packageQuantity: number; packageUnit: string },
  mappings: PackMapping[],
  sourceType: PriceSourceType,
  extra: { supplier?: string | null; notes?: string | null } = {},
): PriceHistoryRecord {
  const n = normalisedUnitCost(p.purchasePrice, p.packageQuantity, p.packageUnit, mappings);
  return {
    id: ctx.newId(),
    ingredientId,
    seq,
    purchaseDate,
    purchasePrice: p.purchasePrice,
    packageQuantity: p.packageQuantity,
    packageUnit: p.packageUnit,
    packMappings: mappings,
    normalizedUnitCost: n.perBaseUnit,
    baseUnit: n.baseUnit,
    supplier: extra.supplier ?? null,
    notes: extra.notes ?? null,
    sourceType,
    createdAt: ctx.now().toISOString(),
  };
}

/** Creates the ingredient and its baseline history record in one transaction. */
export async function createIngredient(ctx: Context, input: NewIngredient): Promise<Ingredient> {
  const { db } = ctx;
  const mappings = input.packMappings ?? [];
  validatePurchase(input.name, input.purchasePrice, input.packageQuantity, input.packageUnit, mappings);
  const business = await ensureBusiness(ctx);
  return db.transaction('rw', db.ingredients, db.priceHistory, async () => {
    const at = ctx.now().toISOString();
    const ingredient: Ingredient = {
      id: ctx.newId(),
      businessId: business.id,
      name: input.name.trim(),
      purchasePrice: input.purchasePrice,
      packageQuantity: input.packageQuantity,
      packageUnit: input.packageUnit,
      packMappings: mappings,
      marketItemId: null,
      customFlag: input.customFlag ?? false,
      active: true,
      createdAt: at,
      updatedAt: at,
    };
    await db.ingredients.add(ingredient);
    await db.priceHistory.add(
      historyRecord(ctx, ingredient.id, 1, input.purchaseDate ?? localDate(ctx.now()), ingredient, mappings, 'baseline', input),
    );
    return ingredient;
  });
}

/**
 * Updates an ingredient. Appends exactly one history record when purchase data (price, package quantity or
 * package unit) changes; a name-only or identical save appends nothing (Doc 05 §5).
 */
export async function updateIngredient(
  ctx: Context,
  id: string,
  patch: IngredientPatch,
  options: PriceChangeOptions = {},
): Promise<Ingredient> {
  const { db } = ctx;
  return db.transaction('rw', db.ingredients, db.priceHistory, async () => {
    const current = await db.ingredients.get(id);
    if (!current) throw new RepoError('not_found', `Ingredient ${id} not found`);
    const next: Ingredient = {
      ...current,
      ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
      ...(patch.purchasePrice !== undefined ? { purchasePrice: patch.purchasePrice } : {}),
      ...(patch.packageQuantity !== undefined ? { packageQuantity: patch.packageQuantity } : {}),
      ...(patch.packageUnit !== undefined ? { packageUnit: patch.packageUnit } : {}),
      ...(patch.packMappings !== undefined ? { packMappings: patch.packMappings } : {}),
      ...(patch.active !== undefined ? { active: patch.active } : {}),
      updatedAt: ctx.now().toISOString(),
    };
    validatePurchase(next.name, next.purchasePrice, next.packageQuantity, next.packageUnit, next.packMappings);

    await db.ingredients.put(next);
    if (purchaseDataChanged(current, next)) {
      const existing = await db.priceHistory.where('ingredientId').equals(id).toArray();
      const seq = existing.reduce((m, r) => Math.max(m, r.seq), 0) + 1;
      await db.priceHistory.add(
        historyRecord(
          ctx,
          id,
          seq,
          options.purchaseDate ?? localDate(ctx.now()),
          next,
          next.packMappings,
          options.sourceType ?? 'manual',
          options,
        ),
      );
    }
    return next;
  });
}

/** Oldest first (date, then seq). */
export async function listHistory(ctx: Context, ingredientId: string): Promise<PriceHistoryRecord[]> {
  return sortHistory(await ctx.db.priceHistory.where('ingredientId').equals(ingredientId).toArray());
}

/** Every price-history record, oldest first per ingredient. One read for Jejak Harga and the Dashboard. Never writes. */
export async function listAllHistory(ctx: Context): Promise<PriceHistoryRecord[]> {
  return sortHistory(await ctx.db.priceHistory.toArray());
}

/**
 * Gives every ingredient that has no history one record from its current values. Idempotent: ingredients
 * that already have history are untouched, so running it twice adds nothing.
 */
export async function backfillPriceHistory(ctx: Context): Promise<number> {
  const { db } = ctx;
  return db.transaction('rw', db.ingredients, db.priceHistory, async () => {
    let added = 0;
    for (const ing of await db.ingredients.toArray()) {
      if ((await db.priceHistory.where('ingredientId').equals(ing.id).count()) > 0) continue;
      await db.priceHistory.add(
        historyRecord(ctx, ing.id, 1, ing.createdAt.slice(0, 10), ing, ing.packMappings, 'backfill'),
      );
      added += 1;
    }
    return added;
  });
}
