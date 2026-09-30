import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { describeStore } from '../../core/__tests__/storeContract';
import type { D1Database, D1PreparedStatement, D1Result } from '../d1';
import { D1Store } from '../d1Store';

/** Minimal D1-shaped wrapper over SQLite so the real SQL in D1Store is exercised, not a copy of its logic. */
function d1(sqlite: DatabaseSync): D1Database {
  const statement = (sql: string, values: unknown[] = []): D1PreparedStatement => ({
    bind: (...v) => statement(sql, v),
    async run(): Promise<D1Result> {
      const r = sqlite.prepare(sql).run(...(values as never[]));
      return { meta: { changes: Number(r.changes) } };
    },
    async first<T>() {
      return (sqlite.prepare(sql).get(...(values as never[])) as T | undefined) ?? null;
    },
    async all<T>() {
      return { results: sqlite.prepare(sql).all(...(values as never[])) as T[], meta: { changes: 0 } };
    },
  });
  return {
    prepare: (sql) => statement(sql),
    async batch(list) {
      return Promise.all(list.map((s) => s.run()));
    },
  };
}

describeStore('D1Store (real SQL on SQLite)', async () => {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(readFileSync(new URL('../schema.sql', import.meta.url), 'utf8'));
  return new D1Store(d1(sqlite));
});
