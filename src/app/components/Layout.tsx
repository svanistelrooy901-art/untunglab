import { NavLink, Outlet } from 'react-router-dom';
import { t } from '../../i18n/ms';
import { ROUTES } from '../routes';
import { Icon } from './Icon';

const linkBase = 'flex items-center gap-3 rounded-xl px-3 min-h-11 text-sm font-medium transition-colors';

export function Layout() {
  const primary = ROUTES.filter((r) => r.primary);

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[240px_1fr]">
      {/* Desktop: left navigation + content workspace (Doc 04 §3) */}
      <aside className="hidden md:flex md:flex-col md:gap-1 md:border-r md:border-border md:bg-surface md:p-4">
        <div className="mb-4 px-3 pt-2 text-lg font-bold tracking-tight text-primary">{t('app.name')}</div>
        <nav aria-label={t('nav.utama')} className="flex flex-col gap-1">
          {ROUTES.map((r) => (
            <NavLink
              key={r.path}
              to={r.path}
              end={r.path === '/'}
              className={({ isActive }) =>
                `${linkBase} ${isActive ? 'bg-primary-soft text-primary' : 'text-muted hover:bg-canvas'}`
              }
            >
              <Icon name={r.icon} size={20} />
              <span>{t(r.label)}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="mx-auto w-full max-w-3xl px-5 pt-5 pb-28 md:pb-10">
        <Outlet />
      </main>

      {/* Mobile: compact bottom navigation plus Lagi (Doc 02 §1) */}
      <nav
        aria-label={t('nav.utama')}
        className="fixed inset-x-0 bottom-0 z-10 flex h-[68px] border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {primary.map((r) => (
          <NavLink
            key={r.path}
            to={r.path}
            end={r.path === '/'}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center justify-center gap-1 text-[11px] ${
                isActive ? 'font-semibold text-primary' : 'font-medium text-muted'
              }`
            }
          >
            <Icon name={r.icon} />
            <span>{t(r.label)}</span>
          </NavLink>
        ))}
        <NavLink
          to="/lagi"
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center justify-center gap-1 text-[11px] ${
              isActive ? 'font-semibold text-primary' : 'font-medium text-muted'
            }`
          }
        >
          <Icon name="lagi" />
          <span>{t('nav.lagi')}</span>
        </NavLink>
      </nav>
    </div>
  );
}
