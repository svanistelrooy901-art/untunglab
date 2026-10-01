import { computeMenuCost } from './costing';
import type { BusinessInput, Issue, MenuInput } from './types';

/** Target-margin chips shown in the UI (D-76). */
export const SUGGEST_MARGIN_CHIPS = [20, 30, 40, 50] as const;

export type SuggestPriceResult =
  | { ok: true; price: number; targetMarginPct: number; baseCostPerPortion: number; operatingRate: number }
  | { ok: false; reason: 'invalid_target' | 'infeasible' }
  | { ok: false; reason: 'incomplete'; issues: Issue[] };

/**
 * Suggested selling price for a target margin (D-76).
 *
 * Shared operating cost is a percentage of the price (Doc 03 §8), so the full cost is
 * base + r·P and margin m = 1 − base/P − r, giving P = base / (1 − r − m).
 * Base and r are read from the one costing engine (probed at a unit price), so no cost rule
 * is duplicated here. A price that cannot reach the margin (r + m >= 1) is reported, not forced.
 */
export function suggestPrice(menu: MenuInput, business: BusinessInput, targetMarginPct: number): SuggestPriceResult {
  if (!Number.isFinite(targetMarginPct) || targetMarginPct < 0 || targetMarginPct >= 100) return { ok: false, reason: 'invalid_target' };
  const probe = computeMenuCost({ ...menu, sellingPrice: 1 }, business);
  if (!probe.complete) return { ok: false, reason: 'incomplete', issues: probe.issues };
  const base = probe.fullCost - probe.perPortion.sharedOperating;
  const r = probe.operatingCostRate;
  const m = targetMarginPct / 100;
  const denom = 1 - r - m;
  if (denom <= 1e-9) return { ok: false, reason: 'infeasible' };
  return { ok: true, price: base / denom, targetMarginPct, baseCostPerPortion: base, operatingRate: r };
}
