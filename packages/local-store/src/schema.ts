import type { Database } from '@sqlite.org/sqlite-wasm';

/** Each entry upgrades the schema by one version; never edit a shipped entry, append a new one. */
const MIGRATIONS: readonly string[] = [
  `
  CREATE TABLE stocks (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 60),
    name_key TEXT NOT NULL UNIQUE,
    symbol TEXT CHECK (symbol IS NULL OR length(symbol) BETWEEN 1 AND 12),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  ) STRICT;

  CREATE TABLE trades (
    id TEXT PRIMARY KEY NOT NULL,
    stock_id TEXT NOT NULL REFERENCES stocks (id) ON DELETE RESTRICT,
    side TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
    quantity TEXT NOT NULL CHECK (CAST(quantity AS REAL) > 0),
    price TEXT NOT NULL CHECK (CAST(price AS REAL) > 0),
    traded_on TEXT NOT NULL CHECK (traded_on GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  ) STRICT;

  CREATE INDEX trades_fifo_order ON trades (stock_id, traded_on, created_at);
  `,
  `
  CREATE TABLE app_meta (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  ) STRICT;
  `,
  `
  CREATE TABLE deletions (
    kind TEXT NOT NULL CHECK (kind IN ('stock', 'trade')),
    id TEXT NOT NULL,
    deleted_at TEXT NOT NULL,
    PRIMARY KEY (kind, id)
  ) STRICT;
  `,
];

export const SCHEMA_VERSION = MIGRATIONS.length;

/** Brings the database to SCHEMA_VERSION; refuses files written by a newer app version. */
export function migrate(db: Database): void {
  db.exec('PRAGMA foreign_keys = ON');
  const current = Number(db.selectValue('PRAGMA user_version'));
  if (current > SCHEMA_VERSION) {
    throw new Error(`This data was saved by a newer version of Trade Count (schema ${current}). Update the app.`);
  }
  db.transaction('IMMEDIATE', () => {
    for (let version = current; version < SCHEMA_VERSION; version++) {
      db.exec(MIGRATIONS[version]!);
    }
    db.exec(`PRAGMA user_version = ${SCHEMA_VERSION}`);
  });
}
