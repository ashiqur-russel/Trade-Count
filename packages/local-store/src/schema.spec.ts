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
    expect(db.selectValues("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")).toEqual(['stocks', 'trades']);
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
