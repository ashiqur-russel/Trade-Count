import { decodeBase32, encodeBase32 } from './base32.js';
import { bytesEqual, concatBytes } from './bytes.js';

const KEY_BYTES = 16;
const CHECK_BYTES = 4;
const GROUP = 4;

export class SyncKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SyncKeyError';
  }
}

/** A new random sync key, e.g. `7K2M-…` (8 groups of 4): 128-bit secret plus a typo-catching checksum. */
export async function generateSyncKey(): Promise<string> {
  const secret = crypto.getRandomValues(new Uint8Array(KEY_BYTES));
  const encoded = encodeBase32(concatBytes(secret, await checksum(secret)));
  return encoded.match(new RegExp(`.{1,${GROUP}}`, 'g'))!.join('-');
}

/** The 128-bit secret inside a typed sync key; ignores spaces, dashes and case. */
export async function parseSyncKey(input: string): Promise<Uint8Array<ArrayBuffer>> {
  const compact = input.replace(/[\s-]/g, '');
  const bytes = compact.length === 32 ? decodeBase32(compact, KEY_BYTES + CHECK_BYTES) : null;
  if (!bytes) throw new SyncKeyError('A sync key has 32 letters and digits, in 8 groups of 4.');

  const secret = bytes.slice(0, KEY_BYTES);
  if (!bytesEqual(bytes.slice(KEY_BYTES), await checksum(secret))) {
    throw new SyncKeyError('This sync key has a typo. Check each group of 4 characters.');
  }
  return secret;
}

async function checksum(secret: Uint8Array<ArrayBuffer>): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', secret)).slice(0, CHECK_BYTES);
}
