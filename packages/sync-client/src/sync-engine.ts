import { parseVaultSnapshot, type VaultSnapshot } from '@trade-count/local-store';
import { decryptVault, encryptVault, type SyncCredentials } from '@trade-count/sync-crypto';
import { fingerprint } from './fingerprint.js';
import { SyncBusyError, VaultNotFoundError } from './sync-errors.js';
import type { VaultApi } from './vault-api.js';

/** The local database as the engine sees it. */
export interface SyncDevice {
  exportVault(): Promise<VaultSnapshot>;
  /** Merges remote data into local storage and returns the merged result; throws if the merge is refused. */
  syncWith(remote: unknown): Promise<VaultSnapshot>;
}

export interface SyncOutcome {
  /** This device received changes from the server. */
  pulled: boolean;
  /** This device uploaded a new version. */
  pushed: boolean;
  version: number;
}

export interface SyncOptions {
  /** Fail instead of creating the vault; used when joining with a key typed on another device. */
  requireExisting?: boolean;
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

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const remote = await api.get();
    if (!remote && options.requireExisting) throw new VaultNotFoundError();

    const before = fingerprint(await device.exportVault());
    let merged: VaultSnapshot;
    let baseVersion = 0;

    if (remote) {
      const remoteSnapshot = parseVaultSnapshot(JSON.parse(await decryptVault(remote.envelope, credentials)));
      merged = await device.syncWith(remoteSnapshot);
      pulled ||= fingerprint(merged) !== before;
      if (fingerprint(merged) === fingerprint(remoteSnapshot)) return { pulled, pushed: false, version: remote.version };
      baseVersion = remote.version;
    } else {
      merged = await device.exportVault();
    }

    const result = await api.put(baseVersion, await encryptVault(JSON.stringify(merged), credentials));
    if (result.ok) return { pulled, pushed: true, version: result.version };
  }
  throw new SyncBusyError();
}

/** Deletes the encrypted copy from the server; local data is untouched. */
export function deleteRemoteVault(api: VaultApi): Promise<void> {
  return api.delete();
}
