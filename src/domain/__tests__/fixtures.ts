import type { BusinessInput, IngredientLine, MenuInput } from '../types';

/** Business defaults that give a 20% operating-cost rate (RM600 / RM3,000), as used by Doc 03 §15. */
export function business(over: Partial<BusinessInput> = {}): BusinessInput {
  return {
    valueOfTimePerHour: 25,
    electricityTariffPerKwh: 0.5,
    sharedMonthlyOperatingCost: 600,
    expectedMonthlySales: 3000,
    ...over,
  };
}

/** One ingredient line costing exactly `batchCost` for the whole batch. */
export function costedLine(id: string, batchCost: number): IngredientLine {
  return {
    ref: id,
    ingredient: { id, purchasePrice: batchCost, packageQuantity: 1, packageUnit: 'kg' },
    quantity: 1000,
    unit: 'g',
  };
}

/**
 * Doc 03 §15 "Nasi Lemak baseline": sell RM12, ingredients RM6.84, packaging RM0.70,
 * labour RM2.50, shared opex RM2.40. Batch of 10, 60 minutes at RM25/hour.
 * Chicken (RM15/kg, 120 g per portion = RM1.80) is part of the RM6.84.
 */
export function nasiLemak(over: Partial<MenuInput> = {}): MenuInput {
  return {
    sellingPrice: 12,
    yield: 10,
    productionMinutesPerBatch: 60,
    ingredients: [
      {
        ref: 'ayam',
        ingredient: { id: 'ayam', purchasePrice: 15, packageQuantity: 1, packageUnit: 'kg' },
        quantity: 1200,
        unit: 'g',
      },
      costedLine('bahan-lain', 50.4), // 5.04 per portion
    ],
    packaging: [
      { packaging: { id: 'kotak', purchasePrice: 0.7, purchaseQuantity: 1 }, quantityUsed: 1, semantics: 'per_portion' },
    ],
    equipment: [],
    ...over,
  };
}

/**
 * Doc 03 §15 "Chicken Sandwich": sell RM15, ingredients RM4.00, packaging RM0.70,
 * labour RM2.50, shared opex RM3.00. Chicken (RM15/kg, 80 g per portion = RM1.20) is inside the RM4.00.
 */
export function chickenSandwich(over: Partial<MenuInput> = {}): MenuInput {
  return {
    sellingPrice: 15,
    yield: 10,
    productionMinutesPerBatch: 60,
    ingredients: [
      {
        ref: 'ayam',
        ingredient: { id: 'ayam', purchasePrice: 15, packageQuantity: 1, packageUnit: 'kg' },
        quantity: 800,
        unit: 'g',
      },
      costedLine('bahan-lain', 28), // 2.80 per portion
    ],
    packaging: [
      { packaging: { id: 'kotak', purchasePrice: 0.7, purchaseQuantity: 1 }, quantityUsed: 1, semantics: 'per_portion' },
    ],
    equipment: [],
    ...over,
  };
}

export function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const v of Object.values(value as Record<string, unknown>)) deepFreeze(v);
  }
  return value;
}
