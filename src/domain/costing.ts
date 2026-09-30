import { allocateOperating, allocatedOperatingCost } from './operating';
import { DEFAULT_THRESHOLDS, classifyStatus } from './status';
import type {
  CostBreakdown,
  IngredientSource,
  Issue,
  IssueCode,
  MenuCostResult,
  MenuInput,
  MenuSummary,
  BusinessInput,
  StatusThresholds,
  Warning,
} from './types';
import { UnitError, costForUsage, normalisedUnitCost } from './units';
import type { PackMapping } from './types';

const isPositive = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0;
const isNonNegative = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0;

function invalid(label: string, value: unknown): UnitError {
  return new UnitError('invalid_quantity', `Invalid ${label}: ${String(value)}`);
}

/** Recipe ingredient cost = live unit cost x usage converted to the same base unit (Doc 03 §2). */
export function ingredientCostFromSource(
  source: IngredientSource,
  quantity: number,
  unit: string,
  extraMappings: PackMapping[] = [],
): number {
  const mappings = [...(source.packMappings ?? []), ...extraMappings];
  const unitCost = normalisedUnitCost(source.purchasePrice, source.packageQuantity, source.packageUnit, mappings);
  return costForUsage(unitCost, quantity, unit, mappings);
}

/** Packaging unit cost = purchase price / number of usable units (Doc 03 §3). */
export function packagingUnitCost(purchasePrice: number, purchaseQuantity: number): number {
  if (!isNonNegative(purchasePrice)) throw invalid('packaging price', purchasePrice);
  if (!isPositive(purchaseQuantity)) throw invalid('packaging quantity', purchaseQuantity);
  return purchasePrice / purchaseQuantity;
}

/** Energy per batch in kWh = watts / 1000 x usage hours (Doc 03 §7). */
export function energyKwh(watts: number, durationMinutes: number): number {
  if (!isNonNegative(watts)) throw invalid('watts', watts);
  if (!isNonNegative(durationMinutes)) throw invalid('duration', durationMinutes);
  return (watts / 1000) * (durationMinutes / 60);
}

/** Direct production electricity per batch = sum of equipment kWh x tariff (Doc 03 §7). */
export function batchElectricityCost(lines: { watts: number; durationMinutes: number }[], tariffPerKwh: number): number {
  if (!isNonNegative(tariffPerKwh)) throw invalid('electricity tariff', tariffPerKwh);
  return lines.reduce((sum, l) => sum + energyKwh(l.watts, l.durationMinutes) * tariffPerKwh, 0);
}

/** Batch labour = production minutes / 60 x Nilai Masa (Doc 03 §4). */
export function labourCostPerBatch(productionMinutes: number, valueOfTimePerHour: number): number {
  if (!isNonNegative(productionMinutes)) throw invalid('production minutes', productionMinutes);
  if (!isNonNegative(valueOfTimePerHour)) throw invalid('Nilai Masa', valueOfTimePerHour);
  return (productionMinutes / 60) * valueOfTimePerHour;
}

const issue = (code: IssueCode, ref?: string): Issue => (ref === undefined ? { code } : { code, ref });

/**
 * The one full-cost calculation used by Menu, Dashboard, Kesan Harga, reports and tests (Doc 05 §6).
 *
 * Full cost per portion = ingredients + packaging + labour + direct utilities
 *                         + allocated shared operating cost + optional other cost.
 *
 * Anything missing or invalid comes back as an incomplete result that names what is missing.
 * The engine never guesses a value, never divides by zero, and never assumes zero overhead.
 */
export function computeMenuCost(
  menu: MenuInput,
  business: BusinessInput,
  thresholds: StatusThresholds = DEFAULT_THRESHOLDS,
): MenuCostResult {
  const issues: Issue[] = [];
  const warnings: Warning[] = [];

  const yieldOk = isPositive(menu.yield);
  const priceOk = isPositive(menu.sellingPrice);
  if (!yieldOk) issues.push(issue('yield_invalid'));
  if (!priceOk) issues.push(issue('selling_price_invalid'));

  const record = (e: unknown, ref?: string): void => {
    if (!(e instanceof UnitError)) throw e;
    issues.push(issue(e.code === 'invalid_quantity' ? 'invalid_quantity' : 'incompatible_units', ref));
  };

  // Ingredients: live source always wins. The cached cost is only an orphan fallback.
  let ingredientBatch = 0;
  let ingredientsOk = true;
  for (const line of menu.ingredients) {
    const ref = line.ref ?? line.ingredient?.id;
    try {
      if (line.ingredient) {
        ingredientBatch += ingredientCostFromSource(line.ingredient, line.quantity, line.unit);
      } else if (isNonNegative(line.cachedCost)) {
        ingredientBatch += line.cachedCost;
        warnings.push({ code: 'orphan_cost_fallback', ...(ref === undefined ? {} : { ref }) });
      } else {
        issues.push(issue('ingredient_missing', ref));
        ingredientsOk = false;
      }
    } catch (e) {
      record(e, ref);
      ingredientsOk = false;
    }
  }

  // Packaging: per_portion is per sold unit and is not divided by yield again.
  let packagingPerPortion = 0;
  let packagingOk = yieldOk;
  for (const line of menu.packaging) {
    if (!line.packaging) {
      issues.push(issue('packaging_missing', line.ref));
      packagingOk = false;
      continue;
    }
    try {
      const unitCost = packagingUnitCost(line.packaging.purchasePrice, line.packaging.purchaseQuantity);
      if (!isNonNegative(line.quantityUsed)) throw invalid('packaging quantity used', line.quantityUsed);
      const cost = unitCost * line.quantityUsed;
      if (line.semantics === 'per_portion') packagingPerPortion += cost;
      else if (yieldOk) packagingPerPortion += cost / menu.yield;
    } catch (e) {
      record(e, line.packaging.id);
      packagingOk = false;
    }
  }

  // Labour (Nilai Masa) and direct production electricity are batch costs.
  let labourBatch = 0;
  let labourOk = true;
  try {
    if (business.valueOfTimePerHour === null && isPositive(menu.productionMinutesPerBatch)) {
      issues.push(issue('nilai_masa_missing'));
      labourOk = false;
    } else {
      labourBatch = labourCostPerBatch(menu.productionMinutesPerBatch, business.valueOfTimePerHour ?? 0);
    }
  } catch (e) {
    record(e, 'labour');
    labourOk = false;
  }

  let utilitiesBatch = 0;
  let utilitiesOk = true;
  try {
    const known: { watts: number; durationMinutes: number }[] = [];
    for (const l of menu.equipment) {
      if (l.watts === null) {
        issues.push(issue('equipment_missing', l.ref));
        utilitiesOk = false;
      } else known.push({ watts: l.watts, durationMinutes: l.durationMinutes });
    }
    if (business.electricityTariffPerKwh === null && known.some((l) => l.watts * l.durationMinutes > 0)) {
      issues.push(issue('electricity_tariff_missing'));
      utilitiesOk = false;
    }
    if (utilitiesOk) utilitiesBatch = batchElectricityCost(known, business.electricityTariffPerKwh ?? 0);
  } catch (e) {
    record(e, 'equipment');
    utilitiesOk = false;
  }

  let other = 0;
  let otherOk = true;
  if (menu.otherCostPerPortion !== undefined) {
    if (isNonNegative(menu.otherCostPerPortion)) other = menu.otherCostPerPortion;
    else {
      issues.push(issue('invalid_quantity', 'otherCostPerPortion'));
      otherOk = false;
    }
  }

  // Shared operating cost: sales of zero or missing is incomplete, not zero overhead.
  let rate: number | undefined;
  if (business.missingOperatingCategories && business.missingOperatingCategories.length > 0) {
    issues.push(issue('operating_costs_missing', business.missingOperatingCategories.join(',')));
    // Sales is an independent gap: name it too, so the user sees everything to fix in one go.
    if (!allocateOperating(0, business.expectedMonthlySales).ok) issues.push(issue('expected_sales_missing'));
  } else if (business.sharedMonthlyOperatingCost === null) {
    issues.push(issue('operating_costs_invalid'));
  } else if (!isNonNegative(business.sharedMonthlyOperatingCost)) {
    issues.push(issue('invalid_quantity', 'sharedMonthlyOperatingCost'));
  } else {
    const allocation = allocateOperating(business.sharedMonthlyOperatingCost, business.expectedMonthlySales);
    if (allocation.ok) rate = allocation.rate;
    else issues.push(issue('expected_sales_missing'));
  }

  const perPortion: Partial<CostBreakdown> = {};
  if (yieldOk) {
    if (ingredientsOk) perPortion.ingredients = ingredientBatch / menu.yield;
    if (packagingOk) perPortion.packaging = packagingPerPortion;
    if (labourOk) perPortion.labour = labourBatch / menu.yield;
    if (utilitiesOk) perPortion.utilities = utilitiesBatch / menu.yield;
    if (otherOk) perPortion.other = other;
  }
  if (rate !== undefined && priceOk) perPortion.sharedOperating = allocatedOperatingCost(menu.sellingPrice, rate);

  const c = perPortion;
  if (
    issues.length > 0 ||
    rate === undefined ||
    c.ingredients === undefined ||
    c.packaging === undefined ||
    c.labour === undefined ||
    c.utilities === undefined ||
    c.sharedOperating === undefined ||
    c.other === undefined
  ) {
    return { complete: false, issues, warnings, sellingPrice: menu.sellingPrice, perPortion };
  }

  const fullCost = c.ingredients + c.packaging + c.labour + c.utilities + c.sharedOperating + c.other;
  const profit = menu.sellingPrice - fullCost;
  const marginPct = (profit / menu.sellingPrice) * 100;
  const foodCostPct = (c.ingredients / menu.sellingPrice) * 100;

  return {
    complete: true,
    issues: [],
    warnings,
    sellingPrice: menu.sellingPrice,
    perPortion: {
      ingredients: c.ingredients,
      packaging: c.packaging,
      labour: c.labour,
      utilities: c.utilities,
      sharedOperating: c.sharedOperating,
      other: c.other,
    },
    batch: {
      ingredients: ingredientBatch,
      packaging: packagingPerPortion * menu.yield,
      labour: labourBatch,
      utilities: utilitiesBatch,
    },
    operatingCostRate: rate,
    fullCost,
    profit,
    marginPct,
    foodCostPct,
    status: classifyStatus(profit, marginPct, thresholds),
  };
}

/** What lists and the dashboard read. Derived from the same result the detail screen shows. */
export function menuSummary(result: MenuCostResult): MenuSummary | null {
  if (!result.complete) return null;
  return {
    fullCost: result.fullCost,
    profit: result.profit,
    marginPct: result.marginPct,
    status: result.status,
  };
}
