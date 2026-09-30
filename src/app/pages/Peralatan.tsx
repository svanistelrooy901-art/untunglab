import { useState } from 'react';
import {
  addCustomEquipment,
  addEquipmentFromPreset,
  confirmEquipment,
  listEquipment,
  listEquipmentPresets,
  setEquipmentActive,
  updateEquipment,
  type Equipment,
  type EquipmentPreset,
} from '../../db';
import { t } from '../../i18n/ms';
import { Badge, EmptyState, Field, Loading, PageHeader, Sheet, btnPrimary, btnQuiet, btnSecondary } from '../components/ui';
import { useData, useLive } from '../data';
import { validateEquipmentForm } from '../forms';

type Target = { kind: 'new' } | { kind: 'edit'; item: Equipment };

export function PeralatanPage() {
  const ctx = useData();
  const [showArchived, setShowArchived] = useState(false);
  const [target, setTarget] = useState<Target | null>(null);
  const items = useLive((c) => listEquipment(c, { includeInactive: showArchived }), [showArchived]);
  return (
    <section>
      <PageHeader
        title={t('alat.title')}
        action={
          <button type="button" className={btnPrimary} onClick={() => setTarget({ kind: 'new' })}>
            {t('alat.tambah')}
          </button>
        }
      />
      {!items ? (
        <Loading />
      ) : items.length === 0 && !showArchived ? (
        <EmptyState
          title={t('alat.kosongTajuk')}
          body={t('alat.kosongIsi')}
          action={
            <button type="button" className={btnPrimary} onClick={() => setTarget({ kind: 'new' })}>
              {t('alat.tambah')}
            </button>
          }
        />
      ) : (
        <ul className="mt-4 overflow-hidden rounded-2xl border border-border bg-surface">
          {items.map((e, n) => (
            <li key={e.id} className={`flex items-center gap-2 pr-2 ${n > 0 ? 'border-t border-border' : ''}`}>
              <button type="button" onClick={() => setTarget({ kind: 'edit', item: e })} className="flex min-h-14 min-w-0 flex-1 items-center justify-between gap-3 px-4 py-2 text-left">
                <span className="min-w-0">
                  <span className="block truncate text-[15px] font-medium">
                    {e.name} {!e.active && <Badge>{t('common.diarkib')}</Badge>}
                  </span>
                  <span className="mt-0.5 block">{e.confirmed ? <Badge tone="healthy">{t('alat.disahkan')}</Badge> : <Badge tone="watch">{t('alat.anggaran')}</Badge>}</span>
                </span>
                <span className="shrink-0 text-sm font-semibold">{e.powerWatts.toLocaleString('en-US')} W</span>
              </button>
              {!e.confirmed && (
                <button type="button" className={btnQuiet} onClick={() => confirmEquipment(ctx, e.id)}>
                  {t('alat.sahkan')}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      <label className="mt-4 flex min-h-11 items-center gap-2 text-sm text-muted">
        <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} className="size-5" />
        {t('common.tunjukArkib')}
      </label>
      <Sheet open={target !== null} title={target?.kind === 'edit' ? t('alat.tajukEdit') : t('alat.tajukBaru')} onClose={() => setTarget(null)}>
        {target?.kind === 'new' && <AddFlow onDone={() => setTarget(null)} />}
        {target?.kind === 'edit' && <EditForm key={target.item.id} item={target.item} onDone={() => setTarget(null)} />}
      </Sheet>
    </section>
  );
}

/** Step 1: searchable preset list. Step 2: name + wattage, pre-filled from the preset (Doc 04 §5). */
function AddFlow({ onDone }: { onDone: () => void }) {
  const [query, setQuery] = useState('');
  const [chosen, setChosen] = useState<EquipmentPreset | 'custom' | null>(null);
  const presets = useLive((c) => listEquipmentPresets(c));
  if (chosen) return <DetailForm preset={chosen === 'custom' ? null : chosen} onDone={onDone} onBack={() => setChosen(null)} />;
  const shown = (presets ?? []).filter((p) => p.canonicalName.toLowerCase().includes(query.trim().toLowerCase()));
  return (
    <div>
      <Field label={t('alat.cari')} value={query} onChange={(e) => setQuery(e.target.value)} autoComplete="off" type="search" />
      {!presets ? (
        <Loading />
      ) : (
        <ul className="mt-3 overflow-hidden rounded-xl border border-border">
          {shown.map((p, n) => (
            <li key={p.id} className={n > 0 ? 'border-t border-border' : ''}>
              <button type="button" onClick={() => setChosen(p)} className="flex min-h-12 w-full items-center justify-between px-3 text-left text-[15px]">
                <span>{p.canonicalName}</span>
                <span className="text-sm text-muted">{p.defaultWatts.toLocaleString('en-US')} W</span>
              </button>
            </li>
          ))}
          {shown.length === 0 && <li className="px-3 py-3 text-sm text-muted">{t('alat.tiadaPadanan')}</li>}
          <li className="border-t border-border">
            <button type="button" onClick={() => setChosen('custom')} className="flex min-h-12 w-full items-center px-3 text-left text-[15px] font-medium text-primary">
              {t('alat.custom')}
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}

function DetailForm({ preset, onDone, onBack }: { preset: EquipmentPreset | null; onDone: () => void; onBack: () => void }) {
  const ctx = useData();
  const [name, setName] = useState(preset?.canonicalName ?? '');
  const [watts, setWatts] = useState(preset ? String(preset.defaultWatts) : '');
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [saveError, setSaveError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const r = validateEquipmentForm({ name, watts });
    setErrors(r.ok ? {} : r.errors);
    if (!r.ok) return;
    setBusy(true);
    setSaveError(false);
    try {
      if (!preset) await addCustomEquipment(ctx, r.value);
      else {
        const created = await addEquipmentFromPreset(ctx, preset.id);
        // Only what the user changed: a new wattage confirms it; a rename alone keeps the estimate label.
        const patch: { name?: string; powerWatts?: number } = {};
        if (r.value.name !== created.name) patch.name = r.value.name;
        if (r.value.powerWatts !== created.powerWatts) patch.powerWatts = r.value.powerWatts;
        if (Object.keys(patch).length > 0) await updateEquipment(ctx, created.id, patch);
      }
      onDone();
    } catch {
      setSaveError(true);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <Field label={t('alat.namaLabel')} value={name} onChange={(e) => setName(e.target.value)} error={errors.name} autoComplete="off" />
      <Field label={t('alat.wattLabel')} inputMode="decimal" value={watts} onChange={(e) => setWatts(e.target.value)} error={errors.watts} tip={t('tip.watt')} hint={preset ? t('alat.anggaranNota') : undefined} />
      {saveError && <p role="alert" className="mt-3 text-sm font-medium text-loss">{t('common.gagalSimpan')}</p>}
      <div className="mt-5 flex flex-wrap gap-3">
        <button type="submit" disabled={busy} className={btnPrimary}>
          {t('common.simpan')}
        </button>
        <button type="button" onClick={onBack} className={btnSecondary}>
          {t('common.batal')}
        </button>
      </div>
    </form>
  );
}

function EditForm({ item, onDone }: { item: Equipment; onDone: () => void }) {
  const ctx = useData();
  const [name, setName] = useState(item.name);
  const [watts, setWatts] = useState(String(item.powerWatts));
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [saveError, setSaveError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const r = validateEquipmentForm({ name, watts });
    setErrors(r.ok ? {} : r.errors);
    if (!r.ok) return;
    setBusy(true);
    setSaveError(false);
    try {
      const patch: { name?: string; powerWatts?: number } = {};
      if (r.value.name !== item.name) patch.name = r.value.name;
      if (r.value.powerWatts !== item.powerWatts) patch.powerWatts = r.value.powerWatts;
      if (Object.keys(patch).length > 0) await updateEquipment(ctx, item.id, patch);
      onDone();
    } catch {
      setSaveError(true);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <Field label={t('alat.namaLabel')} value={name} onChange={(e) => setName(e.target.value)} error={errors.name} autoComplete="off" />
      <Field label={t('alat.wattLabel')} inputMode="decimal" value={watts} onChange={(e) => setWatts(e.target.value)} error={errors.watts} tip={t('tip.watt')} hint={item.confirmed ? undefined : t('alat.anggaranNota')} />
      {saveError && <p role="alert" className="mt-3 text-sm font-medium text-loss">{t('common.gagalSimpan')}</p>}
      <div className="mt-5 flex flex-wrap gap-3">
        <button type="submit" disabled={busy} className={btnPrimary}>
          {t('common.simpan')}
        </button>
        <button type="button" onClick={onDone} className={btnSecondary}>
          {t('common.batal')}
        </button>
        <button
          type="button"
          className={btnQuiet}
          onClick={async () => {
            await setEquipmentActive(ctx, item.id, !item.active);
            onDone();
          }}
        >
          {item.active ? t('common.arkib') : t('common.pulihkan')}
        </button>
      </div>
    </form>
  );
}
