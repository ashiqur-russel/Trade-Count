import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Database } from '@sqlite.org/sqlite-wasm';
import { openMemoryDatabase } from './memory-database.fixture.js';
import { SCHEMA_VERSION, migrate } from './schema.js';

describe('migrate', () => {
  let db: Database;

  beforeEach(() => {
    db = openMemoryDatabase();
  });
  afterEach(() => db.close());

  it('creates the schema once and records its version', () => {
    migrate(db);
    migrate(db);

    expect(Number(db.selectValue('PRAGMA user_version'))).toBe(SCHEMA_VERSION);
    expect(db.selectValues("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")).toEqual(['app_meta', 'stocks', 'trades']);
  });

  it('upgrades a version 1 database to the current schema without losing data', () => {
    db.exec(`
      CREATE TABLE stocks (id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, name_key TEXT NOT NULL UNIQUE,
        symbol TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL) STRICT;
      CREATE TABLE trades (id TEXT PRIMARY KEY NOT NULL, stock_id TEXT NOT NULL REFERENCES stocks (id),
        side TEXT NOT NULL, quantity TEXT NOT NULL, price TEXT NOT NULL, traded_on TEXT NOT NULL,
        created_at TEXT NOT NULL, updated_at TEXT NOT NULL) STRICT;
      INSERT INTO stocks VALUES ('s1', 'Acme', 'acme', NULL, 'x', 'x');
      PRAGMA user_version = 1;
    `);

    migrate(db);

    expect(Number(db.selectValue('PRAGMA user_version'))).toBe(SCHEMA_VERSION);
    expect(db.selectValue('SELECT name FROM stocks')).toBe('Acme');
    expect(db.selectValue('SELECT count(*) FROM app_meta')).toBe(0);
  });

  it('refuses a file saved by a newer app version', () => {
    db.exec(`PRAGMA user_version = ${SCHEMA_VERSION + 1}`);

    expect(() => migrate(db)).toThrow(/newer version of Trade Count/);
  });

  it('enforces the rules in SQL too, not just in code', () => {
    migrate(db);
    db.exec("INSERT INTO stocks VALUES ('s1', 'Acme', 'acme', NULL, 'x', 'x')");

    expect(() =>
      db.exec("INSERT INTO trades VALUES ('t1', 's1', 'buy', '0', '10', '2026-10-01', 'x', 'x')"),
    ).toThrow(/CHECK constraint/);
    expect(() =>
      db.exec("INSERT INTO trades VALUES ('t2', 'missing', 'buy', '1', '10', '2026-10-01', 'x', 'x')"),
    ).toThrow(/FOREIGN KEY/);
  });
});
