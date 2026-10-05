import { VAULT_DATA_FORMAT, VAULT_DATA_VERSION, type VaultSnapshot } from './vault-snapshot.js';

/** Which side wins when two devices' changes can't be merged. */
export type ConflictChoice = 'keep-this-device' | 'use-synced-copy';

export const EMPTY_SNAPSHOT: VaultSnapshot = {
  format: VAULT_DATA_FORMAT,
  version: VAULT_DATA_VERSION,
  stocks: [],
  trades: [],
  deletions: [],
};
