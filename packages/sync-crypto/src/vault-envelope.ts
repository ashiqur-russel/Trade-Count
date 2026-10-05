import { fromBase64Url, toBase64Url, utf8 } from './bytes.js';
import type { SyncCredentials } from './credentials.js';
import { gunzip, gzip } from './gzip.js';

/** What the server stores: ciphertext plus what is needed to decrypt it with the right key. */
export interface VaultEnvelope {
  format: 'trade-count-vault';
  version: 1;
  algorithm: 'AES-256-GCM';
  /** Absent on envelopes written before compression existed. */
  compression?: 'gzip';
  iv: string;
  ciphertext: string;
}

export class VaultDecryptError extends Error {
  constructor() {
    super("Couldn't decrypt the synced data. The sync key doesn't match, or the data was damaged.");
    this.name = 'VaultDecryptError';
  }
}

const IV_BYTES = 12;

/** The vault id is authenticated with the data, so ciphertext can't be moved into another vault. */
function additionalData(vaultId: string): Uint8Array<ArrayBuffer> {
  return utf8.encode(`trade-count-vault/v1/${vaultId}`);
}

export async function encryptVault(plaintext: string, credentials: SyncCredentials): Promise<VaultEnvelope> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: additionalData(credentials.vaultId) },
    credentials.encryptionKey,
    await gzip(utf8.encode(plaintext)),
  );
  return {
    format: 'trade-count-vault',
    version: 1,
    algorithm: 'AES-256-GCM',
    compression: 'gzip',
    iv: toBase64Url(iv),
    ciphertext: toBase64Url(new Uint8Array(ciphertext)),
  };
}

export async function decryptVault(envelope: unknown, credentials: SyncCredentials): Promise<string> {
  if (!isVaultEnvelope(envelope)) throw new VaultDecryptError();
  try {
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: fromBase64Url(envelope.iv), additionalData: additionalData(credentials.vaultId) },
      credentials.encryptionKey,
      fromBase64Url(envelope.ciphertext),
    );
    const bytes = new Uint8Array(plaintext);
    return utf8.decode(envelope.compression === 'gzip' ? await gunzip(bytes) : bytes);
  } catch {
    throw new VaultDecryptError();
  }
}

export function isVaultEnvelope(value: unknown): value is VaultEnvelope {
  const v = value as Partial<VaultEnvelope> | null;
  return (
    typeof v === 'object' &&
    v !== null &&
    v.format === 'trade-count-vault' &&
    v.version === 1 &&
    v.algorithm === 'AES-256-GCM' &&
    (v.compression === undefined || v.compression === 'gzip') &&
    typeof v.iv === 'string' &&
    typeof v.ciphertext === 'string'
  );
}
