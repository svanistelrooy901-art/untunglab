import { describe, expect, it } from 'vitest';
import { ensureBusiness, saveOperatingCost } from '../repo';
import { freshContext } from './helpers';

describe('business bootstrap', () => {
  it('creates one business and one cost profile, and is idempotent', async () => {
    const { ctx, db } = freshContext();
    const a = await ensureBusiness(ctx);
    const b = await ensureBusiness(ctx);
    expect(b.id).toBe(a.id);
    expect(await db.businesses.count()).toBe(1);
    expect(await db.costProfiles.count()).toBe(1);
    const profile = await db.costProfiles.get(a.id);
    expect(profile).toMatchObject({ valueOfTimePerHour: null, expectedMonthlySales: null, allocationMethod: 'revenue_percentage' });
  });
});

describe('Kos Operasi storage (Doc 06 §5)', () => {
  it('saving a category twice updates one row, never creates a duplicate', async () => {
    const { ctx, db } = freshContext();
    const biz = await ensureBusiness(ctx);
    await saveOperatingCost(ctx, { businessId: biz.id, category: 'rent', mode: 'simple', simpleAmount: 600, active: true, classification: 'shared' });
    await saveOperatingCost(ctx, { businessId: biz.id, category: 'rent', mode: 'simple', simpleAmount: 700, active: true, classification: 'shared' });
    const rows = await db.operatingCosts.toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.simpleAmount).toBe(700);
  });

  it('the database itself rejects a second row for the same category', async () => {
    const { ctx, db } = freshContext();
    const biz = await ensureBusiness(ctx);
    const row = { businessId: biz.id, category: 'rent' as const, mode: 'simple' as const, simpleAmount: 1, active: true, classification: 'shared' as const, updatedAt: 'x' };
    await db.operatingCosts.add({ ...row, id: 'r1' });
    await expect(db.operatingCosts.add({ ...row, id: 'r2' })).rejects.toThrow();
  });

  it('switching mode keeps the detailed data', async () => {
    const { ctx, db } = freshContext();
    const biz = await ensureBusiness(ctx);
    const detail = { kind: 'workspace' as const, monthlyHomeCost: 1000, businessUsePct: 30 };
    await saveOperatingCost(ctx, { businessId: biz.id, category: 'workspace', mode: 'detailed', simpleAmount: 0, detail, active: true, classification: 'shared' });
    await saveOperatingCost(ctx, { businessId: biz.id, category: 'workspace', mode: 'simple', simpleAmount: 300, active: true, classification: 'shared' });
    const [row] = await db.operatingCosts.toArray();
    expect(row?.mode).toBe('simple');
    expect(row?.detail).toEqual(detail);
  });
});
