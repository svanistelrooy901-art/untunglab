import type { StatusCode, StatusThresholds } from './types';

export const DEFAULT_THRESHOLDS: StatusThresholds = { lowBelow: 25, watchBelow: 40 };

/** Tolerance so binary floating-point noise is not read as a loss or a band change. */
const EPSILON = 1e-9;

/**
 * Status comes from estimated profit first, then margin (Doc 03 §13).
 * Loss always wins. The bands are configurable guidance, not industry benchmarks.
 * This is the only place status is decided.
 */
export function classifyStatus(
  profit: number,
  marginPct: number,
  thresholds: StatusThresholds = DEFAULT_THRESHOLDS,
): StatusCode {
  if (!(thresholds.lowBelow <= thresholds.watchBelow)) {
    throw new RangeError('lowBelow must not exceed watchBelow');
  }
  if (profit < -EPSILON) return 'loss';
  if (marginPct < thresholds.lowBelow - EPSILON) return 'low';
  if (marginPct < thresholds.watchBelow - EPSILON) return 'watch';
  return 'healthy';
}
