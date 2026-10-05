import { parseVaultSnapshot, type ConflictChoice, type VaultSnapshot } from '@trade-count/local-store';
import { decryptVault, encryptVault, type SyncCredentials, type VaultEnvelope } from '@trade-count/sync-crypto';
import { fingerprint } from './fingerprint.js';
import { SyncBusyError, VaultGoneError, VaultNotFoundError } from './sync-errors.js';
import type { VaultApi } from './vault-api.js';

/** The local database as the engine sees it. */
export interface SyncDevice {
  exportVault(): Promise<VaultSnapshot>;
  /** Told how far this device's clock is from the server's, before anything is merged. */
  setClockOffset?(offsetMs: number): Promise<void> | void;
  /** Merges remote data into local storage and returns the merged result; throws if the merge is refused. */
  syncWith(remote: unknown): Promise<VaultSnapshot>;
  /** Lets one side win outright after a refused merge and returns the result to upload. */
  resolveConflict(remote: unknown, choice: ConflictChoice): Promise<VaultSnapshot>;
}

export interface SyncOutcome {
  /** This device received changes from the server. */
  pulled: boolean;
  /** This device uploaded a new version. */
  pushed: boolean;
  version: number;
  /** Server time minus this device's clock, from the latest response; null if the server sent no time. */
  clockOffsetMs: number | null;
}

export interface SyncOptions {
  /** Fail instead of creating the vault; used when joining with a key typed on another device. */
  requireExisting?: boolean;
  /**
   * This device has synced with this vault before, so a missing vault means it was deleted elsewhere.
   * The engine then refuses to create a new one; only an explicit "turn on sync" may do that.
   */
  wasSynced?: boolean;
  /** Settles a refused merge by letting one side win, instead of merging. */
  resolveConflict?: ConflictChoice;
}

const MAX_ATTEMPTS = 4;

/**
 * One full sync: fetch the encrypted vault, merge it into local data, and upload the result if it
 * differs from the server's copy. When another device saved first, the whole round repeats.
 */
export async function syncOnce(
  device: SyncDevice,
  api: VaultApi,
  credentials: SyncCredentials,
  options: SyncOptions = {},
): Promise<SyncOutcome> {
  let pulled = false;
  let clockOffsetMs: number | null = null;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const { vault: remote, clockOffsetMs: offset } = await api.get();
    if (offset !== null) {
      clockOffsetMs = offset;
      await device.setClockOffset?.(offset);
    }
    if (!remote && options.wasSynced) throw new VaultGoneError();
    if (!remote && options.requireExisting) throw new VaultNotFoundError();

    const before = fingerprint(await device.exportVault());
    let merged: VaultSnapshot;
    let baseVersion = 0;

    if (remote) {
      const remoteSnapshot = parseVaultSnapshot(JSON.parse(await decryptVault(remote.envelope, credentials)));
      merged = options.resolveConflict
        ? await device.resolveConflict(remoteSnapshot, options.resolveConflict)
        : await device.syncWith(remoteSnapshot);
      pulled ||= fingerprint(merged) !== before;
      if (fingerprint(merged) === fingerprint(remoteSnapshot)) return { pulled, pushed: false, version: remote.version, clockOffsetMs };
      baseVersion = remote.version;
    } else {
      merged = await device.exportVault();
    }

    const result = await putVault(api, baseVersion, await encryptVault(JSON.stringify(merged), credentials));
    if (result.ok) return { pulled, pushed: true, version: result.version, clockOffsetMs };
  }
  throw new SyncBusyError();
}

/** A vault that disappears between reading and writing was deleted by its owner, not lost. */
async function putVault(api: VaultApi, baseVersion: number, envelope: VaultEnvelope) {
  try {
    return await api.put(baseVersion, envelope);
  } catch (error) {
    if (error instanceof VaultNotFoundError && baseVersion > 0) throw new VaultGoneError();
    throw error;
  }
}

/** Deletes the encrypted copy from the server; local data is untouched. */
export function deleteRemoteVault(api: VaultApi): Promise<void> {
  return api.delete();
}
