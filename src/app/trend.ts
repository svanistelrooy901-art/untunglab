export interface TrendInput {
  date: string;
  amount: number;
}
export interface Box {
  width: number;
  height: number;
  padX: number;
  padY: number;
}
export interface TrendPoint extends TrendInput {
  x: number;
  y: number;
}

const day = (d: string) => Date.parse(`${d}T00:00:00Z`);

/** Screen positions for a price trend. X follows real dates (evenly spread when all dates are equal); Y is inverted. */
export function trendPoints(points: readonly TrendInput[], box: Box): TrendPoint[] {
  const w = box.width - box.padX * 2;
  const h = box.height - box.padY * 2;
  const times = points.map((p) => day(p.date));
  const t0 = Math.min(...times);
  const tSpan = Math.max(...times) - t0;
  const amounts = points.map((p) => p.amount);
  const lo = Math.min(...amounts);
  const span = Math.max(...amounts) - lo;
  return points.map((p, i) => ({
    ...p,
    x: box.padX + (points.length === 1 ? w / 2 : tSpan > 0 ? ((times[i]! - t0) / tSpan) * w : (i / (points.length - 1)) * w),
    y: box.padY + (span > 0 ? (1 - (p.amount - lo) / span) * h : h / 2),
  }));
}
