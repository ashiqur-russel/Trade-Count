/** In-memory vault storage and rate limiting: used by tests and handy for local experiments. */
import type { RateLimiter, VaultRecord, VaultStore } from './vault-store.js';

export class MemoryVaultStore implements VaultStore {
  readonly vaults = new Map<string, VaultRecord>();

  async get(vaultId: string) {
    const record = this.vaults.get(vaultId);
    return record ? { ...record } : null;
  }

  async create(record: Omit<VaultRecord, 'version'>) {
    if (this.vaults.has(record.vaultId)) return false;
    this.vaults.set(record.vaultId, { ...record, version: 1 });
    return true;
  }

  async update(vaultId: string, expectedVersion: number, envelope: string, updatedAt: string) {
    const record = this.vaults.get(vaultId);
    if (!record || record.version !== expectedVersion) return false;
    this.vaults.set(vaultId, { ...record, version: record.version + 1, envelope, updatedAt });
    return true;
  }

  async delete(vaultId: string) {
    this.vaults.delete(vaultId);
  }
}

export class MemoryRateLimiter implements RateLimiter {
  readonly counts = new Map<string, number>();

  async consume(key: string, limit: number) {
    const count = (this.counts.get(key) ?? 0) + 1;
    this.counts.set(key, count);
    return count <= limit;
  }
}
