import { liveQuery } from 'dexie';
import { createContext as createReactContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { UntungLabDB, backfillPriceHistory, createContext, ensureBusiness, ensureDeviceId, seedEquipmentPresets, type Context } from '../db';

/** One database per app session. Opened lazily; startup work is idempotent, so a reload is always safe. */
let started: Promise<Context> | null = null;

function start(): Promise<Context> {
  started ??= (async () => {
    const ctx = createContext(new UntungLabDB());
    await ensureBusiness(ctx);
    await seedEquipmentPresets(ctx);
    await backfillPriceHistory(ctx);
    await ensureDeviceId(ctx);
    // Ask the browser not to evict our data. A no is fine; the Sandaran page explains what it means.
    void navigator.storage?.persist?.().catch(() => undefined);
    return ctx;
  })();
  return started;
}

/** Short, technical description of why startup failed, shown on the error screen so it can be reported. */
function describeError(err: unknown): string {
  const e = err as { name?: string; message?: string } | null;
  return [e?.name, e?.message].filter(Boolean).join(': ') || String(err);
}

const DataContext = createReactContext<Context | null>(null);

export function DataProvider({ children, fallback, failed }: { children: ReactNode; fallback: ReactNode; failed: (detail: string) => ReactNode }) {
  const [state, setState] = useState<{ ctx: Context } | { error: string } | null>(null);
  useEffect(() => {
    let live = true;
    start().then(
      (ctx) => live && setState({ ctx }),
      (err) => {
        console.error('UntungLab: gagal buka pangkalan data', err);
        started = null;
        if (live) setState({ error: describeError(err) });
      },
    );
    return () => {
      live = false;
    };
  }, []);
  if (!state) return <>{fallback}</>;
  if ('error' in state) return <>{failed(state.error)}</>;
  return <DataContext.Provider value={state.ctx}>{children}</DataContext.Provider>;
}

export function useData(): Context {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside DataProvider');
  return ctx;
}

/**
 * Re-runs the query whenever the underlying tables change. `undefined` until the first result.
 * If a run fails (some phone browsers abort a read that overlaps a big write), the last good value stays on screen and
 * the query is subscribed again shortly, instead of dropping the page back to "Loading" for good.
 */
export function useLive<T>(query: (ctx: Context) => Promise<T>, deps: readonly unknown[] = []): T | undefined {
  const ctx = useData();
  const [value, setValue] = useState<T>();
  useEffect(() => {
    let stopped = false;
    let sub: { unsubscribe(): void } | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let failures = 0;
    const run = () => {
      sub = liveQuery(() => query(ctx)).subscribe({
        next: (v) => {
          failures = 0;
          setValue(v);
        },
        error: (err) => {
          console.warn('UntungLab: live query failed, retrying', err);
          sub?.unsubscribe();
          if (stopped) return;
          failures += 1;
          timer = setTimeout(run, Math.min(250 * 2 ** failures, 4000));
        },
      });
    };
    run();
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      sub?.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx, ...deps]);
  return value;
}
