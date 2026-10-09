import { describe, expect, it } from 'vitest';
import { createIngredient, updateIngredient } from '../repo';
import { createPackaging } from '../masterData';
import { deleteMenu, listMenus, loadCostingData, saveMenu, type MenuDraft } from '../menus';
import { freshContext } from './helpers';

async function seed(ctx: Parameters<typeof createIngredient>[0]) {
  const flour = await createIngredient(ctx, { name: 'Tepung', purchasePrice: 25, packageQuantity: 5, packageUnit: 'kg' });
  const choc = await createIngredient(ctx, { name: 'Coklat', purchasePrice: 30, packageQuantity: 1, packageUnit: 'kg' });
  const box = await createPackaging(ctx, { name: 'Kotak', purchasePrice: 20, purchaseQuantity: 50, purchaseUnit: 'pcs' });
  const base: MenuDraft = {
    name: 'Brownies',
    category: 'Kek',
    yield: 10,
    productionMinutesPerBatch: 60,
    sellingPrice: 12,
    ingredients: [{ ingredientId: flour.id, quantity: 250, usageUnit: 'g' }],
    packaging: [{ packagingId: box.id, quantityUsed: 1, usageSemantics: 'per_portion' }],
    equipment: [],
  };
  return { flour, choc, box, base };
}

const variationOf = (baseMenuId: string, over: Partial<MenuDraft> = {}): MenuDraft => ({
  name: 'Brownies Coklat',
  baseMenuId,
  yield: 10,
  productionMinutesPerBatch: 60,
  sellingPrice: 15,
  ingredients: [],
  packaging: [],
  equipment: [],
  ...over,
});

describe('categories', () => {
  it('a menu keeps its category and a blank one means none', async () => {
    const { ctx } = freshContext();
    const { base } = await seed(ctx);
    await saveMenu(ctx, base);
    await saveMenu(ctx, { ...base, name: 'Roti', category: '  ' });
    const menus = await listMenus(ctx);
    expect(menus.find((m) => m.name === 'Brownies')?.category).toBe('Kek');
    expect(menus.find((m) => m.name === 'Roti')?.category).toBeUndefined();
  });
});

describe('variations (D-86)', () => {
  it('a variation reads the base lines, yield and time, plus its own extras', async () => {
    const { ctx } = freshContext();
    const { base, choc } = await seed(ctx);
    const b = await saveMenu(ctx, base);
    await saveMenu(ctx, variationOf(b.menuId, { ingredients: [{ ingredientId: choc.id, quantity: 50, usageUnit: 'g' }] }));
    const v = (await listMenus(ctx)).find((m) => m.name === 'Brownies Coklat')!;
    expect(v.baseMenuId).toBe(b.menuId);
    expect(v.ingredients.map((l) => l.quantity)).toEqual([250, 50]);
    expect(v.packaging).toHaveLength(1);
    expect(v.own?.ingredients).toHaveLength(1);
    expect(v.sellingPrice).toBe(15);
  });

  it('follows later changes to the base (live inherit)', async () => {
    const { ctx } = freshContext();
    const { base, flour } = await seed(ctx);
    const b = await saveMenu(ctx, base);
    await saveMenu(ctx, variationOf(b.menuId));
    await saveMenu(ctx, { ...base, id: b.menuId, yield: 20, productionMinutesPerBatch: 90, ingredients: [{ ingredientId: flour.id, quantity: 400, usageUnit: 'g' }] });
    const v = (await listMenus(ctx)).find((m) => m.name === 'Brownies Coklat')!;
    expect(v.yield).toBe(20);
    expect(v.productionMinutesPerBatch).toBe(90);
    expect(v.ingredients[0]?.quantity).toBe(400);
  });

  it('follows an ingredient price change like any menu', async () => {
    const { ctx } = freshContext();
    const { base, flour } = await seed(ctx);
    const b = await saveMenu(ctx, base);
    await saveMenu(ctx, variationOf(b.menuId));
    await updateIngredient(ctx, flour.id, { purchasePrice: 50 });
    const data = await loadCostingData(ctx);
    expect(data.ingredients.find((i) => i.id === flour.id)?.purchasePrice).toBe(50);
    expect(data.menus.find((m) => m.name === 'Brownies Coklat')?.ingredients[0]?.ingredientId).toBe(flour.id);
  });

  it('refuses a missing base, a variation as base, and itself as base', async () => {
    const { ctx } = freshContext();
    const { base } = await seed(ctx);
    const b = await saveMenu(ctx, base);
    await expect(saveMenu(ctx, variationOf('nope'))).rejects.toThrow();
    const v = await saveMenu(ctx, variationOf(b.menuId));
    await expect(saveMenu(ctx, variationOf(v.menuId, { name: 'Cucu' }))).rejects.toThrow();
    await expect(saveMenu(ctx, variationOf(v.menuId, { id: v.menuId }))).rejects.toThrow();
  });

  it('deleting the base keeps the variation as a complete standalone menu', async () => {
    const { ctx, db } = freshContext();
    const { base, choc } = await seed(ctx);
    const b = await saveMenu(ctx, base);
    await saveMenu(ctx, variationOf(b.menuId, { ingredients: [{ ingredientId: choc.id, quantity: 50, usageUnit: 'g' }] }));
    await deleteMenu(ctx, b.menuId);
    const menus = await listMenus(ctx);
    expect(menus).toHaveLength(1);
    const v = menus[0]!;
    expect(v.baseMenuId).toBeUndefined();
    expect(v.own).toBeUndefined();
    expect(v.category).toBe('Kek');
    expect(v.yield).toBe(10);
    expect(v.productionMinutesPerBatch).toBe(60);
    expect(v.ingredients.map((l) => l.quantity)).toEqual([250, 50]);
    expect(v.packaging).toHaveLength(1);
    expect(await db.recipes.count()).toBe(1);
  });

  it('deleting a variation leaves the base untouched', async () => {
    const { ctx } = freshContext();
    const { base } = await seed(ctx);
    const b = await saveMenu(ctx, base);
    const v = await saveMenu(ctx, variationOf(b.menuId));
    await deleteMenu(ctx, v.menuId);
    const menus = await listMenus(ctx);
    expect(menus.map((m) => m.name)).toEqual(['Brownies']);
    expect(menus[0]?.ingredients).toHaveLength(1);
  });
});

describe('backup keeps the new fields (D-84, D-85, D-86)', () => {
  it('categories, variations, guided costs, Kos Lain items and workers survive restore', async () => {
    const { backupToText, createBackup, restoreBackup } = await import('../backup');
    const { saveOperatingCost, ensureBusiness } = await import('../repo');
    const { saveCostProfile, getCostProfile, listOperatingCosts } = await import('../settings');
    const a = freshContext();
    const { base } = await seed(a.ctx);
    const b = await saveMenu(a.ctx, base);
    await saveMenu(a.ctx, variationOf(b.menuId));
    const biz = await ensureBusiness(a.ctx);
    const common = { businessId: biz.id, active: true, classification: 'shared' as const, mode: 'simple' as const };
    await saveOperatingCost(a.ctx, { ...common, category: 'air', simpleAmount: 0, guided: { monthlyBill: 80, businessUsePct: 10 } });
    await saveOperatingCost(a.ctx, { ...common, category: 'kos_lain', simpleAmount: 0, items: [{ id: 'x', name: 'Iklan', monthlyAmount: 40 }] });
    await saveCostProfile(a.ctx, { workMode: 'team', workers: [{ id: 'w', name: 'Ali', monthlyPay: 2080, daysPerMonth: 26, hoursPerDay: 8 }] });
    const text = backupToText(await createBackup(a.ctx));

    const c = freshContext();
    await restoreBackup(c.ctx, text);
    const menus = await listMenus(c.ctx);
    expect(menus.find((m) => m.name === 'Brownies')?.category).toBe('Kek');
    const v = menus.find((m) => m.name === 'Brownies Coklat')!;
    expect(v.baseMenuId).toBeTruthy();
    expect(v.ingredients).toHaveLength(1);
    const rows = await listOperatingCosts(c.ctx);
    expect(rows.find((r) => r.category === 'air')?.guided).toEqual({ monthlyBill: 80, businessUsePct: 10 });
    expect(rows.find((r) => r.category === 'kos_lain')?.items).toHaveLength(1);
    const p = await getCostProfile(c.ctx);
    expect(p.workMode).toBe('team');
    expect(p.workers).toHaveLength(1);
  });
});
