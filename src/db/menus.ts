import type { PackagingSemantics } from '../domain';
import { RepoError, ensureBusiness, type Context } from './repo';
import { currentTariff, getCostProfile, listOperatingCosts } from './settings';
import type {
  BusinessCostProfile,
  Equipment,
  Ingredient,
  Menu,
  OperatingCostRow,
  Packaging,
  Recipe,
  RecipeEquipmentUsage,
  RecipeIngredient,
  RecipePackaging,
  UtilityTariff,
} from './types';

/**
 * A menu the user edits as one thing. Stored as Recipe + Menu (Doc 05 §2) with child rows that hold
 * quantities and durations only. No cost is ever stored, so every screen costs from live sources.
 */
export interface MenuDraft {
  /** Menu id when editing an existing menu. */
  id?: string;
  name: string;
  yield: number;
  productionMinutesPerBatch: number;
  /** RM per portion. 0 = not set yet: saved as a draft and reported as incomplete by the engine. */
  sellingPrice: number;
  ingredients: { ingredientId: string; quantity: number; usageUnit: string }[];
  packaging: { packagingId: string; quantityUsed: number; usageSemantics: PackagingSemantics }[];
  equipment: { equipmentId: string; durationMinutes: number }[];
}

export interface StoredMenu extends MenuDraft {
  id: string;
  menuId: string;
  recipeId: string;
  active: boolean;
}

const invalid = (msg: string) => new RepoError('invalid_input', msg);
const finite = (n: number) => Number.isFinite(n);

function validate(d: MenuDraft): void {
  if (d.name.trim() === '') throw invalid('Menu name is required');
  if (!finite(d.yield) || d.yield <= 0) throw invalid('Yield must be more than zero');
  if (!finite(d.productionMinutesPerBatch) || d.productionMinutesPerBatch < 0) throw invalid('Production time cannot be negative');
  if (!finite(d.sellingPrice) || d.sellingPrice < 0) throw invalid('Selling price cannot be negative');
  for (const l of d.ingredients) {
    if (!finite(l.quantity) || l.quantity <= 0) throw invalid('Ingredient quantity must be more than zero');
    if (l.usageUnit.trim() === '') throw invalid('Ingredient usage unit is required');
  }
  for (const l of d.packaging) {
    if (!finite(l.quantityUsed) || l.quantityUsed <= 0) throw invalid('Packaging quantity must be more than zero');
  }
  for (const l of d.equipment) {
    if (!finite(l.durationMinutes) || l.durationMinutes < 0) throw invalid('Equipment duration cannot be negative');
  }
}

/** Creates or updates a menu. Children are replaced in the same transaction; a failure changes nothing. */
export async function saveMenu(ctx: Context, draft: MenuDraft): Promise<{ menuId: string; recipeId: string }> {
  validate(draft);
  const { db } = ctx;
  const business = await ensureBusiness(ctx);
  return db.transaction(
    'rw',
    [db.menus, db.recipes, db.recipeIngredients, db.recipePackaging, db.recipeEquipmentUsage, db.ingredients, db.packaging, db.equipment],
    async () => {
      for (const l of draft.ingredients) if (!(await db.ingredients.get(l.ingredientId))) throw invalid(`Ingredient ${l.ingredientId} does not exist`);
      for (const l of draft.packaging) if (!(await db.packaging.get(l.packagingId))) throw invalid(`Packaging ${l.packagingId} does not exist`);
      for (const l of draft.equipment) if (!(await db.equipment.get(l.equipmentId))) throw invalid(`Equipment ${l.equipmentId} does not exist`);

      const at = ctx.now().toISOString();
      let menu = draft.id ? await db.menus.get(draft.id) : undefined;
      if (draft.id && !menu) throw new RepoError('not_found', `Menu ${draft.id} not found`);
      const existingRecipe = menu ? await db.recipes.get(menu.recipeId) : undefined;

      const recipe: Recipe = {
        id: existingRecipe?.id ?? ctx.newId(),
        businessId: business.id,
        name: draft.name.trim(),
        yield: draft.yield,
        productionMinutesPerBatch: draft.productionMinutesPerBatch,
        createdAt: existingRecipe?.createdAt ?? at,
        updatedAt: at,
      };
      await db.recipes.put(recipe);

      menu = {
        id: menu?.id ?? ctx.newId(),
        businessId: business.id,
        recipeId: recipe.id,
        sellingPrice: draft.sellingPrice,
        active: menu?.active ?? true,
        createdAt: menu?.createdAt ?? at,
        updatedAt: at,
      };
      await db.menus.put(menu);

      await db.recipeIngredients.where('recipeId').equals(recipe.id).delete();
      await db.recipePackaging.where('recipeId').equals(recipe.id).delete();
      await db.recipeEquipmentUsage.where('recipeId').equals(recipe.id).delete();

      await db.recipeIngredients.bulkAdd(draft.ingredients.map((l, position): RecipeIngredient => ({ id: ctx.newId(), recipeId: recipe.id, position, ...l })));
      await db.recipePackaging.bulkAdd(draft.packaging.map((l, position): RecipePackaging => ({ id: ctx.newId(), recipeId: recipe.id, position, ...l })));
      await db.recipeEquipmentUsage.bulkAdd(draft.equipment.map((l, position): RecipeEquipmentUsage => ({ id: ctx.newId(), recipeId: recipe.id, position, ...l })));
      return { menuId: menu.id, recipeId: recipe.id };
    },
  );
}

const byPosition = (a: { position: number }, b: { position: number }) => a.position - b.position;

function stored(menu: Menu, recipe: Recipe, ing: RecipeIngredient[], pack: RecipePackaging[], eq: RecipeEquipmentUsage[]): StoredMenu {
  return {
    id: menu.id,
    menuId: menu.id,
    recipeId: recipe.id,
    active: menu.active,
    name: recipe.name,
    yield: recipe.yield,
    productionMinutesPerBatch: recipe.productionMinutesPerBatch,
    sellingPrice: menu.sellingPrice,
    ingredients: [...ing].sort(byPosition).map(({ ingredientId, quantity, usageUnit }) => ({ ingredientId, quantity, usageUnit })),
    packaging: [...pack].sort(byPosition).map(({ packagingId, quantityUsed, usageSemantics }) => ({ packagingId, quantityUsed, usageSemantics })),
    equipment: [...eq].sort(byPosition).map(({ equipmentId, durationMinutes }) => ({ equipmentId, durationMinutes })),
  };
}

export async function getMenu(ctx: Context, menuId: string): Promise<StoredMenu | null> {
  const { db } = ctx;
  const menu = await db.menus.get(menuId);
  const recipe = menu ? await db.recipes.get(menu.recipeId) : undefined;
  if (!menu || !recipe) return null;
  const [ing, pack, eq] = await Promise.all([
    db.recipeIngredients.where('recipeId').equals(recipe.id).toArray(),
    db.recipePackaging.where('recipeId').equals(recipe.id).toArray(),
    db.recipeEquipmentUsage.where('recipeId').equals(recipe.id).toArray(),
  ]);
  return stored(menu, recipe, ing, pack, eq);
}

export async function listMenus(ctx: Context): Promise<StoredMenu[]> {
  const data = await loadMenuRows(ctx);
  return data.sort((a, b) => a.name.localeCompare(b.name, 'ms', { sensitivity: 'base' }) || (a.name < b.name ? -1 : 1));
}

async function loadMenuRows(ctx: Context): Promise<StoredMenu[]> {
  const { db } = ctx;
  const [menus, recipes, ing, pack, eq] = await Promise.all([
    db.menus.toArray(),
    db.recipes.toArray(),
    db.recipeIngredients.toArray(),
    db.recipePackaging.toArray(),
    db.recipeEquipmentUsage.toArray(),
  ]);
  const recipeById = new Map(recipes.map((r) => [r.id, r]));
  const group = <T extends { recipeId: string }>(rows: T[]) => {
    const m = new Map<string, T[]>();
    for (const r of rows) m.set(r.recipeId, [...(m.get(r.recipeId) ?? []), r]);
    return m;
  };
  const gi = group(ing);
  const gp = group(pack);
  const ge = group(eq);
  const out: StoredMenu[] = [];
  for (const menu of menus) {
    const recipe = recipeById.get(menu.recipeId);
    if (recipe) out.push(stored(menu, recipe, gi.get(recipe.id) ?? [], gp.get(recipe.id) ?? [], ge.get(recipe.id) ?? []));
  }
  return out;
}

export async function deleteMenu(ctx: Context, menuId: string): Promise<void> {
  const { db } = ctx;
  await db.transaction('rw', [db.menus, db.recipes, db.recipeIngredients, db.recipePackaging, db.recipeEquipmentUsage], async () => {
    const menu = await db.menus.get(menuId);
    if (!menu) return;
    await db.recipeIngredients.where('recipeId').equals(menu.recipeId).delete();
    await db.recipePackaging.where('recipeId').equals(menu.recipeId).delete();
    await db.recipeEquipmentUsage.where('recipeId').equals(menu.recipeId).delete();
    await db.recipes.delete(menu.recipeId);
    await db.menus.delete(menuId);
  });
}

/** Everything the costing assembler needs, read in one go. Read-only, so it is safe inside live queries. */
export interface CostingData {
  profile: BusinessCostProfile;
  tariff: UtilityTariff | null;
  operatingRows: OperatingCostRow[];
  menus: StoredMenu[];
  ingredients: Ingredient[];
  packaging: Packaging[];
  equipment: Equipment[];
}

export async function loadCostingData(ctx: Context): Promise<CostingData> {
  const { db } = ctx;
  const [profile, tariff, operatingRows, menus, ingredients, packaging, equipment] = await Promise.all([
    getCostProfile(ctx),
    currentTariff(ctx),
    listOperatingCosts(ctx),
    loadMenuRows(ctx),
    db.ingredients.toArray(),
    db.packaging.toArray(),
    db.equipment.toArray(),
  ]);
  return { profile, tariff, operatingRows, menus, ingredients, packaging, equipment };
}
