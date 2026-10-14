import { describe, expect, it } from 'vitest';
import { packsToBuy, planBatch, type BatchPlanMenuInput } from '../batchPlan';
import { computeMenuCost } from '../costing';
import { MINUS, formatQuantity, isRoundedForDisplay } from '../format';
import type { IngredientLine, MenuInput, PackagingLine } from '../types';
import { business } from './fixtures';

const tepung = { id: 'tepung', purchasePrice: 25, packageQuantity: 5, packageUnit: 'kg' };
const minyak = { id: 'minyak', purchasePrice: 8, packageQuantity: 1, packageUnit: 'l' };
// Counted: one tray ("papan") of 30 eggs for RM12, so RM0.40 an egg.
const telur = { id: 'telur', purchasePrice: 12, packageQuantity: 1, packageUnit: 'papan', packMappings: [{ pack: 'papan', unit: 'biji', unitsPerPack: 30 }] };
const kotak = { id: 'kotak', purchasePrice: 20, purchaseQuantity: 50 };
const dulang = { id: 'dulang', purchasePrice: 15, purchaseQuantity: 10 };

const ing = (src: IngredientLine['ingredient'], quantity: number, unit: string, ref?: string): IngredientLine => ({
  ref: ref ?? src?.id,
  ingredient: src,
  quantity,
  unit,
});
const pack = (src: PackagingLine['packaging'], quantityUsed: number, semantics: PackagingLine['semantics'], ref?: string): PackagingLine => ({
  ref: ref ?? src?.id,
  packaging: src,
  quantityUsed,
  semantics,
});
const menuInput = (over: Partial<MenuInput>): MenuInput => ({
  sellingPrice: 1,
  yield: 20,
  productionMinutesPerBatch: 0,
  ingredients: [],
  packaging: [],
  equipment: [],
  ...over,
});
const names = {
  ingredientNames: new Map([['tepung', 'Tepung gandum'], ['minyak', 'Minyak masak'], ['telur', 'Telur'], ['hilang', 'Gula lama']]),
  packagingNames: new Map([['kotak', 'Kotak kertas'], ['dulang', 'Dulang aluminium']]),
};
const karipap = (pieces: number, over: Partial<MenuInput> = {}): BatchPlanMenuInput => ({
  menuId: 'karipap',
  name: 'Karipap',
  pieces,
  input: menuInput({ yield: 20, ingredients: [ing(tepung, 500, 'g'), ing(minyak, 200, 'ml')], packaging: [pack(kotak, 1, 'per_portion')], ...over }),
});
const plan = (...menus: BatchPlanMenuInput[]) => planBatch({ menus, ...names });

describe('batches per menu', () => {
  it('is pieces ÷ yield, kept as a decimal (50 pieces at 20 a batch = 2.5)', () => {
    const r = plan(karipap(50));
    expect(r.menus).toEqual([{ menuId: 'karipap', name: 'Karipap', pieces: 50, yield: 20, batches: 2.5 }]);
  });
  it('a repeating decimal is not rounded in the result (only the display marks it ≈)', () => {
    const r = plan(karipap(50, { yield: 12 }));
    expect(r.menus[0]!.batches).toBe(50 / 12);
    expect(formatQuantity(r.menus[0]!.batches!)).toBe('4.17');
    expect(isRoundedForDisplay(r.menus[0]!.batches!)).toBe(true);
    expect(isRoundedForDisplay(2.5)).toBe(false);
  });
  it('0 pieces leaves the menu out entirely', () => {
    const r = plan(karipap(0));
    expect(r.menus).toEqual([]);
    expect(r.shopping).toEqual([]);
    expect(r.issues).toEqual([]);
  });
  it('a yield that cannot be used is named, with no batches and no totals', () => {
    const r = plan(karipap(50, { yield: 0 }));
    expect(r.menus[0]!.batches).toBeNull();
    expect(r.issues).toEqual([{ code: 'yield_invalid', menuId: 'karipap', menuName: 'Karipap', itemName: null }]);
    expect(r.shopping).toEqual([]);
    expect(r.ingredientCost).toBeNull();
    expect(r.packagingCost).toBeNull();
  });
  it('negative or non-numeric pieces are named, never treated as 0', () => {
    for (const pieces of [-1, Number.NaN]) {
      const r = plan(karipap(pieces));
      expect(r.issues.map((i) => i.code)).toEqual(['pieces_invalid']);
      expect(r.ingredientCost).toBeNull();
    }
  });
});

describe('shopping list', () => {
  it('scales each line by batches and converts to the base unit', () => {
    const r = plan(karipap(50));
    const flour = r.shopping.find((s) => s.ingredientId === 'tepung')!;
    expect(flour).toMatchObject({ name: 'Tepung gandum', unit: 'g', needed: 1250, packQuantity: 5, packUnit: 'kg', packsToBuy: 1, menuIds: ['karipap'] });
    expect(flour.estimatedCost).toBeCloseTo(6.25, 12); // 1,250 g at RM5/kg
    const oil = r.shopping.find((s) => s.ingredientId === 'minyak')!;
    expect(oil).toMatchObject({ unit: 'ml', needed: 500, packsToBuy: 1 });
    expect(oil.estimatedCost).toBeCloseTo(4, 12);
    expect(r.ingredientCost).toBeCloseTo(10.25, 12);
  });

  it('adds up the same ingredient across menus, whatever unit each recipe uses', () => {
    const popia: BatchPlanMenuInput = {
      menuId: 'popia', name: 'Popia', pieces: 30,
      input: menuInput({ yield: 10, ingredients: [ing(tepung, 0.3, 'kg')] }), // 3 batches × 300 g
    };
    const r = plan(karipap(50), popia);
    const flour = r.shopping.find((s) => s.ingredientId === 'tepung')!;
    expect(flour.needed).toBeCloseTo(2150, 9);
    expect(flour.menuIds).toEqual(['karipap', 'popia']);
    expect(flour.packsToBuy).toBe(1);
    expect(flour.estimatedCost).toBeCloseTo(10.75, 12);
  });

  it('rounds packs up, and floating-point noise does not add a pack', () => {
    expect(packsToBuy(5000, 5000)).toBe(1);
    expect(packsToBuy(5001, 5000)).toBe(2);
    expect(packsToBuy(0.1 * 3, 0.1)).toBe(3); // 3.0000000000000004 packs
    expect(packsToBuy(0, 5000)).toBe(0);
    expect(() => packsToBuy(10, 0)).toThrow();
    const r = plan(karipap(201)); // 10.05 batches × 500 g = 5,025 g of a 5 kg pack
    expect(r.shopping.find((s) => s.ingredientId === 'tepung')!.packsToBuy).toBe(2);
  });

  it('counted items convert through the pack mapping (eggs by the tray)', () => {
    const r = plan(karipap(50, { ingredients: [ing(telur, 4, 'biji')] })); // 2.5 batches × 4 = 10 eggs
    const eggs = r.shopping[0]!;
    expect(eggs.unit).toBe('papan');
    expect(eggs.needed).toBeCloseTo(10 / 30, 12);
    expect(eggs.packsToBuy).toBe(1);
    expect(eggs.estimatedCost).toBeCloseTo(4, 12);
  });

  it('cost of the amount used is the engine’s own batch ingredient cost', () => {
    const input = karipap(20).input; // pieces = yield → exactly one batch
    const engine = computeMenuCost({ ...input, sellingPrice: 5 }, business());
    if (!engine.complete) throw new Error('expected complete');
    expect(plan(karipap(20)).ingredientCost).toBeCloseTo(engine.batch.ingredients, 12);
  });

  it('is sorted by name', () => {
    const r = plan(karipap(50, { ingredients: [ing(telur, 1, 'biji'), ing(tepung, 1, 'g'), ing(minyak, 1, 'ml')] }));
    expect(r.shopping.map((s) => s.name)).toEqual(['Minyak masak', 'Telur', 'Tepung gandum']);
  });
});

describe('lines that cannot be worked out are named, never guessed or dropped', () => {
  it('an incompatible unit: named with the menu and unit; that item shows no amount and there is no total', () => {
    const r = plan(karipap(50, { ingredients: [ing(tepung, 2, 'cawan'), ing(minyak, 200, 'ml')] }));
    expect(r.issues).toEqual([{ code: 'incompatible_units', menuId: 'karipap', menuName: 'Karipap', itemName: 'Tepung gandum', unit: 'cawan' }]);
    const flour = r.shopping.find((s) => s.ingredientId === 'tepung')!;
    expect(flour).toMatchObject({ needed: null, packsToBuy: null, estimatedCost: null });
    expect(r.shopping.find((s) => s.ingredientId === 'minyak')!.needed).toBe(500);
    expect(r.ingredientCost).toBeNull();
  });

  it('one bad line spoils only that ingredient’s total, not a partial sum shown as complete', () => {
    const popia: BatchPlanMenuInput = { menuId: 'popia', name: 'Popia', pieces: 10, input: menuInput({ yield: 10, ingredients: [ing(tepung, 1, 'sudu')] }) };
    const r = plan(karipap(50), popia);
    expect(r.shopping.find((s) => s.ingredientId === 'tepung')!.needed).toBeNull();
    expect(r.issues.map((i) => [i.code, i.menuName])).toEqual([['incompatible_units', 'Popia']]);
  });

  it('a deleted ingredient is named (or shown as unknown) and stops the total', () => {
    const r = plan(karipap(50, { ingredients: [ing(null, 100, 'g', 'hilang'), ing(null, 5, 'g', 'tiada-nama'), ing(minyak, 200, 'ml')] }));
    expect(r.issues).toEqual([
      { code: 'ingredient_missing', menuId: 'karipap', menuName: 'Karipap', itemName: 'Gula lama' },
      { code: 'ingredient_missing', menuId: 'karipap', menuName: 'Karipap', itemName: null },
    ]);
    expect(r.shopping.map((s) => s.ingredientId)).toEqual(['minyak']);
    expect(r.ingredientCost).toBeNull();
  });

  it('a bad recipe quantity is named as invalid', () => {
    const r = plan(karipap(50, { ingredients: [ing(tepung, -5, 'g')] }));
    expect(r.issues.map((i) => i.code)).toEqual(['invalid_quantity']);
    expect(r.shopping[0]!.needed).toBeNull();
  });

  it('a deleted packaging item is named and stops the packaging total', () => {
    const r = plan(karipap(50, { packaging: [pack(null, 1, 'per_portion', 'kotak')] }));
    expect(r.issues).toEqual([{ code: 'packaging_missing', menuId: 'karipap', menuName: 'Karipap', itemName: 'Kotak kertas' }]);
    expect(r.packagingCost).toBeNull();
    expect(r.ingredientCost).not.toBeNull();
  });
});

describe('packaging', () => {
  it('per portion × pieces, per batch × batches (decimal kept), packs rounded up', () => {
    const r = plan(karipap(50, { packaging: [pack(kotak, 1, 'per_portion'), pack(dulang, 1, 'per_batch')] }));
    const box = r.packaging.find((p) => p.packagingId === 'kotak')!;
    expect(box).toMatchObject({ name: 'Kotak kertas', needed: 50, packQuantity: 50, packsToBuy: 1 });
    expect(box.estimatedCost).toBeCloseTo(20, 12);
    const tray = r.packaging.find((p) => p.packagingId === 'dulang')!;
    expect(tray).toMatchObject({ needed: 2.5, packsToBuy: 1 });
    expect(tray.estimatedCost).toBeCloseTo(3.75, 12);
    expect(r.packagingCost).toBeCloseTo(23.75, 12);
  });

  it('adds the same packaging across menus', () => {
    const popia: BatchPlanMenuInput = { menuId: 'popia', name: 'Popia', pieces: 30, input: menuInput({ yield: 10, packaging: [pack(kotak, 1, 'per_portion')] }) };
    const r = plan(karipap(50), popia);
    expect(r.packaging).toHaveLength(1);
    expect(r.packaging[0]).toMatchObject({ needed: 80, packsToBuy: 2, menuIds: ['karipap', 'popia'] });
  });
});

describe('quantity display', () => {
  it('drops trailing zeros, groups thousands and keeps the sign', () => {
    expect(formatQuantity(1250)).toBe('1,250');
    expect(formatQuantity(2.5)).toBe('2.5');
    expect(formatQuantity(0.30000000000000004)).toBe('0.3');
    expect(formatQuantity(10 / 30)).toBe('0.33');
    expect(formatQuantity(100, 0)).toBe('100');
    expect(formatQuantity(-1.5)).toBe(`${MINUS}1.5`);
    expect(formatQuantity(0)).toBe('0');
    expect(formatQuantity(Number.NaN)).toBe('—');
  });
});
