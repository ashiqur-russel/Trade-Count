import type { VaultEnvelope } from '@trade-count/sync-crypto';

/** The HTTP contract between the app and the vault API. The server only ever handles ciphertext. */

export const VAULT_ID_PATTERN = /^[0-9a-f]{32}$/;
export const AUTH_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
export const MAX_ENVELOPE_BYTES = 1024 * 1024;

export interface VaultState {
  version: number;
  updatedAt: string;
  envelope: VaultEnvelope;
}

/** `baseVersion` is the version the device last saw (0 to create); a mismatch means another device wrote first. */
export interface PutVaultBody {
  baseVersion: number;
  envelope: VaultEnvelope;
}

export interface PutVaultResult {
  version: number;
}

export type ApiErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'NOT_FOUND'
  | 'METHOD_NOT_ALLOWED'
  | 'VERSION_CONFLICT'
  | 'TOO_LARGE'
  | 'RATE_LIMITED'
  | 'SERVER_ERROR';

export interface ApiError {
  error: ApiErrorCode;
  message: string;
  /** Present on VERSION_CONFLICT: the version stored on the server. */
  version?: number;
}
