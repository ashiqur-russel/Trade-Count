import { describe, expect, it } from 'vitest';
import { decodeBase32, encodeBase32 } from './base32.js';

describe('encodeBase32 / decodeBase32', () => {
  it('round-trips arbitrary bytes', () => {
    const bytes = Uint8Array.from({ length: 20 }, (_, i) => (i * 37) % 256);

    expect(decodeBase32(encodeBase32(bytes), 20)).toEqual(bytes);
  });

  it('returns null for characters outside the alphabet or the wrong length', () => {
    expect(decodeBase32('UUUU', 2)).toBeNull();
    expect(decodeBase32('00', 4)).toBeNull();
  });
});
