import { describe, expect, it } from 'vitest';
import { ensureBusiness, saveOperatingCost } from '../../db/repo';
import { listOperatingCosts } from '../../db/settings';
import { getCostProfile, saveCostProfile } from '../../db/settings';
import { freshContext } from '../../db/__tests__/helpers';
import { hourlyRateOf } from '../menuAssembly';
import { toEntry } from '../operatingView';
import { finalMonthlyAmount } from '../../domain';
import { validateGuided, validateOtherItem, validateWorker } from '../operatingForms';

describe('forms for guided costs, Kos Lain and workers', () => {
  it('guided: RM150 bill, 10% -> RM15; blank or out of range is refused', () => {
    const r = validateGuided({ bill: '150', pct: '10' });
    expect(r.ok && r.value.monthly).toBe(15);
    expect(validateGuided({ bill: '', pct: '10' }).ok).toBe(false);
    expect(validateGuided({ bill: '150', pct: '120' }).ok).toBe(false);
  });
  it('other item needs a name and an amount of RM0 or more', () => {
    expect(validateOtherItem({ name: 'Iklan', amount: '50' })).toEqual({ ok: true, value: { name: 'Iklan', monthlyAmount: 50 } });
    expect(validateOtherItem({ name: ' ', amount: '50' }).ok).toBe(false);
    expect(validateOtherItem({ name: 'Iklan', amount: '-1' }).ok).toBe(false);
  });
  it('worker needs 1-31 days and more than 0 hours', () => {
    expect(validateWorker({ name: 'Ali', pay: '2080', days: '26', hours: '8' }).ok).toBe(true);
    expect(validateWorker({ name: 'Ali', pay: '2080', days: '0', hours: '8' }).ok).toBe(false);
    expect(validateWorker({ name: 'Ali', pay: '2080', days: '26', hours: '0' }).ok).toBe(false);
    expect(validateWorker({ name: '', pay: '2080', days: '26', hours: '8' }).ok).toBe(false);
  });
});

describe('hourly rate used by menus', () => {
  const w = (pay: number) => ({ id: 'a', name: 'A', monthlyPay: pay, daysPerMonth: 26, hoursPerDay: 8 });
  it('solo uses Nilai Masa; absent mode means solo (existing users)', () => {
    expect(hourlyRateOf({ valueOfTimePerHour: 12 })).toBe(12);
    expect(hourlyRateOf({ workMode: 'solo', valueOfTimePerHour: 12, workers: [w(2080)] })).toBe(12);
  });
  it('team uses the worker list and ignores Nilai Masa; incomplete team is null, not a fallback', () => {
    expect(hourlyRateOf({ workMode: 'team', valueOfTimePerHour: 12, workers: [w(2080)] })).toBeCloseTo(10, 10);
    expect(hourlyRateOf({ workMode: 'team', valueOfTimePerHour: 12, workers: [] })).toBeNull();
  });
});

describe('storage keeps both sides and the new fields', () => {
  it('switching to team and back keeps Nilai Masa and the workers', async () => {
    const { ctx } = freshContext();
    await saveCostProfile(ctx, { valueOfTimePerHour: 15 });
    await saveCostProfile(ctx, { workMode: 'team', workers: [{ id: 'a', name: 'Ali', monthlyPay: 2080, daysPerMonth: 26, hoursPerDay: 8 }] });
    await saveCostProfile(ctx, { workMode: 'solo' });
    const p = await getCostProfile(ctx);
    expect(p.valueOfTimePerHour).toBe(15);
    expect(p.workers).toHaveLength(1);
    expect(hourlyRateOf(p)).toBe(15);
  });
  it('guided and items are stored; a later direct save clears the guided inputs', async () => {
    const { ctx } = freshContext();
    const biz = await ensureBusiness(ctx);
    const base = { businessId: biz.id, active: true, classification: 'shared' as const, mode: 'simple' as const };
    await saveOperatingCost(ctx, { ...base, category: 'air', simpleAmount: 0, guided: { monthlyBill: 80, businessUsePct: 10 } });
    await saveOperatingCost(ctx, { ...base, category: 'kos_lain', simpleAmount: 0, items: [{ id: 'x', name: 'Iklan', monthlyAmount: 40 }] });
    let rows = await listOperatingCosts(ctx);
    expect(finalMonthlyAmount(toEntry(rows.find((r) => r.category === 'air')!))).toBe(8);
    expect(finalMonthlyAmount(toEntry(rows.find((r) => r.category === 'kos_lain')!))).toBe(40);
    await saveOperatingCost(ctx, { ...base, category: 'air', simpleAmount: 25 });
    rows = await listOperatingCosts(ctx);
    expect(finalMonthlyAmount(toEntry(rows.find((r) => r.category === 'air')!))).toBe(25);
  });
});
