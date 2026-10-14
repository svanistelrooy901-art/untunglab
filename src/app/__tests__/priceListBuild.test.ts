import { describe, expect, it } from 'vitest';
import { menuSummary } from '../../domain';
import { createIngredient, ensureBusiness, saveOperatingCost } from '../../db/repo';
import { createPackaging } from '../../db/masterData';
import { loadCostingData, saveMenu, type MenuDraft } from '../../db/menus';
import { saveCostProfile } from '../../db/settings';
import { fillOperatingZeros, freshContext } from '../../db/__tests__/helpers';
import { fitsInQr, priceListFileName, priceListFileText, priceListLink, readPriceListFile, readPriceListLink, validatePriceList } from '../../link';
import { computeAllMenus } from '../menuAssembly';
import { PriceListBuildError, buildPriceList, malaysiaDate, malaysiaDateTime } from '../priceListBuild';

// 20:42:05 in Malaysia on 14 Oct 2026.
const NOW = new Date('2026-10-14T12:42:05.123Z');

/** A complete business (20% operating rate, RM25/hour) with flour and a box, through the real storage path. */
async function world(opts: { complete?: boolean } = {}) {
  const t = freshContext('2026-10-14T08:00:00');
  const { ctx } = t;
  const biz = await ensureBusiness(ctx);
  if (opts.complete !== false) {
    await saveCostProfile(ctx, { valueOfTimePerHour: 25, expectedMonthlySales: 3000 });
    await saveOperatingCost(ctx, { businessId: biz.id, category: 'gas', mode: 'simple', simpleAmount: 600, active: true, classification: 'shared' });
    await fillOperatingZeros(ctx, biz.id);
  }
  const flour = await createIngredient(ctx, { name: 'Tepung', purchasePrice: 25, packageQuantity: 5, packageUnit: 'kg' });
  const choc = await createIngredient(ctx, { name: 'Coklat', purchasePrice: 30, packageQuantity: 1, packageUnit: 'kg' });
  const box = await createPackaging(ctx, { name: 'Kotak', purchasePrice: 20, purchaseQuantity: 50, purchaseUnit: 'pcs' });
  const brownies: MenuDraft = {
    name: 'Brownies',
    category: 'Kek',
    yield: 10,
    productionMinutesPerBatch: 60,
    sellingPrice: 12,
    ingredients: [{ ingredientId: flour.id, quantity: 250, usageUnit: 'g' }],
    packaging: [{ packagingId: box.id, quantityUsed: 1, usageSemantics: 'per_portion' }],
    equipment: [],
  };
  return { ...t, flour, choc, box, brownies };
}

const costedOf = async (ctx: Parameters<typeof loadCostingData>[0]) => computeAllMenus(await loadCostingData(ctx));

describe('Malaysian time', () => {
  it('sentAt is ISO 8601 with +08:00, to the second, and the date follows Malaysia, not UTC', () => {
    expect(malaysiaDateTime(NOW)).toBe('2026-10-14T20:42:05+08:00');
    expect(malaysiaDate(new Date('2026-10-14T16:30:00Z'))).toBe('2026-10-15'); // 00:30 next day in Malaysia
  });
});

describe('buildPriceList', () => {
  it('sends a complete menu with its price in sen and the engine’s margin and status', async () => {
    const w = await world();
    const saved = await saveMenu(w.ctx, w.brownies);
    const costed = await costedOf(w.ctx);
    const list = buildPriceList(costed, NOW);
    const summary = menuSummary(costed.get(saved.menuId)!.result)!;
    expect(summary).not.toBeNull();
    expect(list).toMatchObject({ app: 'untunglab', kind: 'price-list', format: 1, currency: 'MYR', sentAt: '2026-10-14T20:42:05+08:00' });
    expect(list.menus).toEqual([
      { id: saved.menuId, name: 'Brownies', category: 'Kek', priceSen: 1200, marginPct: Math.round(summary.marginPct * 100) / 100, status: summary.status, baseMenuId: null },
    ]);
  });

  it('converts the ringgit price without float drift (RM1.15 = 115 sen)', async () => {
    const w = await world();
    await saveMenu(w.ctx, { ...w.brownies, sellingPrice: 1.15 });
    expect(buildPriceList(await costedOf(w.ctx), NOW).menus[0]!.priceSen).toBe(115);
  });

  it('a variation points to its base when the base is in the list', async () => {
    const w = await world();
    const base = await saveMenu(w.ctx, w.brownies);
    const v = await saveMenu(w.ctx, { ...w.brownies, name: 'Brownies Coklat', category: undefined, baseMenuId: base.menuId, sellingPrice: 15, ingredients: [{ ingredientId: w.choc.id, quantity: 100, usageUnit: 'g' }], packaging: [] });
    const list = buildPriceList(await costedOf(w.ctx), NOW);
    const variation = list.menus.find((m) => m.id === v.menuId)!;
    expect(variation.baseMenuId).toBe(base.menuId);
    expect(variation.category).toBe('Kek'); // follows the base (D-86)
    expect(list.menus.find((m) => m.id === base.menuId)!.baseMenuId).toBeNull();
    expect(validatePriceList(list)).toEqual({ ok: true, value: list, warnings: [] });
  });

  it('a variation whose base is not active goes as a standalone menu, and inactive menus are left out', async () => {
    const w = await world();
    const base = await saveMenu(w.ctx, w.brownies);
    const v = await saveMenu(w.ctx, { ...w.brownies, name: 'Brownies Coklat', baseMenuId: base.menuId, sellingPrice: 15, ingredients: [], packaging: [] });
    await w.db.menus.update(base.menuId, { active: false });
    const list = buildPriceList(await costedOf(w.ctx), NOW);
    expect(list.menus.map((m) => m.id)).toEqual([v.menuId]);
    expect(list.menus[0]!.baseMenuId).toBeNull();
    expect(validatePriceList(list)).toEqual({ ok: true, value: list, warnings: [] });
  });

  it('an incomplete menu goes with margin and status null, never a guessed number', async () => {
    const w = await world({ complete: false }); // Kos Operasi and Nilai Masa not filled
    const saved = await saveMenu(w.ctx, w.brownies);
    const costed = await costedOf(w.ctx);
    expect(costed.get(saved.menuId)!.result.complete).toBe(false);
    expect(buildPriceList(costed, NOW).menus[0]).toMatchObject({ priceSen: 1200, marginPct: null, status: null });
  });

  it('a menu with no price (RM0 draft) goes with priceSen 0 and margin and status null', async () => {
    const w = await world();
    await saveMenu(w.ctx, { ...w.brownies, sellingPrice: 0 });
    expect(buildPriceList(await costedOf(w.ctx), NOW).menus[0]).toMatchObject({ priceSen: 0, marginPct: null, status: null });
  });

  it('a menu without a category goes with category null', async () => {
    const w = await world();
    await saveMenu(w.ctx, { ...w.brownies, category: undefined });
    expect(buildPriceList(await costedOf(w.ctx), NOW).menus[0]!.category).toBeNull();
  });

  it('round trip: the link and the file decode back to the same list and pass the format check', async () => {
    const w = await world();
    const base = await saveMenu(w.ctx, w.brownies);
    await saveMenu(w.ctx, { ...w.brownies, name: 'Brownies “Kedut” — ½ loyang', baseMenuId: base.menuId, sellingPrice: 15, ingredients: [], packaging: [] });
    await saveMenu(w.ctx, { ...w.brownies, name: 'Kuih draf', category: undefined, sellingPrice: 0 });
    const list = buildPriceList(await costedOf(w.ctx), NOW);
    expect(list.menus).toHaveLength(3);

    const link = priceListLink(list);
    expect(link.startsWith('https://jualan.untunglab.space/terima#d=1.')).toBe(true);
    expect(fitsInQr(link)).toBe(true);
    const back = readPriceListLink(link);
    expect(back).toEqual({ ok: true, value: list, warnings: [] });
    if (back.ok) expect(validatePriceList(back.value).ok).toBe(true);

    expect(priceListFileName(list.sentAt)).toBe('untunglab-harga-2026-10-14.json');
    expect(readPriceListFile(priceListFileText(list))).toEqual({ ok: true, value: list, warnings: [] });
  });

  it('refuses to build a list the format would reject, and names the menu', async () => {
    const w = await world();
    const long = 'K'.repeat(130); // UntungLab has no name limit; the format allows 120 characters
    const saved = await saveMenu(w.ctx, { ...w.brownies, name: long });
    let caught: unknown;
    try {
      buildPriceList(await costedOf(w.ctx), NOW);
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(PriceListBuildError);
    const err = caught as PriceListBuildError;
    expect(err.error).toMatchObject({ code: 'invalid', path: 'menus[0].name' });
    expect(err.menuId).toBe(saved.menuId);
    expect(err.menuName).toBe(long);
  });

  it('an empty list is refused (the format needs at least one menu)', () => {
    expect(() => buildPriceList(new Map(), NOW)).toThrow(PriceListBuildError);
  });
});
