import { useState } from 'react';
import { t } from '../../i18n/ms';
import { signedPct, signedRM, unitRM } from '../signed';
import { trendPoints, type TrendInput } from '../trend';

const BOX = { width: 320, height: 170, padX: 22, padY: 36 };

/**
 * Normalised unit cost over time for one ingredient. One series, so no legend; the title names it.
 * The history list under it is the table view. Selecting a point (tap, hover or keyboard) shows its exact values.
 */
export function PriceTrend({ name, points, unit }: { name: string; points: TrendInput[]; unit: string }) {
  const [picked, setPicked] = useState<number | null>(null);
  if (points.length < 2) return null;
  const pts = trendPoints(points, BOX);
  const i = picked ?? pts.length - 1;
  const cur = pts[i]!;
  const prev = i > 0 ? pts[i - 1]! : null;
  const lo = Math.min(...points.map((p) => p.amount));
  const hi = Math.max(...points.map((p) => p.amount));
  const line = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const first = points[0]!.date;
  const last = points[points.length - 1]!.date;

  const nearest = (clientX: number, el: SVGSVGElement) => {
    const r = el.getBoundingClientRect();
    const x = ((clientX - r.left) / r.width) * BOX.width;
    let best = 0;
    pts.forEach((p, n) => {
      if (Math.abs(p.x - x) < Math.abs(pts[best]!.x - x)) best = n;
    });
    setPicked(best);
  };

  return (
    <div className="mt-2">
      <p className="text-xs font-semibold">{t('jejak.trendTajuk')}</p>
      <p className="mt-0.5 min-h-8 text-xs text-muted" aria-live="polite">
        <span className="font-semibold text-ink">
          {cur.date} · {unitRM(cur.amount)}/{unit}
        </span>
        {prev && (
          <>
            {' '}
            · {signedRM(cur.amount - prev.amount, 3)} ({prev.amount > 0 ? signedPct(((cur.amount - prev.amount) / prev.amount) * 100) : '—'}) {t('jejak.dariSebelum')}
          </>
        )}
      </p>
      <svg
        viewBox={`0 0 ${BOX.width} ${BOX.height}`}
        className="w-full touch-pan-y select-none text-primary"
        role="img"
        aria-label={t('jejak.trendLabel').replace('{nama}', name).replace('{a}', first).replace('{b}', last).replace('{n}', String(points.length))}
        data-testid="trend"
        onPointerMove={(e) => nearest(e.clientX, e.currentTarget)}
        onPointerDown={(e) => nearest(e.clientX, e.currentTarget)}
      >
        <line x1={BOX.padX} x2={BOX.width - BOX.padX} y1={BOX.padY} y2={BOX.padY} stroke="currentColor" strokeOpacity="0.12" />
        <line x1={BOX.padX} x2={BOX.width - BOX.padX} y1={BOX.height - BOX.padY} y2={BOX.height - BOX.padY} stroke="currentColor" strokeOpacity="0.12" />
        <text x={BOX.padX} y={BOX.padY - 8} fontSize="10" className="fill-muted">
          {unitRM(hi)}
        </text>
        <text x={BOX.padX} y={BOX.height - BOX.padY + 16} fontSize="10" className="fill-muted">
          {unitRM(lo)}
        </text>
        <text x={BOX.width - BOX.padX} y={BOX.height - 2} fontSize="10" textAnchor="end" className="fill-muted">
          {last}
        </text>
        <text x={BOX.padX} y={BOX.height - 2} fontSize="10" className="fill-muted">
          {first}
        </text>
        <polyline points={line} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {pts.map((p, n) => (
          <circle
            key={n}
            cx={p.x}
            cy={p.y}
            r={n === i ? 6 : 4}
            strokeWidth="2"
            className={n === i ? 'fill-primary stroke-surface' : 'fill-surface stroke-primary'}
            tabIndex={0}
            role="button"
            aria-label={`${p.date} ${unitRM(p.amount)}/${unit}`}
            onFocus={() => setPicked(n)}
          />
        ))}
      </svg>
      <p className="text-xs text-muted">{t('jejak.trendNota')}</p>
    </div>
  );
}
