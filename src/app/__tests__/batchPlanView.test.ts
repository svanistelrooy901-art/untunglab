import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { createIngredient, ensureBusiness } from '../../db/repo';
import { createPackaging } from '../../db/masterData';
import { loadCostingData, saveMenu } from '../../db/menus';
import { freshContext } from '../../db/__tests__/helpers';
import { setLang, resetLangForTests } from '../../i18n/lang';
import { encodePayload, readBatchListLink, type BatchList } from '../../link';
import { batchPlanText, linkErrorText, parsePieces, planFor, prefillFromBatchList } from '../batchPlanView';
import { computeAllMenus } from '../menuAssembly';

const fixture = (f: string) => readFileSync(new URL(`../../../spec/fixtures/${f}`, import.meta.url), 'utf8');

afterEach(() => {
  setLang('ms');
  resetLangForTests();
});

describe('pieces input', () => {
  it('blank is 0; only whole numbers from 0 are accepted, never guessed', () => {
    expect(parsePieces('')).toBe(0);
    expect(parsePieces(' 12 ')).toBe(12);
    expect(parsePieces('1,000')).toBe(1000);
    expect(parsePieces('0')).toBe(0);
    for (const bad of ['1.5', '-1', 'abc', '100001']) expect(parsePieces(bad), bad).toBeNull();
  });
});

describe('prefill from a JualanLab link', () => {
  it('reads the fixture link through the full URL and fills quantities by menu id', () => {
    const read = readBatchListLink(fixture('batch-list.valid.link.txt'));
    expect(read.ok).toBe(true);
    if (!read.ok) return;
    const p = prefillFromBatchList(read.value, new Set(['m-karipap-01', 'm-brownies-01']));
    expect(p.batchDate).toBe('2026-10-18');
    expect([...p.quantities]).toEqual([['m-karipap-01', 50], ['m-brownies-01', 18]]);
    // Not found here, and JualanLab-only: listed by name, not calculated.
    expect(p.notCalculated).toEqual([{ name: 'Kek batik (sepotong)', quantity: 20 }, { name: 'Air botol', quantity: 10 }]);
  });

  it('a link from a newer JualanLab asks to update UntungLab', () => {
    const newer = { ...(JSON.parse(fixture('batch-list.valid.json')) as BatchList), format: 2 };
    const r = readBatchListLink(`https://untunglab.space/#/rancang-batch?d=${encodePayload(newer)}`);
    expect(r).toMatchObject({ ok: false, error: { code: 'newer_format' } });
    if (!r.ok) expect(linkErrorText(r.error)).toMatch(/Kemas kini UntungLab/);
    setLang('en');
    if (!r.ok) expect(linkErrorText(r.error)).toMatch(/Update UntungLab/);
  });

  it('a damaged link is explained in plain words', () => {
    const r = readBatchListLink('https://untunglab.space/#/rancang-batch?d=1.abc$');
    if (r.ok) throw new Error('expected an error');
    expect(linkErrorText(r.error)).toBe('Pautan ini rosak atau terpotong. Hantar semula dari JualanLab.');
  });
});

describe('plan from stored menus', () => {
  async function world() {
    const { ctx } = freshContext('2026-10-14T08:00:00');
    await ensureBusiness(ctx);
    const flour = await createIngredient(ctx, { name: 'Tepung', purchasePrice: 25, packageQuantity: 5, packageUnit: 'kg' });
    const choc = await createIngredient(ctx, { name: 'Coklat', purchasePrice: 30, packageQuantity: 1, packageUnit: 'kg' });
    const box = await createPackaging(ctx, { name: 'Kotak', purchasePrice: 20, purchaseQuantity: 50, purchaseUnit: 'pcs' });
    const base = await saveMenu(ctx, {
      name: 'Brownies', yield: 10, productionMinutesPerBatch: 60, sellingPrice: 12,
      ingredients: [{ ingredientId: flour.id, quantity: 250, usageUnit: 'g' }],
      packaging: [{ packagingId: box.id, quantityUsed: 1, usageSemantics: 'per_portion' }],
      equipment: [],
    });
    const variation = await saveMenu(ctx, {
      name: 'Brownies Coklat', baseMenuId: base.menuId, yield: 10, productionMinutesPerBatch: 60, sellingPrice: 15,
      ingredients: [{ ingredientId: choc.id, quantity: 100, usageUnit: 'g' }], packaging: [], equipment: [],
    });
    const data = await loadCostingData(ctx);
    // The screen lists menus by name; the plan keeps that order.
    const order = [...computeAllMenus(data).values()].sort((a, b) => a.menu.name.localeCompare(b.menu.name, 'ms'));
    return { data, order, base, variation, flour, choc, box };
  }

  it('a variation brings its base lines (yield, flour, box) plus its own extras', async () => {
    const w = await world();
    const plan = planFor(w.order, w.data, new Map([[w.variation.menuId, 15]]));
    expect(plan.menus).toEqual([{ menuId: w.variation.menuId, name: 'Brownies Coklat', pieces: 15, yield: 10, batches: 1.5 }]);
    expect(plan.shopping.map((s) => [s.name, s.needed])).toEqual([['Coklat', 150], ['Tepung', 375]]);
    expect(plan.packaging.map((p) => [p.name, p.needed])).toEqual([['Kotak', 15]]);
    expect(plan.issues).toEqual([]);
  });

  it('base and variation together add up; 0 and inactive menus are left out', async () => {
    const w = await world();
    const plan = planFor(w.order, w.data, new Map([[w.base.menuId, 10], [w.variation.menuId, 0]]));
    expect(plan.menus.map((m) => m.name)).toEqual(['Brownies']);
    expect(plan.shopping.map((s) => [s.name, s.needed])).toEqual([['Tepung', 250]]);
  });

  it('copies a WhatsApp-friendly list with the same figures, and "≈" when a number is rounded', async () => {
    const w = await world();
    const plan = planFor(w.order, w.data, new Map([[w.base.menuId, 25], [w.variation.menuId, 15]]));
    const text = batchPlanText({ date: '2026-10-18', plan, packagingUnit: () => 'pcs', notCalculated: [{ name: 'Air botol', quantity: 10 }] });
    expect(text).toBe(
      [
        '*Rancang Batch 2026-10-18*',
        '',
        '*Batch setiap menu*',
        '• Brownies: 25 unit = 2.5 batch',
        '• Brownies Coklat: 15 unit = 1.5 batch',
        '',
        '*Senarai beli*',
        '• Coklat: perlu 150 g, beli 1 × 1 kg',
        '• Tepung: perlu 1,000 g, beli 1 × 5 kg',
        '',
        '*Pembungkusan*',
        '• Kotak: perlu 40, beli 1 × 50 pcs',
        '',
        'Anggaran kos bahan digunakan: RM9.50',
        'Anggaran kos pembungkusan digunakan: RM16.00',
        '',
        '*Tidak dikira di UntungLab*',
        '• Air botol × 10',
        '',
      ].join('\n'),
    );
  });

  it('a line that cannot be worked out says so in the copied text, and no total is given', async () => {
    const w = await world();
    const plan = planFor(w.order, w.data, new Map([[w.base.menuId, 25]]));
    const broken = { ...plan, shopping: plan.shopping.map((s) => ({ ...s, needed: null, packsToBuy: null, estimatedCost: null })), ingredientCost: null };
    const text = batchPlanText({ date: '2026-10-18', plan: broken, packagingUnit: () => 'pcs', notCalculated: [] });
    expect(text).toContain('• Tepung: belum dapat dikira');
    expect(text).not.toContain('Anggaran kos bahan');
  });
});
