import sqlite3InitModule from "@sqlite.org/sqlite-wasm";
import { PortfolioDatabase } from "@trade-count/local-store";
import {
  deriveCredentials,
  generateSyncKey,
  type SyncCredentials,
} from "@trade-count/sync-crypto";
import {
  MemoryRateLimiter,
  MemoryVaultStore,
  handleVaultRequest,
} from "@trade-count/sync-server";
import { createFetchVaultApi, type VaultApi } from "./vault-api.js";
import type { SyncDevice } from "./sync-engine.js";

const sqlite3 = await sqlite3InitModule();

/** The real server handler on in-memory storage, reachable through a fetch-shaped function. */
export function createServer() {
  const store = new MemoryVaultStore();
  const deps = {
    store,
    requestLimiter: new MemoryRateLimiter(),
    writeLimiter: new MemoryRateLimiter(),
    rateLimitSalt: "test",
  };
  const requests: string[] = [];
  /** The server's own clock; when set, responses carry a Date header like Cloudflare's do. */
  let serverNow: number | null = null;
  const fetchServer: typeof fetch = async (input, init) => {
    const url = new URL(String(input), "https://trade-count.test");
    requests.push(`${init?.method ?? "GET"} ${url.pathname}`);
    const response = await handleVaultRequest(
      new Request(url, init),
      url.pathname.split("/").pop()!,
      deps,
    );
    if (serverNow !== null)
      response.headers.set("Date", new Date(serverNow).toUTCString());
    return response;
  };
  /** Real time, as minutes after 10:00 on 5 Oct 2026; the clock the devices are measured against. */
  const setRealMinute = (minute: number) =>
    void (serverNow = Date.UTC(2026, 9, 5, 10, minute));
  return { store, fetchServer, requests, setRealMinute };
}

/** A device: its own SQLite database, with a clock the test controls, adapted for the sync engine. */
export function createDevice(startMinute = 0) {
  const sqlite = new sqlite3.oo1.DB(":memory:");
  let minute = startMinute;
  const store = new PortfolioDatabase(sqlite, {
    now: () => new Date(Date.UTC(2026, 9, 5, 10, minute)),
  });
  const device: SyncDevice = {
    exportVault: async () => store.exportVault(),
    syncWith: async (remote) =>
      store.syncWith(JSON.parse(JSON.stringify(remote))),
    resolveConflict: async (remote, choice) =>
      store.resolveConflict(JSON.parse(JSON.stringify(remote)), choice),
    setClockOffset: async (offsetMs) => store.setClockOffset(offsetMs),
  };
  return {
    sqlite,
    store,
    device,
    at: (m: number) => void (minute = m),
    /** This device's own (possibly wrong) clock in milliseconds. */
    now: () => Date.UTC(2026, 9, 5, 10, minute),
  };
}

export async function newCredentials(): Promise<SyncCredentials> {
  return deriveCredentials(await generateSyncKey());
}

/** The vault API for one device; the device's clock is what the server's time is measured against. */
export function apiFor(
  credentials: SyncCredentials,
  server: ReturnType<typeof createServer>,
  device?: ReturnType<typeof createDevice>,
): VaultApi {
  return createFetchVaultApi(credentials, {
    fetch: server.fetchServer,
    now: device?.now,
  });
}
