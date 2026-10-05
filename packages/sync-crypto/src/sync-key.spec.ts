import { describe, expect, it } from 'vitest';
import { SyncKeyError, generateSyncKey, parseSyncKey } from './sync-key.js';

describe('generateSyncKey / parseSyncKey', () => {
  it('writes 8 groups of 4 unambiguous characters', async () => {
    const key = await generateSyncKey();

    expect(key).toMatch(/^[0-9A-HJKMNP-TV-Z]{4}(-[0-9A-HJKMNP-TV-Z]{4}){7}$/);
  });

  it('gives a different 128-bit secret every time', async () => {
    const keys = await Promise.all(Array.from({ length: 50 }, generateSyncKey));

    expect(new Set(keys).size).toBe(50);
    expect((await parseSyncKey(keys[0]!)).length).toBe(16);
  });

  it('accepts the key typed in lowercase, without dashes or with look-alike letters', async () => {
    const key = await generateSyncKey();
    const secret = await parseSyncKey(key);
    const sloppy = key.toLowerCase().replaceAll('-', ' ').replaceAll('0', 'o').replaceAll('1', 'l');

    expect(await parseSyncKey(sloppy)).toEqual(secret);
  });

  it('catches a single mistyped character with the checksum', async () => {
    const key = await generateSyncKey();
    const typo = (key[0] === 'A' ? 'B' : 'A') + key.slice(1);

    await expect(parseSyncKey(typo)).rejects.toThrow('This sync key has a typo');
  });

  it('rejects text that is not shaped like a sync key', async () => {
    await expect(parseSyncKey('hello')).rejects.toBeInstanceOf(SyncKeyError);
    await expect(parseSyncKey('UUUU-UUUU-UUUU-UUUU-UUUU-UUUU-UUUU-UUUU')).rejects.toThrow('32 letters and digits');
  });
});
