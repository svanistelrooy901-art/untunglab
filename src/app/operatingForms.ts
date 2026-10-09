import { businessPctFromArea, guidedMonthlyCost, waterMonthlyCost, workspaceMonthlyCost, type ElectricityDetail, type GuidedAmount, type WaterDetail, type WorkspaceDetail, type Worker } from '../domain';
import { t } from '../i18n/ms';
import { parseNumber, type FormResult } from './forms';

const nonNegative = (text: string) => {
  const n = parseNumber(text);
  return n !== null && n >= 0 ? n : null;
};
const pctValue = (text: string) => {
  const n = parseNumber(text);
  return n !== null && n >= 0 && n <= 100 ? n : null;
};

/** Mudah: one monthly RM amount, zero or more. */
export function validateSimple(text: string): { ok: true; value: number } | { ok: false; error: string } {
  const n = nonNegative(text);
  return n === null ? { ok: false, error: t('ops.errJumlah') } : { ok: true, value: n };
}

export interface WorkspaceForm {
  home: string;
  method: 'pct' | 'area';
  pct: string;
  homeArea: string;
  businessArea: string;
}

export interface Derived<D> {
  detail: D;
  monthly: number;
}

/** Ruang Kerja. Both the manual % and the areas are stored, so switching methods never loses data. */
export function validateWorkspace(f: WorkspaceForm): FormResult<Derived<WorkspaceDetail> & { derivedPct: number }, 'home' | 'pct' | 'area'> {
  const errors: Partial<Record<'home' | 'pct' | 'area', string>> = {};
  const home = nonNegative(f.home);
  if (home === null) errors.home = t('ops.errJumlah');

  const manual = f.pct.trim() === '' ? null : pctValue(f.pct);
  const homeArea = f.homeArea.trim() === '' ? null : parseNumber(f.homeArea);
  const businessArea = f.businessArea.trim() === '' ? null : parseNumber(f.businessArea);
  let derivedPct: number | null = null;

  if (f.method === 'pct') {
    if (manual === null) errors.pct = t('ops.errPeratus');
    else derivedPct = manual;
  } else {
    if (homeArea === null || businessArea === null) errors.area = t('ops.errKeluasan');
    else {
      try {
        derivedPct = businessPctFromArea(businessArea, homeArea);
      } catch {
        errors.area = t('ops.errKeluasan');
      }
    }
  }
  if (Object.keys(errors).length > 0 || home === null || derivedPct === null) return { ok: false, errors };

  const detail: WorkspaceDetail = {
    kind: 'workspace',
    monthlyHomeCost: home,
    method: f.method === 'pct' ? 'percent' : 'area',
    ...(manual !== null ? { businessUsePct: manual } : {}),
    ...(homeArea !== null && businessArea !== null && homeArea > 0 && businessArea >= 0 && businessArea <= homeArea ? { homeArea, businessArea } : {}),
  };
  return { ok: true, value: { detail, monthly: workspaceMonthlyCost(home, derivedPct), derivedPct } };
}

export function validateWater(f: { bill: string; pct: string }): FormResult<Derived<WaterDetail>, 'bill' | 'pct'> {
  const errors: Partial<Record<'bill' | 'pct', string>> = {};
  const bill = nonNegative(f.bill);
  const pct = pctValue(f.pct);
  if (bill === null) errors.bill = t('ops.errJumlah');
  if (pct === null) errors.pct = t('ops.errPeratus');
  if (bill === null || pct === null) return { ok: false, errors };
  return { ok: true, value: { detail: { kind: 'water', averageMonthlyBill: bill, businessUsePct: pct }, monthly: waterMonthlyCost(bill, pct) } };
}

export function validateElectricity(f: { shared: string }): FormResult<Derived<ElectricityDetail>, 'shared'> {
  const shared = nonNegative(f.shared);
  if (shared === null) return { ok: false, errors: { shared: t('ops.errJumlah') } };
  return { ok: true, value: { detail: { kind: 'electricity', sharedMonthlyAmount: shared }, monthly: shared } };
}

/** Blank = not entered (null). Nilai Masa may be zero; expected sales must be more than zero. */
export function validateProfile(f: { time: string; sales: string }): FormResult<{ valueOfTimePerHour: number | null; expectedMonthlySales: number | null }, 'time' | 'sales'> {
  const errors: Partial<Record<'time' | 'sales', string>> = {};
  let time: number | null = null;
  let sales: number | null = null;
  if (f.time.trim() !== '') {
    time = nonNegative(f.time);
    if (time === null) errors.time = t('ops.errNilaiMasa');
  }
  if (f.sales.trim() !== '') {
    const n = parseNumber(f.sales);
    if (n === null || n <= 0) errors.sales = t('ops.errJualan');
    else sales = n;
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: { valueOfTimePerHour: time, expectedMonthlySales: sales } };
}

export function validateTariff(text: string): { ok: true; value: number } | { ok: false; error: string } {
  const n = parseNumber(text);
  return n !== null && n > 0 ? { ok: true, value: n } : { ok: false, error: t('ops.errTarif') };
}

/** Mudah guided: monthly bill and the share the business uses. */
export function validateGuided(f: { bill: string; pct: string }): FormResult<{ guided: GuidedAmount; monthly: number }, 'bill' | 'pct'> {
  const errors: Partial<Record<'bill' | 'pct', string>> = {};
  const bill = nonNegative(f.bill);
  const pct = pctValue(f.pct);
  if (bill === null) errors.bill = t('ops.errJumlah');
  if (pct === null) errors.pct = t('ops.errPeratus');
  if (bill === null || pct === null) return { ok: false, errors };
  return { ok: true, value: { guided: { monthlyBill: bill, businessUsePct: pct }, monthly: guidedMonthlyCost(bill, pct) } };
}

/** One Kos Lain item: a name and a monthly RM amount. */
export function validateOtherItem(f: { name: string; amount: string }): FormResult<{ name: string; monthlyAmount: number }, 'name' | 'amount'> {
  const errors: Partial<Record<'name' | 'amount', string>> = {};
  const name = f.name.trim();
  const amount = nonNegative(f.amount);
  if (name === '') errors.name = t('ops.errNamaKos');
  if (amount === null) errors.amount = t('ops.errJumlah');
  if (name === '' || amount === null) return { ok: false, errors };
  return { ok: true, value: { name, monthlyAmount: amount } };
}

/** One worker: name, monthly pay, days a month, hours a day. Hours must be more than zero. */
export function validateWorker(f: { name: string; pay: string; days: string; hours: string }): FormResult<Omit<Worker, 'id'>, 'name' | 'pay' | 'days' | 'hours'> {
  const errors: Partial<Record<'name' | 'pay' | 'days' | 'hours', string>> = {};
  const name = f.name.trim();
  const pay = nonNegative(f.pay);
  const days = parseNumber(f.days);
  const hours = parseNumber(f.hours);
  if (name === '') errors.name = t('ops.errNamaPekerja');
  if (pay === null) errors.pay = t('ops.errJumlah');
  if (days === null || days <= 0 || days > 31) errors.days = t('ops.errHari');
  if (hours === null || hours <= 0 || hours > 24) errors.hours = t('ops.errJam');
  if (Object.keys(errors).length > 0 || pay === null || days === null || hours === null) return { ok: false, errors };
  return { ok: true, value: { name, monthlyPay: pay, daysPerMonth: days, hoursPerDay: hours } };
}
