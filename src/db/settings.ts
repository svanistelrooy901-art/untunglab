import type { OperatingCategory, Worker } from '../domain';
import { RepoError, ensureBusiness, localDate, type Context } from './repo';
import type { Business, BusinessCostProfile, OperatingCostRow, UtilityTariff } from './types';

/** Fixed order used by the Kos Operasi screen (Doc 02 §6). */
export const OPERATING_CATEGORIES: readonly OperatingCategory[] = ['ruang_kerja', 'elektrik', 'air', 'internet_telefon', 'gas', 'kos_lain'];

const invalid = (msg: string) => new RepoError('invalid_input', msg);

/** Read-only: safe inside live queries. The business is created at startup, never by a getter. */
export async function getBusiness(ctx: Context): Promise<Business | null> {
  return (await ctx.db.businesses.toCollection().first()) ?? null;
}

/** Read-only. Before the business exists this is an empty profile ("not entered"), never zero. */
export async function getCostProfile(ctx: Context): Promise<BusinessCostProfile> {
  const business = await getBusiness(ctx);
  const profile = business ? await ctx.db.costProfiles.get(business.id) : undefined;
  return (
    profile ?? {
      businessId: business?.id ?? '',
      valueOfTimePerHour: null,
      expectedMonthlySales: null,
      allocationMethod: 'revenue_percentage',
      updatedAt: '',
    }
  );
}

export interface CostProfilePatch {
  /** RM per hour. Zero is allowed (the user may choose to cost no labour). null = not entered. */
  valueOfTimePerHour?: number | null;
  /** RM per month. Must be more than zero; null = not entered. Zero is never stored (Doc 03 §8). */
  expectedMonthlySales?: number | null;
  workMode?: 'solo' | 'team';
  workers?: Worker[];
}

/** Omitted fields are kept. Validation happens before anything is written. */
export async function saveCostProfile(ctx: Context, patch: CostProfilePatch): Promise<BusinessCostProfile> {
  const { db } = ctx;
  const { valueOfTimePerHour: time, expectedMonthlySales: sales } = patch;
  if (time !== undefined && time !== null && (!Number.isFinite(time) || time < 0)) throw invalid('Nilai Masa cannot be negative');
  if (sales !== undefined && sales !== null && (!Number.isFinite(sales) || sales <= 0)) throw invalid('Expected sales must be more than zero');
  const business = await ensureBusiness(ctx);
  return db.transaction('rw', db.costProfiles, async () => {
    const current = await db.costProfiles.get(business.id);
    if (!current) throw new RepoError('not_found', 'Cost profile missing');
    const next: BusinessCostProfile = {
      ...current,
      ...(time !== undefined ? { valueOfTimePerHour: time } : {}),
      ...(sales !== undefined ? { expectedMonthlySales: sales } : {}),
      ...(patch.workMode !== undefined ? { workMode: patch.workMode } : {}),
      ...(patch.workers !== undefined ? { workers: patch.workers } : {}),
      updatedAt: ctx.now().toISOString(),
    };
    await db.costProfiles.put(next);
    return next;
  });
}

export async function updateBusinessProfile(ctx: Context, patch: { name?: string | null; businessType?: string | null }): Promise<Business> {
  const { db } = ctx;
  const business = await ensureBusiness(ctx);
  const clean = (v: string | null | undefined) => (v === undefined ? undefined : v === null || v.trim() === '' ? null : v.trim());
  const name = clean(patch.name);
  const businessType = clean(patch.businessType);
  const next: Business = {
    ...business,
    ...(name !== undefined ? { name } : {}),
    ...(businessType !== undefined ? { businessType } : {}),
    updatedAt: ctx.now().toISOString(),
  };
  await db.businesses.put(next);
  return next;
}

// ---------- electricity tariff ----------

/** The rate in force today: the latest effective date that is not in the future. Null until the user sets one. */
export async function currentTariff(ctx: Context): Promise<UtilityTariff | null> {
  const business = await getBusiness(ctx);
  if (!business) return null;
  const today = localDate(ctx.now());
  const rows = await ctx.db.tariffs.where('businessId').equals(business.id).toArray();
  const inForce = rows.filter((r) => r.effectiveDate <= today).sort((a, b) => (a.effectiveDate < b.effectiveDate ? 1 : -1));
  return inForce[0] ?? null;
}

/** Adds an effective-dated rate. A second rate for the same date replaces it instead of piling up rows. */
export async function setTariff(ctx: Context, ratePerKwh: number, effectiveDate?: string): Promise<UtilityTariff> {
  if (!Number.isFinite(ratePerKwh) || ratePerKwh <= 0) throw invalid('Tariff must be more than zero');
  const business = await ensureBusiness(ctx);
  const date = effectiveDate ?? localDate(ctx.now());
  const { db } = ctx;
  return db.transaction('rw', db.tariffs, async () => {
    const sameDay = (await db.tariffs.where('businessId').equals(business.id).toArray()).find((r) => r.effectiveDate === date);
    const row: UtilityTariff = { id: sameDay?.id ?? ctx.newId(), businessId: business.id, utilityType: 'electricity', ratePerKwh, effectiveDate: date };
    await db.tariffs.put(row);
    return row;
  });
}

// ---------- operating costs ----------

export async function listOperatingCosts(ctx: Context): Promise<OperatingCostRow[]> {
  const rows = await ctx.db.operatingCosts.toArray();
  return rows.sort((a, b) => OPERATING_CATEGORIES.indexOf(a.category) - OPERATING_CATEGORIES.indexOf(b.category));
}

/** Explicit reset (Doc 04 §4): drops the Lebih Tepat details and returns to Mudah. The simple amount stays. */
export async function resetOperatingDetail(ctx: Context, businessId: string, category: OperatingCategory): Promise<void> {
  const { db } = ctx;
  await db.transaction('rw', db.operatingCosts, async () => {
    const row = await db.operatingCosts.where('[businessId+category]').equals([businessId, category]).first();
    if (!row) return;
    const { detail: _dropped, ...rest } = row;
    await db.operatingCosts.put({ ...rest, mode: 'simple', updatedAt: ctx.now().toISOString() });
  });
}
