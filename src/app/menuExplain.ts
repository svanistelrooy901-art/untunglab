import {
  allocateOperating,
  allocatedOperatingCost,
  energyKwh,
  ingredientCostFromSource,
  packagingUnitCost,
  type BusinessInput,
  type MenuInput,
  type PackagingSemantics,
} from '../domain';

export interface ExplainedMenu {
  ingredients: { ref: string | undefined; quantity: number; unit: string; cost: number | null }[];
  packaging: { ref: string | undefined; quantityUsed: number; semantics: PackagingSemantics; unitCost: number | null; cost: number | null }[];
  labour: { minutes: number; ratePerHour: number | null; batch: number | null };
  utilities: { ref: string | undefined; watts: number | null; minutes: number; kwh: number | null; cost: number | null }[];
  tariffPerKwh: number | null;
  sharedOperating: { ok: true; ratePct: number; amount: number } | { ok: false };
}

const attempt = <T>(fn: () => T): T | null => {
  try {
    return fn();
  } catch {
    return null;
  }
};

/**
 * Line-by-line working for the "how was this calculated" rows. Uses the same domain functions as the engine,
 * so what the user reads is what was added up. Lines that cannot be costed show no number instead of a guess.
 */
export function explainMenu(menu: MenuInput, business: BusinessInput): ExplainedMenu {
  const rate = business.valueOfTimePerHour;
  const tariff = business.electricityTariffPerKwh;
  const allocation =
    business.sharedMonthlyOperatingCost === null ? null : allocateOperating(business.sharedMonthlyOperatingCost, business.expectedMonthlySales);
  return {
    ingredients: menu.ingredients.map((l) => ({
      ref: l.ref ?? l.ingredient?.id,
      quantity: l.quantity,
      unit: l.unit,
      cost: l.ingredient ? attempt(() => ingredientCostFromSource(l.ingredient!, l.quantity, l.unit)) : null,
    })),
    packaging: menu.packaging.map((l) => {
      const unitCost = l.packaging ? attempt(() => packagingUnitCost(l.packaging!.purchasePrice, l.packaging!.purchaseQuantity)) : null;
      return {
        ref: l.ref ?? l.packaging?.id,
        quantityUsed: l.quantityUsed,
        semantics: l.semantics,
        unitCost,
        cost: unitCost === null ? null : unitCost * l.quantityUsed,
      };
    }),
    labour: {
      minutes: menu.productionMinutesPerBatch,
      ratePerHour: rate,
      batch: rate === null ? null : (menu.productionMinutesPerBatch / 60) * rate,
    },
    utilities: menu.equipment.map((l) => {
      const kwh = l.watts === null ? null : attempt(() => energyKwh(l.watts!, l.durationMinutes));
      return {
        ref: l.ref,
        watts: l.watts,
        minutes: l.durationMinutes,
        kwh,
        cost: kwh === null || tariff === null ? null : kwh * tariff,
      };
    }),
    tariffPerKwh: tariff,
    sharedOperating:
      allocation && allocation.ok
        ? { ok: true, ratePct: allocation.ratePct, amount: allocatedOperatingCost(menu.sellingPrice, allocation.rate) }
        : { ok: false },
  };
}
