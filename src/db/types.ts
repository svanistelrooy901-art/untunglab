import type {
  CostClassification,
  GuidedAmount,
  OperatingCategory,
  OperatingDetail,
  OtherCostItem,
  Worker,
  OperatingMode,
  PackMapping,
  PackagingSemantics,
} from '../domain';

/**
 * On-device entities from Doc 05 §2. One business per device (no login), but every row keeps
 * `businessId` so backup/import and any later multi-business scope stay possible.
 *
 * Derived values are NOT stored: ingredient unit cost, packaging unit cost, the operating-cost rate and
 * each operating cost's final monthly amount are computed by the domain from source data (Doc 05 §3, §10).
 */

export interface Business {
  id: string;
  name: string | null;
  businessType: string | null;
  targetMargin: number | null;
  targetProfit: number | null;
  createdAt: string;
  updatedAt: string;
}

/** Authoritative for Nilai Masa and expected monthly sales. Null means "not entered yet". */
export interface BusinessCostProfile {
  businessId: string;
  valueOfTimePerHour: number | null;
  expectedMonthlySales: number | null;
  /** Who does the work. Absent = solo (Nilai Masa). Switching never deletes the other side's numbers (D-85). */
  workMode?: 'solo' | 'team';
  workers?: Worker[];
  allocationMethod: 'revenue_percentage';
  updatedAt: string;
}

/** One row per category (enforced by a unique index). Simple and detailed data live on the same row. */
export interface OperatingCostRow {
  id: string;
  businessId: string;
  category: OperatingCategory;
  mode: OperatingMode;
  simpleAmount: number;
  detail?: OperatingDetail;
  guided?: GuidedAmount;
  items?: OtherCostItem[];
  active: boolean;
  classification: CostClassification;
  updatedAt: string;
}

export interface UtilityTariff {
  id: string;
  businessId: string;
  utilityType: 'electricity';
  ratePerKwh: number;
  effectiveDate: string;
}

export interface EquipmentPreset {
  id: string;
  canonicalName: string;
  defaultWatts: number;
  active: boolean;
  version: number;
}

export interface Equipment {
  id: string;
  businessId: string;
  presetId: string | null;
  name: string;
  powerWatts: number;
  source: 'preset' | 'user';
  /** False while the wattage is still the "Anggaran UntungLab" estimate (Doc 04 §5). */
  confirmed: boolean;
  active: boolean;
}

export interface Ingredient {
  id: string;
  businessId: string;
  name: string;
  purchasePrice: number;
  packageQuantity: number;
  packageUnit: string;
  packMappings: PackMapping[];
  /** Reserved for the post-core market-reference layer. Never overwrites the user's purchase price. */
  marketItemId: string | null;
  customFlag: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export type PriceSourceType = 'baseline' | 'manual' | 'scenario_apply' | 'backfill' | 'import';

/** Immutable event record. Never edited or deleted, and never the source of current ingredient values. */
export interface PriceHistoryRecord {
  id: string;
  ingredientId: string;
  /** Position among this ingredient's records; breaks ties between records on the same day. */
  seq: number;
  /** YYYY-MM-DD */
  purchaseDate: string;
  purchasePrice: number;
  packageQuantity: number;
  packageUnit: string;
  /** Pack mappings in force at the time, so the normalised cost can always be re-derived. */
  packMappings: PackMapping[];
  /** Snapshot of the normalised cost at the time, per base unit. */
  normalizedUnitCost: number;
  baseUnit: string;
  supplier: string | null;
  notes: string | null;
  sourceType: PriceSourceType;
  createdAt: string;
}

export interface Packaging {
  id: string;
  businessId: string;
  name: string;
  purchasePrice: number;
  purchaseQuantity: number;
  purchaseUnit: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Recipe {
  id: string;
  businessId: string;
  name: string;
  yield: number;
  productionMinutesPerBatch: number;
  createdAt: string;
  updatedAt: string;
}

/** Quantity and unit only. No monetary cost is stored here (Doc 05 §3). */
export interface RecipeIngredient {
  id: string;
  recipeId: string;
  /** Order the user entered the line in. */
  position: number;
  ingredientId: string;
  quantity: number;
  usageUnit: string;
}

export interface RecipePackaging {
  id: string;
  recipeId: string;
  /** Order the user entered the line in. */
  position: number;
  packagingId: string;
  quantityUsed: number;
  usageSemantics: PackagingSemantics;
}

/** Duration only. Cost is derived from equipment watts and the tariff. */
export interface RecipeEquipmentUsage {
  id: string;
  recipeId: string;
  /** Order the user entered the line in. */
  position: number;
  equipmentId: string;
  durationMinutes: number;
}

export interface Menu {
  id: string;
  businessId: string;
  recipeId: string;
  sellingPrice: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Scenario {
  id: string;
  businessId: string;
  baseEntity: 'ingredient';
  assumptions: Record<string, unknown>;
  resultSnapshot?: unknown;
  createdAt: string;
}

export interface Insight {
  id: string;
  businessId: string;
  type: string;
  severity: 'info' | 'warning' | 'critical';
  triggerData: Record<string, unknown>;
  text: string;
  createdAt: string;
  readAt: string | null;
}

/** Device identity and licence activation. Kept out of backups on purpose. */
export type LicenseRow =
  | { id: 'device'; deviceId: string; createdAt: string }
  | { id: 'activation'; token: string; codeHint: string; activatedAt: string };
