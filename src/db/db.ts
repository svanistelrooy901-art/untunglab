import Dexie, { type EntityTable } from 'dexie';
import type {
  Business,
  BusinessCostProfile,
  Equipment,
  EquipmentPreset,
  Ingredient,
  Insight,
  Menu,
  OperatingCostRow,
  Packaging,
  PriceHistoryRecord,
  Recipe,
  RecipeEquipmentUsage,
  RecipeIngredient,
  RecipePackaging,
  Scenario,
  UtilityTariff,
} from './types';

export class ImmutableRecordError extends Error {
  constructor(table: string) {
    super(`${table} records are immutable`);
    this.name = 'ImmutableRecordError';
  }
}

export class UntungLabDB extends Dexie {
  businesses!: EntityTable<Business, 'id'>;
  costProfiles!: EntityTable<BusinessCostProfile, 'businessId'>;
  operatingCosts!: EntityTable<OperatingCostRow, 'id'>;
  tariffs!: EntityTable<UtilityTariff, 'id'>;
  equipmentPresets!: EntityTable<EquipmentPreset, 'id'>;
  equipment!: EntityTable<Equipment, 'id'>;
  ingredients!: EntityTable<Ingredient, 'id'>;
  priceHistory!: EntityTable<PriceHistoryRecord, 'id'>;
  packaging!: EntityTable<Packaging, 'id'>;
  recipes!: EntityTable<Recipe, 'id'>;
  recipeIngredients!: EntityTable<RecipeIngredient, 'id'>;
  recipePackaging!: EntityTable<RecipePackaging, 'id'>;
  recipeEquipmentUsage!: EntityTable<RecipeEquipmentUsage, 'id'>;
  menus!: EntityTable<Menu, 'id'>;
  scenarios!: EntityTable<Scenario, 'id'>;
  insights!: EntityTable<Insight, 'id'>;

  /** True only while a full backup restore replaces every table. Price history is immutable otherwise. */
  restoring = false;

  constructor(name = 'untunglab') {
    super(name);

    // Schema v1. Only indexed fields are listed. Add a new `version(n)` for any later change.
    this.version(1).stores({
      businesses: 'id',
      costProfiles: 'businessId',
      // Unique compound index: one row per category, so switching modes can never create a duplicate cost row.
      operatingCosts: 'id, &[businessId+category]',
      tariffs: 'id, businessId, effectiveDate',
      equipmentPresets: 'id, canonicalName, active',
      equipment: 'id, businessId, presetId, active',
      ingredients: 'id, businessId, name, marketItemId, active',
      priceHistory: 'id, ingredientId, &[ingredientId+seq], [ingredientId+purchaseDate]',
      packaging: 'id, businessId, name, active',
      recipes: 'id, businessId, name',
      recipeIngredients: 'id, recipeId, ingredientId',
      recipePackaging: 'id, recipeId, packagingId',
      recipeEquipmentUsage: 'id, recipeId, equipmentId',
      menus: 'id, businessId, recipeId, active',
      scenarios: 'id, businessId',
      insights: 'id, businessId, type, createdAt, readAt',
    });

    // Price history is immutable event data (Doc 05 §5): no edits, no deletes.
    this.priceHistory.hook('updating', () => {
      throw new ImmutableRecordError('priceHistory');
    });
    this.priceHistory.hook('deleting', () => {
      if (this.restoring) return;
      throw new ImmutableRecordError('priceHistory');
    });
  }
}
