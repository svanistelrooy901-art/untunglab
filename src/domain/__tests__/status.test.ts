import { describe, expect, it } from 'vitest';
import { DEFAULT_THRESHOLDS, classifyStatus } from '../status';

describe('status classification (Doc 03 §13, Doc 02 §14)', () => {
  it('profit below zero is Loss', () => {
    expect(classifyStatus(-0.44, -3.7)).toBe('loss');
  });

  it('margin below 40% is Low', () => {
    expect(classifyStatus(4.8, 32)).toBe('low');
    expect(classifyStatus(0, 0)).toBe('low');
  });

  it('margin 40% to below 60% is Watch, 60% and above is Healthy', () => {
    expect(classifyStatus(6, 40)).toBe('watch');
    expect(classifyStatus(8, 59.9)).toBe('watch');
    expect(classifyStatus(9, 60)).toBe('healthy');
    expect(classifyStatus(12, 80)).toBe('healthy');
  });

  it('Loss always overrides the margin band', () => {
    expect(classifyStatus(-0.01, 65)).toBe('loss');
  });

  it('does not call float noise a loss', () => {
    expect(classifyStatus(-1e-13, 0)).toBe('low');
    expect(classifyStatus(6, 39.9999999999)).toBe('watch');
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
    expect(DEFAULT_THRESHOLDS).toEqual({ lowBelow: 40, watchBelow: 60 });
  });
});
