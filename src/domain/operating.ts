import type { OperatingCategory, OperatingCostEntry, OperatingMode } from './types';

export type OperatingErrorCode =
  | 'invalid_amount'
  | 'invalid_percentage'
  | 'invalid_area'
  | 'duplicate_category'
  | 'missing_detail'
  | 'detail_mismatch';

export class OperatingCostError extends Error {
  readonly code: OperatingErrorCode;
  constructor(code: OperatingErrorCode, message: string) {
    super(message);
    this.name = 'OperatingCostError';
    this.code = code;
  }
}

function assertAmount(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new OperatingCostError('invalid_amount', `${label} must be zero or more`);
  }
}

function assertPct(value: number): void {
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    throw new OperatingCostError('invalid_percentage', 'Business-use % must be between 0 and 100');
  }
}

/** Ruang Kerja: monthly home/rent/mortgage cost x business-use % (Doc 03 §5). */
export function workspaceMonthlyCost(monthlyHomeCost: number, businessUsePct: number): number {
  assertAmount(monthlyHomeCost, 'Monthly home cost');
  assertPct(businessUsePct);
  return (monthlyHomeCost * businessUsePct) / 100;
}

/** Floor-area method: business area / home area x 100 (Doc 03 §5). */
export function businessPctFromArea(businessArea: number, homeArea: number): number {
  if (!Number.isFinite(homeArea) || homeArea <= 0) {
    throw new OperatingCostError('invalid_area', 'Home area must be more than zero');
  }
  if (!Number.isFinite(businessArea) || businessArea < 0 || businessArea > homeArea) {
    throw new OperatingCostError('invalid_area', 'Business area must be between zero and the home area');
  }
  return (businessArea / homeArea) * 100;
}

/** Air: average monthly water bill x business-use % (Doc 03 §6). */
export function waterMonthlyCost(averageMonthlyBill: number, businessUsePct: number): number {
  assertAmount(averageMonthlyBill, 'Water bill');
  assertPct(businessUsePct);
  return (averageMonthlyBill * businessUsePct) / 100;
}

/**
 * The single monthly amount a category feeds to shared allocation, whichever mode derived it.
 * Inactive costs contribute zero.
 */
export function finalMonthlyAmount(entry: OperatingCostEntry): number {
  if (!entry.active) return 0;

  if (entry.mode === 'simple') {
    assertAmount(entry.simpleAmount, 'Monthly amount');
    return entry.simpleAmount;
  }

  const detail = entry.detail;
  if (!detail) {
    throw new OperatingCostError('missing_detail', `${entry.category} has no Kira Lebih Tepat details`);
  }

  switch (detail.kind) {
    case 'workspace': {
      if (entry.category !== 'ruang_kerja') throw mismatch(entry, detail.kind);
      const hasAreas = detail.homeArea !== undefined && detail.businessArea !== undefined;
      const useAreas = detail.method === 'area' || (detail.method === undefined && hasAreas);
      const pct = useAreas
        ? businessPctFromArea(detail.businessArea as number, detail.homeArea as number)
        : (detail.businessUsePct as number);
      return workspaceMonthlyCost(detail.monthlyHomeCost, pct);
    }
    case 'water': {
      if (entry.category !== 'air') throw mismatch(entry, detail.kind);
      return waterMonthlyCost(detail.averageMonthlyBill, detail.businessUsePct);
    }
    case 'electricity': {
      if (entry.category !== 'elektrik') throw mismatch(entry, detail.kind);
      assertAmount(detail.sharedMonthlyAmount, 'Shared electricity');
      return detail.sharedMonthlyAmount;
    }
  }
}

function mismatch(entry: OperatingCostEntry, kind: string): OperatingCostError {
  return new OperatingCostError('detail_mismatch', `${kind} details do not belong to ${entry.category}`);
}

/** Switch between Mudah and Kira Lebih Tepat. Keeps every field, so advanced data is not deleted. */
export function setMode(entry: OperatingCostEntry, mode: OperatingMode): OperatingCostEntry {
  return { ...entry, mode };
}

/** One row per category. A second row for the same category would double-count. */
export function resolveOperatingCosts(entries: OperatingCostEntry[]): OperatingCostEntry[] {
  const seen = new Set<string>();
  for (const e of entries) {
    if (seen.has(e.category)) {
      throw new OperatingCostError('duplicate_category', `More than one cost row for ${e.category}`);
    }
    seen.add(e.category);
  }
  return entries;
}

/**
 * Eligible shared monthly operating costs. Costs classified as direct production utilities are
 * charged per recipe, so they are excluded here (Doc 03 §9).
 */
export function sharedOperatingTotal(entries: OperatingCostEntry[]): number {
  return resolveOperatingCosts(entries)
    .filter((e) => e.active && e.classification === 'shared')
    .reduce((sum, e) => sum + finalMonthlyAmount(e), 0);
}

export type Allocation =
  | { ok: true; /** fraction of sales, 0.1 = 10% */ rate: number; ratePct: number }
  | { ok: false; reason: 'expected_sales_missing' };

/**
 * Operating-cost rate = shared monthly costs / expected monthly sales (Doc 03 §8).
 * Zero, missing or invalid sales is an incomplete state. It is never divided by, and never read as zero overhead.
 */
export function allocateOperating(sharedMonthlyCost: number, expectedMonthlySales: number | null | undefined): Allocation {
  if (typeof expectedMonthlySales !== 'number' || !Number.isFinite(expectedMonthlySales) || expectedMonthlySales <= 0) {
    return { ok: false, reason: 'expected_sales_missing' };
  }
  assertAmount(sharedMonthlyCost, 'Shared monthly operating cost');
  return {
    ok: true,
    rate: sharedMonthlyCost / expectedMonthlySales,
    ratePct: (sharedMonthlyCost * 100) / expectedMonthlySales,
  };
}

/** Allocated shared operating cost for a menu = selling price x rate (revenue-percentage method). */
export function allocatedOperatingCost(sellingPrice: number, rate: number): number {
  return sellingPrice * rate;
}

/** Required categories that have no row at all. A row of any kind (even archived, even RM0) counts as filled. */
export function missingCategories(entries: readonly OperatingCostEntry[], required: readonly OperatingCategory[]): OperatingCategory[] {
  const have = new Set(entries.map((e) => e.category));
  return required.filter((c) => !have.has(c));
}

/**
 * Production appliances add their own electricity to a recipe only when Elektrik is in Kira Lebih Tepat. In Mudah the
 * whole electricity bill is already a shared monthly cost, so charging appliances as well would count it twice (D-71, Doc 03 §9).
 */
export function appliancesCounted(entries: readonly OperatingCostEntry[]): boolean {
  return entries.some((e) => e.category === 'elektrik' && e.active && e.mode === 'detailed');
}
