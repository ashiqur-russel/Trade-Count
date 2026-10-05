import type { RateLimiter, VaultRecord, VaultStore } from './vault-store.js';

/** The slice of Cloudflare's D1 API used here, so tests can run the same SQL on plain SQLite. */
export interface D1Like {
  prepare(sql: string): D1StatementLike;
}

export interface D1StatementLike {
  bind(...values: unknown[]): D1StatementLike;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  run(): Promise<{ meta: { changes: number } }>;
}

interface VaultRow {
  vault_id: string;
  token_hash: string;
  version: number;
  envelope: string;
  updated_at: string;
  last_seen_at: string;
}

/** Rows written before last_seen_at existed hold '' and count as last active when they were last updated. */
const LAST_ACTIVE = "COALESCE(NULLIF(last_seen_at, ''), updated_at)";

export function createD1VaultStore(db: D1Like): VaultStore {
  return {
    async get(vaultId) {
      const row = await db
        .prepare('SELECT vault_id, token_hash, version, envelope, updated_at, last_seen_at FROM vaults WHERE vault_id = ?')
        .bind(vaultId)
        .first<VaultRow>();
      return row ? toRecord(row) : null;
    },

    async create(record) {
      const result = await db
        .prepare(
          'INSERT INTO vaults (vault_id, token_hash, version, envelope, updated_at, last_seen_at) VALUES (?, ?, 1, ?, ?, ?) ON CONFLICT (vault_id) DO NOTHING',
        )
        .bind(record.vaultId, record.tokenHash, record.envelope, record.updatedAt, record.lastSeenAt)
        .run();
      return result.meta.changes === 1;
    },

    async update(vaultId, expectedVersion, envelope, updatedAt) {
      const result = await db
        .prepare('UPDATE vaults SET version = version + 1, envelope = ?, updated_at = ?, last_seen_at = ? WHERE vault_id = ? AND version = ?')
        .bind(envelope, updatedAt, updatedAt, vaultId, expectedVersion)
        .run();
      return result.meta.changes === 1;
    },

    async delete(vaultId) {
      await db.prepare('DELETE FROM vaults WHERE vault_id = ?').bind(vaultId).run();
    },

    async touch(vaultId, seenAt) {
      await db.prepare('UPDATE vaults SET last_seen_at = ? WHERE vault_id = ?').bind(seenAt, vaultId).run();
    },

    async usedBytes() {
      const row = await db.prepare('SELECT COALESCE(SUM(length(envelope)), 0) AS bytes FROM vaults').first<{ bytes: number }>();
      return row?.bytes ?? 0;
    },

    async deleteStale(neverResyncedBefore, inactiveBefore) {
      const result = await db
        .prepare(`DELETE FROM vaults WHERE (version = 1 AND ${LAST_ACTIVE} < ?) OR ${LAST_ACTIVE} < ?`)
        .bind(neverResyncedBefore, inactiveBefore)
        .run();
      return result.meta.changes;
    },
  };
}

export function createD1RateLimiter(db: D1Like, now: () => number = () => Date.now()): RateLimiter {
  return {
    async consume(key, limit, windowSeconds) {
      const windowStart = Math.floor(now() / 1000 / windowSeconds) * windowSeconds;
      const row = await db
        .prepare(
          'INSERT INTO rate_limits (key, window_start, count) VALUES (?, ?, 1) ON CONFLICT (key, window_start) DO UPDATE SET count = count + 1 RETURNING count',
        )
        .bind(key, windowStart)
        .first<{ count: number }>();
      if (row?.count === 1) {
        await db.prepare('DELETE FROM rate_limits WHERE window_start < ?').bind(windowStart - 2 * windowSeconds).run();
      }
      return (row?.count ?? 1) <= limit;
    },
  };
}

function toRecord(row: VaultRow): VaultRecord {
  return {
    vaultId: row.vault_id,
    tokenHash: row.token_hash,
    version: row.version,
    envelope: row.envelope,
    updatedAt: row.updated_at,
    lastSeenAt: row.last_seen_at,
  };
}
