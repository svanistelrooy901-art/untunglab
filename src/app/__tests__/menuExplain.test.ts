import { describe, expect, it } from 'vitest';
import type { BusinessInput, MenuInput } from '../../domain';
import { explainMenu } from '../menuExplain';

const business: BusinessInput = { valueOfTimePerHour: 25, electricityTariffPerKwh: 0.5, sharedMonthlyOperatingCost: 600, expectedMonthlySales: 3000 };
const menu: MenuInput = {
  sellingPrice: 12,
  yield: 10,
  productionMinutesPerBatch: 60,
  ingredients: [
    { ref: 'tepung', ingredient: { id: 'tepung', purchasePrice: 25, packageQuantity: 5, packageUnit: 'kg' }, quantity: 250, unit: 'g' },
    { ref: 'hilang', ingredient: null, quantity: 1, unit: 'g' },
    { ref: 'telur', ingredient: { id: 'telur', purchasePrice: 12, packageQuantity: 30, packageUnit: 'biji' }, quantity: 5, unit: 'kg' },
  ],
  packaging: [
    { ref: 'kotak', packaging: { id: 'kotak', purchasePrice: 20, purchaseQuantity: 50 }, quantityUsed: 10, semantics: 'per_batch' },
    { ref: 'x', packaging: null, quantityUsed: 1, semantics: 'per_portion' },
  ],
  equipment: [
    { ref: 'oven', watts: 2000, durationMinutes: 45 },
    { ref: 'gone', watts: null, durationMinutes: 10 },
  ],
};

describe('explainMenu (the numbers behind "how was this calculated")', () => {
  const e = explainMenu(menu, business);

  it('ingredient lines: C01 RM25/5kg x 250g = RM1.25; missing or incompatible lines have no cost', () => {
    expect(e.ingredients.map((l) => l.ref)).toEqual(['tepung', 'hilang', 'telur']);
    expect(e.ingredients[0]?.cost).toBeCloseTo(1.25, 12);
    expect(e.ingredients[1]?.cost).toBeNull();
    expect(e.ingredients[2]?.cost).toBeNull();
  });

  it('packaging lines: unit cost, line cost, and whether it is per batch', () => {
    expect(e.packaging[0]).toMatchObject({ ref: 'kotak', unitCost: 0.4, semantics: 'per_batch' });
    expect(e.packaging[0]?.cost).toBeCloseTo(4, 12);
    expect(e.packaging[1]?.cost).toBeNull();
  });

  it('labour: 60 min at RM25/h is RM25 per batch', () => {
    expect(e.labour).toEqual({ minutes: 60, ratePerHour: 25, batch: 25 });
  });

  it('labour is null when Nilai Masa is not entered', () => {
    expect(explainMenu(menu, { ...business, valueOfTimePerHour: null }).labour.batch).toBeNull();
  });

  it('C05 utilities: 2000 W x 45 min = 1.5 kWh = RM0.75 at RM0.50; missing appliance has no cost', () => {
    expect(e.utilities[0]).toMatchObject({ ref: 'oven', watts: 2000, minutes: 45, kwh: 1.5 });
    expect(e.utilities[0]?.cost).toBeCloseTo(0.75, 12);
    expect(e.utilities[1]?.cost).toBeNull();
    expect(e.tariffPerKwh).toBe(0.5);
  });

  it('shared operating: rate and RM from the selling price (revenue-percentage)', () => {
    expect(e.sharedOperating).toMatchObject({ ok: true, ratePct: 20 });
    if (e.sharedOperating.ok) expect(e.sharedOperating.amount).toBeCloseTo(2.4, 12);
  });

  it('shared operating is not ok when sales are missing', () => {
    expect(explainMenu(menu, { ...business, expectedMonthlySales: null }).sharedOperating.ok).toBe(false);
  });
});
