import {
  DOCUMENT,
  DestroyRef,
  Injectable,
  InjectionToken,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import {
  SyncNetworkError,
  VaultGoneError,
  createFetchVaultApi,
  syncOnce,
  type SyncDevice,
  type SyncOptions,
  type VaultApi,
} from '@trade-count/sync-client';
import { deriveCredentials, generateSyncKey, type SyncCredentials } from '@trade-count/sync-crypto';
import { PortfolioDb, PortfolioDbError } from './portfolio-db';
import { PortfolioStore } from './portfolio-store';

export type SyncStatus = 'off' | 'idle' | 'syncing' | 'offline' | 'conflict' | 'error';
export type SyncResult = { ok: true } | { ok: false; message: string };

/** Builds the API client for one sync key; replaceable in tests. */
export const VAULT_API_FACTORY = new InjectionToken<(credentials: SyncCredentials) => VaultApi>(
  'VAULT_API_FACTORY',
  {
    providedIn: 'root',
    factory: () => (credentials) => createFetchVaultApi(credentials),
  },
);

const DEBOUNCE_MS = 2000;
const REFOCUS_MIN_GAP_MS = 30_000;

/**
 * Keeps this device in sync through the encrypted vault: after local changes, when the app returns to
 * the foreground and when the connection comes back. One sync runs at a time; requests arriving meanwhile
 * are merged into one follow-up run.
 */
@Injectable()
export class PortfolioSync {
  private readonly db = inject(PortfolioDb);
  private readonly store = inject(PortfolioStore);
  private readonly makeApi = inject(VAULT_API_FACTORY);
  private readonly document = inject(DOCUMENT);

  readonly status = signal<SyncStatus>('off');
  readonly lastSyncedAt = signal<string | null>(null);
  readonly message = signal<string | null>(null);
  /** Something that happened without the user asking, e.g. sync turned off from another device. */
  readonly notice = signal<string | null>(null);
  readonly enabled = computed(() => this.status() !== 'off');

  private syncKey: string | null = null;
  private credentials: SyncCredentials | null = null;
  private api: VaultApi | null = null;
  /** The vault this device has already synced with; if it disappears, sync was turned off elsewhere. */
  private establishedVaultId: string | null = null;
  private inflight: Promise<SyncResult> | null = null;
  private runAgain = false;
  private lastRunAt = 0;
  private timer: ReturnType<typeof setTimeout> | undefined;

  private readonly device: SyncDevice = {
    exportVault: () => this.db.call('exportVault'),
    syncWith: (remote) => this.db.call('syncWith', remote),
  };

  constructor() {
    effect(() => {
      const revision = this.store.revision();
      untracked(() => {
        if (revision > 0 && this.enabled()) this.schedule(DEBOUNCE_MS);
      });
    });

    const view = this.document.defaultView;
    const onVisible = () => {
      if (
        this.document.visibilityState === 'visible' &&
        this.enabled() &&
        Date.now() - this.lastRunAt > REFOCUS_MIN_GAP_MS
      ) {
        void this.sync();
      }
    };
    const onOnline = () => {
      if (this.enabled()) void this.sync();
    };
    this.document.addEventListener('visibilitychange', onVisible);
    view?.addEventListener('online', onOnline);
    inject(DestroyRef).onDestroy(() => {
      clearTimeout(this.timer);
      this.document.removeEventListener('visibilitychange', onVisible);
      view?.removeEventListener('online', onOnline);
    });
  }

  /** Resumes syncing on start-up if this device already has a sync key. */
  async start(): Promise<void> {
    const key = await this.db.call('syncKey');
    if (!key) return;
    try {
      await this.activate(key);
      this.establishedVaultId = await this.db.call('syncEstablishedVault');
    } catch {
      this.status.set('error');
      this.message.set(
        "The saved sync key can't be used. Turn sync off and on again, or join with your key.",
      );
      return;
    }
    void this.sync();
  }

  newKey(): Promise<string> {
    return generateSyncKey();
  }

  /** Starts syncing with a freshly generated key: uploads this device's data as the first vault. */
  turnOn(key: string): Promise<SyncResult> {
    return this.begin(key, {});
  }

  /** Starts syncing with a key from another device: downloads and merges that device's data. */
  join(key: string): Promise<SyncResult> {
    return this.begin(key, { requireExisting: true });
  }

  /** Deletes the encrypted copy on the server, then forgets the key here. Local data stays. */
  async turnOff(): Promise<SyncResult> {
    if (!this.api) return { ok: true };
    try {
      await this.api.delete();
    } catch (error) {
      return { ok: false, message: errorMessage(error) };
    }
    await this.forget();
    return { ok: true };
  }

  currentKey(): string | null {
    return this.syncKey;
  }

  sync(options: SyncOptions = {}): Promise<SyncResult> {
    if (this.inflight) {
      this.runAgain = true;
      return this.inflight;
    }
    const run = (async () => {
      let result: SyncResult;
      do {
        this.runAgain = false;
        result = await this.runOnce(options);
      } while (this.runAgain && result.ok);
      return result;
    })().finally(() => (this.inflight = null));
    this.inflight = run;
    return run;
  }

  private async begin(key: string, options: SyncOptions): Promise<SyncResult> {
    try {
      await this.activate(key);
    } catch (error) {
      return { ok: false, message: errorMessage(error) };
    }
    const result = await this.sync(options);
    if (!result.ok) {
      await this.forget();
      return result;
    }
    await this.db.call('setSyncKey', key);
    return result;
  }

  private async activate(key: string): Promise<void> {
    this.credentials = await deriveCredentials(key);
    this.syncKey = key;
    this.api = this.makeApi(this.credentials);
    this.status.set('idle');
    this.message.set(null);
  }

  private async forget(): Promise<void> {
    clearTimeout(this.timer);
    await this.db.call('setSyncKey', null);
    this.syncKey = null;
    this.credentials = null;
    this.api = null;
    this.establishedVaultId = null;
    this.lastSyncedAt.set(null);
    this.message.set(null);
    this.status.set('off');
  }

  private async runOnce(options: SyncOptions): Promise<SyncResult> {
    if (!this.api || !this.credentials) return { ok: false, message: 'Sync is off.' };
    this.lastRunAt = Date.now();
    this.status.set('syncing');
    try {
      const wasSynced = this.establishedVaultId === this.credentials.vaultId;
      const outcome = await syncOnce(this.device, this.api, this.credentials, {
        ...options,
        wasSynced,
      });
      await this.rememberEstablished(this.credentials.vaultId);
      if (outcome.pulled) await this.store.refresh();
      this.lastSyncedAt.set(new Date().toISOString());
      this.message.set(null);
      this.status.set('idle');
      return { ok: true };
    } catch (error) {
      if (error instanceof VaultGoneError) {
        await this.forget();
        this.notice.set(error.message);
        return { ok: false, message: error.message };
      }
      const message = errorMessage(error);
      this.message.set(message);
      this.status.set(statusFor(error));
      return { ok: false, message };
    }
  }

  private async rememberEstablished(vaultId: string): Promise<void> {
    if (this.establishedVaultId === vaultId) return;
    this.establishedVaultId = vaultId;
    await this.db.call('markSyncEstablished', vaultId);
  }

  private schedule(delayMs: number): void {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.sync(), delayMs);
  }
}

function statusFor(error: unknown): SyncStatus {
  if (error instanceof SyncNetworkError) return 'offline';
  if (error instanceof PortfolioDbError && error.failure.code === 'CONFLICT') return 'conflict';
  return 'error';
}

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return 'Something went wrong while syncing. Try again.';
}
