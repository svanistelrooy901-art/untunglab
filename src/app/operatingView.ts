import { allocateOperating, finalMonthlyAmount, OperatingCostError, sharedOperatingTotal, type CostClassification, type OperatingCategory, type OperatingCostEntry, type OperatingErrorCode, type OperatingMode } from '../domain';
import { OPERATING_CATEGORIES, type OperatingCostRow } from '../db';

export interface OverviewLine {
  category: OperatingCategory;
  entered: boolean;
  mode: OperatingMode;
  classification: CostClassification;
  active: boolean;
  /** Final RM/month from the domain, whichever mode derived it. 0 when not entered or broken. */
  amount: number;
  error: OperatingErrorCode | null;
}

export type OverviewAllocation =
  | { ok: true; rate: number; ratePct: number }
  | { ok: false; reason: 'expected_sales_missing' | 'incomplete_costs' };

export interface Overview {
  lines: OverviewLine[];
  sharedTotal: number;
  allocation: OverviewAllocation;
  hasErrors: boolean;
}

export function toEntry(row: OperatingCostRow): OperatingCostEntry {
  return {
    category: row.category,
    mode: row.mode,
    simpleAmount: row.simpleAmount,
    ...(row.detail ? { detail: row.detail } : {}),
    ...(row.guided ? { guided: row.guided } : {}),
    ...(row.items ? { items: row.items } : {}),
    active: row.active,
    classification: row.classification,
  };
}

/** Screen summary built only from domain functions, so it can never disagree with the costing engine. */
export function buildOverview(rows: OperatingCostRow[], expectedMonthlySales: number | null): Overview {
  const byCategory = new Map(rows.map((r) => [r.category, r]));
  const goodEntries: OperatingCostEntry[] = [];
  const lines = OPERATING_CATEGORIES.map((category): OverviewLine => {
    const row = byCategory.get(category);
    if (!row) return { category, entered: false, mode: 'simple', classification: 'shared', active: true, amount: 0, error: null };
    const entry = toEntry(row);
    try {
      const amount = finalMonthlyAmount(entry);
      goodEntries.push(entry);
      return { category, entered: true, mode: row.mode, classification: row.classification, active: row.active, amount, error: null };
    } catch (e) {
      const error = e instanceof OperatingCostError ? e.code : 'invalid_amount';
      return { category, entered: true, mode: row.mode, classification: row.classification, active: row.active, amount: 0, error };
    }
  });
  const hasErrors = lines.some((l) => l.error !== null);
  const sharedTotal = sharedOperatingTotal(goodEntries);
  const a = allocateOperating(sharedTotal, expectedMonthlySales);
  const allocation: OverviewAllocation = hasErrors ? { ok: false, reason: 'incomplete_costs' } : a;
  return { lines, sharedTotal, allocation, hasErrors };
}
