import type { PackMapping } from './types';

export type Dimension = 'mass' | 'volume' | 'count';
export type UnitErrorCode = 'invalid_quantity' | 'incompatible' | 'unknown_unit';

export class UnitError extends Error {
  readonly code: UnitErrorCode;
  constructor(code: UnitErrorCode, message: string) {
    super(message);
    this.name = 'UnitError';
    this.code = code;
  }
}

const MASS: Record<string, number> = { g: 1, kg: 1000 };
const VOLUME: Record<string, number> = { ml: 1, l: 1000 };

const normalise = (unit: string): string => unit.trim().toLowerCase();

export function dimensionOf(unit: string): Dimension {
  const u = normalise(unit);
  if (u === '') throw new UnitError('unknown_unit', 'Unit is empty');
  if (Object.hasOwn(MASS, u)) return 'mass';
  if (Object.hasOwn(VOLUME, u)) return 'volume';
  return 'count';
}

/** Base unit for a unit's dimension: g, ml, or the counted unit's own label. */
export function baseUnitOf(unit: string): string {
  const dimension = dimensionOf(unit);
  if (dimension === 'mass') return 'g';
  if (dimension === 'volume') return 'ml';
  return normalise(unit);
}

function assertQuantity(quantity: number): void {
  if (!Number.isFinite(quantity) || quantity < 0) {
    throw new UnitError('invalid_quantity', `Invalid quantity: ${quantity}`);
  }
}

/**
 * Convert a quantity between compatible units: kg/g, L/ml, and pack/unit through an explicit mapping.
 * Never silently converts incompatible dimensions (Doc 03 §1).
 */
export function convertQuantity(quantity: number, from: string, to: string, mappings: PackMapping[] = []): number {
  assertQuantity(quantity);
  const f = normalise(from);
  const t = normalise(to);
  if (f === t) return quantity;

  const df = dimensionOf(f);
  const dt = dimensionOf(t);

  if (df === 'mass' && dt === 'mass') return (quantity * MASS[f]!) / MASS[t]!;
  if (df === 'volume' && dt === 'volume') return (quantity * VOLUME[f]!) / VOLUME[t]!;

  if (df === 'count' && dt === 'count') {
    for (const m of mappings) {
      if (!Number.isFinite(m.unitsPerPack) || m.unitsPerPack <= 0) {
        throw new UnitError('invalid_quantity', `Invalid units per pack for ${m.pack}`);
      }
      if (normalise(m.pack) === f && normalise(m.unit) === t) return quantity * m.unitsPerPack;
      if (normalise(m.unit) === f && normalise(m.pack) === t) return quantity / m.unitsPerPack;
    }
  }

  throw new UnitError('incompatible', `Cannot convert ${from} to ${to}`);
}

export interface NormalisedUnitCost {
  /** RM per one base unit (per g, per ml, or per counted unit). */
  perBaseUnit: number;
  baseUnit: string;
  dimension: Dimension;
}

/** Unit cost = purchase price / purchase quantity, expressed per base unit (Doc 03 §2). */
export function normalisedUnitCost(
  purchasePrice: number,
  packageQuantity: number,
  packageUnit: string,
  mappings: PackMapping[] = [],
): NormalisedUnitCost {
  if (!Number.isFinite(purchasePrice) || purchasePrice < 0) {
    throw new UnitError('invalid_quantity', `Invalid purchase price: ${purchasePrice}`);
  }
  if (!Number.isFinite(packageQuantity) || packageQuantity <= 0) {
    throw new UnitError('invalid_quantity', `Invalid package quantity: ${packageQuantity}`);
  }
  const baseUnit = baseUnitOf(packageUnit);
  const baseQuantity = convertQuantity(packageQuantity, packageUnit, baseUnit, mappings);
  return { perBaseUnit: purchasePrice / baseQuantity, baseUnit, dimension: dimensionOf(packageUnit) };
}

/** Cost of using `quantity` of `unit` at the given unit cost. */
export function costForUsage(cost: NormalisedUnitCost, quantity: number, unit: string, mappings: PackMapping[] = []): number {
  return convertQuantity(quantity, unit, cost.baseUnit, mappings) * cost.perBaseUnit;
}

/** Unit cost in the unit people read: per kg, per litre, or per counted unit. */
export function perDisplayUnit(cost: NormalisedUnitCost): { amount: number; unit: string } {
  if (cost.dimension === 'mass') return { amount: cost.perBaseUnit * 1000, unit: 'kg' };
  if (cost.dimension === 'volume') return { amount: cost.perBaseUnit * 1000, unit: 'l' };
  return { amount: cost.perBaseUnit, unit: cost.baseUnit };
}
