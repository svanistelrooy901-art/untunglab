import { HashRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Lagi, Placeholder } from './pages/Pages';
import { ROUTES } from './routes';

export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          {ROUTES.map((r) => (
            <Route
              key={r.path}
              path={r.path === '/' ? undefined : r.path}
              index={r.path === '/'}
              element={<Placeholder title={r.label} />}
            />
          ))}
          <Route path="/lagi" element={<Lagi />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
