import { isVaultEnvelope } from '@trade-count/sync-crypto';
import { constantTimeEqual, sha256Hex } from './hashing.js';
import {
  AUTH_TOKEN_PATTERN,
  MAX_ENVELOPE_BYTES,
  VAULT_ID_PATTERN,
  type ApiError,
  type ApiErrorCode,
  type PutVaultBody,
  type PutVaultResult,
  type VaultState,
} from './vault-protocol.js';
import type { RateLimiter, VaultRecord, VaultStore } from './vault-store.js';

export interface VaultApiDeps {
  store: VaultStore;
  rateLimiter: RateLimiter;
  /** Secret that salts rate-limit keys, so stored keys can't be reversed into IP addresses. */
  rateLimitSalt: string;
  now?: () => Date;
}

/** Requests allowed per client per hour: plenty for syncing, little room for abuse. */
export const LIMITS = { requestsPerHour: 600, createsPerHour: 10 } as const;
const HOUR_SECONDS = 3600;

const STATUS: Record<ApiErrorCode, number> = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  VERSION_CONFLICT: 409,
  TOO_LARGE: 413,
  RATE_LIMITED: 429,
  SERVER_ERROR: 500,
};

const ALLOWED_METHODS = 'GET, PUT, DELETE';

/**
 * Handles one request for /api/vaults/:vaultId. Responses are never cached and carry no CORS headers,
 * so only the app on the same origin can call the API.
 */
export async function handleVaultRequest(request: Request, vaultId: string, deps: VaultApiDeps): Promise<Response> {
  try {
    if (!VAULT_ID_PATTERN.test(vaultId)) return fail('BAD_REQUEST', 'That is not a valid vault id.');
    if (!ALLOWED_METHODS.split(', ').includes(request.method)) {
      return fail('METHOD_NOT_ALLOWED', `Use ${ALLOWED_METHODS}.`, { Allow: ALLOWED_METHODS });
    }

    const limited = await checkRateLimit(request, deps);
    if (limited) return limited;

    const token = bearerToken(request);
    if (!token) return fail('UNAUTHORIZED', 'Missing or malformed sync credentials.');

    switch (request.method) {
      case 'GET':
        return await getVault(vaultId, token, deps);
      case 'PUT':
        return await putVault(request, vaultId, token, deps);
      default:
        return await deleteVault(vaultId, token, deps);
    }
  } catch (error) {
    console.error('Vault API error', error instanceof Error ? error.message : 'unknown');
    return fail('SERVER_ERROR', 'Something went wrong on the server. Try again in a moment.');
  }
}

async function getVault(vaultId: string, token: string, deps: VaultApiDeps): Promise<Response> {
  const record = await deps.store.get(vaultId);
  if (!record) return fail('NOT_FOUND', 'No synced data exists for this key yet.');
  if (!(await isOwner(record, token))) return fail('UNAUTHORIZED', "These sync credentials don't match.");

  const state: VaultState = { version: record.version, updatedAt: record.updatedAt, envelope: JSON.parse(record.envelope) };
  return json(state, 200);
}

async function putVault(request: Request, vaultId: string, token: string, deps: VaultApiDeps): Promise<Response> {
  const body = await readBody(request);
  if (body instanceof Response) return body;

  const now = (deps.now ?? (() => new Date()))().toISOString();
  const envelope = JSON.stringify(body.envelope);
  const record = await deps.store.get(vaultId);

  if (!record) {
    if (body.baseVersion !== 0) return fail('NOT_FOUND', 'No synced data exists for this key yet.');
    const allowed = await deps.rateLimiter.consume(
      `create:${await clientKey(request, deps)}`,
      LIMITS.createsPerHour,
      HOUR_SECONDS,
    );
    if (!allowed) return fail('RATE_LIMITED', 'Too many new vaults from this connection. Try again later.');

    const created = await deps.store.create({ vaultId, tokenHash: await sha256Hex(token), envelope, updatedAt: now });
    if (created) return json<PutVaultResult>({ version: 1 }, 201);
    return fail('VERSION_CONFLICT', 'Another device created this vault first. Sync again.', {}, 1);
  }

  if (!(await isOwner(record, token))) return fail('UNAUTHORIZED', "These sync credentials don't match.");
  if (body.baseVersion !== record.version) return versionConflict(record.version);

  const updated = await deps.store.update(vaultId, record.version, envelope, now);
  if (!updated) return versionConflict((await deps.store.get(vaultId))?.version ?? record.version + 1);
  return json<PutVaultResult>({ version: record.version + 1 }, 200);
}

async function deleteVault(vaultId: string, token: string, deps: VaultApiDeps): Promise<Response> {
  const record = await deps.store.get(vaultId);
  if (!record) return new Response(null, { status: 204, headers: baseHeaders() });
  if (!(await isOwner(record, token))) return fail('UNAUTHORIZED', "These sync credentials don't match.");

  await deps.store.delete(vaultId);
  return new Response(null, { status: 204, headers: baseHeaders() });
}

async function readBody(request: Request): Promise<PutVaultBody | Response> {
  const declared = Number(request.headers.get('content-length') ?? 0);
  if (declared > MAX_ENVELOPE_BYTES) return fail('TOO_LARGE', 'The synced data is too large.');

  const text = await request.text();
  if (new TextEncoder().encode(text).length > MAX_ENVELOPE_BYTES) return fail('TOO_LARGE', 'The synced data is too large.');

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return fail('BAD_REQUEST', 'The request body is not valid JSON.');
  }
  const body = parsed as Partial<PutVaultBody> | null;
  if (typeof body !== 'object' || body === null || !Number.isInteger(body.baseVersion) || body.baseVersion! < 0) {
    return fail('BAD_REQUEST', 'baseVersion must be a whole number, 0 or more.');
  }
  if (!isVaultEnvelope(body.envelope)) return fail('BAD_REQUEST', 'The body does not hold an encrypted vault.');
  return { baseVersion: body.baseVersion!, envelope: body.envelope };
}

async function checkRateLimit(request: Request, deps: VaultApiDeps): Promise<Response | null> {
  const allowed = await deps.rateLimiter.consume(
    `any:${await clientKey(request, deps)}`,
    LIMITS.requestsPerHour,
    HOUR_SECONDS,
  );
  return allowed ? null : fail('RATE_LIMITED', 'Too many requests. Try again in a few minutes.', { 'Retry-After': '300' });
}

/** A salted hash of the client address; the address itself is never stored or logged. */
async function clientKey(request: Request, deps: VaultApiDeps): Promise<string> {
  const address = request.headers.get('cf-connecting-ip') ?? 'unknown';
  return sha256Hex(`${deps.rateLimitSalt}:${address}`);
}

function bearerToken(request: Request): string | null {
  const match = /^Bearer (\S+)$/.exec(request.headers.get('authorization') ?? '');
  return match && AUTH_TOKEN_PATTERN.test(match[1]!) ? match[1]! : null;
}

async function isOwner(record: VaultRecord, token: string): Promise<boolean> {
  return constantTimeEqual(record.tokenHash, await sha256Hex(token));
}

function versionConflict(version: number): Response {
  return fail('VERSION_CONFLICT', 'Another device synced first. Merge its data, then try again.', {}, version);
}

function baseHeaders(extra: Record<string, string> = {}): Headers {
  return new Headers({ 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...extra });
}

function json<T>(body: T, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: baseHeaders({ 'Content-Type': 'application/json' }) });
}

function fail(code: ApiErrorCode, message: string, headers: Record<string, string> = {}, version?: number): Response {
  const body: ApiError = { error: code, message, ...(version === undefined ? {} : { version }) };
  return new Response(JSON.stringify(body), {
    status: STATUS[code],
    headers: baseHeaders({ 'Content-Type': 'application/json', ...headers }),
  });
}
