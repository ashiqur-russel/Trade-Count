import { parseVaultSnapshot, type VaultSnapshot } from '@trade-count/local-store';
import { decryptVault, type SyncCredentials } from '@trade-count/sync-crypto';
import type { VaultApi } from './vault-api.js';

/** The synced copy as plain data, without merging it into anything; null when no copy exists. */
export async function fetchRemoteSnapshot(api: VaultApi, credentials: SyncCredentials): Promise<VaultSnapshot | null> {
  const { vault } = await api.get();
  if (!vault) return null;
  return parseVaultSnapshot(JSON.parse(await decryptVault(vault.envelope, credentials)));
}
