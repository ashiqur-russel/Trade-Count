import { TestBed } from '@angular/core/testing';
import type { PutOutcome, VaultApi } from '@trade-count/sync-client';
import { SyncNetworkError, VaultNotFoundError } from '@trade-count/sync-client';
import { deriveCredentials, generateSyncKey, type VaultEnvelope } from '@trade-count/sync-crypto';
import type { VaultSnapshot } from '@trade-count/local-store';
import { PersistentStorage } from '../../../core/storage/persistent-storage';
import { PortfolioDb, PortfolioDbError } from './portfolio-db';
import { PortfolioStore } from './portfolio-store';
import { PortfolioSync, VAULT_API_FACTORY } from './portfolio-sync';

const emptySnapshot = (): VaultSnapshot => ({
  format: 'trade-count-vault-data',
  version: 1,
  stocks: [],
  trades: [],
  deletions: [],
});

/** Stands in for the database worker. */
class FakeDb {
  snapshot = emptySnapshot();
  syncKeyValue: string | null = null;
  establishedVault: string | null = null;
  mergeFailure: PortfolioDbError | null = null;
  readonly calls: string[] = [];

  /** A simple union by id, enough to tell "local data survives a sync" from "local data is overwritten". */
  private merge(local: VaultSnapshot, remote: VaultSnapshot): VaultSnapshot {
    const stocks = new Map([...remote.stocks, ...local.stocks].map((stock) => [stock.id, stock]));
    return { ...local, stocks: [...stocks.values()] };
  }

  async call(method: string, ...args: unknown[]): Promise<unknown> {
    this.calls.push(method);
    switch (method) {
      case 'exportVault':
        return this.snapshot;
      case 'syncWith':
        if (this.mergeFailure) throw this.mergeFailure;
        this.snapshot = this.merge(this.snapshot, args[0] as VaultSnapshot);
        return this.snapshot;
      case 'syncKey':
        return this.syncKeyValue;
      case 'setSyncKey':
        this.syncKeyValue = args[0] as string | null;
        if (args[0] === null) this.establishedVault = null;
        return undefined;
      case 'syncEstablishedVault':
        return this.establishedVault;
      case 'markSyncEstablished':
        this.establishedVault = args[0] as string;
        return undefined;
      case 'getPortfolio':
        return { stocks: [], trades: [] };
      default:
        throw new Error(`Unexpected call ${method}`);
    }
  }
}

/** A vault server in memory: stores whatever envelope it is given and enforces the base version. */
class FakeVaultApi implements VaultApi {
  state: { version: number; updatedAt: string; envelope: VaultEnvelope } | null = null;
  offline = false;
  deleted = false;

  async get() {
    if (this.offline) throw new SyncNetworkError();
    return this.state;
  }

  async put(baseVersion: number, envelope: VaultEnvelope): Promise<PutOutcome> {
    if (this.offline) throw new SyncNetworkError();
    if (baseVersion !== (this.state?.version ?? 0))
      return { ok: false, conflictVersion: this.state?.version ?? 0 };
    this.state = { version: baseVersion + 1, updatedAt: new Date().toISOString(), envelope };
    return { ok: true, version: this.state.version };
  }

  async delete() {
    if (this.offline) throw new SyncNetworkError();
    this.state = null;
    this.deleted = true;
  }
}

describe('PortfolioSync', () => {
  let db: FakeDb;
  let api: FakeVaultApi;
  let store: PortfolioStore;
  let sync: PortfolioSync;

  beforeEach(() => {
    db = new FakeDb();
    api = new FakeVaultApi();
    TestBed.configureTestingModule({
      providers: [
        PortfolioStore,
        PortfolioSync,
        { provide: PortfolioDb, useValue: db },
        { provide: PersistentStorage, useValue: { request: async () => undefined } },
        { provide: VAULT_API_FACTORY, useValue: () => api },
      ],
    });
    store = TestBed.inject(PortfolioStore);
    sync = TestBed.inject(PortfolioSync);
  });

  afterEach(() => vi.useRealTimers());

  it('stays off when the device has no sync key', async () => {
    await sync.start();

    expect(sync.status()).toBe('off');
    expect(sync.enabled()).toBe(false);
  });

  it('turns on with a new key: uploads this device, remembers the key and shows when it synced', async () => {
    const key = await sync.newKey();

    const result = await sync.turnOn(key);

    expect(result).toEqual({ ok: true });
    expect(sync.status()).toBe('idle');
    expect(sync.lastSyncedAt()).not.toBeNull();
    expect(api.state?.version).toBe(1);
    expect(db.syncKeyValue).toBe(key);
    expect(sync.currentKey()).toBe(key);
  });

  it('rejects a mistyped key before contacting the server', async () => {
    const result = await sync.join('AAAA-AAAA-AAAA-AAAA-AAAA-AAAA-AAAA-AAAA');

    expect(result.ok).toBe(false);
    expect(sync.status()).toBe('off');
    expect(api.state).toBeNull();
  });

  it('leaves sync off and the key unsaved when turning on fails because the device is offline', async () => {
    api.offline = true;

    const result = await sync.turnOn(await sync.newKey());

    expect(result.ok).toBe(false);
    expect(sync.status()).toBe('off');
    expect(db.syncKeyValue).toBeNull();
  });

  it('joins with a key from another device, merges its data and refreshes the screen', async () => {
    const key = await generateSyncKey();
    await sync.turnOn(key);
    db.snapshot = {
      ...emptySnapshot(),
      stocks: [
        { id: 's1', name: 'Tesla Inc.', symbol: 'TSLA', updatedAt: '2026-10-05T10:00:00.000Z' },
      ],
    };
    await sync.sync();
    const phoneVault = api.state;

    TestBed.resetTestingModule();
    const laptopDb = new FakeDb();
    const laptopApi = new FakeVaultApi();
    laptopApi.state = phoneVault;
    TestBed.configureTestingModule({
      providers: [
        PortfolioStore,
        PortfolioSync,
        { provide: PortfolioDb, useValue: laptopDb },
        { provide: PersistentStorage, useValue: { request: async () => undefined } },
        { provide: VAULT_API_FACTORY, useValue: () => laptopApi },
      ],
    });
    const laptopSync = TestBed.inject(PortfolioSync);
    TestBed.inject(PortfolioStore);

    const result = await laptopSync.join(key);

    expect(result).toEqual({ ok: true });
    expect(laptopDb.snapshot.stocks.map((s) => s.name)).toEqual(['Tesla Inc.']);
    expect(laptopDb.calls).toContain('getPortfolio');
    expect(laptopDb.syncKeyValue).toBe(key);
  });

  it('refuses to join when no synced data exists for the key and does not keep the key', async () => {
    const failing: VaultApi = {
      get: async () => null,
      put: async () => ({ ok: true, version: 1 }),
      delete: async () => undefined,
    };
    TestBed.resetTestingModule();
    const emptyDb = new FakeDb();
    TestBed.configureTestingModule({
      providers: [
        PortfolioStore,
        PortfolioSync,
        { provide: PortfolioDb, useValue: emptyDb },
        { provide: PersistentStorage, useValue: { request: async () => undefined } },
        { provide: VAULT_API_FACTORY, useValue: () => failing },
      ],
    });
    TestBed.inject(PortfolioStore);
    const joiner = TestBed.inject(PortfolioSync);

    const result = await joiner.join(await generateSyncKey());

    expect(result).toEqual({ ok: false, message: new VaultNotFoundError().message });
    expect(joiner.status()).toBe('off');
    expect(emptyDb.syncKeyValue).toBeNull();
  });

  it('resumes syncing at start-up when a key is already stored', async () => {
    db.syncKeyValue = await generateSyncKey();

    await sync.start();
    await vi.waitFor(() => expect(sync.status()).toBe('idle'));

    expect(api.state?.version).toBe(1);
  });

  it('syncs a couple of seconds after a local change, once for a burst of changes', async () => {
    await sync.turnOn(await sync.newKey());
    vi.useFakeTimers();
    const putsBefore = api.state!.version;
    db.snapshot = {
      ...emptySnapshot(),
      stocks: [{ id: 's1', name: 'Acme', symbol: null, updatedAt: '2026-10-05T10:00:00.000Z' }],
    };

    store.revision.update((n) => n + 1);
    TestBed.tick();
    store.revision.update((n) => n + 1);
    TestBed.tick();
    await vi.advanceTimersByTimeAsync(1500);
    expect(api.state!.version).toBe(putsBefore);
    await vi.advanceTimersByTimeAsync(1000);

    await vi.waitFor(() => expect(api.state!.version).toBe(putsBefore + 1));
    await vi.advanceTimersByTimeAsync(10_000);
    expect(api.state!.version).toBe(putsBefore + 1);
  });

  it('shows offline when the connection drops and recovers on the next sync', async () => {
    await sync.turnOn(await sync.newKey());
    api.offline = true;

    const failed = await sync.sync();
    expect(failed.ok).toBe(false);
    expect(sync.status()).toBe('offline');

    api.offline = false;
    expect((await sync.sync()).ok).toBe(true);
    expect(sync.status()).toBe('idle');
  });

  it('flags a refused merge as needing attention, with the reason', async () => {
    await sync.turnOn(await sync.newKey());
    db.snapshot = {
      ...emptySnapshot(),
      stocks: [{ id: 's1', name: 'Acme', symbol: null, updatedAt: '2026-10-05T10:00:00.000Z' }],
    };
    await sync.sync();
    db.snapshot = emptySnapshot();
    db.mergeFailure = new PortfolioDbError({
      code: 'CONFLICT',
      message: 'Changes from your other device conflict with this one.',
    });

    const result = await sync.sync();

    expect(result.ok).toBe(false);
    expect(sync.status()).toBe('conflict');
    expect(sync.message()).toBe('Changes from your other device conflict with this one.');
  });

  describe('when sync is turned off from another device', () => {
    it('remembers the vault it synced with, and forgets that together with the key', async () => {
      const key = await sync.newKey();

      await sync.turnOn(key);
      expect(db.establishedVault).toBe((await deriveCredentials(key)).vaultId);

      await sync.turnOff();
      expect(db.establishedVault).toBeNull();
    });

    it('stops syncing, forgets the key and says why, without creating a new vault', async () => {
      await sync.turnOn(await sync.newKey());
      const localBefore = db.snapshot;
      api.state = null;

      const result = await sync.sync();

      expect(result.ok).toBe(false);
      expect(sync.status()).toBe('off');
      expect(db.syncKeyValue).toBeNull();
      expect(sync.currentKey()).toBeNull();
      expect(sync.notice()).toContain('turned off on another device');
      expect(api.state).toBeNull();
      expect(db.snapshot).toBe(localBefore);
    });

    it('notices at start-up when the vault was removed while the app was closed', async () => {
      const key = await generateSyncKey();
      db.syncKeyValue = key;
      db.establishedVault = (await deriveCredentials(key)).vaultId;
      api.state = null;

      await sync.start();
      await vi.waitFor(() => expect(sync.status()).toBe('off'));

      expect(sync.notice()).toContain('turned off on another device');
      expect(db.syncKeyValue).toBeNull();
      expect(api.state).toBeNull();
    });

    it('still creates the vault at start-up for a key that was saved but never synced', async () => {
      db.syncKeyValue = await generateSyncKey();

      await sync.start();
      await vi.waitFor(() => expect(sync.status()).toBe('idle'));

      expect(api.state?.version).toBe(1);
      expect(sync.notice()).toBeNull();
    });
  });

  it('turns off by deleting the server copy first, then forgetting the key', async () => {
    await sync.turnOn(await sync.newKey());

    const result = await sync.turnOff();

    expect(result).toEqual({ ok: true });
    expect(api.deleted).toBe(true);
    expect(sync.status()).toBe('off');
    expect(db.syncKeyValue).toBeNull();
    expect(sync.currentKey()).toBeNull();
  });

  it('keeps sync on when the server copy could not be deleted', async () => {
    await sync.turnOn(await sync.newKey());
    api.offline = true;

    const result = await sync.turnOff();

    expect(result.ok).toBe(false);
    expect(sync.enabled()).toBe(true);
    expect(db.syncKeyValue).not.toBeNull();
  });
});
