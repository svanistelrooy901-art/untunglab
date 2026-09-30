/** Shared types for the costing domain. Pure data shapes only. */

export type StatusCode = 'loss' | 'low' | 'watch' | 'healthy';

export interface StatusThresholds {
  /** Margin (%) below which a profitable menu is "Low". */
  lowBelow: number;
  /** Margin (%) below which a menu is "Watch"; at or above it is "Healthy". */
  watchBelow: number;
}

/** Explicit pack-to-unit relationship supplied by the package definition (Doc 03 §1). */
export interface PackMapping {
  pack: string;
  unit: string;
  unitsPerPack: number;
}

/** The authoritative purchase data for an ingredient. Current unit cost is derived from this only. */
export interface IngredientSource {
  id: string;
  purchasePrice: number;
  packageQuantity: number;
  packageUnit: string;
  packMappings?: PackMapping[];
}

/** RecipeIngredient: quantity and unit. The cached cost is an orphan fallback and never overrides live data. */
export interface IngredientLine {
  ref?: string;
  ingredient: IngredientSource | null;
  quantity: number;
  unit: string;
  cachedCost?: number;
}

export interface PackagingSource {
  id: string;
  purchasePrice: number;
  /** Number of usable packaging units in the purchase. */
  purchaseQuantity: number;
}

/** per_portion: quantity is per sold unit. per_batch: quantity is per batch and is divided by yield. */
export type PackagingSemantics = 'per_portion' | 'per_batch';

export interface PackagingLine {
  packaging: PackagingSource;
  quantityUsed: number;
  semantics: PackagingSemantics;
}

/** RecipeEquipmentUsage resolved against the saved equipment: watts plus duration in minutes. */
export interface EquipmentLine {
  watts: number;
  durationMinutes: number;
}

export interface MenuInput {
  sellingPrice: number;
  /** Portions per batch. */
  yield: number;
  productionMinutesPerBatch: number;
  ingredients: IngredientLine[];
  packaging: PackagingLine[];
  equipment: EquipmentLine[];
  /** Optional direct other/wastage cost per portion (Doc 03 §10). */
  otherCostPerPortion?: number;
}

/** BusinessCostProfile plus the resolved shared operating total. */
export interface BusinessInput {
  /** Nilai Masa, RM per hour. */
  valueOfTimePerHour: number;
  /** Electricity tariff, RM per kWh. */
  electricityTariffPerKwh: number;
  /** Sum of eligible shared monthly operating costs (see `sharedOperatingTotal`). */
  sharedMonthlyOperatingCost: number;
  /** Anggaran Jualan Bulanan. Zero, missing or invalid makes allocation incomplete. */
  expectedMonthlySales?: number | null;
}

export type IssueCode =
  | 'expected_sales_missing'
  | 'yield_invalid'
  | 'selling_price_invalid'
  | 'ingredient_missing'
  | 'incompatible_units'
  | 'invalid_quantity';

export interface Issue {
  code: IssueCode;
  ref?: string;
}

export interface Warning {
  code: 'orphan_cost_fallback';
  ref?: string;
}

/** Costs per sold portion. Full numeric precision; round only for display. */
export interface CostBreakdown {
  ingredients: number;
  packaging: number;
  labour: number;
  utilities: number;
  sharedOperating: number;
  other: number;
}

export interface CompleteMenuCost {
  complete: true;
  issues: [];
  warnings: Warning[];
  sellingPrice: number;
  perPortion: CostBreakdown;
  /** Whole-batch figures, for "how was this calculated" views. */
  batch: { ingredients: number; packaging: number; labour: number; utilities: number };
  /** Shared operating cost as a fraction of sales (0.2 = 20%). */
  operatingCostRate: number;
  fullCost: number;
  profit: number;
  marginPct: number;
  foodCostPct: number;
  status: StatusCode;
}

/** Something needed is missing or invalid. Names what is missing; never guesses a value. */
export interface IncompleteMenuCost {
  complete: false;
  issues: Issue[];
  warnings: Warning[];
  sellingPrice: number;
  /** Only the components that could be calculated. */
  perPortion: Partial<CostBreakdown>;
}

export type MenuCostResult = CompleteMenuCost | IncompleteMenuCost;

/** The one shape every screen reads for a menu: dashboard, detail, scenario, reports. */
export interface MenuSummary {
  fullCost: number;
  profit: number;
  marginPct: number;
  status: StatusCode;
}

export type OperatingCategory = 'ruang_kerja' | 'elektrik' | 'air' | 'internet_telefon' | 'gas' | 'kos_lain';
export type OperatingMode = 'simple' | 'detailed';
/** A cost is shared overhead OR a direct production utility, never both (Doc 03 §9). */
export type CostClassification = 'shared' | 'direct';

export interface WorkspaceDetail {
  kind: 'workspace';
  monthlyHomeCost: number;
  /** Manual business-use %. Ignored when both areas are given. */
  businessUsePct?: number;
  homeArea?: number;
  businessArea?: number;
}

export interface WaterDetail {
  kind: 'water';
  averageMonthlyBill: number;
  businessUsePct: number;
}

/** In Lebih Tepat, production appliances are costed per recipe; this is the remaining general electricity. */
export interface ElectricityDetail {
  kind: 'electricity';
  sharedMonthlyAmount: number;
}

export type OperatingDetail = WorkspaceDetail | WaterDetail | ElectricityDetail;

/** One row per category. Mudah and Lebih Tepat are two ways to derive one final monthly amount. */
export interface OperatingCostEntry {
  category: OperatingCategory;
  mode: OperatingMode;
  simpleAmount: number;
  detail?: OperatingDetail;
  active: boolean;
  classification: CostClassification;
}
