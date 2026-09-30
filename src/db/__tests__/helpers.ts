import { UntungLabDB } from '../db';
import { createContext, type Context } from '../repo';

let counter = 0;

export function freshContext(start = '2026-09-30T08:00:00'): { ctx: Context; db: UntungLabDB; setNow: (iso: string) => void } {
  counter += 1;
  const db = new UntungLabDB(`test-${counter}-${Math.random().toString(36).slice(2)}`);
  let current = new Date(start);
  let n = 0;
  const ctx = createContext(db, { now: () => current, newId: () => `id-${++n}` });
  return { ctx, db, setNow: (iso) => (current = new Date(iso)) };
}

/** Kos Operasi is mandatory (D-70): tests that need complete menus fill every category not set yet with an explicit RM0. */
export async function fillOperatingZeros(ctx: Context, businessId: string): Promise<void> {
  const { OPERATING_CATEGORIES, listOperatingCosts, saveOperatingCost } = await import('../index');
  const have = new Set((await listOperatingCosts(ctx)).map((r) => r.category));
  for (const category of OPERATING_CATEGORIES) {
    if (!have.has(category)) await saveOperatingCost(ctx, { businessId, category, mode: 'simple', simpleAmount: 0, active: true, classification: 'shared' });
  }
}
