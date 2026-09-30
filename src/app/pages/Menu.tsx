import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { dimensionOf, formatPct, formatRM, type PackagingSemantics } from '../../domain';
import { deleteMenu, loadCostingData, saveMenu, type CostingData, type Ingredient, type StoredMenu } from '../../db';
import { t } from '../../i18n/ms';
import { MenuResultView, StatusBadge, issueText } from '../components/MenuResultView';
import { EmptyState, Field, InfoTip, Loading, PageHeader, btnPrimary, btnQuiet, btnSecondary } from '../components/ui';
import { useData, useLive } from '../data';
import { businessInputFrom, computeAllMenus, menuInputFrom } from '../menuAssembly';
import { parseNumber } from '../forms';
import { emptyForm, parseMenuForm, type MenuForm } from '../menuForm';
import { computeMenuCost } from '../../domain';

type Kind = 'ing' | 'pack' | 'eq';

function namer(data: CostingData) {
  const maps = {
    ing: new Map(data.ingredients.map((i) => [i.id, i.name])),
    pack: new Map(data.packaging.map((p) => [p.id, p.name])),
    eq: new Map(data.equipment.map((e) => [e.id, e.name])),
  };
  return (kind: Kind, ref: string | undefined) => (ref ? (maps[kind].get(ref) ?? t('menu.hilang')) : t('menu.hilang'));
}

// ---------- list ----------

export function MenuListPage() {
  const data = useLive((c) => loadCostingData(c));
  if (!data) return <Loading />;
  const costed = computeAllMenus(data);
  const name = namer(data);
  const menus = [...costed.values()];
  const hasIngredients = data.ingredients.some((i) => i.active);

  return (
    <section>
      <PageHeader
        title={t('menu.title')}
        action={
          <Link to="/menu/baru" className={btnPrimary}>
            {t('menu.tambah')}
          </Link>
        }
      />
      {menus.length === 0 ? (
        <EmptyState
          title={t('menu.kosongTajuk')}
          body={hasIngredients ? t('menu.kosongIsi') : `${t('menu.kosongIsi')} ${t('menu.kosongPerluBahan')}`}
          action={
            <Link to={hasIngredients ? '/menu/baru' : '/bahan'} className={btnPrimary}>
              {hasIngredients ? t('menu.tambah') : t('bahan.tambah')}
            </Link>
          }
        />
      ) : (
        <ul className="mt-4 overflow-hidden rounded-2xl border border-border bg-surface">
          {menus.map(({ menu, result }, n) => (
            <li key={menu.id} className={n > 0 ? 'border-t border-border' : ''}>
              <Link to={`/menu/${menu.id}`} className="block px-4 py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="truncate text-[15px] font-semibold">{menu.name}</span>
                  <span className="shrink-0 text-sm text-muted">{formatRM(menu.sellingPrice)}</span>
                </div>
                {result.complete ? (
                  <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs text-muted">
                      {t('terms.kosSebenar')} {formatRM(result.fullCost)} · {t('terms.anggaranUntung')}{' '}
                      <span className={result.profit < 0 ? 'font-semibold text-loss' : ''}>{formatRM(result.profit)}</span> ·{' '}
                      {formatPct(result.marginPct)}
                    </span>
                    <StatusBadge status={result.status} />
                  </div>
                ) : (
                  <p className="mt-1 text-xs font-medium text-watch">
                    {t('menu.belumLengkap')}: {result.issues[0] ? issueText(result.issues[0], (ref) => name('ing', ref)) : ''}
                    {result.issues.length > 1 && ` (+${result.issues.length - 1})`}
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ---------- editor ----------

function formFrom(m: StoredMenu): MenuForm {
  return {
    name: m.name,
    yield: String(m.yield),
    minutes: String(m.productionMinutesPerBatch),
    price: String(m.sellingPrice),
    ingredients: m.ingredients.map((l) => ({ ingredientId: l.ingredientId, quantity: String(l.quantity), unit: l.usageUnit })),
    packaging: m.packaging.map((l) => ({ packagingId: l.packagingId, quantity: String(l.quantityUsed), semantics: l.usageSemantics })),
    equipment: m.equipment.map((l) => ({ equipmentId: l.equipmentId, minutes: String(l.durationMinutes) })),
  };
}

export function MenuEditorPage() {
  const { id } = useParams();
  const data = useLive((c) => loadCostingData(c));
  if (!data) return <Loading />;
  const existing = id && id !== 'baru' ? data.menus.find((m) => m.id === id) : undefined;
  if (id && id !== 'baru' && !existing) {
    return (
      <section>
        <PageHeader title={t('menu.title')} />
        <EmptyState title={t('menu.hilang')} body="" action={<Link to="/menu" className={btnSecondary}>{t('menu.title')}</Link>} />
      </section>
    );
  }
  return <MenuEditor key={existing?.id ?? 'baru'} data={data} existing={existing ?? null} />;
}

function unitOptions(i: Ingredient | undefined): string[] {
  if (!i) return [];
  const d = dimensionOf(i.packageUnit);
  if (d === 'mass') return ['g', 'kg'];
  if (d === 'volume') return ['ml', 'l'];
  const out = [i.packageUnit.trim().toLowerCase()];
  for (const m of i.packMappings) for (const u of [m.pack, m.unit]) if (!out.includes(u.trim().toLowerCase())) out.push(u.trim().toLowerCase());
  return out;
}

const selectClass = 'mt-1 min-h-11 w-full rounded-xl border border-border-strong bg-surface px-3 text-base';
const lineBox = 'mt-3 rounded-xl border border-border p-3';

function MenuEditor({ data, existing }: { data: CostingData; existing: StoredMenu | null }) {
  const ctx = useData();
  const navigate = useNavigate();
  const [form, setForm] = useState<MenuForm>(existing ? formFrom(existing) : emptyForm());
  const [submitted, setSubmitted] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  const parsed = parseMenuForm(form, existing?.id);
  const errors = submitted && !parsed.ok ? parsed.errors : {};
  const name = useMemo(() => namer(data), [data]);
  const ingredientById = useMemo(() => new Map(data.ingredients.map((i) => [i.id, i])), [data]);

  // Live result: the same assembler and engine as the list and the saved menu, fed by the unsaved form.
  const live = useMemo(() => {
    const num = (s: string) => (s.trim() === '' ? 0 : (parseNumber(s) ?? Number.NaN));
    const draftMenu: StoredMenu = {
      id: 'draft', menuId: 'draft', recipeId: 'draft', active: true,
      name: form.name,
      yield: num(form.yield),
      productionMinutesPerBatch: num(form.minutes),
      sellingPrice: num(form.price),
      ingredients: form.ingredients.filter((l) => l.ingredientId).map((l) => ({ ingredientId: l.ingredientId, quantity: num(l.quantity), usageUnit: l.unit })),
      packaging: form.packaging.filter((l) => l.packagingId).map((l) => ({ packagingId: l.packagingId, quantityUsed: num(l.quantity), usageSemantics: l.semantics })),
      equipment: form.equipment.filter((l) => l.equipmentId).map((l) => ({ equipmentId: l.equipmentId, durationMinutes: num(l.minutes) })),
    };
    const business = businessInputFrom(data);
    const input = menuInputFrom(draftMenu, data);
    return { input, business, result: computeMenuCost(input, business) };
  }, [form, data]);

  const set = <K extends keyof MenuForm>(k: K, v: MenuForm[K]) => setForm((f) => ({ ...f, [k]: v }));
  const activeIngredients = data.ingredients.filter((i) => i.active);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (!parsed.ok) return;
    setBusy(true);
    setSaveError(false);
    try {
      await saveMenu(ctx, parsed.value);
      navigate('/menu');
    } catch {
      setSaveError(true);
      setBusy(false);
    }
  }

  const nameOfKind = (kind: Kind, ref: string | undefined) => name(kind, ref);

  return (
    <form onSubmit={submit} noValidate>
      <PageHeader title={existing ? t('menu.tajukEdit') : t('menu.tajukBaru')} />

      {/* Compact live summary stays visible while lines are edited. */}
      <div className="sticky top-0 z-10 -mx-5 mt-2 border-b border-border bg-canvas/95 px-5 py-2 backdrop-blur" aria-live="polite">
        {live.result.complete ? (
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span>
              {t('terms.kosSebenar')} <b>{formatRM(live.result.fullCost)}</b> · {t('terms.anggaranUntung')}{' '}
              <b className={live.result.profit < 0 ? 'text-loss' : ''}>{formatRM(live.result.profit)}</b> ({formatPct(live.result.marginPct)})
            </span>
            <StatusBadge status={live.result.status} />
          </div>
        ) : (
          <span className="text-sm font-medium text-watch">{t('menu.belumLengkap')}: {live.result.issues.length}</span>
        )}
      </div>

      <Field label={t('menu.namaLabel')} value={form.name} onChange={(e) => set('name', e.target.value)} error={errors.name} autoComplete="off" />
      <div className="grid grid-cols-2 gap-3">
        <Field label={t('menu.hasilLabel')} inputMode="decimal" value={form.yield} onChange={(e) => set('yield', e.target.value)} error={errors.yield} tip={t('menu.tipHasil')} />
        <Field label={t('menu.masaLabel')} inputMode="decimal" value={form.minutes} onChange={(e) => set('minutes', e.target.value)} error={errors.minutes} />
      </div>
      <Field label={t('menu.hargaLabel')} inputMode="decimal" value={form.price} onChange={(e) => set('price', e.target.value)} error={errors.price} />

      {/* Bahan */}
      <h2 className="mt-6 text-base font-bold">{t('menu.bahanTajuk')}</h2>
      {activeIngredients.length === 0 && form.ingredients.length === 0 && (
        <p className="mt-1 text-sm text-muted">{t('menu.tiadaBahan')} <Link to="/bahan" className="font-semibold text-primary underline">{t('nav.bahan')}</Link></p>
      )}
      {form.ingredients.map((l, i) => {
        const ing = ingredientById.get(l.ingredientId);
        const options = unitOptions(ing);
        const patch = (p: Partial<typeof l>) => set('ingredients', form.ingredients.map((x, j) => (j === i ? { ...x, ...p } : x)));
        return (
          <div key={i} className={lineBox}>
            <label className="text-sm font-medium" htmlFor={`ing-${i}`}>{t('menu.bahanPilih')}</label>
            <select
              id={`ing-${i}`}
              className={selectClass}
              value={l.ingredientId}
              onChange={(e) => {
                const next = ingredientById.get(e.target.value);
                patch({ ingredientId: e.target.value, unit: unitOptions(next)[0] ?? '' });
              }}
            >
              <option value="">{t('menu.pilihSatu')}</option>
              {data.ingredients
                .filter((x) => x.active || x.id === l.ingredientId)
                .sort((a, b) => a.name.localeCompare(b.name, 'ms', { sensitivity: 'base' }))
                .map((x) => (
                  <option key={x.id} value={x.id}>{x.name}{x.active ? '' : ` ${t('menu.diarkib')}`}</option>
                ))}
              {l.ingredientId && !ing && <option value={l.ingredientId}>{t('menu.hilang')}</option>}
            </select>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('menu.kuantitiGuna')} inputMode="decimal" value={l.quantity} onChange={(e) => patch({ quantity: e.target.value })} />
              <Field label={t('menu.unitGuna')} list={`units-${i}`} value={l.unit} onChange={(e) => patch({ unit: e.target.value })} autoCapitalize="none" autoComplete="off" />
              <datalist id={`units-${i}`}>{options.map((u) => <option key={u} value={u} />)}</datalist>
            </div>
            <button type="button" className={btnQuiet} onClick={() => set('ingredients', form.ingredients.filter((_, j) => j !== i))}>{t('menu.buangBaris')}</button>
          </div>
        );
      })}
      <button type="button" className={`${btnSecondary} mt-3`} onClick={() => set('ingredients', [...form.ingredients, { ingredientId: '', quantity: '', unit: '' }])}>
        + {t('menu.bahanTambah')}
      </button>

      {/* Pembungkusan */}
      <h2 className="mt-6 text-base font-bold">{t('menu.packTajuk')}</h2>
      {data.packaging.filter((p) => p.active).length === 0 && form.packaging.length === 0 && (
        <p className="mt-1 text-sm text-muted">{t('menu.tiadaPack')} <Link to="/pembungkusan" className="font-semibold text-primary underline">{t('nav.pembungkusan')}</Link></p>
      )}
      {form.packaging.map((l, i) => {
        const patch = (p: Partial<typeof l>) => set('packaging', form.packaging.map((x, j) => (j === i ? { ...x, ...p } : x)));
        return (
          <div key={i} className={lineBox}>
            <label className="text-sm font-medium" htmlFor={`pack-${i}`}>{t('menu.packPilih')}</label>
            <select id={`pack-${i}`} className={selectClass} value={l.packagingId} onChange={(e) => patch({ packagingId: e.target.value })}>
              <option value="">{t('menu.pilihSatu')}</option>
              {data.packaging.filter((x) => x.active || x.id === l.packagingId).map((x) => (
                <option key={x.id} value={x.id}>{x.name}{x.active ? '' : ` ${t('menu.diarkib')}`}</option>
              ))}
              {l.packagingId && !data.packaging.some((x) => x.id === l.packagingId) && <option value={l.packagingId}>{t('menu.hilang')}</option>}
            </select>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('menu.packKuantiti')} inputMode="decimal" value={l.quantity} onChange={(e) => patch({ quantity: e.target.value })} />
              <div className="mt-3">
                <label className="text-sm font-medium" htmlFor={`sem-${i}`}>{t('menu.packJenis')}</label>
                <select id={`sem-${i}`} className={selectClass} value={l.semantics} onChange={(e) => patch({ semantics: e.target.value as PackagingSemantics })}>
                  <option value="per_portion">{t('menu.perPortion')}</option>
                  <option value="per_batch">{t('menu.perBatch')}</option>
                </select>
              </div>
            </div>
            <button type="button" className={btnQuiet} onClick={() => set('packaging', form.packaging.filter((_, j) => j !== i))}>{t('menu.buangBaris')}</button>
          </div>
        );
      })}
      <button type="button" className={`${btnSecondary} mt-3`} onClick={() => set('packaging', [...form.packaging, { packagingId: '', quantity: '1', semantics: 'per_portion' }])}>
        + {t('menu.packTambah')}
      </button>

      {/* Peralatan */}
      <h2 className="mt-6 flex items-center text-base font-bold">{t('menu.alatTajuk')}<InfoTip text={t('tip.watt')} label={t('menu.alatTajuk')} /></h2>
      {data.equipment.filter((e) => e.active).length === 0 && form.equipment.length === 0 && (
        <p className="mt-1 text-sm text-muted">{t('menu.tiadaAlat')} <Link to="/peralatan" className="font-semibold text-primary underline">{t('nav.peralatan')}</Link></p>
      )}
      {form.equipment.map((l, i) => {
        const patch = (p: Partial<typeof l>) => set('equipment', form.equipment.map((x, j) => (j === i ? { ...x, ...p } : x)));
        return (
          <div key={i} className={lineBox}>
            <label className="text-sm font-medium" htmlFor={`eq-${i}`}>{t('menu.alatPilih')}</label>
            <select id={`eq-${i}`} className={selectClass} value={l.equipmentId} onChange={(e) => patch({ equipmentId: e.target.value })}>
              <option value="">{t('menu.pilihSatu')}</option>
              {data.equipment.filter((x) => x.active || x.id === l.equipmentId).map((x) => (
                <option key={x.id} value={x.id}>{x.name} ({x.powerWatts} W){x.active ? '' : ` ${t('menu.diarkib')}`}</option>
              ))}
              {l.equipmentId && !data.equipment.some((x) => x.id === l.equipmentId) && <option value={l.equipmentId}>{t('menu.hilang')}</option>}
            </select>
            <Field label={t('menu.alatMinit')} inputMode="decimal" value={l.minutes} onChange={(e) => patch({ minutes: e.target.value })} />
            <button type="button" className={btnQuiet} onClick={() => set('equipment', form.equipment.filter((_, j) => j !== i))}>{t('menu.buangBaris')}</button>
          </div>
        );
      })}
      <button type="button" className={`${btnSecondary} mt-3`} onClick={() => set('equipment', [...form.equipment, { equipmentId: '', minutes: '' }])}>
        + {t('menu.alatTambah')}
      </button>

      {errors.lines && <p role="alert" className="mt-4 text-sm font-medium text-loss">{errors.lines}</p>}

      <div className="mt-6">
        <MenuResultView result={live.result} input={live.input} business={live.business} nameOf={nameOfKind} />
      </div>

      {saveError && <p role="alert" className="mt-3 text-sm font-medium text-loss">{t('common.gagalSimpan')}</p>}
      <div className="mt-5 flex flex-wrap gap-3">
        <button type="submit" disabled={busy} className={btnPrimary}>{t('menu.simpan')}</button>
        <Link to="/menu" className={btnSecondary}>{t('common.batal')}</Link>
        {existing && !confirmDelete && <button type="button" className={btnQuiet} onClick={() => setConfirmDelete(true)}>{t('menu.padam')}</button>}
      </div>
      {existing && confirmDelete && (
        <div role="alertdialog" className="mt-3 rounded-xl border border-loss-line bg-loss-soft p-3 text-sm text-loss">
          <p>{t('menu.padamSah')}</p>
          <div className="mt-2 flex gap-3">
            <button type="button" className={btnPrimary} onClick={async () => { await deleteMenu(ctx, existing.id); navigate('/menu'); }}>{t('menu.padamYa')}</button>
            <button type="button" className={btnSecondary} onClick={() => setConfirmDelete(false)}>{t('common.batal')}</button>
          </div>
        </div>
      )}
    </form>
  );
}
