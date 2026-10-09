/** Worker pay -> hourly rate. Pure functions; unusable input gives null, never a guess (D-85). */

export const WORKING_DAYS_FULL_WEEK = 26;
export const WORKING_DAYS_FIVE_DAY = 22;
export const HOURS_PER_DAY = 8;

export interface Worker {
  id: string;
  name: string;
  monthlyPay: number;
  daysPerMonth: number;
  hoursPerDay: number;
}

const usable = (n: number) => Number.isFinite(n) && n > 0;

export function workerMonthlyHours(w: Worker): number {
  return w.daysPerMonth * w.hoursPerDay;
}

function valid(w: Worker): boolean {
  return Number.isFinite(w.monthlyPay) && w.monthlyPay >= 0 && usable(w.daysPerMonth) && usable(w.hoursPerDay) && usable(workerMonthlyHours(w));
}

export function workerHourlyRate(w: Worker): number | null {
  return valid(w) ? w.monthlyPay / workerMonthlyHours(w) : null;
}

/** Team rate = total pay / total hours, so a part-timer counts for fewer hours. Null when empty or any worker is unusable. */
export function teamHourlyRate(workers: readonly Worker[]): number | null {
  if (workers.length === 0 || !workers.every(valid)) return null;
  const pay = workers.reduce((s, w) => s + w.monthlyPay, 0);
  const hours = workers.reduce((s, w) => s + workerMonthlyHours(w), 0);
  return pay / hours;
}
