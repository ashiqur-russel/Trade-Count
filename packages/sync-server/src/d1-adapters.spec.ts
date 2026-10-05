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
    const record = { vaultId: ID, tokenHash: HASH, envelope: '{"x":1}', updatedAt: '2026-10-05T12:00:00.000Z', lastSeenAt: '2026-10-05T12:00:00.000Z' };

    expect(await store.create(record)).toBe(true);
    expect(await store.create({ ...record, envelope: 'other' })).toBe(false);
    expect(await store.get(ID)).toEqual({ ...record, version: 1 });
    expect(await store.get('c'.repeat(32))).toBeNull();
  });

  it('updates only when the expected version still matches, bumping it each time', async () => {
    const store = createD1VaultStore(stand.db);
    await store.create({ vaultId: ID, tokenHash: HASH, envelope: 'v1', updatedAt: 'x', lastSeenAt: 'x' });

    expect(await store.update(ID, 1, 'v2', 'later')).toBe(true);
    expect(await store.update(ID, 1, 'lost update', 'later')).toBe(false);
    expect(await store.get(ID)).toMatchObject({ version: 2, envelope: 'v2', updatedAt: 'later', lastSeenAt: 'later' });
  });

  it('deletes a vault', async () => {
    const store = createD1VaultStore(stand.db);
    await store.create({ vaultId: ID, tokenHash: HASH, envelope: 'v1', updatedAt: 'x', lastSeenAt: 'x' });

    await store.delete(ID);

    expect(await store.get(ID)).toBeNull();
  });

  it('enforces the table rules in SQL: id length, token-hash length and version', async () => {
    const insert = (id: string, hash: string, version: number) =>
      stand.sqlite.exec('INSERT INTO vaults VALUES (?, ?, ?, ?, ?, ?)', { bind: [id, hash, version, 'e', 'u', 'u'] });

    expect(() => insert('short', HASH, 1)).toThrow(/CHECK/);
    expect(() => insert(ID, 'short', 1)).toThrow(/CHECK/);
    expect(() => insert(ID, HASH, 0)).toThrow(/CHECK/);
  });
});

describe('D1 vault activity', () => {
  let stand: ReturnType<typeof openD1Stand>;
  beforeEach(() => void (stand = openD1Stand()));
  afterEach(() => stand.sqlite.close());

  const record = (vaultId: string, lastSeenAt: string, envelope = 'abcd') => ({
    vaultId,
    tokenHash: HASH,
    envelope,
    updatedAt: lastSeenAt,
    lastSeenAt,
  });

  it('adds up the stored envelope sizes', async () => {
    const store = createD1VaultStore(stand.db);
    expect(await store.usedBytes()).toBe(0);

    await store.create(record('a'.repeat(32), '2026-01-01', 'abcd'));
    await store.create(record('b'.repeat(32), '2026-01-01', 'xyz'));

    expect(await store.usedBytes()).toBe(7);
  });

  it('touch records when a vault was last opened', async () => {
    const store = createD1VaultStore(stand.db);
    await store.create(record(ID, '2026-01-01'));

    await store.touch(ID, '2026-02-01');

    expect((await store.get(ID))?.lastSeenAt).toBe('2026-02-01');
  });

  it('deletes never-resynced vaults unseen since the first cut-off and any vault unseen since the second', async () => {
    const store = createD1VaultStore(stand.db);
    const fresh = 'a'.repeat(32);
    const abandoned = 'b'.repeat(32);
    const ancientButSynced = 'c'.repeat(32);
    const recentlySynced = 'd'.repeat(32);
    await store.create(record(fresh, '2026-10-04'));
    await store.create(record(abandoned, '2026-09-01'));
    await store.create(record(ancientButSynced, '2025-01-01'));
    await store.create(record(recentlySynced, '2026-09-01'));
    await store.update(ancientButSynced, 1, 'v2', '2025-01-01');
    await store.update(recentlySynced, 1, 'v2', '2026-09-01');

    const removed = await store.deleteStale('2026-09-28', '2025-10-05');

    expect(removed).toBe(2);
    expect(await store.get(fresh)).not.toBeNull();
    expect(await store.get(recentlySynced)).not.toBeNull();
    expect(await store.get(abandoned)).toBeNull();
    expect(await store.get(ancientButSynced)).toBeNull();
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
