import { describe, expect, it } from 'vitest';
import { createIngredient, ensureBusiness, listAllHistory, saveOperatingCost, updateIngredient } from '../../db';
import { loadCostingData, saveMenu, saveCostProfile, setTariff, createPackaging } from '../../db';
import { freshContext } from '../../db/__tests__/helpers';
import { computeAllMenus } from '../menuAssembly';
import { PRICE_ALERT_PCT, buildDashboard, buildTrails } from '../insights';

async function world() {
  const t = freshContext('2026-09-01T08:00:00');
  const biz = await ensureBusiness(t.ctx);
  await saveCostProfile(t.ctx, { valueOfTimePerHour: 25, expectedMonthlySales: 3000 });
  await setTariff(t.ctx, 0.5, '2026-01-01');
  await saveOperatingCost(t.ctx, { businessId: biz.id, category: 'gas', mode: 'simple', simpleAmount: 600, active: true, classification: 'shared' });
  const ayam = await createIngredient(t.ctx, { name: 'Ayam', purchasePrice: 15, packageQuantity: 1, packageUnit: 'kg' });
  const lain = await createIngredient(t.ctx, { name: 'Bahan lain', purchasePrice: 50.4, packageQuantity: 1, packageUnit: 'kg' });
  const kotak = await createPackaging(t.ctx, { name: 'Kotak', purchasePrice: 0.7, purchaseQuantity: 1, purchaseUnit: 'pcs' });
  const nasi = await saveMenu(t.ctx, {
    name: 'Nasi Lemak', yield: 10, productionMinutesPerBatch: 60, sellingPrice: 12,
    ingredients: [{ ingredientId: ayam.id, quantity: 1200, usageUnit: 'g' }, { ingredientId: lain.id, quantity: 1000, usageUnit: 'g' }],
    packaging: [{ packagingId: kotak.id, quantityUsed: 1, usageSemantics: 'per_portion' }], equipment: [],
  });
  const sandwic = await saveMenu(t.ctx, {
    name: 'Sandwic Ayam', yield: 10, productionMinutesPerBatch: 60, sellingPrice: 15,
    ingredients: [{ ingredientId: ayam.id, quantity: 800, usageUnit: 'g' }, { ingredientId: lain.id, quantity: 500, usageUnit: 'g' }],
    packaging: [{ packagingId: kotak.id, quantityUsed: 1, usageSemantics: 'per_portion' }], equipment: [],
  });
  return { ...t, ayam, lain, nasi, sandwic };
}

const load = async (w: Awaited<ReturnType<typeof world>>) => {
  const data = await loadCostingData(w.ctx);
  const history = await listAllHistory(w.ctx);
  return { data, history, costed: computeAllMenus(data) };
};

describe('dashboard', () => {
  it('M04: every ranked figure is exactly what the menu detail (the engine result) shows', async () => {
    const w = await world();
    const { data, history, costed } = await load(w);
    const d = buildDashboard(data, history);
    expect(d.ranking).toHaveLength(2);
    for (const row of d.ranking) {
      const r = costed.get(row.menuId)?.result;
      if (!r?.complete) throw new Error('expected complete');
      expect(row.fullCost).toBe(r.fullCost);
      expect(row.profit).toBe(r.profit);
      expect(row.marginPct).toBe(r.marginPct);
      expect(row.status).toBe(r.status);
    }
  });

  it('ranks by margin, best first, and leaves incomplete menus out of the ranking', async () => {
    const w = await world();
    await saveMenu(w.ctx, { name: 'Tiada harga', yield: 5, productionMinutesPerBatch: 0, sellingPrice: 0, ingredients: [], packaging: [], equipment: [] });
    const { data, history } = await load(w);
    const d = buildDashboard(data, history);
    expect(d.ranking.map((r) => r.name)).toEqual(['Sandwic Ayam', 'Nasi Lemak']);
    expect(d.ranking[0]!.marginPct).toBeGreaterThan(d.ranking[1]!.marginPct);
    expect(d.incomplete.map((m) => m.name)).toEqual(['Tiada harga']);
    expect(d.incomplete[0]!.issues.length).toBeGreaterThan(0);
    expect(d.menuCount).toBe(3);
  });

  it('a loss menu is a critical insight listing the menu, and comes first', async () => {
    const w = await world();
    const { data, history } = await load(w);
    const first = buildDashboard(data, history).insights[0]!;
    expect(first.type).toBe('loss');
    if (first.type !== 'loss') throw new Error();
    expect(first.severity).toBe('critical');
    expect(first.menus.map((m) => m.name)).toEqual(['Nasi Lemak']);
    expect(first.to).toBe(`/menu/${w.nasi.menuId}`);
  });

  it('several loss menus link to the menu list, not one arbitrary menu', async () => {
    const w = await world();
    await saveMenu(w.ctx, { name: 'Rugi juga', yield: 1, productionMinutesPerBatch: 0, sellingPrice: 1, ingredients: [{ ingredientId: w.ayam.id, quantity: 500, usageUnit: 'g' }], packaging: [], equipment: [] });
    const { data, history } = await load(w);
    const first = buildDashboard(data, history).insights[0]!;
    if (first.type !== 'loss') throw new Error();
    expect(first.menus).toHaveLength(2);
    expect(first.to).toBe('/menu');
  });

  it('no menus: no ranking, no insights', async () => {
    const t = freshContext();
    await ensureBusiness(t.ctx);
    const data = await loadCostingData(t.ctx);
    const d = buildDashboard(data, await listAllHistory(t.ctx));
    expect(d).toMatchObject({ menuCount: 0, ranking: [], incomplete: [], insights: [] });
  });
});

describe('ingredient movement insights', () => {
  it('states item, normalised movement and affected menus, and links to Kesan Harga', async () => {
    const w = await world();
    w.setNow('2026-09-20T08:00:00');
    await updateIngredient(w.ctx, w.ayam.id, { purchasePrice: 16.065 }, { purchaseDate: '2026-09-20' }); // +7.1%
    const { data, history } = await load(w);
    const move = buildDashboard(data, history).insights.find((i) => i.type === 'price_move');
    if (move?.type !== 'price_move') throw new Error('expected a price movement');
    expect(move).toMatchObject({ name: 'Ayam', direction: 'up', severity: 'warning', displayUnit: 'kg' });
    expect(move.percent).toBeCloseTo(7.1, 6);
    expect(move.affected.map((m) => m.name).sort()).toEqual(['Nasi Lemak', 'Sandwic Ayam']);
    expect(move.to).toBe(`/kesan-harga?bahan=${w.ayam.id}`);
  });

  it('a package-size-only change still shows its real movement (Doc 02 §11)', async () => {
    const w = await world();
    await updateIngredient(w.ctx, w.lain.id, { packageQuantity: 0.9 }, { purchaseDate: '2026-09-20' }); // same RM50.4, smaller pack
    const { data, history } = await load(w);
    const move = buildDashboard(data, history).insights.find((i) => i.type === 'price_move');
    if (move?.type !== 'price_move') throw new Error('expected a price movement');
    expect(move.name).toBe('Bahan lain');
    expect(move.direction).toBe('up');
    expect(move.percent).toBeCloseTo((1 / 0.9 - 1) * 100, 6);
  });

  it('movement below the alert threshold is on Jejak Harga but not an insight', async () => {
    const w = await world();
    await updateIngredient(w.ctx, w.ayam.id, { purchasePrice: 15 * (1 + (PRICE_ALERT_PCT - 1) / 100) }, { purchaseDate: '2026-09-20' });
    const { data, history } = await load(w);
    expect(buildDashboard(data, history).insights.some((i) => i.type === 'price_move')).toBe(false);
    const trail = buildTrails(data, history).find((x) => x.ingredient.id === w.ayam.id)!;
    expect(trail.lastChange?.comparison.percentChange).toBeCloseTo(PRICE_ALERT_PCT - 1, 6);
  });

  it('a price drop is informational and states the direction', async () => {
    const w = await world();
    await updateIngredient(w.ctx, w.ayam.id, { purchasePrice: 12 }, { purchaseDate: '2026-09-20' });
    const { data, history } = await load(w);
    const move = buildDashboard(data, history).insights.find((i) => i.type === 'price_move');
    if (move?.type !== 'price_move') throw new Error();
    expect(move).toMatchObject({ direction: 'down', severity: 'info' });
    expect(move.percent).toBeCloseTo(-20, 6);
  });

  it('a movement on an ingredient no menu uses is not an alert', async () => {
    const w = await world();
    const solo = await createIngredient(w.ctx, { name: 'Gula', purchasePrice: 3, packageQuantity: 1, packageUnit: 'kg' });
    await updateIngredient(w.ctx, solo.id, { purchasePrice: 6 }, { purchaseDate: '2026-09-20' });
    const { data, history } = await load(w);
    expect(buildDashboard(data, history).insights.some((i) => i.type === 'price_move' && i.name === 'Gula')).toBe(false);
  });

  it('only the latest movement of an ingredient is reported, and biggest movement first', async () => {
    const w = await world();
    await updateIngredient(w.ctx, w.ayam.id, { purchasePrice: 30 }, { purchaseDate: '2026-09-10' });
    await updateIngredient(w.ctx, w.ayam.id, { purchasePrice: 33 }, { purchaseDate: '2026-09-15' }); // +10% latest
    await updateIngredient(w.ctx, w.lain.id, { purchasePrice: 60.48 }, { purchaseDate: '2026-09-16' }); // +20%
    const { data, history } = await load(w);
    const moves = buildDashboard(data, history).insights.filter((i) => i.type === 'price_move');
    expect(moves.map((m) => (m.type === 'price_move' ? m.name : ''))).toEqual(['Bahan lain', 'Ayam']);
    expect((moves[1] as { percent: number }).percent).toBeCloseTo(10, 6);
  });
});

describe('Jejak Harga trails', () => {
  it('latest price, latest normalised unit cost, and ordered history with per-step change', async () => {
    const w = await world();
    await updateIngredient(w.ctx, w.ayam.id, { purchasePrice: 18 }, { purchaseDate: '2026-09-12' });
    await updateIngredient(w.ctx, w.ayam.id, { purchasePrice: 17 }, { purchaseDate: '2026-09-05' }); // back-dated, still ordered by date
    const { data, history } = await load(w);
    const trail = buildTrails(data, history).find((x) => x.ingredient.id === w.ayam.id)!;
    expect(trail.changes.map((c) => c.entry.purchaseDate)).toEqual(['2026-09-01', '2026-09-05', '2026-09-12']);
    expect(trail.latest?.purchasePrice).toBe(18);
    expect(trail.latestUnit).toEqual({ amount: 18, unit: 'kg' });
    expect(trail.lastChange?.comparison.percentChange).toBeCloseTo((18 / 17 - 1) * 100, 6);
  });

  it('counts affected menus and names them', async () => {
    const w = await world();
    const { data, history } = await load(w);
    const trails = buildTrails(data, history);
    expect(trails.find((x) => x.ingredient.id === w.ayam.id)!.affectedMenus.map((m) => m.name).sort()).toEqual(['Nasi Lemak', 'Sandwic Ayam']);
  });

  it('an ingredient with only its baseline has no change and nothing to alert', async () => {
    const w = await world();
    const { data, history } = await load(w);
    const trail = buildTrails(data, history)[0]!;
    expect(trail.lastChange).toBeNull();
    expect(trail.changes).toHaveLength(1);
    expect(trail.changes[0]!.kind).toBe('baseline');
  });

  it('most recently changed first, then by name; archived ingredients are left out', async () => {
    const w = await world();
    await updateIngredient(w.ctx, w.lain.id, { purchasePrice: 55 }, { purchaseDate: '2026-09-25' });
    const off = await createIngredient(w.ctx, { name: 'Lama', purchasePrice: 1, packageQuantity: 1, packageUnit: 'kg' });
    const { setIngredientActive } = await import('../../db');
    await setIngredientActive(w.ctx, off.id, false);
    const { data, history } = await load(w);
    const names = buildTrails(data, history).map((x) => x.ingredient.name);
    expect(names).toEqual(['Bahan lain', 'Ayam']);
  });
});
