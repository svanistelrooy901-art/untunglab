import { Link } from 'react-router-dom';
import { t, type MsKey } from '../../i18n/ms';
import { ROUTES } from '../routes';
import { Icon } from '../components/Icon';

export function Placeholder({ title }: { title: MsKey }) {
  return (
    <section>
      <h1 className="text-2xl font-bold tracking-tight">{t(title)}</h1>
      <div className="mt-4 rounded-2xl border border-border bg-surface p-5">
        <div className="text-base font-semibold">{t('placeholder.title')}</div>
        <p className="mt-1 text-sm text-muted">{t('placeholder.body')}</p>
      </div>
    </section>
  );
}

/** Secondary modules on mobile (Doc 02 §1: "Lagi"). A bottom sheet can replace this page later. */
export function Lagi() {
  const secondary = ROUTES.filter((r) => !r.primary);
  return (
    <section>
      <h1 className="text-2xl font-bold tracking-tight">{t('nav.lagi')}</h1>
      <ul className="mt-4 overflow-hidden rounded-2xl border border-border bg-surface">
        {secondary.map((r, i) => (
          <li key={r.path} className={i > 0 ? 'border-t border-border' : ''}>
            <Link to={r.path} className="flex min-h-14 items-center gap-3 px-4 text-[15px] font-medium">
              <Icon name={r.icon} size={20} className="text-muted" />
              <span>{t(r.label)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
