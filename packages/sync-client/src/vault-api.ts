import type { SyncCredentials, VaultEnvelope } from '@trade-count/sync-crypto';
import type { ApiError, PutVaultBody, PutVaultResult, VaultState } from '@trade-count/sync-server';
import {
  SyncAuthError,
  SyncNetworkError,
  SyncRateLimitedError,
  SyncTooLargeError,
  SyncUnavailableError,
  VaultNotFoundError,
} from './sync-errors.js';

export type PutOutcome = { ok: true; version: number } | { ok: false; conflictVersion: number };

export interface VaultRead {
  /** Null when no vault exists yet. */
  vault: VaultState | null;
  /** Server time minus this device's clock in milliseconds, measured from the response; null if unknown. */
  clockOffsetMs: number | null;
}

/** One vault on the server, already authenticated for a specific sync key. */
export interface VaultApi {
  get(): Promise<VaultRead>;
  put(baseVersion: number, envelope: VaultEnvelope): Promise<PutOutcome>;
  delete(): Promise<void>;
}

export interface FetchVaultApiOptions {
  baseUrl?: string;
  fetch?: typeof fetch;
  /** The device clock in milliseconds; replaceable in tests. */
  now?: () => number;
}

export function createFetchVaultApi(credentials: SyncCredentials, options: FetchVaultApiOptions = {}): VaultApi {
  const url = `${options.baseUrl ?? ''}/api/vaults/${credentials.vaultId}`;
  const send = options.fetch ?? ((input, init) => fetch(input, init));
  const now = options.now ?? Date.now;

  async function request(
    method: string,
    body?: PutVaultBody,
  ): Promise<{ status: number; json: unknown; clockOffsetMs: number | null }> {
    let response: Response;
    const sentAt = now();
    try {
      response = await send(url, {
        method,
        headers: {
          authorization: `Bearer ${credentials.authToken}`,
          ...(body ? { 'content-type': 'application/json' } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        cache: 'no-store',
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
      });
    } catch {
      throw new SyncNetworkError();
    }
    const clockOffsetMs = measureClockOffset(response.headers.get('date'), sentAt, now());
    if (response.status === 204) return { status: 204, json: null, clockOffsetMs };
    // Anything that isn't the API's JSON (an HTML error page, a dev server without the API) counts as unavailable.
    if (!response.headers.get('content-type')?.includes('application/json')) throw new SyncUnavailableError();
    return { status: response.status, json: await response.json().catch(() => null), clockOffsetMs };
  }

  function unexpected(status: number): never {
    if (status === 401) throw new SyncAuthError();
    if (status === 429) throw new SyncRateLimitedError();
    if (status === 413) throw new SyncTooLargeError();
    throw new SyncUnavailableError();
  }

  return {
    async get() {
      const { status, json, clockOffsetMs } = await request('GET');
      if (status === 200) return { vault: json as VaultState, clockOffsetMs };
      if (status === 404) return { vault: null, clockOffsetMs };
      return unexpected(status);
    },

    async put(baseVersion, envelope) {
      const { status, json } = await request('PUT', { baseVersion, envelope });
      if (status === 200 || status === 201) return { ok: true, version: (json as PutVaultResult).version };
      if (status === 409) return { ok: false, conflictVersion: (json as ApiError).version ?? baseVersion + 1 };
      if (status === 404) throw new VaultNotFoundError();
      return unexpected(status);
    },

    async delete() {
      const { status } = await request('DELETE');
      if (status !== 204) unexpected(status);
    },
  };
}

/**
 * Server time minus device time. The Date header has one-second resolution, so the true server time lies
 * in the second it names; its middle is used, and the device time is taken halfway through the request.
 */
function measureClockOffset(dateHeader: string | null, sentAt: number, receivedAt: number): number | null {
  const serverTime = dateHeader ? Date.parse(dateHeader) : Number.NaN;
  if (Number.isNaN(serverTime)) return null;
  return Math.round(serverTime + 500 - (sentAt + receivedAt) / 2);
}
