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
import type { ConflictChoice, VaultDifference } from '@trade-count/local-store';
import { diffVaults } from '@trade-count/local-store';
import {
  SyncNetworkError,
  VaultGoneError,
  createFetchVaultApi,
  fetchRemoteSnapshot,
  syncOnce,
  type SyncDevice,
  type SyncOptions,
  type VaultApi,
} from '@trade-count/sync-client';
import { deriveCredentials, generateSyncKey, type SyncCredentials } from '@trade-count/sync-crypto';
import { formatIsoDate } from '../../../shared/dates/iso-date';
import { clockWarningMessage } from './clock-warning';
import { PortfolioDb, PortfolioDbError } from './portfolio-db';
import { PortfolioStore } from './portfolio-store';

export type SyncStatus = 'off' | 'locked' | 'idle' | 'syncing' | 'offline' | 'conflict' | 'error';
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
  /** Server time minus this device's clock, from the latest sync; null if not measured. */
  readonly clockOffsetMs = signal<number | null>(null);
  readonly clockWarning = computed(() => clockWarningMessage(this.clockOffsetMs()));
  /** Sync is set up and running; false while off or while waiting for the user to enter the key again. */
  /** What each side holds when the last sync was refused; null while there is nothing to decide. */
  readonly conflict = signal<VaultDifference | null>(null);
  readonly enabled = computed(() => this.status() !== 'off' && this.status() !== 'locked');
  /** Whether the sync key is saved on this device (otherwise it lives in memory until the app closes). */
  readonly keyStored = signal(false);

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
    resolveConflict: (remote, choice) => this.db.call('resolveConflict', remote, choice),
    setClockOffset: (offsetMs) => this.db.call('setClockOffset', offsetMs),
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
    if (!key) {
      await this.lockIfKeyWasNotStored();
      return;
    }
    try {
      await this.activate(key);
      this.keyStored.set(true);
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
  turnOn(key: string, rememberKey = true): Promise<SyncResult> {
    return this.begin(key, {}, rememberKey);
  }

  /** Starts syncing with a key from another device: downloads and merges that device's data. */
  join(key: string, rememberKey = true): Promise<SyncResult> {
    return this.begin(key, { requireExisting: true }, rememberKey);
  }

  /** Resumes syncing after a restart on a device that doesn't store the key. */
  async unlock(key: string): Promise<SyncResult> {
    try {
      const credentials = await deriveCredentials(key);
      if (credentials.vaultId !== this.establishedVaultId) {
        return {
          ok: false,
          message: 'That key belongs to a different synced copy than the one this device uses.',
        };
      }
      await this.activate(key);
    } catch (error) {
      return { ok: false, message: errorMessage(error) };
    }
    return this.sync();
  }

  /** Stops syncing on this device without a key; the synced copy stays and local data is untouched. */
  async leaveWithoutKey(): Promise<void> {
    await this.forget();
  }

  /** Deletes the key from this device's storage; syncing continues until the app is closed. */
  async forgetStoredKey(): Promise<void> {
    await this.db.call('forgetStoredSyncKey');
    this.keyStored.set(false);
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

  /** Settles a refused merge by letting one side win outright. */
  resolveConflict(choice: ConflictChoice): Promise<SyncResult> {
    return this.sync({ resolveConflict: choice });
  }

  sync(options: SyncOptions = {}): Promise<SyncResult> {
    if (this.inflight) {
      this.runAgain = true;
      return this.inflight;
    }
    const run = (async () => {
      let result: SyncResult;
      let runOptions = options;
      do {
        this.runAgain = false;
        result = await this.runOnce(runOptions);
        runOptions = {};
      } while (this.runAgain && result.ok);
      return result;
    })().finally(() => (this.inflight = null));
    this.inflight = run;
    return run;
  }

  private async begin(
    key: string,
    options: SyncOptions,
    rememberKey: boolean,
  ): Promise<SyncResult> {
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
    if (rememberKey) await this.db.call('setSyncKey', key);
    this.keyStored.set(rememberKey);
    return result;
  }

  private async lockIfKeyWasNotStored(): Promise<void> {
    this.establishedVaultId = await this.db.call('syncEstablishedVault');
    if (!this.establishedVaultId) return;
    this.status.set('locked');
    this.message.set('Enter your sync key to continue syncing on this device.');
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
    this.keyStored.set(false);
    this.clockOffsetMs.set(null);
    this.conflict.set(null);
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
      if (outcome.clockOffsetMs !== null) this.clockOffsetMs.set(outcome.clockOffsetMs);
      if (outcome.pulled) await this.store.refresh();
      this.lastSyncedAt.set(new Date().toISOString());
      this.message.set(null);
      this.conflict.set(null);
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
      if (this.status() === 'conflict') await this.describeConflict();
      return { ok: false, message };
    }
  }

  private async describeConflict(): Promise<void> {
    try {
      const synced = await fetchRemoteSnapshot(this.api!, this.credentials!);
      const local = await this.db.call('exportVault');
      this.conflict.set(synced ? diffVaults(local, synced, formatIsoDate) : null);
    } catch {
      this.conflict.set(null);
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
