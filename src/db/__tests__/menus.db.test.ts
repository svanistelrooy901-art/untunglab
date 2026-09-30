import { describe, expect, it } from 'vitest';
import { createIngredient, ensureBusiness, saveOperatingCost } from '../repo';
import { addCustomEquipment, createPackaging } from '../masterData';
import { deleteMenu, getMenu, listMenus, loadCostingData, saveMenu, type MenuDraft } from '../menus';
import { saveCostProfile, setTariff } from '../settings';
import { freshContext } from './helpers';

async function seed(ctx: Parameters<typeof createIngredient>[0]) {
  const flour = await createIngredient(ctx, { name: 'Tepung', purchasePrice: 25, packageQuantity: 5, packageUnit: 'kg' });
  const box = await createPackaging(ctx, { name: 'Kotak', purchasePrice: 20, purchaseQuantity: 50, purchaseUnit: 'pcs' });
  const oven = await addCustomEquipment(ctx, { name: 'Oven', powerWatts: 2000 });
  const draft: MenuDraft = {
    name: 'Kek Pisang',
    yield: 10,
    productionMinutesPerBatch: 60,
    sellingPrice: 12,
    ingredients: [{ ingredientId: flour.id, quantity: 250, usageUnit: 'g' }],
    packaging: [{ packagingId: box.id, quantityUsed: 1, usageSemantics: 'per_portion' }],
    equipment: [{ equipmentId: oven.id, durationMinutes: 45 }],
  };
  return { flour, box, oven, draft };
}

describe('Menu storage (Doc 05 §2)', () => {
  it('saves a menu as recipe + menu + child rows in one go', async () => {
    const { ctx, db } = freshContext();
    const { draft } = await seed(ctx);
    const saved = await saveMenu(ctx, draft);
    expect(await db.recipes.count()).toBe(1);
    expect(await db.menus.count()).toBe(1);
    expect(await db.recipeIngredients.count()).toBe(1);
    expect(await db.recipePackaging.count()).toBe(1);
    expect(await db.recipeEquipmentUsage.count()).toBe(1);
    const back = await getMenu(ctx, saved.menuId);
    expect(back).toMatchObject({ name: 'Kek Pisang', yield: 10, productionMinutesPerBatch: 60, sellingPrice: 12 });
    expect(back?.ingredients).toHaveLength(1);
  });

  it('stores quantities and durations only, never a cost (Doc 05 §3)', async () => {
    const { ctx, db } = freshContext();
    const { draft } = await seed(ctx);
    await saveMenu(ctx, draft);
    for (const table of [db.recipeIngredients, db.recipePackaging, db.recipeEquipmentUsage]) {
      const [row] = await table.toArray();
      expect(Object.keys(row ?? {}).filter((k) => /cost|price|total/i.test(k))).toEqual([]);
    }
  });

  it('updating replaces child rows and leaves no orphans', async () => {
    const { ctx, db } = freshContext();
    const { draft } = await seed(ctx);
    const saved = await saveMenu(ctx, draft);
    await saveMenu(ctx, { ...draft, id: saved.menuId, name: 'Kek Pisang Besar', ingredients: [], packaging: [], equipment: [] });
    expect(await db.recipes.count()).toBe(1);
    expect(await db.menus.count()).toBe(1);
    expect(await db.recipeIngredients.count()).toBe(0);
    expect(await db.recipePackaging.count()).toBe(0);
    expect(await db.recipeEquipmentUsage.count()).toBe(0);
    expect((await getMenu(ctx, saved.menuId))?.name).toBe('Kek Pisang Besar');
  });

  it('lists menus by name and can delete one with everything under it', async () => {
    const { ctx, db } = freshContext();
    const { draft } = await seed(ctx);
    const a = await saveMenu(ctx, { ...draft, name: 'Zebra' });
    await saveMenu(ctx, { ...draft, name: 'Apam' });
    expect((await listMenus(ctx)).map((m) => m.name)).toEqual(['Apam', 'Zebra']);
    await deleteMenu(ctx, a.menuId);
    expect((await listMenus(ctx)).map((m) => m.name)).toEqual(['Apam']);
    expect(await db.recipes.count()).toBe(1);
    expect(await db.recipeIngredients.count()).toBe(1);
  });

  it('validates the draft and writes nothing when it is invalid', async () => {
    const { ctx, db } = freshContext();
    const { draft } = await seed(ctx);
    for (const bad of [
      { ...draft, name: '  ' },
      { ...draft, yield: 0 },
      { ...draft, productionMinutesPerBatch: -1 },
      { ...draft, sellingPrice: -1 },
      { ...draft, ingredients: [{ ingredientId: 'x', quantity: 0, usageUnit: 'g' }] },
      { ...draft, ingredients: [{ ingredientId: 'x', quantity: 5, usageUnit: '' }] },
      { ...draft, equipment: [{ equipmentId: 'x', durationMinutes: -5 }] },
    ]) {
      await expect(saveMenu(ctx, bad)).rejects.toThrow();
    }
    expect(await db.menus.count()).toBe(0);
    expect(await db.recipes.count()).toBe(0);
  });

  it('a failed child write rolls back the whole save', async () => {
    const { ctx, db } = freshContext();
    const { draft } = await seed(ctx);
    db.recipePackaging.hook('creating', () => {
      throw new Error('disk full');
    });
    await expect(saveMenu(ctx, draft)).rejects.toThrow();
    expect(await db.menus.count()).toBe(0);
    expect(await db.recipes.count()).toBe(0);
    expect(await db.recipeIngredients.count()).toBe(0);
  });

  it('rejects references to master data that does not exist', async () => {
    const { ctx, db } = freshContext();
    const { draft } = await seed(ctx);
    await expect(saveMenu(ctx, { ...draft, ingredients: [{ ingredientId: 'nope', quantity: 1, usageUnit: 'g' }] })).rejects.toThrow();
    expect(await db.menus.count()).toBe(0);
  });

  it('a price of 0 is saved as a draft (the engine reports it as incomplete)', async () => {
    const { ctx } = freshContext();
    const { draft } = await seed(ctx);
    const saved = await saveMenu(ctx, { ...draft, sellingPrice: 0 });
    expect((await getMenu(ctx, saved.menuId))?.sellingPrice).toBe(0);
  });
});

describe('line order', () => {
  it('lines come back in the order the user entered them', async () => {
    const { ctx } = freshContext();
    const { draft, flour } = await seed(ctx);
    const more = [];
    for (const n of ['Z', 'M', 'A', 'K', 'B', 'Y']) more.push(await createIngredient(ctx, { name: n, purchasePrice: 1, packageQuantity: 1, packageUnit: 'kg' }));
    const lines = [...more.map((i) => ({ ingredientId: i.id, quantity: 1, usageUnit: 'g' })), { ingredientId: flour.id, quantity: 2, usageUnit: 'g' }];
    const saved = await saveMenu(ctx, { ...draft, ingredients: lines });
    expect((await getMenu(ctx, saved.menuId))?.ingredients.map((l) => l.ingredientId)).toEqual(lines.map((l) => l.ingredientId));
    expect((await listMenus(ctx))[0]?.ingredients.map((l) => l.ingredientId)).toEqual(lines.map((l) => l.ingredientId));
  });
});

describe('loadCostingData is read-only and complete', () => {
  it('returns everything the costing assembler needs from one read transaction', async () => {
    const { ctx, db } = freshContext('2026-09-30T08:00:00');
    const { draft } = await seed(ctx);
    const biz = await ensureBusiness(ctx);
    await saveCostProfile(ctx, { valueOfTimePerHour: 25, expectedMonthlySales: 3000 });
    await setTariff(ctx, 0.5, '2026-01-01');
    await saveOperatingCost(ctx, { businessId: biz.id, category: 'gas', mode: 'simple', simpleAmount: 600, active: true, classification: 'shared' });
    await saveMenu(ctx, draft);
    const data = await db.transaction(
      'r',
      db.tables,
      () => loadCostingData(ctx),
    );
    expect(data.profile.valueOfTimePerHour).toBe(25);
    expect(data.tariff?.ratePerKwh).toBe(0.5);
    expect(data.operatingRows).toHaveLength(1);
    expect(data.menus).toHaveLength(1);
    expect(data.ingredients).toHaveLength(1);
    expect(data.packaging).toHaveLength(1);
    expect(data.equipment).toHaveLength(1);
  });

  it('works on an empty database', async () => {
    const { ctx, db } = freshContext();
    const data = await db.transaction('r', db.tables, () => loadCostingData(ctx));
    expect(data.menus).toEqual([]);
    expect(data.profile.valueOfTimePerHour).toBeNull();
    expect(data.tariff).toBeNull();
  });
});
