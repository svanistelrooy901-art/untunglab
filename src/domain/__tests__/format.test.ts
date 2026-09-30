import { describe, expect, it } from 'vitest';
import { MINUS, formatPct, formatRM } from '../format';

describe('formatting (Doc 03 §14)', () => {
  it('C10: negative profit -0.44 displays as −RM0.44, never RM0.44', () => {
    expect(formatRM(-0.44)).toBe(`${MINUS}RM0.44`);
    expect(formatRM(-0.44)).not.toBe('RM0.44');
  });

  it('uses two decimals and thousands grouping by default', () => {
    expect(formatRM(4.8)).toBe('RM4.80');
    expect(formatRM(1234.5)).toBe('RM1,234.50');
    expect(formatRM(2000)).toBe('RM2,000.00');
  });

  it('shows 4 decimals when asked, for g/ml-level costs', () => {
    expect(formatRM(0.046875, 4)).toBe('RM0.0469');
    expect(formatRM(0.005, 4)).toBe('RM0.0050');
  });

  it('rounds half up for display only', () => {
    expect(formatRM(0.9375)).toBe('RM0.94');
    expect(formatRM(1.005)).toBe('RM1.01');
  });

  it('never shows a negative zero', () => {
    expect(formatRM(0)).toBe('RM0.00');
    expect(formatRM(-0.004)).toBe('RM0.00');
  });

  it('formats percentages with one decimal and keeps the sign', () => {
    expect(formatPct(-3.6667)).toBe(`${MINUS}3.7%`);
    expect(formatPct(32)).toBe('32.0%');
    expect(formatPct(-25, 0)).toBe(`${MINUS}25%`);
  });

  it('shows a dash for values that are not finite instead of NaN or Infinity', () => {
    expect(formatRM(Number.NaN)).toBe('—');
    expect(formatPct(Number.POSITIVE_INFINITY)).toBe('—');
  });
});
