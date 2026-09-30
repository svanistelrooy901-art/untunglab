import { describe, expect, it } from 'vitest';
import { emptyForm, parseMenuForm, type MenuForm } from '../menuForm';

const ok: MenuForm = {
  name: ' Kek ',
  yield: '10',
  minutes: '60',
  price: '12,50',
  ingredients: [{ ingredientId: 'a', quantity: '250', unit: 'g' }],
  packaging: [{ packagingId: 'p', quantity: '1', semantics: 'per_portion' }],
  equipment: [{ equipmentId: 'e', minutes: '45' }],
};

describe('parseMenuForm', () => {
  it('parses text to a draft, with comma decimals and trimmed names', () => {
    const r = parseMenuForm(ok, 'm1');
    expect(r).toEqual({
      ok: true,
      value: {
        id: 'm1',
        name: 'Kek',
        yield: 10,
        productionMinutesPerBatch: 60,
        sellingPrice: 12.5,
        ingredients: [{ ingredientId: 'a', quantity: 250, usageUnit: 'g' }],
        packaging: [{ packagingId: 'p', quantityUsed: 1, usageSemantics: 'per_portion' }],
        equipment: [{ equipmentId: 'e', durationMinutes: 45 }],
      },
    });
  });

  it('blank minutes and price mean 0 (saved as a draft, reported incomplete by the engine)', () => {
    const r = parseMenuForm({ ...ok, minutes: '', price: '' });
    expect(r.ok && [r.value.productionMinutesPerBatch, r.value.sellingPrice]).toEqual([0, 0]);
  });

  it('reports each wrong field, in Bahasa Melayu', () => {
    const r = parseMenuForm({ ...emptyForm(), yield: '0', minutes: '-1', price: 'abc' });
    if (r.ok) throw new Error('expected errors');
    expect(Object.keys(r.errors).sort()).toEqual(['minutes', 'name', 'price', 'yield']);
    expect(r.errors.name).toMatch(/nama/i);
  });

  it('rejects incomplete or non-positive lines', () => {
    for (const bad of [
      { ingredients: [{ ingredientId: '', quantity: '1', unit: 'g' }] },
      { ingredients: [{ ingredientId: 'a', quantity: '0', unit: 'g' }] },
      { ingredients: [{ ingredientId: 'a', quantity: '5', unit: '' }] },
      { packaging: [{ packagingId: 'p', quantity: 'x', semantics: 'per_batch' as const }] },
      { equipment: [{ equipmentId: 'e', minutes: '' }] },
    ]) {
      const r = parseMenuForm({ ...ok, ...bad });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.errors.lines).toBeTruthy();
    }
  });
});
