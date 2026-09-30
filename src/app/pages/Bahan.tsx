import { useState } from 'react';
import { formatPct, historyChanges } from '../../domain';
import { createIngredient, listHistory, listIngredients, localDate, setIngredientActive, updateIngredient, type Ingredient } from '../../db';
import { t } from '../../i18n/ms';
import { Badge, EmptyState, Field, InfoTip, Loading, PageHeader, Sheet, btnPrimary, btnQuiet, btnSecondary } from '../components/ui';
import { useData, useLive } from '../data';
import { parseMappings, unitCostLabel, validateIngredientForm, type MappingRow } from '../forms';

export function BahanPage() {
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState<Ingredient | 'new' | null>(null);
  const items = useLive((ctx) => listIngredients(ctx, { includeInactive: showArchived }), [showArchived]);

  return (
    <section>
      <PageHeader
        title={t('bahan.title')}
        action={
          <button type="button" className={btnPrimary} onClick={() => setEditing('new')}>
            {t('bahan.tambah')}
          </button>
        }
      />
      {!items ? (
        <Loading />
      ) : items.length === 0 && !showArchived ? (
        <EmptyState
          title={t('bahan.kosongTajuk')}
          body={t('bahan.kosongIsi')}
          action={
            <button type="button" className={btnPrimary} onClick={() => setEditing('new')}>
              {t('bahan.tambah')}
            </button>
          }
        />
      ) : (
        <ul className="mt-4 overflow-hidden rounded-2xl border border-border bg-surface">
          {items.map((i, n) => (
            <li key={i.id} className={n > 0 ? 'border-t border-border' : ''}>
              <button type="button" onClick={() => setEditing(i)} className="flex min-h-14 w-full items-center justify-between gap-3 px-4 py-2 text-left">
                <span className="min-w-0">
                  <span className="block truncate text-[15px] font-medium">
                    {i.name} {!i.active && <Badge>{t('common.diarkib')}</Badge>}
                  </span>
                  <span className="block text-xs text-muted">
                    RM{i.purchasePrice.toFixed(2)} / {i.packageQuantity} {i.packageUnit}
                  </span>
                </span>
                <span className="shrink-0 text-sm font-semibold">{unitCostLabel(i.purchasePrice, i.packageQuantity, i.packageUnit, i.packMappings) ?? '—'}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <label className="mt-4 flex min-h-11 items-center gap-2 text-sm text-muted">
        <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} className="size-5" />
        {t('common.tunjukArkib')}
      </label>
      <IngredientSheet target={editing} onClose={() => setEditing(null)} />
    </section>
  );
}

function IngredientSheet({ target, onClose }: { target: Ingredient | 'new' | null; onClose: () => void }) {
  // Remount the form for each target so state never leaks between ingredients.
  return (
    <Sheet open={target !== null} title={target === 'new' ? t('bahan.tajukBaru') : t('bahan.tajukEdit')} onClose={onClose}>
      {target && <IngredientForm key={target === 'new' ? 'new' : target.id} ingredient={target === 'new' ? null : target} onDone={onClose} />}
    </Sheet>
  );
}

function IngredientForm({ ingredient, onDone }: { ingredient: Ingredient | null; onDone: () => void }) {
  const ctx = useData();
  const [name, setName] = useState(ingredient?.name ?? '');
  const [price, setPrice] = useState(ingredient ? String(ingredient.purchasePrice) : '');
  const [quantity, setQuantity] = useState(ingredient ? String(ingredient.packageQuantity) : '');
  const [unit, setUnit] = useState(ingredient?.packageUnit ?? '');
  const [rows, setRows] = useState<MappingRow[]>(
    ingredient?.packMappings.map((m) => ({ pack: m.pack, unit: m.unit, per: String(m.unitsPerPack) })) ?? [],
  );
  const [date, setDate] = useState(localDate(new Date()));
  const [supplier, setSupplier] = useState('');
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [busy, setBusy] = useState(false);

  const history = useLive((c) => (ingredient ? listHistory(c, ingredient.id) : Promise.resolve([])), [ingredient?.id]);

  const mappings = parseMappings(rows);
  const check = validateIngredientForm({ name, price, quantity, unit });
  // Errors appear after the first save attempt, then follow the fields live so they clear as soon as they are fixed.
  const errors: Record<string, string | undefined> = submitted
    ? { ...(check.ok ? {} : check.errors), ...(mappings.ok ? {} : { mapping: mappings.errors.mapping }) }
    : {};
  const preview = validateIngredientForm({ name: 'x', price, quantity, unit });
  const previewText = preview.ok
    ? unitCostLabel(preview.value.purchasePrice, preview.value.packageQuantity, preview.value.packageUnit, mappings.ok ? mappings.value : [])
    : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    const v = check;
    if (!v.ok || !mappings.ok) return;
    setBusy(true);
    setSaveError(false);
    try {
      const detail = { supplier: supplier.trim() || null, notes: notes.trim() || null, purchaseDate: date || localDate(new Date()) };
      if (ingredient) await updateIngredient(ctx, ingredient.id, { ...v.value, packMappings: mappings.value }, detail);
      else await createIngredient(ctx, { ...v.value, packMappings: mappings.value, ...detail });
      onDone();
    } catch {
      setSaveError(true);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <Field label={t('form.namaLabel')} value={name} onChange={(e) => setName(e.target.value)} error={errors.name} autoComplete="off" />
      <div className="grid grid-cols-2 gap-3">
        <Field label={t('form.hargaBeliLabel')} inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} error={errors.price} />
        <Field label={t('form.kuantitiLabel')} inputMode="decimal" value={quantity} onChange={(e) => setQuantity(e.target.value)} error={errors.quantity} />
      </div>
      <Field
        label={t('form.unitLabel')}
        list="unit-options"
        value={unit}
        onChange={(e) => setUnit(e.target.value)}
        error={errors.unit}
        hint={t('form.unitHint')}
        autoComplete="off"
        autoCapitalize="none"
      />
      <datalist id="unit-options">
        {['kg', 'g', 'l', 'ml', 'biji', 'pek', 'kotak', 'botol', 'tin', 'ikat', 'keping'].map((u) => (
          <option key={u} value={u} />
        ))}
      </datalist>

      <div className="mt-3 flex min-h-11 items-center justify-between gap-2 rounded-xl bg-primary-soft px-3 text-sm">
        <span className="flex items-center text-muted">
          {t('bahan.kosSeunit')}
          <InfoTip text={t('tip.kosSeunit')} label={t('bahan.kosSeunit')} />
        </span>
        <span className="font-semibold text-primary">{previewText ?? '—'}</span>
      </div>

      <details className="mt-3 rounded-xl border border-border px-3" open={rows.length > 0}>
        <summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium">{t('bahan.pemetaanTajuk')}</summary>
        <p className="text-xs text-muted">{t('bahan.pemetaanIsi')}</p>
        {rows.map((r, idx) => (
          <div key={idx} className="mt-2 grid grid-cols-[1fr_1fr_5rem] gap-2">
            {(['pack', 'unit', 'per'] as const).map((k) => (
              <input
                key={k}
                aria-label={k === 'pack' ? t('bahan.pemetaanPek') : k === 'unit' ? t('bahan.pemetaanUnit') : t('bahan.pemetaanBilangan')}
                placeholder={k === 'pack' ? t('bahan.pemetaanPek') : k === 'unit' ? t('bahan.pemetaanUnit') : t('bahan.pemetaanBilangan')}
                inputMode={k === 'per' ? 'decimal' : 'text'}
                value={r[k]}
                onChange={(e) => setRows(rows.map((x, j) => (j === idx ? { ...x, [k]: e.target.value } : x)))}
                className="min-h-11 rounded-xl border border-border-strong px-3 text-base"
              />
            ))}
          </div>
        ))}
        {errors.mapping && <p className="mt-1 text-sm font-medium text-loss">{errors.mapping}</p>}
        <button type="button" className={`${btnQuiet} my-1`} onClick={() => setRows([...rows, { pack: '', unit: '', per: '' }])}>
          {t('bahan.pemetaanTambah')}
        </button>
      </details>

      <details className="mt-3 rounded-xl border border-border px-3">
        <summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium">{t('bahan.tarikhLabel')} · {t('bahan.pembekalLabel')}</summary>
        <Field label={t('bahan.tarikhLabel')} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <Field label={t('bahan.pembekalLabel')} value={supplier} onChange={(e) => setSupplier(e.target.value)} />
        <Field label={t('bahan.catatanLabel')} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </details>
      {ingredient && <p className="mt-2 text-xs text-muted">{t('bahan.perubahanMerekod')}</p>}

      {saveError && <p role="alert" className="mt-3 text-sm font-medium text-loss">{t('common.gagalSimpan')}</p>}
      <div className="mt-5 flex flex-wrap gap-3">
        <button type="submit" disabled={busy} className={btnPrimary}>
          {t('common.simpan')}
        </button>
        <button type="button" onClick={onDone} className={btnSecondary}>
          {t('common.batal')}
        </button>
        {ingredient && (
          <button
            type="button"
            className={btnQuiet}
            onClick={async () => {
              await setIngredientActive(ctx, ingredient.id, !ingredient.active);
              onDone();
            }}
          >
            {ingredient.active ? t('common.arkib') : t('common.pulihkan')}
          </button>
        )}
      </div>

      {ingredient && history && history.length > 0 && <HistoryList ingredient={ingredient} history={history} />}
    </form>
  );
}

function HistoryList({ ingredient, history }: { ingredient: Ingredient; history: Awaited<ReturnType<typeof listHistory>> }) {
  const changes = historyChanges(history, ingredient.packMappings).reverse();
  return (
    <div className="mt-6">
      <h3 className="text-sm font-bold">{t('bahan.sejarahTajuk')}</h3>
      <ul className="mt-2 divide-y divide-border rounded-xl border border-border">
        {changes.map((c) => (
          <li key={c.entry.id} className="px-3 py-2 text-sm">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-muted">{c.entry.purchaseDate}</span>
              <span className="font-medium">
                RM{c.entry.purchasePrice.toFixed(2)} / {c.entry.packageQuantity} {c.entry.packageUnit}
              </span>
            </div>
            <div className="mt-0.5 text-xs text-muted">
              {c.kind === 'baseline' && t('bahan.sejarahAsas')}
              {c.kind === 'incompatible_units' && t('bahan.sejarahTakBoleh')}
              {c.kind === 'change' && <ChangeText change={c} />}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ChangeText({ change }: { change: Extract<ReturnType<typeof historyChanges>[number], { kind: 'change' }> }) {
  const pct = change.comparison.percentChange;
  const label =
    pct === null || pct === 0 ? t('bahan.takBerubah') : `${pct > 0 ? '▲ ' : '▼ '}${pct > 0 ? '+' : ''}${formatPct(pct)} ${pct > 0 ? t('bahan.naik') : t('bahan.turun')}`;
  return (
    <>
      {label}
      {change.mappingsChanged && ` · ${t('bahan.sejarahPemetaan')}`}
    </>
  );
}
