import { Fragment, type ComponentType } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { useLangState } from '../i18n/lang';
import { t } from '../i18n/ms';
import { LanguagePrompt } from './components/LanguagePrompt';
import { TetapanPage } from './pages/Tetapan';
import { Layout } from './components/Layout';
import { DataProvider } from './data';
import { LicenseProvider } from './license';
import { ManualPage } from './pages/Manual';
import { LesenPage } from './pages/Lesen';
import { LaporanPage } from './pages/Laporan';
import { BahanPage } from './pages/Bahan';
import { KosOperasiPage } from './pages/KosOperasi';
import { MenuEditorPage, MenuListPage } from './pages/Menu';
import { DashboardPage } from './pages/Dashboard';
import { SandaranPage } from './pages/Sandaran';
import { KesanHargaPage } from './pages/KesanHarga';
import { JejakHargaPage } from './pages/JejakHarga';
import { Lagi, Placeholder } from './pages/Pages';
import { PembungkusanPage } from './pages/Pembungkusan';
import { PeralatanPage } from './pages/Peralatan';
import { ROUTES } from './routes';

/** Screens built so far. Everything else shows the placeholder until its phase. */
const PAGES: Record<string, ComponentType> = {
  '/': DashboardPage,
  '/jejak-harga': JejakHargaPage,
  '/kesan-harga': KesanHargaPage,
  '/sandaran': SandaranPage,
  '/lesen': LesenPage,
  '/manual': ManualPage,
  '/tetapan': TetapanPage,
  '/laporan': LaporanPage,
  '/kos-operasi': KosOperasiPage,
  '/menu': MenuListPage,
  '/bahan': BahanPage,
  '/pembungkusan': PembungkusanPage,
  '/peralatan': PeralatanPage,
};

export function App() {
  const { lang } = useLangState();
  return (
    <DataProvider
      fallback={<p className="p-6 text-sm text-muted">{t('common.memuatkan')}</p>}
      failed={(detail) => (
        <div role="alert" className="p-6">
          <p className="text-sm font-medium text-loss">{t('common.gagalMuat')}</p>
          <p data-testid="ralat-teknikal" className="mt-3 break-words rounded-md border border-border bg-canvas p-3 font-mono text-xs text-muted">{detail}</p>
        </div>
      )}
    >
      <LicenseProvider>
      {/* The key remounts the screens when the language changes, so every text is re-read. */}
      <Fragment key={lang}>
      <LanguagePrompt />
      <HashRouter>
        <Routes>
          <Route element={<Layout />}>
            {ROUTES.map((r) => {
              const Page = PAGES[r.path];
              return (
                <Route
                  key={r.path}
                  path={r.path === '/' ? undefined : r.path}
                  index={r.path === '/'}
                  element={Page ? <Page /> : <Placeholder title={r.label} />}
                />
              );
            })}
            <Route path="/menu/:id" element={<MenuEditorPage />} />
            <Route path="/lagi" element={<Lagi />} />
          </Route>
        </Routes>
      </HashRouter>
      </Fragment>
      </LicenseProvider>
    </DataProvider>
  );
}
