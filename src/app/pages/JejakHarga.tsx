import { Link } from 'react-router-dom';
import { normalisedUnitCost, perDisplayUnit } from '../../domain';
import { listAllHistory, loadCostingData } from '../../db';
import { t } from '../../i18n/ms';
import { EmptyState, Loading, PageHeader, btnPrimary } from '../components/ui';
import { PriceTrend } from '../components/PriceTrend';
import { useLive } from '../data';
import { buildTrails, type IngredientTrail } from '../insights';
import { signedPct, signedRM, unitRM } from '../signed';

type Row = IngredientTrail['changes'][number];

function Movement({ change }: { change: Row }) {
  if (change.kind === 'baseline') return <span className="text-muted">{t('jejak.rekodAsal')}</span>;
  if (change.kind === 'incompatible_units') return <span className="text-muted">{t('jejak.unitBerbeza')}</span>;
  const { comparison: c, mappingsChanged } = change;
  const pct = c.percentChange;
  const up = c.absoluteChangePerDisplayUnit > 0;
  const none = c.absoluteChangePerDisplayUnit === 0 || pct === 0;
  return (
    <span>
      {none ? (
        <span className="text-muted">{t('jejak.tiadaUbah')}</span>
      ) : (
        <span className={`font-semibold ${up ? 'text-loss' : 'text-healthy'}`}>
          {up ? '▲' : '▼'} {signedRM(c.absoluteChangePerDisplayUnit, 3)}/{c.displayUnit}
          {pct !== null && ` (${signedPct(pct)})`} {up ? t('jejak.naik') : t('jejak.turun')}
        </span>
      )}
      {mappingsChanged && <span className="text-muted"> · {t('jejak.pemetaan')}</span>}
    </span>
  );
}

function Trail({ trail }: { trail: IngredientTrail }) {
  const { ingredient: ing, latest, latestUnit, lastChange, affectedMenus } = trail;
  const newestFirst = [...trail.changes].reverse();
  return (
    <li className="rounded-2xl border border-border bg-surface px-4 py-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="truncate text-[15px] font-semibold">{ing.name}</h2>
        {latest && <span className="shrink-0 text-xs text-muted">{latest.purchaseDate}</span>}
      </div>
      {latest && latestUnit && (
        <dl className="mt-1 grid grid-cols-2 gap-x-3 text-sm">
          <dt className="text-muted">{t('jejak.hargaPek')}</dt>
          <dt className="text-muted">{t('jejak.kosSeunit')}</dt>
          <dd className="font-semibold">
            {unitRM(latest.purchasePrice)} / {latest.packageQuantity} {latest.packageUnit}
          </dd>
          <dd className="font-semibold">
            {unitRM(latestUnit.amount)} / {latestUnit.unit}
          </dd>
        </dl>
      )}
      <p className="mt-1 text-sm">
        <span className="text-muted">{t('jejak.perubahan')}: </span>
        {trail.changes.length > 0 ? <Movement change={trail.changes[trail.changes.length - 1]!} /> : null}
      </p>
      <p className="mt-1 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
        <span>{affectedMenus.length > 0 ? `${affectedMenus.length} ${t('jejak.menuTerjejas')}: ${affectedMenus.map((m) => m.name).join(', ')}` : t('jejak.tiadaMenu')}</span>
        {(lastChange || affectedMenus.length > 0) && (
          <Link to={`/kesan-harga?bahan=${ing.id}`} className="inline-flex min-h-11 items-center text-sm font-semibold text-primary">
            {t('jejak.lihatKesan')} →
          </Link>
        )}
      </p>
      <PriceTrend
        name={ing.name}
        unit={latestUnit?.unit ?? ''}
        points={trail.changes.map((c) => ({
          date: c.entry.purchaseDate,
          amount: perDisplayUnit(normalisedUnitCost(c.entry.purchasePrice, c.entry.packageQuantity, c.entry.packageUnit, c.entry.packMappings)).amount,
        }))}
      />
      <details className="mt-1 border-t border-border pt-2">
        <summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium text-primary">
          {t('jejak.sejarah').replace('{n}', String(trail.changes.length))}
        </summary>
        <ul className="divide-y divide-border">
          {newestFirst.map((c) => {
            const unit = perDisplayUnit(normalisedUnitCost(c.entry.purchasePrice, c.entry.packageQuantity, c.entry.packageUnit, c.entry.packMappings));
            return (
              <li key={c.entry.id} className="py-2 text-sm">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-muted">{c.entry.purchaseDate}</span>
                  <span className="font-medium">
                    {unitRM(c.entry.purchasePrice)} / {c.entry.packageQuantity} {c.entry.packageUnit}
                  </span>
                </div>
                <div className="mt-0.5 flex flex-wrap justify-between gap-2 text-xs">
                  <Movement change={c} />
                  <span className="text-muted">
                    {unitRM(unit.amount)} / {unit.unit}
                  </span>
                </div>
                {c.kind === 'change' && (
                  <Link to={`/kesan-harga?bahan=${trail.ingredient.id}&rekod=${c.entry.id}`} className="inline-flex min-h-11 items-center text-xs font-semibold text-primary">
                    {t('jejak.lihatKesanMenu')} →
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </details>
    </li>
  );
}

/** Jejak Harga: latest price and normalised unit cost, with an immutable history ordered by purchase date (Doc 02 §11). */
export function JejakHargaPage() {
  const data = useLive(async (c) => ({ costing: await loadCostingData(c), history: await listAllHistory(c) }));
  if (!data) return <Loading />;
  const trails = buildTrails(data.costing, data.history);
  return (
    <section>
      <PageHeader title={t('jejak.title')} />
      <p className="mt-1 text-sm text-muted">{t('jejak.intro')}</p>
      {trails.length === 0 ? (
        <EmptyState
          title={t('jejak.kosongTajuk')}
          body={t('jejak.kosongIsi')}
          action={
            <Link to="/bahan" className={btnPrimary}>
              {t('bahan.tambah')}
            </Link>
          }
        />
      ) : (
        <ul className="mt-4 space-y-3" data-testid="trails">
          {trails.map((tr) => (
            <Trail key={tr.ingredient.id} trail={tr} />
          ))}
        </ul>
      )}
    </section>
  );
}
