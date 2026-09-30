import { UnitError, normalisedUnitCost, perDisplayUnit } from './units';
import type { PackMapping } from './types';

export interface PurchaseSnapshot {
  purchasePrice: number;
  packageQuantity: number;
  packageUnit: string;
  /** Pack mappings in force when this purchase was recorded. Falls back to the mappings passed in. */
  packMappings?: PackMapping[];
}

export interface PurchaseComparison {
  /** Change in the sticker price of the package. Can be 0 while the real cost moves. */
  packagePriceDelta: number;
  displayUnit: string;
  previousPerDisplayUnit: number;
  currentPerDisplayUnit: number;
  /** Current minus previous normalised unit cost, per display unit. Sign is preserved. */
  absoluteChangePerDisplayUnit: number;
  /** Null when the previous unit cost is zero (a baseline record). */
  percentChange: number | null;
}

/**
 * Jejak Harga compares normalised unit cost, not the package sticker price (Doc 03 §11),
 * so a package-size-only change shows its real movement.
 */
export function comparePurchases(
  previous: PurchaseSnapshot,
  current: PurchaseSnapshot,
  mappings: PackMapping[] = [],
): PurchaseComparison {
  const p = normalisedUnitCost(previous.purchasePrice, previous.packageQuantity, previous.packageUnit, previous.packMappings ?? mappings);
  const c = normalisedUnitCost(current.purchasePrice, current.packageQuantity, current.packageUnit, current.packMappings ?? mappings);
  if (p.baseUnit !== c.baseUnit) {
    throw new UnitError('incompatible', `Cannot compare ${previous.packageUnit} with ${current.packageUnit}`);
  }
  const before = perDisplayUnit(p);
  const after = perDisplayUnit(c);
  return {
    packagePriceDelta: current.purchasePrice - previous.purchasePrice,
    displayUnit: after.unit,
    previousPerDisplayUnit: before.amount,
    currentPerDisplayUnit: after.amount,
    absoluteChangePerDisplayUnit: after.amount - before.amount,
    percentChange: p.perBaseUnit > 0 ? ((c.perBaseUnit - p.perBaseUnit) / p.perBaseUnit) * 100 : null,
  };
}
