import { liveQuery } from 'dexie';
import { createContext as createReactContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { UntungLabDB, backfillPriceHistory, createContext, ensureBusiness, seedEquipmentPresets, type Context } from '../db';

/** One database per app session. Opened lazily; startup work is idempotent, so a reload is always safe. */
let started: Promise<Context> | null = null;

function start(): Promise<Context> {
  started ??= (async () => {
    const ctx = createContext(new UntungLabDB());
    await ensureBusiness(ctx);
    await seedEquipmentPresets(ctx);
    await backfillPriceHistory(ctx);
    // Ask the browser not to evict our data. A no is fine; the Sandaran page explains what it means.
    void navigator.storage?.persist?.().catch(() => undefined);
    return ctx;
  })();
  return started;
}

const DataContext = createReactContext<Context | null>(null);

export function DataProvider({ children, fallback, failed }: { children: ReactNode; fallback: ReactNode; failed: ReactNode }) {
  const [state, setState] = useState<{ ctx: Context } | { error: true } | null>(null);
  useEffect(() => {
    let live = true;
    start().then(
      (ctx) => live && setState({ ctx }),
      () => {
        started = null;
        if (live) setState({ error: true });
      },
    );
    return () => {
      live = false;
    };
  }, []);
  if (!state) return <>{fallback}</>;
  if ('error' in state) return <>{failed}</>;
  return <DataContext.Provider value={state.ctx}>{children}</DataContext.Provider>;
}

export function useData(): Context {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside DataProvider');
  return ctx;
}

/** Re-runs the query whenever the underlying tables change. `undefined` until the first result. */
export function useLive<T>(query: (ctx: Context) => Promise<T>, deps: readonly unknown[] = []): T | undefined {
  const ctx = useData();
  const [value, setValue] = useState<T>();
  useEffect(() => {
    const sub = liveQuery(() => query(ctx)).subscribe({ next: setValue, error: () => setValue(undefined) });
    return () => sub.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx, ...deps]);
  return value;
}
