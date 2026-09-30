import 'fake-indexeddb/auto';
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
