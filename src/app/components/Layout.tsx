import { NavLink, Outlet } from 'react-router-dom';
import { t } from '../../i18n/ms';
import { ROUTES } from '../routes';
import { Icon } from './Icon';

const linkBase = 'flex items-center gap-3 rounded-xl px-3 min-h-11 text-sm font-medium transition-colors';

const mobileLink = ({ isActive }: { isActive: boolean }) =>
  `relative flex flex-1 flex-col items-center justify-center gap-1 text-[11px] ${
    isActive ? 'font-semibold text-brand-mint' : 'font-medium text-brand-muted'
  }`;

/** Mint bar on top of the active mobile tab, so the current place is not shown by colour alone. */
const ActiveBar = ({ isActive }: { isActive: boolean }) =>
  isActive ? <span aria-hidden className="absolute inset-x-5 top-0 h-[3px] rounded-b-full bg-brand-mint" /> : null;

export function Layout() {
  const primary = ROUTES.filter((r) => r.primary);

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Brand bar: tagline on the left, logo at the top right */}
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-brand-line bg-brand-ink px-4 pt-[env(safe-area-inset-top)] md:px-6">
        <p className="max-w-[10.5rem] text-[11px] font-medium leading-tight text-brand-muted md:max-w-none md:text-xs">
          {t('app.slogan')}
        </p>
        <img src="./logo.png" alt={t('app.name')} width={496} height={88} className="h-8 w-auto md:h-9" />
      </header>

      <div className="flex-1 md:grid md:grid-cols-[240px_1fr]">
        {/* Desktop: left navigation + content workspace (Doc 04 §3) */}
        <aside className="hidden md:sticky md:top-14 md:flex md:h-[calc(100dvh-3.5rem)] md:flex-col md:gap-1 md:overflow-y-auto md:bg-brand-ink md:p-4">
          <nav aria-label={t('nav.utama')} className="flex flex-col gap-1">
            {ROUTES.map((r) => (
              <NavLink
                key={r.path}
                to={r.path}
                end={r.path === '/'}
                className={({ isActive }) =>
                  `${linkBase} ${isActive ? 'bg-brand-ink-2 text-brand-mint shadow-[inset_3px_0_0_var(--color-brand-mint)]' : 'text-brand-muted hover:bg-brand-ink-2'}`
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
      </div>

      {/* Mobile: compact bottom navigation plus Lagi (Doc 02 §1) */}
      <nav
        aria-label={t('nav.utama')}
        className="fixed inset-x-0 bottom-0 z-10 flex h-[68px] border-t border-brand-line bg-brand-ink pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {primary.map((r) => (
          <NavLink key={r.path} to={r.path} end={r.path === '/'} className={mobileLink}>
            {({ isActive }) => (
              <>
                <ActiveBar isActive={isActive} />
                <Icon name={r.icon} />
                <span>{t(r.label)}</span>
              </>
            )}
          </NavLink>
        ))}
        <NavLink to="/lagi" className={mobileLink}>
          {({ isActive }) => (
            <>
              <ActiveBar isActive={isActive} />
              <Icon name="lagi" />
              <span>{t('nav.lagi')}</span>
            </>
          )}
        </NavLink>
      </nav>
    </div>
  );
}
