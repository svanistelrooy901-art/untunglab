import { describe, expect, it } from 'vitest';
import type { OperatingCostRow } from '../../db';
import { buildOverview } from '../operatingView';

const row = (over: Partial<OperatingCostRow> & Pick<OperatingCostRow, 'category'>): OperatingCostRow => ({
  id: over.category,
  businessId: 'b',
  mode: 'simple',
  simpleAmount: 0,
  active: true,
  classification: 'shared',
  updatedAt: 'x',
  ...over,
});

describe('buildOverview (one engine, same numbers as costing)', () => {
  it('C07: RM600 shared on RM6,000 sales is a 10% rate', () => {
    const o = buildOverview([row({ category: 'ruang_kerja', simpleAmount: 400 }), row({ category: 'gas', simpleAmount: 200 })], 6000);
    expect(o.sharedTotal).toBe(600);
    expect(o.allocation).toMatchObject({ ok: true, ratePct: 10 });
  });

  it('missing or zero sales is incomplete, never a zero rate', () => {
    for (const sales of [null, 0]) {
      const o = buildOverview([row({ category: 'gas', simpleAmount: 100 })], sales);
      expect(o.allocation).toEqual({ ok: false, reason: 'expected_sales_missing' });
    }
  });

  it('each category shows its final amount, whichever mode produced it', () => {
    const o = buildOverview(
      [
        row({ category: 'ruang_kerja', mode: 'detailed', detail: { kind: 'workspace', monthlyHomeCost: 2000, businessUsePct: 15 } }),
        row({ category: 'air', mode: 'detailed', detail: { kind: 'water', averageMonthlyBill: 100, businessUsePct: 30 } }),
      ],
      3000,
    );
    expect(o.lines.find((l) => l.category === 'ruang_kerja')).toMatchObject({ amount: 300, error: null });
    expect(o.lines.find((l) => l.category === 'air')).toMatchObject({ amount: 30 });
    expect(o.sharedTotal).toBe(330);
  });

  it('always returns all six categories in screen order, blank ones as not entered', () => {
    const o = buildOverview([row({ category: 'gas', simpleAmount: 10 })], 100);
    expect(o.lines.map((l) => l.category)).toEqual(['ruang_kerja', 'elektrik', 'air', 'internet_telefon', 'gas', 'kos_lain']);
    expect(o.lines.find((l) => l.category === 'air')).toMatchObject({ entered: false, amount: 0 });
  });

  it('a broken row is flagged on its own line and does not crash or vanish from the total silently', () => {
    const o = buildOverview([row({ category: 'air', mode: 'detailed' }), row({ category: 'gas', simpleAmount: 50 })], 500);
    expect(o.lines.find((l) => l.category === 'air')?.error).toBeTruthy();
    expect(o.hasErrors).toBe(true);
    expect(o.allocation).toEqual({ ok: false, reason: 'incomplete_costs' });
  });

  it('direct-classified and inactive rows stay out of the shared total', () => {
    const o = buildOverview(
      [row({ category: 'gas', simpleAmount: 100, classification: 'direct' }), row({ category: 'air', simpleAmount: 50, active: false }), row({ category: 'kos_lain', simpleAmount: 25 })],
      250,
    );
    expect(o.sharedTotal).toBe(25);
  });
});
