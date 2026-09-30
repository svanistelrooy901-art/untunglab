/** Display formatting (Doc 03 §14). Calculations keep full precision; only these functions round. */

/** U+2212 minus sign, as used in the specification examples. */
export const MINUS = '−';

const roundHalfUp = (magnitude: number, decimals: number): number => {
  const factor = 10 ** decimals;
  return Math.round((magnitude + Number.EPSILON * Math.max(1, magnitude)) * factor) / factor;
};

const group = (text: string): string => {
  const [whole = '', fraction] = text.split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return fraction === undefined ? grouped : `${grouped}.${fraction}`;
};

/** Ringgit with the sign preserved: −RM0.44, never RM0.44. Never shows a negative zero. */
export function formatRM(value: number, decimals = 2): string {
  if (!Number.isFinite(value)) return '—';
  const rounded = roundHalfUp(Math.abs(value), decimals);
  const sign = value < 0 && rounded !== 0 ? MINUS : '';
  return `${sign}RM${group(rounded.toFixed(decimals))}`;
}

export function formatPct(value: number, decimals = 1): string {
  if (!Number.isFinite(value)) return '—';
  const rounded = roundHalfUp(Math.abs(value), decimals);
  const sign = value < 0 && rounded !== 0 ? MINUS : '';
  return `${sign}${rounded.toFixed(decimals)}%`;
}
