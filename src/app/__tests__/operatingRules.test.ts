import { describe, expect, it } from 'vitest';
import { addCustomEquipment, createIngredient, ensureBusiness, loadCostingData, saveCostProfile, saveMenu, saveOperatingCost, setTariff, type CostingData } from '../../db';
import { freshContext, fillOperatingZeros } from '../../db/__tests__/helpers';
import { computeAllMenus, equipmentSectionState } from '../menuAssembly';

/** D-70 / D-71: every Kos Operasi category must be filled, and appliance electricity is counted only in Kira Lebih Tepat. */
async function world(opts: { tariff?: boolean; elektrik?: 'simple' | 'detailed' | 'none'; fill?: boolean } = {}) {
  const { tariff = true, elektrik = 'none', fill = true } = opts;
  const t = freshContext('2026-09-30T08:00:00');
  const biz = await ensureBusiness(t.ctx);
  await saveCostProfile(t.ctx, { valueOfTimePerHour: 25, expectedMonthlySales: 3000 });
  if (tariff) await setTariff(t.ctx, 0.5, '2026-01-01');
  await saveOperatingCost(t.ctx, { businessId: biz.id, category: 'gas', mode: 'simple', simpleAmount: 600, active: true, classification: 'shared' });
  if (elektrik === 'simple') await saveOperatingCost(t.ctx, { businessId: biz.id, category: 'elektrik', mode: 'simple', simpleAmount: 150, active: true, classification: 'shared' });
  if (elektrik === 'detailed')
    await saveOperatingCost(t.ctx, { businessId: biz.id, category: 'elektrik', mode: 'detailed', simpleAmount: 0, detail: { kind: 'electricity', sharedMonthlyAmount: 150 }, active: true, classification: 'shared' });
  if (fill) await fillOperatingZeros(t.ctx, biz.id);
  const ayam = await createIngredient(t.ctx, { name: 'Ayam', purchasePrice: 15, packageQuantity: 1, packageUnit: 'kg' });
  const oven = await addCustomEquipment(t.ctx, { name: 'Oven', powerWatts: 2000 });
  const menu = await saveMenu(t.ctx, {
    name: 'Roti', yield: 10, productionMinutesPerBatch: 0, sellingPrice: 10,
    ingredients: [{ ingredientId: ayam.id, quantity: 100, usageUnit: 'g' }], packaging: [], equipment: [{ equipmentId: oven.id, durationMinutes: 45 }],
  });
  const data = await loadCostingData(t.ctx);
  return { t, data, menu, result: computeAllMenus(data).get(menu.menuId)!.result };
}

describe('Kos Operasi is mandatory (D-70)', () => {
  it('with only one category filled, every menu is incomplete and names what is missing', async () => {
    const { result } = await world({ fill: false, elektrik: 'simple' });
    expect(result.complete).toBe(false);
    const issue = result.issues.find((i) => i.code === 'operating_costs_missing');
    expect(issue).toBeDefined();
    expect(issue!.ref!.split(',').sort()).toEqual(['air', 'internet_telefon', 'kos_lain', 'ruang_kerja']);
  });

  it('an explicit RM0 counts as filled ("Tiada kos ini"), so all six with zeros is complete', async () => {
    const { result } = await world({ elektrik: 'simple' });
    expect(result.complete).toBe(true);
  });

  it('an archived or direct row still counts as filled; only a missing row is missing', async () => {
    const { t } = await world({ fill: false, elektrik: 'simple' });
    const biz = await ensureBusiness(t.ctx);
    for (const category of ['ruang_kerja', 'air', 'internet_telefon'] as const)
      await saveOperatingCost(t.ctx, { businessId: biz.id, category, mode: 'simple', simpleAmount: 0, active: false, classification: 'shared' });
    await saveOperatingCost(t.ctx, { businessId: biz.id, category: 'kos_lain', mode: 'simple', simpleAmount: 10, active: true, classification: 'direct' });
    const data = await loadCostingData(t.ctx);
    const r = [...computeAllMenus(data).values()][0]!.result;
    expect(r.issues.map((i) => i.code)).not.toContain('operating_costs_missing');
  });

  it('nothing is guessed: the missing categories never become a zero rate', async () => {
    const { result } = await world({ fill: false, elektrik: 'simple' });
    expect(result.complete).toBe(false);
  });
});

describe('appliance electricity follows the Elektrik mode (D-71)', () => {
  it('Mudah + tariff set: appliances add no electricity (the bill is already in Kos Operasi), so no double count', async () => {
    const { result } = await world({ elektrik: 'simple', tariff: true });
    if (!result.complete) throw new Error('expected complete');
    expect(result.batch.utilities).toBe(0);
  });

  it('Mudah without any tariff is complete: no tariff is asked for', async () => {
    const { result } = await world({ elektrik: 'simple', tariff: false });
    expect(result.complete).toBe(true);
  });

  it('Kira Lebih Tepat + tariff: oven 2000 W x 45 min x RM0.50 = RM0.75 per batch (C05)', async () => {
    const { result } = await world({ elektrik: 'detailed', tariff: true });
    if (!result.complete) throw new Error('expected complete');
    expect(result.batch.utilities).toBeCloseTo(0.75, 12);
  });

  it('Kira Lebih Tepat without a tariff still asks for it', async () => {
    const { result } = await world({ elektrik: 'detailed', tariff: false });
    expect(result.issues.map((i) => i.code)).toContain('electricity_tariff_missing');
  });

  it('switching Elektrik back to Mudah keeps the stored appliance lines but stops counting them', async () => {
    const { t, menu } = await world({ elektrik: 'detailed' });
    const biz = await ensureBusiness(t.ctx);
    await saveOperatingCost(t.ctx, { businessId: biz.id, category: 'elektrik', mode: 'simple', simpleAmount: 150, active: true, classification: 'shared' });
    const data = await loadCostingData(t.ctx);
    expect(data.menus.find((m) => m.menuId === menu.menuId)!.equipment).toHaveLength(1);
    const r = computeAllMenus(data).get(menu.menuId)!.result;
    if (!r.complete) throw new Error('expected complete');
    expect(r.batch.utilities).toBe(0);
  });
});

describe('menu builder equipment section', () => {
  const state = (d: CostingData) => equipmentSectionState(d);
  it('hidden when Elektrik is Mudah, shown when Lebih Tepat, pointer when Elektrik is not filled yet', async () => {
    expect(state((await world({ elektrik: 'simple' })).data)).toBe('hidden_simple');
    expect(state((await world({ elektrik: 'detailed' })).data)).toBe('show');
    expect(state((await world({ elektrik: 'none', fill: false })).data)).toBe('hidden_missing');
  });
});
