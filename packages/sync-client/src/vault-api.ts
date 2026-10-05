import type { SyncCredentials, VaultEnvelope } from '@trade-count/sync-crypto';
import type { ApiError, PutVaultBody, PutVaultResult, VaultState } from '@trade-count/sync-server';
import {
  SyncAuthError,
  SyncNetworkError,
  SyncRateLimitedError,
  SyncUnavailableError,
  VaultNotFoundError,
} from './sync-errors.js';

export type PutOutcome = { ok: true; version: number } | { ok: false; conflictVersion: number };

/** One vault on the server, already authenticated for a specific sync key. */
export interface VaultApi {
  /** Resolves null when no vault exists yet. */
  get(): Promise<VaultState | null>;
  put(baseVersion: number, envelope: VaultEnvelope): Promise<PutOutcome>;
  delete(): Promise<void>;
}

export interface FetchVaultApiOptions {
  baseUrl?: string;
  fetch?: typeof fetch;
}

export function createFetchVaultApi(credentials: SyncCredentials, options: FetchVaultApiOptions = {}): VaultApi {
  const url = `${options.baseUrl ?? ''}/api/vaults/${credentials.vaultId}`;
  const send = options.fetch ?? ((input, init) => fetch(input, init));

  async function request(method: string, body?: PutVaultBody): Promise<{ status: number; json: unknown }> {
    let response: Response;
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
    if (response.status === 204) return { status: 204, json: null };
    // Anything that isn't the API's JSON (an HTML error page, a dev server without the API) counts as unavailable.
    if (!response.headers.get('content-type')?.includes('application/json')) throw new SyncUnavailableError();
    return { status: response.status, json: await response.json().catch(() => null) };
  }

  function unexpected(status: number): never {
    if (status === 401) throw new SyncAuthError();
    if (status === 429) throw new SyncRateLimitedError();
    throw new SyncUnavailableError();
  }

  return {
    async get() {
      const { status, json } = await request('GET');
      if (status === 200) return json as VaultState;
      if (status === 404) return null;
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
