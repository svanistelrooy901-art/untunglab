import { describe, expect, it } from 'vitest';
import { signedPct, signedRM, unitRM } from '../signed';

describe('signed display', () => {
  it('always shows direction', () => {
    expect(signedPct(7.14)).toBe('+7.1%');
    expect(signedPct(-3.04)).toBe('−3.0%');
    expect(signedPct(0)).toBe('0.0%');
    expect(signedPct(0.01)).toBe('0.0%');
    expect(signedRM(3)).toBe('+RM3.00');
    expect(signedRM(-1.2)).toBe('−RM1.20');
    expect(signedRM(0)).toBe('RM0.00');
  });
  it('small unit costs get a third decimal', () => {
    expect(unitRM(0.3)).toBe('RM0.300');
    expect(unitRM(15)).toBe('RM15.00');
  });
});
