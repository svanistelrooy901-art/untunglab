import { describe, expect, it } from 'vitest';
import { createIngredient, ensureBusiness, listAllHistory, listHistory, loadCostingData, saveCostProfile, saveMenu, saveOperatingCost, setTariff, createPackaging, updateIngredient } from '../../db';
import { freshContext } from '../../db/__tests__/helpers';
import { computeAllMenus } from '../menuAssembly';
import { historyReview, parseScenarioInput, whatIf } from '../scenarioView';

async function world() {
  const t = freshContext('2026-09-01T08:00:00');
  const biz = await ensureBusiness(t.ctx);
  await saveCostProfile(t.ctx, { valueOfTimePerHour: 25, expectedMonthlySales: 3000 });
  await setTariff(t.ctx, 0.5, '2026-01-01');
  await saveOperatingCost(t.ctx, { businessId: biz.id, category: 'gas', mode: 'simple', simpleAmount: 600, active: true, classification: 'shared' });
  const ayam = await createIngredient(t.ctx, { name: 'Ayam', purchasePrice: 15, packageQuantity: 1, packageUnit: 'kg' });
  const lain = await createIngredient(t.ctx, { name: 'Bahan lain', purchasePrice: 50.4, packageQuantity: 1, packageUnit: 'kg' });
  const gula = await createIngredient(t.ctx, { name: 'Gula', purchasePrice: 3, packageQuantity: 1, packageUnit: 'kg' });
  const kotak = await createPackaging(t.ctx, { name: 'Kotak', purchasePrice: 0.7, purchaseQuantity: 1, purchaseUnit: 'pcs' });
  const pack = [{ packagingId: kotak.id, quantityUsed: 1, usageSemantics: 'per_portion' as const }];
  const nasi = await saveMenu(t.ctx, { name: 'Nasi Lemak', yield: 10, productionMinutesPerBatch: 60, sellingPrice: 12, ingredients: [{ ingredientId: ayam.id, quantity: 1200, usageUnit: 'g' }, { ingredientId: lain.id, quantity: 1000, usageUnit: 'g' }], packaging: pack, equipment: [] });
  const sandwic = await saveMenu(t.ctx, { name: 'Sandwic Ayam', yield: 10, productionMinutesPerBatch: 60, sellingPrice: 15, ingredients: [{ ingredientId: ayam.id, quantity: 800, usageUnit: 'g' }, { ingredientId: lain.id, quantity: 500, usageUnit: 'g' }], packaging: pack, equipment: [] });
  const kuih = await saveMenu(t.ctx, { name: 'Kuih', yield: 10, productionMinutesPerBatch: 30, sellingPrice: 3, ingredients: [{ ingredientId: gula.id, quantity: 500, usageUnit: 'g' }], packaging: [], equipment: [] });
  return { ...t, ayam, lain, gula, nasi, sandwic, kuih };
}
const load = (w: Awaited<ReturnType<typeof world>>) => loadCostingData(w.ctx);
const cost = (r: { complete: boolean }) => {
  const x = r as { complete: true; fullCost: number; profit: number; marginPct: number; status: string };
  if (!x.complete) throw new Error('expected complete');
  return x;
};

describe('What-If (Doc 02 §12, Doc 06 §6)', () => {
  it('chicken +20%: Nasi Lemak 12.44 to 12.80, profit −0.44 to −0.80, unit cost 15 to 18 per kg', async () => {
    const w = await world();
    const v = whatIf(await load(w), w.ayam.id, { kind: 'pct', pct: 20 })!;
    expect(v).toMatchObject({ beforePrice: 15, afterPrice: 18, changed: true });
    expect(v.beforeUnit).toEqual({ amount: 15, unit: 'kg' });
    expect(v.afterUnit).toEqual({ amount: 18, unit: 'kg' });
    expect(v.unitPct).toBeCloseTo(20, 9);
    const nasi = v.menus.find((m) => m.name === 'Nasi Lemak')!;
    expect(cost(nasi.before).fullCost).toBeCloseTo(12.44, 9);
    expect(cost(nasi.after).fullCost).toBeCloseTo(12.8, 9);
    expect(cost(nasi.after).profit).toBeCloseTo(-0.8, 9);
    expect(cost(nasi.after).marginPct).toBeCloseTo(-6.6667, 3);
  });

  it('writes nothing: ingredient, history and table counts are unchanged', async () => {
    const w = await world();
    const before = { ing: await w.db.ingredients.toArray(), hist: await w.db.priceHistory.count(), insights: await w.db.insights.count(), scen: await w.db.scenarios.count() };
    whatIf(await load(w), w.ayam.id, { kind: 'pct', pct: 30 });
    whatIf(await load(w), w.ayam.id, { kind: 'price', price: 99 });
    expect(await w.db.ingredients.toArray()).toEqual(before.ing);
    expect(await w.db.priceHistory.count()).toBe(before.hist);
    expect(await w.db.insights.count()).toBe(before.insights);
    expect(await w.db.scenarios.count()).toBe(before.scen);
  });

  it('lists only the menus that use the ingredient', async () => {
    const w = await world();
    const v = whatIf(await load(w), w.ayam.id, { kind: 'pct', pct: 10 })!;
    expect(v.menus.map((m) => m.name).sort()).toEqual(['Nasi Lemak', 'Sandwic Ayam']);
  });

  it('a typed price and the same change as a percentage give the same result', async () => {
    const w = await world();
    const a = whatIf(await load(w), w.ayam.id, { kind: 'price', price: 18 })!;
    const b = whatIf(await load(w), w.ayam.id, { kind: 'pct', pct: 20 })!;
    expect(a.afterPrice).toBe(b.afterPrice);
    expect(cost(a.menus[0]!.after).profit).toBe(cost(b.menus[0]!.after).profit);
  });

  it('the preview price is rounded to the sen, the same value Apply would store', async () => {
    const w = await world();
    const odd = await createIngredient(w.ctx, { name: 'Tepung', purchasePrice: 13.33, packageQuantity: 1, packageUnit: 'kg' });
    expect(whatIf(await load(w), odd.id, { kind: 'pct', pct: 7 })!.afterPrice).toBe(14.26);
  });

  it('no change (0% or the same price) is reported as unchanged', async () => {
    const w = await world();
    expect(whatIf(await load(w), w.ayam.id, { kind: 'pct', pct: 0 })!.changed).toBe(false);
    expect(whatIf(await load(w), w.ayam.id, { kind: 'price', price: 15 })!.changed).toBe(false);
  });

  it('flags menus whose status flips', async () => {
    const w = await world();
    const v = whatIf(await load(w), w.ayam.id, { kind: 'price', price: 200 })!;
    expect(v.menus.find((m) => m.name === 'Sandwic Ayam')!.statusChanged).toBe(true);
    expect(v.menus.find((m) => m.name === 'Nasi Lemak')!.statusChanged).toBe(false);
    expect(v.statusChangeCount).toBe(1);
  });

  it('an incomplete menu stays incomplete and names its issue; nothing is guessed', async () => {
    const w = await world();
    await saveMenu(w.ctx, { name: 'Tiada harga', yield: 5, productionMinutesPerBatch: 0, sellingPrice: 0, ingredients: [{ ingredientId: w.ayam.id, quantity: 100, usageUnit: 'g' }], packaging: [], equipment: [] });
    const m = whatIf(await load(w), w.ayam.id, { kind: 'pct', pct: 10 })!.menus.find((x) => x.name === 'Tiada harga')!;
    expect(m.before.complete).toBe(false);
    expect(m.after.complete).toBe(false);
    expect(m.statusChanged).toBe(false);
  });

  it('unknown ingredient gives no view', async () => {
    const w = await world();
    expect(whatIf(await load(w), 'nope', { kind: 'pct', pct: 10 })).toBeNull();
  });

  it('Apply through updateIngredient: one scenario_apply history record, and live menus equal the preview', async () => {
    const w = await world();
    const preview = whatIf(await load(w), w.ayam.id, { kind: 'pct', pct: 20 })!;
    const histBefore = (await listHistory(w.ctx, w.ayam.id)).length;
    await updateIngredient(w.ctx, w.ayam.id, { purchasePrice: preview.afterPrice }, { sourceType: 'scenario_apply', purchaseDate: '2026-09-30' });
    const hist = await listHistory(w.ctx, w.ayam.id);
    expect(hist).toHaveLength(histBefore + 1);
    expect(hist[hist.length - 1]).toMatchObject({ sourceType: 'scenario_apply', purchasePrice: 18 });
    const live = computeAllMenus(await load(w)).get(w.nasi.menuId)!.result;
    expect(cost(live).profit).toBe(cost(preview.menus.find((m) => m.name === 'Nasi Lemak')!.after).profit);
  });
});

describe('parseScenarioInput', () => {
  it('accepts a percentage above −100 (including a drop) and a price of zero or more', () => {
    expect(parseScenarioInput('12,5', 'pct')).toEqual({ ok: true, change: { kind: 'pct', pct: 12.5 } });
    expect(parseScenarioInput('-25', 'pct')).toEqual({ ok: true, change: { kind: 'pct', pct: -25 } });
    expect(parseScenarioInput('16.80', 'price')).toEqual({ ok: true, change: { kind: 'price', price: 16.8 } });
  });
  it('rejects blank, text, −100% or below, and a negative price', () => {
    for (const [text, kind] of [['', 'pct'], ['abc', 'pct'], ['-100', 'pct'], ['-150', 'pct'], ['-1', 'price'], ['', 'price']] as const) {
      expect(parseScenarioInput(text, kind).ok).toBe(false);
    }
  });
});

describe('History Review (read-only, exact transition)', () => {
  it('shows Sebelum vs Selepas for that record against the one before it, not the latest price', async () => {
    const w = await world();
    await updateIngredient(w.ctx, w.ayam.id, { purchasePrice: 18 }, { purchaseDate: '2026-09-10' });
    await updateIngredient(w.ctx, w.ayam.id, { purchasePrice: 30 }, { purchaseDate: '2026-09-20' });
    const hist = await listHistory(w.ctx, w.ayam.id);
    const v = historyReview(await load(w), hist, w.ayam.id, hist[1]!.id)!;
    expect(v).toMatchObject({ beforePrice: 15, afterPrice: 18, changed: true });
    const nasi = v.menus.find((m) => m.name === 'Nasi Lemak')!;
    expect(cost(nasi.before).fullCost).toBeCloseTo(12.44, 9);
    expect(cost(nasi.after).fullCost).toBeCloseTo(12.8, 9);
  });

  it('the baseline record has no earlier version to compare with', async () => {
    const w = await world();
    const hist = await listHistory(w.ctx, w.ayam.id);
    expect(historyReview(await load(w), hist, w.ayam.id, hist[0]!.id)).toBeNull();
  });

  it('a package-size-only record still moves the menu cost', async () => {
    const w = await world();
    await updateIngredient(w.ctx, w.lain.id, { packageQuantity: 0.9 }, { purchaseDate: '2026-09-20' });
    const hist = await listHistory(w.ctx, w.lain.id);
    const v = historyReview(await load(w), hist, w.lain.id, hist[1]!.id)!;
    expect(v.unitPct).toBeCloseTo((1 / 0.9 - 1) * 100, 6);
    const nasi = v.menus.find((m) => m.name === 'Nasi Lemak')!;
    expect(cost(nasi.after).fullCost).toBeGreaterThan(cost(nasi.before).fullCost);
  });

  it('is read-only', async () => {
    const w = await world();
    await updateIngredient(w.ctx, w.ayam.id, { purchasePrice: 18 }, { purchaseDate: '2026-09-10' });
    const all = await listAllHistory(w.ctx);
    const n = await w.db.priceHistory.count();
    historyReview(await load(w), await listHistory(w.ctx, w.ayam.id), w.ayam.id, all.find((r) => r.purchasePrice === 18)!.id);
    expect(await w.db.priceHistory.count()).toBe(n);
  });
});
