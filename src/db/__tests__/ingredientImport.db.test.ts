import { describe, expect, it } from 'vitest';
import { applyIngredientImport } from '../ingredientImport';
import { createIngredient } from '../repo';
import { listAllHistory } from '../repo';
import { listIngredients } from '../masterData';
import { freshContext } from './helpers';

describe('applying an import plan (D-87)', () => {
  it('creates new ingredients and updates an existing one with a Jejak Harga record marked import', async () => {
    const { ctx } = freshContext();
    const gula = await createIngredient(ctx, { name: 'Gula', purchasePrice: 3, packageQuantity: 1, packageUnit: 'kg' });
    const r = await applyIngredientImport(ctx, [
      { row: 2, name: 'Gula', price: 4, qty: 1, unit: 'kg', action: 'update', existingId: gula.id },
      { row: 3, name: 'Telur', price: 12, qty: 30, unit: 'biji', action: 'create' },
    ]);
    expect(r).toEqual({ created: 1, updated: 1, failed: [] });
    const list = await listIngredients(ctx);
    expect(list.find((i) => i.name === 'Gula')?.purchasePrice).toBe(4);
    expect(list.find((i) => i.name === 'Telur')?.packageQuantity).toBe(30);
    const history = (await listAllHistory(ctx)).filter((h) => h.ingredientId === gula.id);
    expect(history.map((h) => h.sourceType)).toContain('import');
    expect(history).toHaveLength(2);
  });
  it('one bad row is reported and the others still go in', async () => {
    const { ctx } = freshContext();
    const r = await applyIngredientImport(ctx, [
      { row: 2, name: 'Rosak', price: 1, qty: 0, unit: 'kg', action: 'create' },
      { row: 3, name: 'Baik', price: 1, qty: 1, unit: 'kg', action: 'create' },
    ]);
    expect(r.created).toBe(1);
    expect(r.failed).toEqual([{ row: 2, name: 'Rosak' }]);
    expect((await listIngredients(ctx)).map((i) => i.name)).toEqual(['Baik']);
  });
});
