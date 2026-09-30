import { businessPctFromArea, waterMonthlyCost, workspaceMonthlyCost, type ElectricityDetail, type WaterDetail, type WorkspaceDetail } from '../domain';
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
