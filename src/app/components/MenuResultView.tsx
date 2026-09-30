import { Link } from 'react-router-dom';
import { formatPct, formatRM, type BusinessInput, type Issue, type MenuCostResult, type MenuInput, type OperatingCategory, type StatusCode } from '../../domain';
import { t } from '../../i18n/ms';
import { explainMenu } from '../menuExplain';

const STATUS_STYLE: Record<StatusCode, string> = {
  loss: 'border-loss-line bg-loss-soft text-loss',
  low: 'border-low-line bg-low-soft text-low',
  watch: 'border-watch-line bg-watch-soft text-watch',
  healthy: 'border-healthy-line bg-healthy-soft text-healthy',
};

const STATUS_ICON: Record<StatusCode, string> = { loss: '✕', low: '▼', watch: '!', healthy: '✓' };

/** Icon + label + number, never colour alone (Doc 04 §8). */
export function StatusBadge({ status }: { status: StatusCode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-bold ${STATUS_STYLE[status]}`}>
      <span aria-hidden="true">{STATUS_ICON[status]}</span>
      {t(`status.${status}`)}
    </span>
  );
}

const ISSUE_LINK: Partial<Record<Issue['code'], string>> = {
  expected_sales_missing: '/kos-operasi',
  nilai_masa_missing: '/kos-operasi',
  electricity_tariff_missing: '/kos-operasi',
  operating_costs_invalid: '/kos-operasi',
  operating_costs_missing: '/kos-operasi',
  ingredient_missing: '/bahan',
  incompatible_units: '/bahan',
};

export function issueText(issue: Issue, nameOf: (ref: string | undefined) => string): string {
  if (issue.code === 'operating_costs_missing') {
    const names = (issue.ref ?? '').split(',').filter(Boolean).map((c) => t(`ops.cat.${c as OperatingCategory}`)).join(', ');
    return t('menu.isu.operating_costs_missing').replace('{name}', names);
  }
  return t(`menu.isu.${issue.code}`).replace('{name}', nameOf(issue.ref));
}

export function MenuResultView({
  result,
  input,
  business,
  nameOf,
}: {
  result: MenuCostResult;
  input: MenuInput;
  business: BusinessInput;
  nameOf: (kind: 'ing' | 'pack' | 'eq', ref: string | undefined) => string;
}) {
  const ex = explainMenu(input, business);
  const ing = (ref: string | undefined) => nameOf('ing', ref);
  const rows: { key: string; label: string; perPortion: number | undefined; detail: React.ReactNode }[] = [
    {
      key: 'bahan',
      label: t('menu.bahanRow'),
      perPortion: result.perPortion.ingredients,
      detail: ex.ingredients.map((l, i) => (
        <li key={i} className="flex justify-between gap-3">
          <span>
            {ing(l.ref)} · {l.quantity} {l.unit}
          </span>
          <span>{l.cost === null ? '—' : formatRM(l.cost, 4)}</span>
        </li>
      )),
    },
    {
      key: 'pack',
      label: t('menu.packRow'),
      perPortion: result.perPortion.packaging,
      detail: ex.packaging.map((l, i) => (
        <li key={i} className="flex justify-between gap-3">
          <span>
            {nameOf('pack', l.ref)} · {l.quantityUsed} · {l.semantics === 'per_batch' ? t('menu.perBatch') : t('menu.perPortion')}
          </span>
          <span>{l.cost === null ? '—' : formatRM(l.cost, 4)}</span>
        </li>
      )),
    },
    {
      key: 'masa',
      label: t('menu.masaRow'),
      perPortion: result.perPortion.labour,
      detail: (
        <li className="flex justify-between gap-3">
          <span>
            {ex.labour.minutes} min · {t('menu.formulaMasa')}
            {ex.labour.ratePerHour !== null && ` (${formatRM(ex.labour.ratePerHour)}/jam)`}
          </span>
          <span>{ex.labour.batch === null ? '—' : formatRM(ex.labour.batch, 4)}</span>
        </li>
      ),
    },
    {
      key: 'utiliti',
      label: t('menu.utilitiRow'),
      perPortion: result.perPortion.utilities,
      detail:
        ex.utilities.length === 0 ? (
          <li className="text-muted">—</li>
        ) : (
          ex.utilities.map((l, i) => (
            <li key={i} className="flex justify-between gap-3">
              <span>
                {nameOf('eq', l.ref)} · {l.watts ?? '?'} W × {l.minutes} min{l.kwh !== null && ` = ${l.kwh.toFixed(3)} kWh`}
              </span>
              <span>{l.cost === null ? '—' : formatRM(l.cost, 4)}</span>
            </li>
          ))
        ),
    },
    {
      key: 'operasi',
      label: t('menu.operasiRow'),
      perPortion: result.perPortion.sharedOperating,
      detail: (
        <li className="flex justify-between gap-3">
          <span>
            {ex.sharedOperating.ok ? `${formatPct(ex.sharedOperating.ratePct)} ${t('menu.daripadaHarga')}` : t('menu.belumDikira')}
          </span>
          <span>{ex.sharedOperating.ok ? formatRM(ex.sharedOperating.amount, 4) : '—'}</span>
        </li>
      ),
    },
  ];

  return (
    <div className="rounded-2xl border border-border bg-surface p-4" aria-live="polite">
      <h2 className="text-sm font-bold">{t('menu.hasilTajuk')}</h2>

      {result.complete ? (
        <>
          <div className="mt-2 flex items-baseline justify-between gap-3">
            <span className="text-sm text-muted">{t('terms.kosSebenar')}</span>
            <span className="text-2xl font-bold">{formatRM(result.fullCost)}</span>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm text-muted">{t('terms.hargaJual')}</span>
            <span className="text-base font-semibold">{formatRM(result.sellingPrice)}</span>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm text-muted">{t('terms.anggaranUntung')}</span>
            <span className={`text-base font-bold ${result.profit < 0 ? 'text-loss' : ''}`}>{formatRM(result.profit)}</span>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm text-muted">{t('terms.margin')}</span>
            <span className={`text-base font-bold ${result.profit < 0 ? 'text-loss' : ''}`}>{formatPct(result.marginPct)}</span>
          </div>
          <div className="mt-3">
            <StatusBadge status={result.status} />
          </div>
        </>
      ) : (
        <div className="mt-2">
          <p className="text-sm font-semibold">{t('menu.kekurangan')}</p>
          <ul className="mt-2 space-y-2">
            {result.issues.map((issue, i) => (
              <li key={i} className="rounded-xl border border-watch-line bg-watch-soft p-3 text-sm text-watch">
                {issueText(issue, (ref) => nameOf(issue.code.startsWith('packaging') ? 'pack' : issue.code.startsWith('equipment') ? 'eq' : 'ing', ref))}
                {ISSUE_LINK[issue.code] && (
                  <Link to={ISSUE_LINK[issue.code] as string} className="ml-2 inline-flex min-h-11 items-center font-semibold underline">
                    {t('menu.pergi')}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <h3 className="mt-4 text-sm font-bold">{t('menu.pecahan')}</h3>
      <ul className="mt-1 divide-y divide-border">
        {rows.map((r) => (
          <li key={r.key}>
            <details className="group">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-1.5 font-medium">
                  <span aria-hidden="true" className="text-muted transition-transform group-open:rotate-90">›</span>
                  {r.label}
                </span>
                <span className="font-semibold">{r.perPortion === undefined ? '—' : formatRM(r.perPortion)}</span>
              </summary>
              <ul className="mb-2 space-y-1 rounded-xl bg-canvas p-3 text-xs text-muted">{r.detail}</ul>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}
