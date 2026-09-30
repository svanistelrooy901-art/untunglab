import { Link } from 'react-router-dom';
import { getCostProfile, listEquipment, listIngredients, listMenus, listOperatingCosts, listPackaging } from '../../db';
import { t, type MsKey } from '../../i18n/ms';
import { Icon } from '../components/Icon';
import { Loading, PageHeader } from '../components/ui';
import { useLive } from '../data';

interface Step {
  key: MsKey;
  to: string | null;
  done: boolean;
  optional?: boolean;
}

/** Guided setup (Doc 02 §2). Progress is derived from real data, so it can never drift from what is saved. */
export function MulaPage() {
  const data = useLive(async (c) => {
    const [profile, ops, ingredients, packaging, equipment, menus] = await Promise.all([
      getCostProfile(c),
      listOperatingCosts(c),
      listIngredients(c),
      listPackaging(c),
      listEquipment(c),
      listMenus(c),
    ]);
    return { profile, ops: ops.length, ingredients: ingredients.length, packaging: packaging.length, equipment: equipment.length, menus: menus.length };
  });
  if (!data) return <Loading />;

  const steps: Step[] = [
    { key: 'mula.s1', to: '/kos-operasi', done: data.profile.valueOfTimePerHour !== null },
    { key: 'mula.s2', to: '/kos-operasi', done: data.ops > 0 },
    { key: 'mula.s3', to: '/kos-operasi', done: data.profile.expectedMonthlySales !== null },
    { key: 'mula.s4', to: '/bahan', done: data.ingredients > 0 },
    { key: 'mula.s5', to: '/pembungkusan', done: data.packaging > 0, optional: true },
    { key: 'mula.s6', to: '/peralatan', done: data.equipment > 0, optional: true },
    { key: 'mula.s7', to: '/menu', done: data.menus > 0 },
  ];
  const finished = steps.filter((s) => s.done).length;

  return (
    <section>
      <PageHeader title={t('mula.title')} />
      <p className="mt-1 text-sm text-muted">{t('mula.intro')}</p>
      <p className="mt-3 text-sm font-semibold" aria-live="polite">
        {finished} / {steps.length} {t('mula.kemajuan')}
      </p>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-border" role="progressbar" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={finished}>
        <div className="h-full rounded-full bg-primary" style={{ width: `${(finished / steps.length) * 100}%` }} />
      </div>
      <ol className="mt-4 overflow-hidden rounded-2xl border border-border bg-surface">
        {steps.map((s, n) => {
          const inner = (
            <>
              <span className={`inline-flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${s.done ? 'bg-healthy-soft text-healthy' : 'bg-canvas text-muted'}`}>
                {s.done ? <Icon name="check" size={18} /> : n + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block text-[15px] font-medium ${s.done ? 'text-muted line-through' : ''}`}>{t(s.key)}</span>
                {s.optional && <span className="block text-xs text-muted">{t('mula.pilihan')}</span>}
                {!s.to && <span className="block text-xs text-muted">{t('mula.tidakLama')}</span>}
              </span>
            </>
          );
          return (
            <li key={s.key} className={n > 0 ? 'border-t border-border' : ''}>
              {s.to ? (
                <Link to={s.to} className="flex min-h-14 items-center gap-3 px-4 py-2">
                  {inner}
                </Link>
              ) : (
                <div className="flex min-h-14 items-center gap-3 px-4 py-2 opacity-70">{inner}</div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
