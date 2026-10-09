import { describe, expect, it } from 'vitest';
import { teamHourlyRate, workerHourlyRate, workerMonthlyHours, WORKING_DAYS_FULL_WEEK, WORKING_DAYS_FIVE_DAY, HOURS_PER_DAY } from '../labour';
import { labourCostPerBatch } from '../costing';

const w = (monthlyPay: number, daysPerMonth: number, hoursPerDay: number, name = 'Pekerja') => ({ id: name, name, monthlyPay, daysPerMonth, hoursPerDay });

describe('worker pay', () => {
  it('guide values: 26 days (six-day week), 22 days (five-day week), 8 hours', () => {
    expect([WORKING_DAYS_FULL_WEEK, WORKING_DAYS_FIVE_DAY, HOURS_PER_DAY]).toEqual([26, 22, 8]);
  });
  it('hours a month = days × hours a day', () => {
    expect(workerMonthlyHours(w(2000, 26, 8))).toBe(208);
  });
  it('RM2,080 for 26 days of 8 hours is RM10 an hour', () => {
    expect(workerHourlyRate(w(2080, 26, 8))).toBeCloseTo(10, 10);
  });
  it('refuses zero or negative hours, negative pay, and non-numbers', () => {
    expect(workerHourlyRate(w(1000, 0, 8))).toBeNull();
    expect(workerHourlyRate(w(1000, 26, 0))).toBeNull();
    expect(workerHourlyRate(w(-1, 26, 8))).toBeNull();
    expect(workerHourlyRate(w(Number.NaN, 26, 8))).toBeNull();
  });
});

describe('team rate = total pay ÷ total hours (D-85)', () => {
  it('equal hours give the same answer as the plain average of hourly rates', () => {
    const team = [w(2080, 26, 8, 'a'), w(3120, 26, 8, 'b')];
    expect(teamHourlyRate(team)).toBeCloseTo((10 + 15) / 2, 10);
  });
  it('a part-timer counts for fewer hours (RM2,000 full time + RM800 for 80 hours)', () => {
    const team = [w(2000, 25, 8, 'full'), w(800, 10, 8, 'part')];
    // 2,800 ÷ (200 + 80) hours = RM10 an hour, not the plain average of RM10 and RM10... use unequal pay to prove it
    expect(teamHourlyRate(team)).toBeCloseTo(2800 / 280, 10);
    const lopsided = [w(2000, 25, 8, 'full'), w(1600, 5, 8, 'part')];
    expect(teamHourlyRate(lopsided)).toBeCloseTo(3600 / (200 + 40), 10);
    expect(teamHourlyRate(lopsided)).not.toBeCloseTo((10 + 40) / 2, 3);
  });
  it('one worker is just their own rate', () => {
    expect(teamHourlyRate([w(2080, 26, 8)])).toBeCloseTo(10, 10);
  });
  it('no workers, or any worker with unusable numbers, gives null instead of a guess', () => {
    expect(teamHourlyRate([])).toBeNull();
    expect(teamHourlyRate([w(2000, 26, 8), w(1000, 0, 8)])).toBeNull();
    expect(teamHourlyRate([w(2000, 26, 8), w(-5, 26, 8)])).toBeNull();
  });
  it('feeds the same menu time formula as Nilai Masa: 30 minutes at RM10 an hour = RM5', () => {
    const rate = teamHourlyRate([w(2080, 26, 8)])!;
    expect(labourCostPerBatch(30, rate)).toBeCloseTo(5, 10);
  });
});
