export interface VaultRecord {
  vaultId: string;
  /** SHA-256 (hex) of the auth token; the token itself is never stored. */
  tokenHash: string;
  version: number;
  /** The VaultEnvelope as JSON text. */
  envelope: string;
  updatedAt: string;
}

/** Where vaults live; implemented over Cloudflare D1 in production and in memory in tests. */
export interface VaultStore {
  get(vaultId: string): Promise<VaultRecord | null>;
  /** Creates version 1. Resolves false when the vault already exists. */
  create(record: Omit<VaultRecord, 'version'>): Promise<boolean>;
  /** Replaces the envelope only if the stored version is still `expectedVersion`. */
  update(vaultId: string, expectedVersion: number, envelope: string, updatedAt: string): Promise<boolean>;
  delete(vaultId: string): Promise<void>;
}

/** Counts events per key and window; keys are salted hashes, never raw IP addresses. */
export interface RateLimiter {
  /** Records one event and resolves false once `limit` events have already happened in the current window. */
  consume(key: string, limit: number, windowSeconds: number): Promise<boolean>;
}
