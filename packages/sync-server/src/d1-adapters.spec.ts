import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createD1RateLimiter, createD1VaultStore } from './d1-adapters.js';
import { openD1Stand } from './d1-sqlite.fixture.js';

const ID = 'a'.repeat(32);
const HASH = 'b'.repeat(64);

describe('D1 vault store', () => {
  let stand: ReturnType<typeof openD1Stand>;
  beforeEach(() => void (stand = openD1Stand()));
  afterEach(() => stand.sqlite.close());

  it('creates a vault once and reads it back', async () => {
    const store = createD1VaultStore(stand.db);
    const record = { vaultId: ID, tokenHash: HASH, envelope: '{"x":1}', updatedAt: '2026-10-05T12:00:00.000Z' };

    expect(await store.create(record)).toBe(true);
    expect(await store.create({ ...record, envelope: 'other' })).toBe(false);
    expect(await store.get(ID)).toEqual({ ...record, version: 1 });
    expect(await store.get('c'.repeat(32))).toBeNull();
  });

  it('updates only when the expected version still matches, bumping it each time', async () => {
    const store = createD1VaultStore(stand.db);
    await store.create({ vaultId: ID, tokenHash: HASH, envelope: 'v1', updatedAt: 'x' });

    expect(await store.update(ID, 1, 'v2', 'later')).toBe(true);
    expect(await store.update(ID, 1, 'lost update', 'later')).toBe(false);
    expect(await store.get(ID)).toMatchObject({ version: 2, envelope: 'v2', updatedAt: 'later' });
  });

  it('deletes a vault', async () => {
    const store = createD1VaultStore(stand.db);
    await store.create({ vaultId: ID, tokenHash: HASH, envelope: 'v1', updatedAt: 'x' });

    await store.delete(ID);

    expect(await store.get(ID)).toBeNull();
  });

  it('enforces the table rules in SQL: id length, token-hash length and version', async () => {
    const insert = (id: string, hash: string, version: number) =>
      stand.sqlite.exec('INSERT INTO vaults VALUES (?, ?, ?, ?, ?)', { bind: [id, hash, version, 'e', 'u'] });

    expect(() => insert('short', HASH, 1)).toThrow(/CHECK/);
    expect(() => insert(ID, 'short', 1)).toThrow(/CHECK/);
    expect(() => insert(ID, HASH, 0)).toThrow(/CHECK/);
  });
});

describe('D1 rate limiter', () => {
  let stand: ReturnType<typeof openD1Stand>;
  beforeEach(() => void (stand = openD1Stand()));
  afterEach(() => stand.sqlite.close());

  it('allows up to the limit within a window, then refuses', async () => {
    const limiter = createD1RateLimiter(stand.db, () => Date.parse('2026-10-05T12:10:00Z'));

    const results = [];
    for (let i = 0; i < 4; i++) results.push(await limiter.consume('client-a', 3, 3600));

    expect(results).toEqual([true, true, true, false]);
    expect(await limiter.consume('client-b', 3, 3600)).toBe(true);
  });

  it('starts a fresh count in the next window and purges windows older than two', async () => {
    let now = Date.parse('2026-10-05T12:10:00Z');
    const limiter = createD1RateLimiter(stand.db, () => now);
    for (let i = 0; i < 4; i++) await limiter.consume('client-a', 3, 3600);

    now += 3600_000;
    expect(await limiter.consume('client-a', 3, 3600)).toBe(true);
    now += 3 * 3600_000;
    await limiter.consume('client-c', 3, 3600);

    expect(Number(stand.sqlite.selectValue('SELECT count(*) FROM rate_limits'))).toBe(1);
  });
});
