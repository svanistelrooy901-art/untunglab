import { describe, expect, it } from 'vitest';
import { createIngredient, ensureBusiness, saveOperatingCost } from '../../db/repo';
import { addCustomEquipment, createPackaging, setIngredientActive } from '../../db/masterData';
import { loadCostingData, saveMenu, type MenuDraft } from '../../db/menus';
import { saveCostProfile, setTariff } from '../../db/settings';
import { freshContext } from '../../db/__tests__/helpers';
import { computeAllMenus } from '../menuAssembly';

/** Doc 06 M01 / M02 through the real storage path: rows in, engine out. */
async function world() {
  const t = freshContext('2026-09-30T08:00:00');
  const { ctx } = t;
  const biz = await ensureBusiness(ctx);
  // 20% operating-cost rate (RM600 / RM3,000), RM25 per hour, RM0.50 per kWh.
  await saveCostProfile(ctx, { valueOfTimePerHour: 25, expectedMonthlySales: 3000 });
  await setTariff(ctx, 0.5, '2026-01-01');
  await saveOperatingCost(ctx, { businessId: biz.id, category: 'gas', mode: 'simple', simpleAmount: 600, active: true, classification: 'shared' });
  return t;
}

const run = async (t: Awaited<ReturnType<typeof world>>) => {
  const data = await loadCostingData(t.ctx);
  return { data, results: computeAllMenus(data) };
};

describe('menus costed from stored rows', () => {
  it('M01 Nasi Lemak: cost 12.44, profit -0.44, margin -3.7%, loss', async () => {
    const t = await world();
    const ayam = await createIngredient(t.ctx, { name: 'Ayam', purchasePrice: 15, packageQuantity: 1, packageUnit: 'kg' });
    const lain = await createIngredient(t.ctx, { name: 'Bahan lain', purchasePrice: 50.4, packageQuantity: 1, packageUnit: 'kg' });
    const kotak = await createPackaging(t.ctx, { name: 'Kotak', purchasePrice: 0.7, purchaseQuantity: 1, purchaseUnit: 'pcs' });
    const draft: MenuDraft = {
      name: 'Nasi Lemak', yield: 10, productionMinutesPerBatch: 60, sellingPrice: 12,
      ingredients: [{ ingredientId: ayam.id, quantity: 1200, usageUnit: 'g' }, { ingredientId: lain.id, quantity: 1000, usageUnit: 'g' }],
      packaging: [{ packagingId: kotak.id, quantityUsed: 1, usageSemantics: 'per_portion' }],
      equipment: [],
    };
    const saved = await saveMenu(t.ctx, draft);
    const { results } = await run(t);
    const r = results.get(saved.menuId)?.result;
    if (!r?.complete) throw new Error('expected complete');
    expect(r.fullCost).toBeCloseTo(12.44, 9);
    expect(r.profit).toBeCloseTo(-0.44, 9);
    expect(r.marginPct).toBeCloseTo(-3.6667, 3);
    expect(r.status).toBe('loss');
  });

  it('M02 Chicken Sandwich: cost 10.20, profit 4.80, margin 32%, low', async () => {
    const t = await world();
    const ayam = await createIngredient(t.ctx, { name: 'Ayam', purchasePrice: 15, packageQuantity: 1, packageUnit: 'kg' });
    const lain = await createIngredient(t.ctx, { name: 'Bahan lain', purchasePrice: 28, packageQuantity: 1, packageUnit: 'kg' });
    const kotak = await createPackaging(t.ctx, { name: 'Kotak', purchasePrice: 0.7, purchaseQuantity: 1, purchaseUnit: 'pcs' });
    const saved = await saveMenu(t.ctx, {
      name: 'Sandwic Ayam', yield: 10, productionMinutesPerBatch: 60, sellingPrice: 15,
      ingredients: [{ ingredientId: ayam.id, quantity: 800, usageUnit: 'g' }, { ingredientId: lain.id, quantity: 1000, usageUnit: 'g' }],
      packaging: [{ packagingId: kotak.id, quantityUsed: 1, usageSemantics: 'per_portion' }],
      equipment: [],
    });
    const r = (await run(t)).results.get(saved.menuId)?.result;
    if (!r?.complete) throw new Error('expected complete');
    expect(r.fullCost).toBeCloseTo(10.2, 9);
    expect(r.profit).toBeCloseTo(4.8, 9);
    expect(r.marginPct).toBeCloseTo(32, 9);
    expect(r.status).toBe('low');
  });

  it('M03/M04: a later price change is picked up live by every menu, because no cost is stored', async () => {
    const t = await world();
    const ing = await createIngredient(t.ctx, { name: 'Tepung', purchasePrice: 25, packageQuantity: 5, packageUnit: 'kg' });
    const a = await saveMenu(t.ctx, { name: 'A', yield: 1, productionMinutesPerBatch: 0, sellingPrice: 10, ingredients: [{ ingredientId: ing.id, quantity: 1000, usageUnit: 'g' }], packaging: [], equipment: [] });
    const before = (await run(t)).results.get(a.menuId)?.result;
    const { updateIngredient } = await import('../../db/repo');
    await updateIngredient(t.ctx, ing.id, { purchasePrice: 50 });
    const after = (await run(t)).results.get(a.menuId)?.result;
    if (!before?.complete || !after?.complete) throw new Error('expected complete');
    expect(before.perPortion.ingredients).toBeCloseTo(5, 9);
    expect(after.perPortion.ingredients).toBeCloseTo(10, 9);
  });

  it('C05: oven 2000 W x 45 min at RM0.50/kWh is RM0.75 per batch', async () => {
    const t = await world();
    const oven = await addCustomEquipment(t.ctx, { name: 'Oven', powerWatts: 2000 });
    const saved = await saveMenu(t.ctx, { name: 'Roti', yield: 1, productionMinutesPerBatch: 0, sellingPrice: 10, ingredients: [], packaging: [], equipment: [{ equipmentId: oven.id, durationMinutes: 45 }] });
    const r = (await run(t)).results.get(saved.menuId)?.result;
    if (!r?.complete) throw new Error('expected complete');
    expect(r.batch.utilities).toBeCloseTo(0.75, 12);
  });

  it('an archived ingredient is still costed live', async () => {
    const t = await world();
    const ing = await createIngredient(t.ctx, { name: 'Tepung', purchasePrice: 25, packageQuantity: 5, packageUnit: 'kg' });
    const saved = await saveMenu(t.ctx, { name: 'A', yield: 1, productionMinutesPerBatch: 0, sellingPrice: 10, ingredients: [{ ingredientId: ing.id, quantity: 1000, usageUnit: 'g' }], packaging: [], equipment: [] });
    await setIngredientActive(t.ctx, ing.id, false);
    const r = (await run(t)).results.get(saved.menuId)?.result;
    expect(r?.complete).toBe(true);
  });

  it('a missing ingredient row is named as ingredient_missing', async () => {
    const t = await world();
    const ing = await createIngredient(t.ctx, { name: 'Tepung', purchasePrice: 25, packageQuantity: 5, packageUnit: 'kg' });
    const saved = await saveMenu(t.ctx, { name: 'A', yield: 1, productionMinutesPerBatch: 0, sellingPrice: 10, ingredients: [{ ingredientId: ing.id, quantity: 1000, usageUnit: 'g' }], packaging: [], equipment: [] });
    await t.db.ingredients.delete(ing.id);
    const r = (await run(t)).results.get(saved.menuId)?.result;
    expect(r?.complete).toBe(false);
    expect(r?.issues.map((i) => i.code)).toContain('ingredient_missing');
  });

  it('incompatible usage unit (g of an item bought by the biji) is named, not converted', async () => {
    const t = await world();
    const egg = await createIngredient(t.ctx, { name: 'Telur', purchasePrice: 12, packageQuantity: 30, packageUnit: 'biji' });
    const saved = await saveMenu(t.ctx, { name: 'A', yield: 1, productionMinutesPerBatch: 0, sellingPrice: 10, ingredients: [{ ingredientId: egg.id, quantity: 100, usageUnit: 'g' }], packaging: [], equipment: [] });
    const r = (await run(t)).results.get(saved.menuId)?.result;
    expect(r?.issues.map((i) => i.code)).toContain('incompatible_units');
  });

  it('a pack mapping lets a pack-bought ingredient be used by the piece', async () => {
    const t = await world();
    const egg = await createIngredient(t.ctx, { name: 'Telur', purchasePrice: 6, packageQuantity: 1, packageUnit: 'pek', packMappings: [{ pack: 'pek', unit: 'biji', unitsPerPack: 12 }] });
    const saved = await saveMenu(t.ctx, { name: 'A', yield: 1, productionMinutesPerBatch: 0, sellingPrice: 10, ingredients: [{ ingredientId: egg.id, quantity: 3, usageUnit: 'biji' }], packaging: [], equipment: [] });
    const r = (await run(t)).results.get(saved.menuId)?.result;
    if (!r?.complete) throw new Error('expected complete');
    expect(r.perPortion.ingredients).toBeCloseTo(1.5, 9);
  });

  it('no Nilai Masa, no tariff, no sales: every gap is named', async () => {
    const t = freshContext();
    await ensureBusiness(t.ctx);
    const oven = await addCustomEquipment(t.ctx, { name: 'Oven', powerWatts: 2000 });
    const saved = await saveMenu(t.ctx, { name: 'A', yield: 1, productionMinutesPerBatch: 30, sellingPrice: 10, ingredients: [], packaging: [], equipment: [{ equipmentId: oven.id, durationMinutes: 45 }] });
    const r = (await run(t as never)).results.get(saved.menuId)?.result;
    expect(r?.issues.map((i) => i.code).sort()).toEqual(['electricity_tariff_missing', 'expected_sales_missing', 'nilai_masa_missing']);
  });

  it('inactive and direct operating rows stay out of the shared total', async () => {
    const t = await world();
    const biz = await ensureBusiness(t.ctx);
    await saveOperatingCost(t.ctx, { businessId: biz.id, category: 'air', mode: 'simple', simpleAmount: 1000, active: false, classification: 'shared' });
    await saveOperatingCost(t.ctx, { businessId: biz.id, category: 'kos_lain', mode: 'simple', simpleAmount: 1000, active: true, classification: 'direct' });
    const saved = await saveMenu(t.ctx, { name: 'A', yield: 1, productionMinutesPerBatch: 0, sellingPrice: 10, ingredients: [], packaging: [], equipment: [] });
    const r = (await run(t)).results.get(saved.menuId)?.result;
    if (!r?.complete) throw new Error('expected complete');
    expect(r.operatingCostRate).toBeCloseTo(0.2, 12);
  });

  it('a broken Kos Operasi row makes every menu incomplete instead of silently dropping the row', async () => {
    const t = await world();
    const biz = await ensureBusiness(t.ctx);
    await saveOperatingCost(t.ctx, { businessId: biz.id, category: 'air', mode: 'detailed', simpleAmount: 0, active: true, classification: 'shared' });
    const saved = await saveMenu(t.ctx, { name: 'A', yield: 1, productionMinutesPerBatch: 0, sellingPrice: 10, ingredients: [], packaging: [], equipment: [] });
    const r = (await run(t)).results.get(saved.menuId)?.result;
    expect(r?.complete).toBe(false);
    expect(r?.issues.map((i) => i.code)).toContain('operating_costs_invalid');
  });
});
