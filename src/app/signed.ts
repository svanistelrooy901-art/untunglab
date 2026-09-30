import { formatPct, formatRM } from '../domain';

/** +7.1% / −3.0%. The sign is always shown so direction never depends on colour or arrows alone. */
export function signedPct(value: number, decimals = 1): string {
  const text = formatPct(value, decimals);
  return value > 0 && !text.startsWith('−') && text !== formatPct(0, decimals) ? `+${text}` : text;
}

/** +RM3.00 / −RM1.20 / RM0.00. */
export function signedRM(value: number, decimals = 2): string {
  const text = formatRM(value, decimals);
  return value > 0 && text !== formatRM(0, decimals) ? `+${text}` : text;
}

/** Unit costs are often below RM1 (per gram, per piece), so they get a third decimal when small. */
export function unitRM(value: number): string {
  return formatRM(value, value !== 0 && Math.abs(value) < 1 ? 3 : 2);
}
