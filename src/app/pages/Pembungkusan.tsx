import { useState } from 'react';
import { createPackaging, listPackaging, setPackagingActive, updatePackaging, type Packaging } from '../../db';
import { t } from '../../i18n/ms';
import { Badge, EmptyState, Field, InfoTip, Loading, PageHeader, Sheet, btnPrimary, btnQuiet, btnSecondary } from '../components/ui';
import { useData, useLive } from '../data';
import { unitCostLabel, validatePackagingForm } from '../forms';

export function PembungkusanPage() {
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState<Packaging | 'new' | null>(null);
  const items = useLive((ctx) => listPackaging(ctx, { includeInactive: showArchived }), [showArchived]);
  return (
    <section>
      <PageHeader
        title={t('pack.title')}
        action={
          <button type="button" className={btnPrimary} onClick={() => setEditing('new')}>
            {t('pack.tambah')}
          </button>
        }
      />
      {!items ? (
        <Loading />
      ) : items.length === 0 && !showArchived ? (
        <EmptyState
          title={t('pack.kosongTajuk')}
          body={t('pack.kosongIsi')}
          action={
            <button type="button" className={btnPrimary} onClick={() => setEditing('new')}>
              {t('pack.tambah')}
            </button>
          }
        />
      ) : (
        <ul className="mt-4 overflow-hidden rounded-2xl border border-border bg-surface">
          {items.map((p, n) => (
            <li key={p.id} className={n > 0 ? 'border-t border-border' : ''}>
              <button type="button" onClick={() => setEditing(p)} className="flex min-h-14 w-full items-center justify-between gap-3 px-4 py-2 text-left">
                <span className="min-w-0">
                  <span className="block truncate text-[15px] font-medium">
                    {p.name} {!p.active && <Badge>{t('common.diarkib')}</Badge>}
                  </span>
                  <span className="block text-xs text-muted">
                    RM{p.purchasePrice.toFixed(2)} / {p.purchaseQuantity} {p.purchaseUnit}
                  </span>
                </span>
                <span className="shrink-0 text-sm font-semibold">{unitCostLabel(p.purchasePrice, p.purchaseQuantity, p.purchaseUnit) ?? '—'}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <label className="mt-4 flex min-h-11 items-center gap-2 text-sm text-muted">
        <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} className="size-5" />
        {t('common.tunjukArkib')}
      </label>
      <Sheet open={editing !== null} title={editing === 'new' ? t('pack.tajukBaru') : t('pack.tajukEdit')} onClose={() => setEditing(null)}>
        {editing && <PackagingForm key={editing === 'new' ? 'new' : editing.id} item={editing === 'new' ? null : editing} onDone={() => setEditing(null)} />}
      </Sheet>
    </section>
  );
}

function PackagingForm({ item, onDone }: { item: Packaging | null; onDone: () => void }) {
  const ctx = useData();
  const [name, setName] = useState(item?.name ?? '');
  const [price, setPrice] = useState(item ? String(item.purchasePrice) : '');
  const [quantity, setQuantity] = useState(item ? String(item.purchaseQuantity) : '');
  const [unit, setUnit] = useState(item?.purchaseUnit ?? 'pcs');
  const [submitted, setSubmitted] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [busy, setBusy] = useState(false);

  const check = validatePackagingForm({ name, price, quantity, unit });
  const errors: Record<string, string | undefined> = submitted && !check.ok ? check.errors : {};
  const previewCheck = validatePackagingForm({ name: 'x', price, quantity, unit });
  const preview = previewCheck.ok ? unitCostLabel(previewCheck.value.purchasePrice, previewCheck.value.purchaseQuantity, previewCheck.value.purchaseUnit) : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    const r = check;
    if (!r.ok) return;
    setBusy(true);
    setSaveError(false);
    try {
      if (item) await updatePackaging(ctx, item.id, r.value);
      else await createPackaging(ctx, r.value);
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
        <Field label={t('pack.kuantitiLabel')} inputMode="decimal" value={quantity} onChange={(e) => setQuantity(e.target.value)} error={errors.quantity} />
      </div>
      <Field label={t('pack.unitLabel')} value={unit} onChange={(e) => setUnit(e.target.value)} error={errors.unit} hint={t('pack.unitHint')} autoComplete="off" autoCapitalize="none" />
      <div className="mt-3 flex min-h-11 items-center justify-between gap-2 rounded-xl bg-primary-soft px-3 text-sm">
        <span className="flex items-center text-muted">
          {t('pack.kosSeunit')}
          <InfoTip text={t('tip.kosSeunit')} label={t('pack.kosSeunit')} />
        </span>
        <span className="font-semibold text-primary">{preview ?? '—'}</span>
      </div>
      {saveError && <p role="alert" className="mt-3 text-sm font-medium text-loss">{t('common.gagalSimpan')}</p>}
      <div className="mt-5 flex flex-wrap gap-3">
        <button type="submit" disabled={busy} className={btnPrimary}>
          {t('common.simpan')}
        </button>
        <button type="button" onClick={onDone} className={btnSecondary}>
          {t('common.batal')}
        </button>
        {item && (
          <button
            type="button"
            className={btnQuiet}
            onClick={async () => {
              await setPackagingActive(ctx, item.id, !item.active);
              onDone();
            }}
          >
            {item.active ? t('common.arkib') : t('common.pulihkan')}
          </button>
        )}
      </div>
    </form>
  );
}
