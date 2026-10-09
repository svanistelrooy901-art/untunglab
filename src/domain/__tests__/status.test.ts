import { describe, expect, it } from 'vitest';
import { DEFAULT_THRESHOLDS, classifyStatus } from '../status';

describe('status classification (Doc 03 §13, Doc 02 §14)', () => {
  it('profit below zero is Loss', () => {
    expect(classifyStatus(-0.44, -3.7)).toBe('loss');
  });

  it('margin below 25% is Low', () => {
    expect(classifyStatus(2, 24.9)).toBe('low');
    expect(classifyStatus(0, 0)).toBe('low');
  });

  it('margin 25% to below 40% is Watch, 40% and above is Healthy', () => {
    expect(classifyStatus(4.8, 32)).toBe('watch');
    expect(classifyStatus(5, 25)).toBe('watch');
    expect(classifyStatus(8, 39.9)).toBe('watch');
    expect(classifyStatus(9, 40)).toBe('healthy');
    expect(classifyStatus(19.86, 56.7)).toBe('healthy');
  });

  it('Loss always overrides the margin band', () => {
    expect(classifyStatus(-0.01, 65)).toBe('loss');
  });

  it('does not call float noise a loss', () => {
    expect(classifyStatus(-1e-13, 0)).toBe('low');
    expect(classifyStatus(6, 24.9999999999)).toBe('watch');
    expect(classifyStatus(6, 25)).toBe('watch');
  });

  it('thresholds are configurable but Loss precedence stays', () => {
    const custom = { lowBelow: 30, watchBelow: 50 };
    expect(classifyStatus(5, 35, custom)).toBe('watch');
    expect(classifyStatus(-1, 80, custom)).toBe('loss');
  });

  it('rejects thresholds that are out of order', () => {
    expect(() => classifyStatus(1, 10, { lowBelow: 60, watchBelow: 40 })).toThrow();
  });

  it('ships the documented defaults', () => {
    expect(DEFAULT_THRESHOLDS).toEqual({ lowBelow: 25, watchBelow: 40 });
  });
});
