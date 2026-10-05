import { deriveCredentials, encryptVault, generateSyncKey, type SyncCredentials } from '@trade-count/sync-crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { sha256Hex } from './hashing.js';
import { MemoryRateLimiter, MemoryVaultStore } from './memory-adapters.js';
import { LIMITS, handleVaultRequest } from './vault-handler.js';
import { MAX_ENVELOPE_BYTES, type ApiError, type VaultState } from './vault-protocol.js';

describe('vault API', () => {
  let store: MemoryVaultStore;
  let limiter: MemoryRateLimiter;
  let alice: SyncCredentials;
  let bob: SyncCredentials;

  beforeEach(async () => {
    store = new MemoryVaultStore();
    limiter = new MemoryRateLimiter();
    [alice, bob] = await Promise.all([generateSyncKey().then(deriveCredentials), generateSyncKey().then(deriveCredentials)]);
  });

  const call = (method: string, credentials: SyncCredentials, body?: unknown, ip = '203.0.113.7') =>
    handleVaultRequest(
      new Request(`https://trade-count.test/api/vaults/${credentials.vaultId}`, {
        method,
        headers: {
          authorization: `Bearer ${credentials.authToken}`,
          'cf-connecting-ip': ip,
          ...(body === undefined ? {} : { 'content-type': 'application/json' }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      }),
      credentials.vaultId,
      { store, rateLimiter: limiter, rateLimitSalt: 'test-salt', now: () => new Date('2026-10-05T12:00:00.000Z') },
    );

  const put = async (credentials: SyncCredentials, baseVersion: number, text = 'portfolio') =>
    call('PUT', credentials, { baseVersion, envelope: await encryptVault(text, credentials) });
  const errorOf = async (response: Response) => (await response.json()) as ApiError;

  it('creates a vault, then returns exactly the stored ciphertext', async () => {
    const created = await put(alice, 0);
    const fetched = await call('GET', alice);
    const state = (await fetched.json()) as VaultState;

    expect(created.status).toBe(201);
    expect(await created.clone().json()).toEqual({ version: 1 });
    expect(fetched.status).toBe(200);
    expect(state).toMatchObject({ version: 1, updatedAt: '2026-10-05T12:00:00.000Z' });
    expect(state.envelope.format).toBe('trade-count-vault');
  });

  it('stores only a hash of the token and never the plaintext or the token itself', async () => {
    await put(alice, 0, 'Tesla 50 shares');
    const record = store.vaults.get(alice.vaultId)!;

    expect(record.tokenHash).toBe(await sha256Hex(alice.authToken));
    expect(JSON.stringify(record)).not.toContain(alice.authToken);
    expect(JSON.stringify(record)).not.toContain('Tesla');
  });

  it('updates with the right base version and bumps the version', async () => {
    await put(alice, 0);
    const response = await put(alice, 1, 'second');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ version: 2 });
  });

  it('rejects an update based on an old version and tells the device which version is current', async () => {
    await put(alice, 0);
    await put(alice, 1);
    const stale = await put(alice, 1, 'from a device that missed an update');

    expect(stale.status).toBe(409);
    expect(await errorOf(stale)).toMatchObject({ error: 'VERSION_CONFLICT', version: 2 });
  });

  it('refuses another key, wrong token and missing credentials without revealing the data', async () => {
    await put(alice, 0, 'secret');

    const wrongToken = await call('GET', { ...alice, authToken: bob.authToken });
    const noHeader = await handleVaultRequest(
      new Request(`https://trade-count.test/api/vaults/${alice.vaultId}`),
      alice.vaultId,
      { store, rateLimiter: limiter, rateLimitSalt: 's' },
    );
    const hijackWrite = await call('PUT', { ...alice, authToken: bob.authToken }, { baseVersion: 1, envelope: await encryptVault('x', bob) });

    expect(wrongToken.status).toBe(401);
    expect(noHeader.status).toBe(401);
    expect(hijackWrite.status).toBe(401);
    expect(await wrongToken.text()).not.toContain('ciphertext');
    expect(store.vaults.get(alice.vaultId)!.version).toBe(1);
  });

  it('answers 404 for a vault that does not exist and refuses to create one from a non-zero version', async () => {
    expect((await call('GET', alice)).status).toBe(404);
    expect((await put(alice, 3)).status).toBe(404);
  });

  it('lets two devices race to create the same vault, with only one winner', async () => {
    const results = await Promise.all([put(alice, 0, 'phone'), put(alice, 0, 'laptop')]);

    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
  });

  it('deletes the vault for its owner only, and deleting twice is fine', async () => {
    await put(alice, 0);

    expect((await call('DELETE', { ...alice, authToken: bob.authToken })).status).toBe(401);
    expect(store.vaults.has(alice.vaultId)).toBe(true);
    expect((await call('DELETE', alice)).status).toBe(204);
    expect(store.vaults.has(alice.vaultId)).toBe(false);
    expect((await call('DELETE', alice)).status).toBe(204);
  });

  describe('input checks', () => {
    it('rejects bad vault ids, other methods and malformed credentials', async () => {
      const badId = await handleVaultRequest(new Request('https://trade-count.test/x'), 'not-hex', {
        store,
        rateLimiter: limiter,
        rateLimitSalt: 's',
      });
      const post = await handleVaultRequest(new Request(`https://trade-count.test/x`, { method: 'POST' }), alice.vaultId, {
        store,
        rateLimiter: limiter,
        rateLimitSalt: 's',
      });
      const shortToken = await call('GET', { ...alice, authToken: 'short' });

      expect(badId.status).toBe(400);
      expect(post.status).toBe(405);
      expect(post.headers.get('allow')).toBe('GET, PUT, DELETE');
      expect(shortToken.status).toBe(401);
    });

    it('rejects bodies that are not an encrypted vault', async () => {
      for (const body of [{ baseVersion: 0, envelope: { hello: 'world' } }, { baseVersion: -1 }, { baseVersion: 'a' }, 'text']) {
        expect((await call('PUT', alice, body)).status).toBe(400);
      }
      const notJson = await handleVaultRequest(
        new Request(`https://trade-count.test/x`, { method: 'PUT', headers: { authorization: `Bearer ${alice.authToken}` }, body: '{oops' }),
        alice.vaultId,
        { store, rateLimiter: limiter, rateLimitSalt: 's' },
      );
      expect(notJson.status).toBe(400);
      expect(store.vaults.size).toBe(0);
    });

    it('rejects oversized bodies', async () => {
      const envelope = { ...(await encryptVault('x', alice)), ciphertext: 'A'.repeat(MAX_ENVELOPE_BYTES + 1) };
      const response = await call('PUT', alice, { baseVersion: 0, envelope });

      expect(response.status).toBe(413);
      expect(store.vaults.size).toBe(0);
    });
  });

  describe('abuse limits', () => {
    it('limits how many vaults one connection can create per hour', async () => {
      for (let i = 0; i < LIMITS.createsPerHour; i++) {
        const fresh = await generateSyncKey().then(deriveCredentials);
        expect((await put(fresh, 0)).status).toBe(201);
      }
      const extra = await generateSyncKey().then(deriveCredentials);

      const response = await put(extra, 0);
      expect(response.status).toBe(429);
      expect(await errorOf(response)).toMatchObject({ error: 'RATE_LIMITED' });
      expect((await put(extra, 0, 'x')).status).toBe(429);
      expect((await call('GET', alice, undefined, '198.51.100.9')).status).toBe(404);
    });

    it('limits total requests per connection and keys the limit by a salted hash, not the address', async () => {
      for (let i = 0; i < LIMITS.requestsPerHour; i++) await call('GET', alice);

      expect((await call('GET', alice)).status).toBe(429);
      expect([...limiter.counts.keys()].every((k) => !k.includes('203.0.113.7'))).toBe(true);
    });
  });

  it('marks every response as uncacheable, sniff-proof and without CORS headers', async () => {
    for (const response of [await put(alice, 0), await call('GET', alice), await call('GET', bob)]) {
      expect(response.headers.get('cache-control')).toBe('no-store');
      expect(response.headers.get('x-content-type-options')).toBe('nosniff');
      expect(response.headers.get('access-control-allow-origin')).toBeNull();
    }
  });
});
