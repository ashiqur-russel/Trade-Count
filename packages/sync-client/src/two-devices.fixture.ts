import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import { PortfolioDatabase } from '@trade-count/local-store';
import { deriveCredentials, generateSyncKey, type SyncCredentials } from '@trade-count/sync-crypto';
import { MemoryRateLimiter, MemoryVaultStore, handleVaultRequest } from '@trade-count/sync-server';
import { createFetchVaultApi, type VaultApi } from './vault-api.js';
import type { SyncDevice } from './sync-engine.js';

const sqlite3 = await sqlite3InitModule();

/** The real server handler on in-memory storage, reachable through a fetch-shaped function. */
export function createServer() {
  const store = new MemoryVaultStore();
  const deps = { store, rateLimiter: new MemoryRateLimiter(), rateLimitSalt: 'test' };
  const requests: string[] = [];
  const fetchServer: typeof fetch = async (input, init) => {
    const url = new URL(String(input), 'https://trade-count.test');
    requests.push(`${init?.method ?? 'GET'} ${url.pathname}`);
    return handleVaultRequest(new Request(url, init), url.pathname.split('/').pop()!, deps);
  };
  return { store, fetchServer, requests };
}

/** A device: its own SQLite database, with a clock the test controls, adapted for the sync engine. */
export function createDevice(startMinute = 0) {
  const sqlite = new sqlite3.oo1.DB(':memory:');
  let minute = startMinute;
  const store = new PortfolioDatabase(sqlite, { now: () => new Date(Date.UTC(2026, 9, 5, 10, minute)) });
  const device: SyncDevice = {
    exportVault: async () => store.exportVault(),
    syncWith: async (remote) => store.syncWith(JSON.parse(JSON.stringify(remote))),
  };
  return { sqlite, store, device, at: (m: number) => void (minute = m) };
}

export async function newCredentials(): Promise<SyncCredentials> {
  return deriveCredentials(await generateSyncKey());
}

export function apiFor(credentials: SyncCredentials, server: ReturnType<typeof createServer>): VaultApi {
  return createFetchVaultApi(credentials, { fetch: server.fetchServer });
}
