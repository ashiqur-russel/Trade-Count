import sqlite3InitModule, { type Database, type SqlValue } from '@sqlite.org/sqlite-wasm';
import { readFileSync } from 'node:fs';
import type { D1Like, D1StatementLike } from './d1-adapters.js';

const sqlite3 = await sqlite3InitModule();
const MIGRATIONS = ['0001_create_vaults.sql', '0002_vault_activity.sql'];

/** Real SQLite (D1's engine) behind D1's prepare/bind/first/run API, with the production migrations applied. */
export function openD1Stand(): { db: D1Like; sqlite: Database } {
  const sqlite = new sqlite3.oo1.DB(':memory:');
  for (const file of MIGRATIONS) {
    sqlite.exec(readFileSync(new URL(`../../../migrations/${file}`, import.meta.url), 'utf8'));
  }

  const statement = (sql: string, values: SqlValue[] = []): D1StatementLike => ({
    bind: (...next) => statement(sql, next as SqlValue[]),
    first: async <T>() => (sqlite.selectObject(sql, values.length ? values : undefined) as T | undefined) ?? null,
    run: async () => {
      const before = sqlite.changes(true, false);
      sqlite.exec(sql, { bind: values });
      return { meta: { changes: sqlite.changes(true, false) - before } };
    },
  });
  return { sqlite, db: { prepare: (sql) => statement(sql) } };
}
