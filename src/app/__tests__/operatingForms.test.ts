import { describe, expect, it } from 'vitest';
import { validateElectricity, validateProfile, validateSimple, validateTariff, validateWater, validateWorkspace } from '../operatingForms';

describe('validateSimple (Mudah)', () => {
  it('accepts zero or more', () => {
    expect(validateSimple('600')).toEqual({ ok: true, value: 600 });
    expect(validateSimple('0')).toEqual({ ok: true, value: 0 });
    expect(validateSimple('1,250.50')).toEqual({ ok: true, value: 1250.5 });
  });
  it.each(['', 'abc', '-5'])('rejects %j with a message', (v) => {
    const r = validateSimple(v);
    expect(r.ok).toBe(false);
  });
});

describe('validateWorkspace (Doc 02 §7)', () => {
  it('RM2,000 x 15% = RM300 (C03)', () => {
    const r = validateWorkspace({ home: '2000', method: 'pct', pct: '15', homeArea: '', businessArea: '' });
    if (!r.ok) throw new Error('expected ok');
    expect(r.value.monthly).toBe(300);
    expect(r.value.detail).toEqual({ kind: 'workspace', monthlyHomeCost: 2000, businessUsePct: 15 });
  });

  it('floor-area method derives the percentage and stores the areas', () => {
    const r = validateWorkspace({ home: '2000', method: 'area', pct: '', homeArea: '100', businessArea: '20' });
    if (!r.ok) throw new Error('expected ok');
    expect(r.value.derivedPct).toBe(20);
    expect(r.value.monthly).toBe(400);
    expect(r.value.detail).toMatchObject({ homeArea: 100, businessArea: 20 });
  });

  it('keeps the manual % when switching to areas and back (nothing is lost)', () => {
    const r = validateWorkspace({ home: '2000', method: 'pct', pct: '15', homeArea: '100', businessArea: '20' });
    if (!r.ok) throw new Error('expected ok');
    expect(r.value.detail).toEqual({ kind: 'workspace', monthlyHomeCost: 2000, businessUsePct: 15, homeArea: 100, businessArea: 20 });
    expect(r.value.monthly).toBe(300);
  });

  it('rejects percentages outside 0 to 100, missing home cost, bad areas', () => {
    expect(validateWorkspace({ home: '2000', method: 'pct', pct: '120', homeArea: '', businessArea: '' }).ok).toBe(false);
    expect(validateWorkspace({ home: '', method: 'pct', pct: '10', homeArea: '', businessArea: '' }).ok).toBe(false);
    expect(validateWorkspace({ home: '2000', method: 'area', pct: '', homeArea: '50', businessArea: '80' }).ok).toBe(false);
    expect(validateWorkspace({ home: '2000', method: 'area', pct: '', homeArea: '0', businessArea: '0' }).ok).toBe(false);
  });
});

describe('validateWater (Doc 02 §8)', () => {
  it('RM100 x 30% = RM30', () => {
    const r = validateWater({ bill: '100', pct: '30' });
    if (!r.ok) throw new Error('expected ok');
    expect(r.value.monthly).toBe(30);
    expect(r.value.detail).toEqual({ kind: 'water', averageMonthlyBill: 100, businessUsePct: 30 });
  });
  it('rejects missing bill or invalid percentage', () => {
    expect(validateWater({ bill: '', pct: '30' }).ok).toBe(false);
    expect(validateWater({ bill: '100', pct: '101' }).ok).toBe(false);
  });
});

describe('validateElectricity (remaining shared amount only)', () => {
  it('takes the general shared amount', () => {
    const r = validateElectricity({ shared: '80' });
    if (!r.ok) throw new Error('expected ok');
    expect(r.value).toEqual({ monthly: 80, detail: { kind: 'electricity', sharedMonthlyAmount: 80 } });
  });
  it('rejects negative', () => expect(validateElectricity({ shared: '-1' }).ok).toBe(false));
});

describe('validateProfile', () => {
  it('blank means not entered (null), values are parsed', () => {
    expect(validateProfile({ time: '', sales: '' })).toEqual({ ok: true, value: { valueOfTimePerHour: null, expectedMonthlySales: null } });
    expect(validateProfile({ time: '20', sales: '6,000' })).toEqual({ ok: true, value: { valueOfTimePerHour: 20, expectedMonthlySales: 6000 } });
  });
  it('zero Nilai Masa is allowed; zero or negative sales is not', () => {
    expect(validateProfile({ time: '0', sales: '' }).ok).toBe(true);
    expect(validateProfile({ time: '', sales: '0' }).ok).toBe(false);
    expect(validateProfile({ time: '-1', sales: '' }).ok).toBe(false);
  });
});

describe('validateTariff', () => {
  it('accepts a positive RM/kWh', () => expect(validateTariff('0.50')).toEqual({ ok: true, value: 0.5 }));
  it.each(['', '0', '-1', 'x'])('rejects %j', (v) => expect(validateTariff(v).ok).toBe(false));
});
