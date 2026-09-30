import {
  appliancesCounted,
  computeMenuCost,
  finalMonthlyAmount,
  missingCategories,
  sharedOperatingTotal,
  type BusinessInput,
  type MenuCostResult,
  type MenuInput,
  type OperatingCostEntry,
} from '../domain';
import { OPERATING_CATEGORIES, type CostingData, type StoredMenu } from '../db';
import { toEntry } from './operatingView';

export interface CostedMenu {
  menu: StoredMenu;
  input: MenuInput;
  result: MenuCostResult;
}

/**
 * The shared part of the business, resolved once. A Kos Operasi row that cannot be evaluated makes the total
 * null, so every menu reports `operating_costs_invalid` instead of silently dropping that row.
 */
export function businessInputFrom(data: CostingData): BusinessInput {
  const entries: OperatingCostEntry[] = data.operatingRows.map(toEntry);
  let shared: number | null;
  try {
    for (const e of entries) finalMonthlyAmount(e);
    shared = sharedOperatingTotal(entries);
  } catch {
    shared = null;
  }
  return {
    valueOfTimePerHour: data.profile.valueOfTimePerHour,
    electricityTariffPerKwh: data.tariff?.ratePerKwh ?? null,
    sharedMonthlyOperatingCost: shared,
    expectedMonthlySales: data.profile.expectedMonthlySales,
    missingOperatingCategories: missingCategories(entries, OPERATING_CATEGORIES),
  };
}

export type EquipmentSectionState = 'show' | 'hidden_simple' | 'hidden_missing';

/**
 * Whether the menu builder offers production appliances (D-71). Stored appliance lines are never deleted by hiding the
 * section; they simply stop counting while Elektrik is in Mudah.
 */
export function equipmentSectionState(data: CostingData): EquipmentSectionState {
  const entries = data.operatingRows.map(toEntry);
  if (appliancesCounted(entries)) return 'show';
  return entries.some((e) => e.category === 'elektrik') ? 'hidden_simple' : 'hidden_missing';
}

/** Turns stored quantities into engine input using live master data. No cost is read from any stored row. */
export function menuInputFrom(menu: StoredMenu, data: CostingData): MenuInput {
  const ingredients = new Map(data.ingredients.map((i) => [i.id, i]));
  const packaging = new Map(data.packaging.map((p) => [p.id, p]));
  const equipment = new Map(data.equipment.map((e) => [e.id, e]));
  return {
    sellingPrice: menu.sellingPrice,
    yield: menu.yield,
    productionMinutesPerBatch: menu.productionMinutesPerBatch,
    ingredients: menu.ingredients.map((l) => {
      const i = ingredients.get(l.ingredientId);
      return {
        ref: l.ingredientId,
        ingredient: i
          ? { id: i.id, purchasePrice: i.purchasePrice, packageQuantity: i.packageQuantity, packageUnit: i.packageUnit, packMappings: i.packMappings }
          : null,
        quantity: l.quantity,
        unit: l.usageUnit,
      };
    }),
    packaging: menu.packaging.map((l) => {
      const p = packaging.get(l.packagingId);
      return {
        ref: l.packagingId,
        packaging: p ? { id: p.id, purchasePrice: p.purchasePrice, purchaseQuantity: p.purchaseQuantity } : null,
        quantityUsed: l.quantityUsed,
        semantics: l.usageSemantics,
      };
    }),
    // Appliance electricity is costed per recipe only when Elektrik is in Kira Lebih Tepat (D-71).
    equipment: appliancesCounted(data.operatingRows.map(toEntry))
      ? menu.equipment.map((l) => ({
          ref: l.equipmentId,
          watts: equipment.get(l.equipmentId)?.powerWatts ?? null,
          durationMinutes: l.durationMinutes,
        }))
      : [],
  };
}

/** The one place menus are costed for the screens. Dashboard, Kesan Harga and reports reuse this. */
export function computeAllMenus(data: CostingData): Map<string, CostedMenu> {
  const business = businessInputFrom(data);
  const out = new Map<string, CostedMenu>();
  for (const menu of data.menus) {
    const input = menuInputFrom(menu, data);
    out.set(menu.id, { menu, input, result: computeMenuCost(input, business) });
  }
  return out;
}
