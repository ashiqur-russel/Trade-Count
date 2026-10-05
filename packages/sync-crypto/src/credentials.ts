import { toBase64Url, toHex, utf8 } from './bytes.js';
import { parseSyncKey } from './sync-key.js';

/** Everything a device derives from the sync key. Only vaultId and authToken are ever sent to the server. */
export interface SyncCredentials {
  /** Names the vault on the server. */
  vaultId: string;
  /** Proves ownership of the vault; the server stores only its SHA-256. */
  authToken: string;
  /** AES-256-GCM key for the vault contents; non-extractable, never leaves the device. */
  encryptionKey: CryptoKey;
}

const INFO = {
  vaultId: 'trade-count/vault-id/v1',
  authToken: 'trade-count/auth-token/v1',
  encryption: 'trade-count/encryption/v1',
} as const;

export async function deriveCredentials(syncKey: string): Promise<SyncCredentials> {
  const secret = await parseSyncKey(syncKey);
  const master = await crypto.subtle.importKey('raw', secret, 'HKDF', false, ['deriveBits', 'deriveKey']);
  const hkdf = (info: string) => ({ name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(32), info: utf8.encode(info) });

  const [vaultIdBits, authTokenBits, encryptionKey] = await Promise.all([
    crypto.subtle.deriveBits(hkdf(INFO.vaultId), master, 128),
    crypto.subtle.deriveBits(hkdf(INFO.authToken), master, 256),
    crypto.subtle.deriveKey(hkdf(INFO.encryption), master, { name: 'AES-GCM', length: 256 }, false, [
      'encrypt',
      'decrypt',
    ]),
  ]);

  return {
    vaultId: toHex(new Uint8Array(vaultIdBits)),
    authToken: toBase64Url(new Uint8Array(authTokenBits)),
    encryptionKey,
  };
}
