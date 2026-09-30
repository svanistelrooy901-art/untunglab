import { describe, expect, it } from 'vitest';
import {
  currentTariff,
  getBusiness,
  ensureBusiness,
  getCostProfile,
  listOperatingCosts,
  resetOperatingDetail,
  saveCostProfile,
  saveOperatingCost,
  setTariff,
  updateBusinessProfile,
} from '../index';
import { freshContext } from './helpers';

describe('cost profile: Nilai Masa and expected monthly sales (Doc 05 §2)', () => {
  it('starts empty (null means not entered, never zero)', async () => {
    const { ctx } = freshContext();
    expect(await getCostProfile(ctx)).toMatchObject({ valueOfTimePerHour: null, expectedMonthlySales: null, allocationMethod: 'revenue_percentage' });
  });

  it('saves values and leaves omitted fields alone', async () => {
    const { ctx } = freshContext();
    await saveCostProfile(ctx, { valueOfTimePerHour: 20, expectedMonthlySales: 6000 });
    await saveCostProfile(ctx, { expectedMonthlySales: 8000 });
    expect(await getCostProfile(ctx)).toMatchObject({ valueOfTimePerHour: 20, expectedMonthlySales: 8000 });
  });

  it('null clears a value back to "not entered"', async () => {
    const { ctx } = freshContext();
    await saveCostProfile(ctx, { expectedMonthlySales: 6000 });
    await saveCostProfile(ctx, { expectedMonthlySales: null });
    expect((await getCostProfile(ctx)).expectedMonthlySales).toBeNull();
  });

  it('allows Nilai Masa of 0 but never zero or negative expected sales', async () => {
    const { ctx } = freshContext();
    await saveCostProfile(ctx, { valueOfTimePerHour: 0 });
    expect((await getCostProfile(ctx)).valueOfTimePerHour).toBe(0);
    await expect(saveCostProfile(ctx, { expectedMonthlySales: 0 })).rejects.toThrow();
    await expect(saveCostProfile(ctx, { expectedMonthlySales: -5 })).rejects.toThrow();
    await expect(saveCostProfile(ctx, { valueOfTimePerHour: -1 })).rejects.toThrow();
    await expect(saveCostProfile(ctx, { valueOfTimePerHour: Number.NaN })).rejects.toThrow();
  });

  it('a rejected save changes nothing', async () => {
    const { ctx } = freshContext();
    await saveCostProfile(ctx, { valueOfTimePerHour: 20, expectedMonthlySales: 6000 });
    await expect(saveCostProfile(ctx, { valueOfTimePerHour: 25, expectedMonthlySales: 0 })).rejects.toThrow();
    expect(await getCostProfile(ctx)).toMatchObject({ valueOfTimePerHour: 20, expectedMonthlySales: 6000 });
  });
});

describe('business profile', () => {
  it('stores trimmed optional name and type', async () => {
    const { ctx } = freshContext();
    await updateBusinessProfile(ctx, { name: '  Kek Kak Mah ', businessType: 'Kek & biskut' });
    expect(await ensureBusiness(ctx)).toMatchObject({ name: 'Kek Kak Mah', businessType: 'Kek & biskut' });
  });
  it('blank clears to null', async () => {
    const { ctx } = freshContext();
    await updateBusinessProfile(ctx, { name: 'A' });
    await updateBusinessProfile(ctx, { name: '   ' });
    expect((await ensureBusiness(ctx)).name).toBeNull();
  });
});

describe('electricity tariff (RM/kWh, effective-dated)', () => {
  it('is null until the user sets one', async () => {
    const { ctx } = freshContext();
    expect(await currentTariff(ctx)).toBeNull();
  });

  it('latest tariff already in effect wins; history is kept', async () => {
    const { ctx, db } = freshContext('2026-09-30T08:00:00');
    await setTariff(ctx, 0.5, '2026-01-01');
    await setTariff(ctx, 0.55, '2026-07-01');
    expect((await currentTariff(ctx))?.ratePerKwh).toBe(0.55);
    expect(await db.tariffs.count()).toBe(2);
  });

  it('a tariff dated in the future is not current yet', async () => {
    const { ctx } = freshContext('2026-09-30T08:00:00');
    await setTariff(ctx, 0.5, '2026-01-01');
    await setTariff(ctx, 0.6, '2027-01-01');
    expect((await currentTariff(ctx))?.ratePerKwh).toBe(0.5);
  });

  it('defaults the effective date to today (local)', async () => {
    const { ctx } = freshContext('2026-09-30T08:00:00');
    const t = await setTariff(ctx, 0.5);
    expect(t.effectiveDate).toBe('2026-09-30');
  });

  it('setting the same rate again on the same date does not pile up rows', async () => {
    const { ctx, db } = freshContext();
    await setTariff(ctx, 0.5, '2026-09-30');
    await setTariff(ctx, 0.5, '2026-09-30');
    expect(await db.tariffs.count()).toBe(1);
  });

  it('a new rate on the same date replaces that day\'s rate', async () => {
    const { ctx, db } = freshContext();
    await setTariff(ctx, 0.5, '2026-09-30');
    await setTariff(ctx, 0.52, '2026-09-30');
    expect(await db.tariffs.count()).toBe(1);
    expect((await currentTariff(ctx))?.ratePerKwh).toBe(0.52);
  });

  it('rejects zero, negative and non-finite rates', async () => {
    const { ctx, db } = freshContext();
    for (const r of [0, -0.1, Number.NaN, Number.POSITIVE_INFINITY]) await expect(setTariff(ctx, r)).rejects.toThrow();
    expect(await db.tariffs.count()).toBe(0);
  });
});

describe('operating cost list and reset', () => {
  it('lists rows in the fixed category order of the screen', async () => {
    const { ctx } = freshContext();
    const biz = await ensureBusiness(ctx);
    const base = { businessId: biz.id, mode: 'simple' as const, simpleAmount: 1, active: true, classification: 'shared' as const };
    for (const category of ['kos_lain', 'air', 'ruang_kerja', 'gas', 'elektrik', 'internet_telefon'] as const) {
      await saveOperatingCost(ctx, { ...base, category });
    }
    expect((await listOperatingCosts(ctx)).map((r) => r.category)).toEqual(['ruang_kerja', 'elektrik', 'air', 'internet_telefon', 'gas', 'kos_lain']);
  });

  it('reset removes advanced details and returns to Mudah, keeping the simple amount', async () => {
    const { ctx, db } = freshContext();
    const biz = await ensureBusiness(ctx);
    await saveOperatingCost(ctx, {
      businessId: biz.id,
      category: 'air',
      mode: 'detailed',
      simpleAmount: 40,
      detail: { kind: 'water', averageMonthlyBill: 100, businessUsePct: 30 },
      active: true,
      classification: 'shared',
    });
    await resetOperatingDetail(ctx, biz.id, 'air');
    const [row] = await db.operatingCosts.toArray();
    expect(row).toMatchObject({ mode: 'simple', simpleAmount: 40 });
    expect(row?.detail).toBeUndefined();
  });

  it('reset on a category with no row is a no-op', async () => {
    const { ctx, db } = freshContext();
    const biz = await ensureBusiness(ctx);
    await resetOperatingDetail(ctx, biz.id, 'gas');
    expect(await db.operatingCosts.count()).toBe(0);
  });

  it('switching an existing row to detailed then simple keeps every field (Doc 04 §4)', async () => {
    const { ctx, db } = freshContext();
    const biz = await ensureBusiness(ctx);
    const detail = { kind: 'water' as const, averageMonthlyBill: 100, businessUsePct: 30 };
    const common = { businessId: biz.id, category: 'air' as const, active: true, classification: 'shared' as const };
    await saveOperatingCost(ctx, { ...common, mode: 'simple', simpleAmount: 40 });
    await saveOperatingCost(ctx, { ...common, mode: 'detailed', simpleAmount: 40, detail });
    await saveOperatingCost(ctx, { ...common, mode: 'simple', simpleAmount: 40 });
    const [row] = await db.operatingCosts.toArray();
    expect(row).toMatchObject({ mode: 'simple', simpleAmount: 40, detail });
  });
});

describe('read-only getters never write (they run inside live queries, which are read-only)', () => {
  it('work in a read transaction on an empty database', async () => {
    const { ctx, db } = freshContext();
    const out = await db.transaction('r', [db.businesses, db.costProfiles, db.tariffs, db.operatingCosts], async () => ({
      profile: await getCostProfile(ctx),
      business: await getBusiness(ctx),
      tariff: await currentTariff(ctx),
      rows: await listOperatingCosts(ctx),
    }));
    expect(out.profile).toMatchObject({ valueOfTimePerHour: null, expectedMonthlySales: null });
    expect(out.business).toBeNull();
    expect(out.tariff).toBeNull();
    expect(out.rows).toEqual([]);
    expect(await db.businesses.count()).toBe(0);
  });

  it('work in a read transaction once the business exists', async () => {
    const { ctx, db } = freshContext();
    await saveCostProfile(ctx, { valueOfTimePerHour: 20 });
    await setTariff(ctx, 0.5, '2026-01-01');
    const out = await db.transaction('r', [db.businesses, db.costProfiles, db.tariffs], async () => ({
      profile: await getCostProfile(ctx),
      business: await getBusiness(ctx),
      tariff: await currentTariff(ctx),
    }));
    expect(out.profile.valueOfTimePerHour).toBe(20);
    expect(out.business).not.toBeNull();
    expect(out.tariff?.ratePerKwh).toBe(0.5);
  });
});
