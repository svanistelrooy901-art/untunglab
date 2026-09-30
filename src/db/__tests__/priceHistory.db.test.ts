import { describe, expect, it } from 'vitest';
import { ImmutableRecordError } from '../db';
import { backfillPriceHistory, createIngredient, listHistory, updateIngredient } from '../repo';
import { freshContext } from './helpers';

const chicken = { name: 'Ayam', purchasePrice: 60, packageQuantity: 2, packageUnit: 'kg' };

describe('Jejak Harga records (Doc 06 §4)', () => {
  it('creating an ingredient writes exactly one baseline record with the normalised cost', async () => {
    const { ctx } = freshContext();
    const ing = await createIngredient(ctx, chicken);
    const h = await listHistory(ctx, ing.id);
    expect(h).toHaveLength(1);
    expect(h[0]).toMatchObject({
      sourceType: 'baseline',
      seq: 1,
      purchasePrice: 60,
      packageQuantity: 2,
      packageUnit: 'kg',
      baseUnit: 'g',
      purchaseDate: '2026-09-30',
    });
    expect(h[0]?.normalizedUnitCost).toBeCloseTo(0.03, 12);
  });

  it('price-only change appends one record', async () => {
    const { ctx } = freshContext();
    const ing = await createIngredient(ctx, chicken);
    await updateIngredient(ctx, ing.id, { purchasePrice: 66 });
    const h = await listHistory(ctx, ing.id);
    expect(h).toHaveLength(2);
    expect(h[1]).toMatchObject({ sourceType: 'manual', seq: 2, purchasePrice: 66 });
    expect(h[1]?.normalizedUnitCost).toBeCloseTo(0.033, 12);
  });

  it('package-size-only change appends one record and shows the real cost movement (C09)', async () => {
    const { ctx } = freshContext();
    const ing = await createIngredient(ctx, chicken);
    await updateIngredient(ctx, ing.id, { packageQuantity: 1 });
    const h = await listHistory(ctx, ing.id);
    expect(h).toHaveLength(2);
    expect(h[1]?.purchasePrice).toBe(60);
    expect(h[1]?.normalizedUnitCost).toBeCloseTo(0.06, 12);
  });

  it('package-unit-only change appends one record', async () => {
    const { ctx } = freshContext();
    const ing = await createIngredient(ctx, chicken);
    await updateIngredient(ctx, ing.id, { packageUnit: 'g', packageQuantity: 2 });
    expect((await listHistory(ctx, ing.id)).length).toBe(2);
    const { ctx: c2 } = freshContext();
    const i2 = await createIngredient(c2, { name: 'Gula', purchasePrice: 4, packageQuantity: 1000, packageUnit: 'g' });
    await updateIngredient(c2, i2.id, { packageUnit: 'kg' });
    expect((await listHistory(c2, i2.id)).length).toBe(2);
  });

  it('a multi-field update appends exactly one record', async () => {
    const { ctx } = freshContext();
    const ing = await createIngredient(ctx, chicken);
    await updateIngredient(ctx, ing.id, { purchasePrice: 70, packageQuantity: 3, packageUnit: 'kg' });
    const h = await listHistory(ctx, ing.id);
    expect(h).toHaveLength(2);
    expect(h[1]).toMatchObject({ purchasePrice: 70, packageQuantity: 3 });
  });

  it('a name-only change appends nothing', async () => {
    const { ctx, db } = freshContext();
    const ing = await createIngredient(ctx, chicken);
    await updateIngredient(ctx, ing.id, { name: 'Ayam Segar' });
    expect(await listHistory(ctx, ing.id)).toHaveLength(1);
    expect((await db.ingredients.get(ing.id))?.name).toBe('Ayam Segar');
  });

  it('re-saving identical values appends nothing', async () => {
    const { ctx } = freshContext();
    const ing = await createIngredient(ctx, chicken);
    await updateIngredient(ctx, ing.id, { purchasePrice: 60, packageQuantity: 2, packageUnit: 'kg' });
    expect(await listHistory(ctx, ing.id)).toHaveLength(1);
  });

  it('records the supplier, notes and date supplied with the change', async () => {
    const { ctx } = freshContext();
    const ing = await createIngredient(ctx, chicken);
    await updateIngredient(ctx, ing.id, { purchasePrice: 66 }, { supplier: 'Pasar Borong', notes: 'naik harga', purchaseDate: '2026-10-05' });
    const h = await listHistory(ctx, ing.id);
    expect(h[1]).toMatchObject({ supplier: 'Pasar Borong', notes: 'naik harga', purchaseDate: '2026-10-05' });
  });

  it('can record a scenario_apply source', async () => {
    const { ctx } = freshContext();
    const ing = await createIngredient(ctx, chicken);
    await updateIngredient(ctx, ing.id, { purchasePrice: 72 }, { sourceType: 'scenario_apply' });
    expect((await listHistory(ctx, ing.id))[1]?.sourceType).toBe('scenario_apply');
  });

  it('history is ordered by date then seq, even when a back-dated purchase is added', async () => {
    const { ctx } = freshContext();
    const ing = await createIngredient(ctx, chicken);
    await updateIngredient(ctx, ing.id, { purchasePrice: 66 }, { purchaseDate: '2026-10-10' });
    await updateIngredient(ctx, ing.id, { purchasePrice: 63 }, { purchaseDate: '2026-10-01' });
    const h = await listHistory(ctx, ing.id);
    expect(h.map((r) => r.purchaseDate)).toEqual(['2026-09-30', '2026-10-01', '2026-10-10']);
    expect(h.map((r) => r.seq)).toEqual([1, 3, 2]);
  });

  it('records are snapshots: later ingredient changes never alter earlier records', async () => {
    const { ctx } = freshContext();
    const ing = await createIngredient(ctx, chicken);
    const before = (await listHistory(ctx, ing.id))[0];
    await updateIngredient(ctx, ing.id, { purchasePrice: 99, name: 'Lain' });
    expect((await listHistory(ctx, ing.id))[0]).toEqual(before);
  });

  it('stored normalised cost equals recomputing from the record', async () => {
    const { ctx } = freshContext();
    const ing = await createIngredient(ctx, { name: 'Telur', purchasePrice: 12, packageQuantity: 30, packageUnit: 'biji' });
    const [r] = await listHistory(ctx, ing.id);
    expect(r?.normalizedUnitCost).toBeCloseTo(12 / 30, 12);
    expect(r?.baseUnit).toBe('biji');
  });

  it('history of one ingredient is independent of another', async () => {
    const { ctx } = freshContext();
    const a = await createIngredient(ctx, chicken);
    const b = await createIngredient(ctx, { name: 'Gula', purchasePrice: 4, packageQuantity: 1, packageUnit: 'kg' });
    await updateIngredient(ctx, a.id, { purchasePrice: 61 });
    expect(await listHistory(ctx, b.id)).toHaveLength(1);
  });
});

describe('immutability (Doc 05 §5)', () => {
  it('rejects updating a history record', async () => {
    const { ctx, db } = freshContext();
    const ing = await createIngredient(ctx, chicken);
    const [r] = await listHistory(ctx, ing.id);
    await expect(db.priceHistory.update(r!.id, { purchasePrice: 1 })).rejects.toThrow(ImmutableRecordError);
    await expect(db.priceHistory.put({ ...r!, purchasePrice: 1 })).rejects.toThrow();
    expect((await listHistory(ctx, ing.id))[0]?.purchasePrice).toBe(60);
  });

  it('rejects deleting a history record', async () => {
    const { ctx, db } = freshContext();
    const ing = await createIngredient(ctx, chicken);
    const [r] = await listHistory(ctx, ing.id);
    await expect(db.priceHistory.delete(r!.id)).rejects.toThrow(ImmutableRecordError);
    expect(await listHistory(ctx, ing.id)).toHaveLength(1);
  });

  it('rejects two records with the same ingredient and seq', async () => {
    const { ctx, db } = freshContext();
    const ing = await createIngredient(ctx, chicken);
    const [r] = await listHistory(ctx, ing.id);
    await expect(db.priceHistory.add({ ...r!, id: 'dup' })).rejects.toThrow();
  });
});

describe('atomicity', () => {
  it('a failed history write rolls back the ingredient change', async () => {
    const { ctx, db } = freshContext();
    const ing = await createIngredient(ctx, chicken);
    // Force the history insert to collide with the existing (ingredientId+seq) key.
    const realId = ctx.newId;
    let first = true;
    const failing = { ...ctx, newId: () => (first ? ((first = false), 'boom') : realId()) };
    await db.priceHistory.hook('creating', () => {
      throw new Error('disk full');
    });
    await expect(updateIngredient(failing, ing.id, { purchasePrice: 99 })).rejects.toThrow();
    expect((await db.ingredients.get(ing.id))?.purchasePrice).toBe(60);
    expect(await listHistory(ctx, ing.id)).toHaveLength(1);
  });

  it('a failed baseline write leaves no ingredient behind', async () => {
    const { ctx, db } = freshContext();
    db.priceHistory.hook('creating', () => {
      throw new Error('disk full');
    });
    await expect(createIngredient(ctx, chicken)).rejects.toThrow();
    expect(await db.ingredients.count()).toBe(0);
  });
});

describe('backfill (Doc 05 §5)', () => {
  it('does nothing when every ingredient already has history', async () => {
    const { ctx, db } = freshContext();
    await createIngredient(ctx, chicken);
    expect(await backfillPriceHistory(ctx)).toBe(0);
    expect(await db.priceHistory.count()).toBe(1);
  });

  it('adds exactly one record to an ingredient without history, and is idempotent', async () => {
    const { ctx, db } = freshContext();
    await db.ingredients.add({
      id: 'legacy',
      businessId: 'b',
      name: 'Tepung',
      purchasePrice: 3,
      packageQuantity: 1,
      packageUnit: 'kg',
      packMappings: [],
      marketItemId: null,
      customFlag: false,
      active: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    expect(await backfillPriceHistory(ctx)).toBe(1);
    expect(await backfillPriceHistory(ctx)).toBe(0);
    const h = await listHistory(ctx, 'legacy');
    expect(h).toHaveLength(1);
    expect(h[0]).toMatchObject({ sourceType: 'backfill', seq: 1, purchaseDate: '2026-01-01' });
    expect(h[0]?.normalizedUnitCost).toBeCloseTo(0.003, 12);
  });
});

describe('validation', () => {
  it('rejects invalid purchase data without writing anything', async () => {
    const { ctx, db } = freshContext();
    await expect(createIngredient(ctx, { ...chicken, packageQuantity: 0 })).rejects.toThrow();
    await expect(createIngredient(ctx, { ...chicken, purchasePrice: -1 })).rejects.toThrow();
    await expect(createIngredient(ctx, { ...chicken, name: '   ' })).rejects.toThrow();
    await expect(createIngredient(ctx, { ...chicken, packageUnit: 'xyz' })).rejects.toThrow();
    expect(await db.ingredients.count()).toBe(0);
    expect(await db.priceHistory.count()).toBe(0);
  });

  it('rejects an invalid update and leaves the ingredient and history unchanged', async () => {
    const { ctx } = freshContext();
    const ing = await createIngredient(ctx, chicken);
    await expect(updateIngredient(ctx, ing.id, { packageQuantity: -5 })).rejects.toThrow();
    await expect(updateIngredient(ctx, 'missing', { purchasePrice: 1 })).rejects.toThrow();
    expect(await listHistory(ctx, ing.id)).toHaveLength(1);
  });
});
