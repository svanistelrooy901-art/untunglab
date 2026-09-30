import { describe, expect, it } from 'vitest';
import { trendPoints } from '../trend';

const box = { width: 300, height: 100, padX: 10, padY: 10 };

describe('trendPoints', () => {
  it('x follows the date, y is inverted so a higher cost is higher on screen', () => {
    const p = trendPoints([{ date: '2026-09-01', amount: 10 }, { date: '2026-09-11', amount: 20 }, { date: '2026-09-21', amount: 15 }], box);
    expect(p.map((x) => x.x)).toEqual([10, 150, 290]);
    expect(p[1]!.y).toBeLessThan(p[0]!.y);
    expect(p[1]!.y).toBeLessThan(p[2]!.y);
  });
  it('a flat series sits mid-height and does not divide by zero', () => {
    const p = trendPoints([{ date: '2026-09-01', amount: 5 }, { date: '2026-09-02', amount: 5 }], box);
    expect(p.every((x) => Number.isFinite(x.y) && x.y === 50)).toBe(true);
  });
  it('records on the same day are spread out, not stacked', () => {
    const p = trendPoints([{ date: '2026-09-01', amount: 1 }, { date: '2026-09-01', amount: 2 }], box);
    expect(p[0]!.x).toBe(10);
    expect(p[1]!.x).toBe(290);
  });
  it('a single record is centred', () => {
    expect(trendPoints([{ date: '2026-09-01', amount: 1 }], box)[0]!.x).toBe(150);
  });
});
