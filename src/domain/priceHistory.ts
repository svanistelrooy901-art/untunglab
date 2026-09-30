import { comparePurchases, type PurchaseComparison, type PurchaseSnapshot } from './priceChange';
import { UnitError } from './units';
import type { PackMapping } from './types';

/**
 * Doc 03 §11 / Doc 05 §5: a price-history record is written only when purchase data changes:
 * price, package quantity, or package unit (compared as the normalised base unit's package definition).
 * A name-only edit or a re-save with the same values writes nothing.
 */
export function purchaseDataChanged(previous: PurchaseSnapshot, next: PurchaseSnapshot): boolean {
  return (
    previous.purchasePrice !== next.purchasePrice ||
    previous.packageQuantity !== next.packageQuantity ||
    previous.packageUnit.trim().toLowerCase() !== next.packageUnit.trim().toLowerCase()
  );
}

export interface HistoryEntry extends PurchaseSnapshot {
  id: string;
  seq: number;
  purchaseDate: string;
}

/** Oldest first: by purchase date, then by seq for records on the same day. */
export function sortHistory<T extends { purchaseDate: string; seq: number }>(records: readonly T[]): T[] {
  return [...records].sort((a, b) =>
    a.purchaseDate < b.purchaseDate ? -1 : a.purchaseDate > b.purchaseDate ? 1 : a.seq - b.seq,
  );
}

export type HistoryChange<T> =
  | { kind: 'baseline'; entry: T }
  | { kind: 'change'; entry: T; previous: T; comparison: PurchaseComparison }
  | { kind: 'incompatible_units'; entry: T; previous: T };

/**
 * Each record compared to the one before it on normalised unit cost. The first record is the baseline.
 * Records whose units cannot be compared are flagged, never guessed.
 */
export function historyChanges<T extends HistoryEntry>(records: readonly T[], mappings: PackMapping[] = []): HistoryChange<T>[] {
  const ordered = sortHistory(records);
  return ordered.map((entry, i): HistoryChange<T> => {
    const previous = ordered[i - 1];
    if (!previous) return { kind: 'baseline', entry };
    try {
      return { kind: 'change', entry, previous, comparison: comparePurchases(previous, entry, mappings) };
    } catch (e) {
      if (e instanceof UnitError) return { kind: 'incompatible_units', entry, previous };
      throw e;
    }
  });
}
