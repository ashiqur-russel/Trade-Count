/** Crockford base32: no I, L, O or U, so keys are easy to read aloud and type. */
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

export function encodeBase32(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

/** Decodes `byteLength` bytes; forgives case and the look-alikes O→0, I/L→1. Returns null on bad characters. */
export function decodeBase32(text: string, byteLength: number): Uint8Array<ArrayBuffer> | null {
  const normalised = text.toUpperCase().replaceAll('O', '0').replace(/[IL]/g, '1');
  const out = new Uint8Array(byteLength);
  let bits = 0;
  let value = 0;
  let index = 0;
  for (const char of normalised) {
    const digit = ALPHABET.indexOf(char);
    if (digit === -1) return null;
    value = ((value << 5) | digit) & 0xffff;
    bits += 5;
    if (bits >= 8) {
      if (index >= byteLength) return null;
      out[index++] = (value >>> (bits - 8)) & 0xff;
      bits -= 8;
    }
  }
  return index === byteLength ? out : null;
}
