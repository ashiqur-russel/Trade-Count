import { describe, expect, it } from 'vitest';
import { fromBase64Url, toBase64Url } from './bytes.js';
import { deriveCredentials } from './credentials.js';
import { generateSyncKey } from './sync-key.js';
import { VaultDecryptError, decryptVault, encryptVault } from './vault-envelope.js';

const portfolio = JSON.stringify({ stocks: [{ id: 's1', name: 'Tesla Inc.' }], trades: [] });

describe('deriveCredentials', () => {
  it('derives the same vault id and token from the same key on every device', async () => {
    const key = await generateSyncKey();
    const [a, b] = await Promise.all([deriveCredentials(key), deriveCredentials(key.toLowerCase())]);

    expect(a.vaultId).toBe(b.vaultId);
    expect(a.authToken).toBe(b.authToken);
    expect(a.vaultId).toMatch(/^[0-9a-f]{32}$/);
  });

  it('keeps the vault id, token and encryption key independent of each other', async () => {
    const credentials = await deriveCredentials(await generateSyncKey());

    expect(credentials.authToken).not.toContain(credentials.vaultId);
    expect(credentials.encryptionKey.extractable).toBe(false);
    expect(credentials.encryptionKey.algorithm).toMatchObject({ name: 'AES-GCM', length: 256 });
  });
});

describe('encryptVault / decryptVault', () => {
  it('round-trips the portfolio and never puts the plaintext in the envelope', async () => {
    const credentials = await deriveCredentials(await generateSyncKey());
    const envelope = await encryptVault(portfolio, credentials);

    expect(JSON.stringify(envelope)).not.toContain('Tesla');
    expect(await decryptVault(envelope, credentials)).toBe(portfolio);
  });

  it('uses a fresh IV every time, so equal data never looks equal', async () => {
    const credentials = await deriveCredentials(await generateSyncKey());
    const [a, b] = await Promise.all([encryptVault(portfolio, credentials), encryptVault(portfolio, credentials)]);

    expect(a.iv).not.toBe(b.iv);
    expect(a.ciphertext).not.toBe(b.ciphertext);
  });

  it('refuses to decrypt with another sync key', async () => {
    const envelope = await encryptVault(portfolio, await deriveCredentials(await generateSyncKey()));

    await expect(decryptVault(envelope, await deriveCredentials(await generateSyncKey()))).rejects.toBeInstanceOf(
      VaultDecryptError,
    );
  });

  it('detects a single changed byte in the ciphertext', async () => {
    const credentials = await deriveCredentials(await generateSyncKey());
    const envelope = await encryptVault(portfolio, credentials);
    const bytes = fromBase64Url(envelope.ciphertext);
    bytes[0] = bytes[0]! ^ 1;

    await expect(decryptVault({ ...envelope, ciphertext: toBase64Url(bytes) }, credentials)).rejects.toBeInstanceOf(
      VaultDecryptError,
    );
  });

  it('refuses ciphertext moved into a different vault, even with the same encryption key', async () => {
    const credentials = await deriveCredentials(await generateSyncKey());
    const envelope = await encryptVault(portfolio, credentials);

    await expect(decryptVault(envelope, { ...credentials, vaultId: 'another-vault' })).rejects.toBeInstanceOf(
      VaultDecryptError,
    );
  });

  it('rejects anything that is not a vault envelope', async () => {
    const credentials = await deriveCredentials(await generateSyncKey());

    await expect(decryptVault({ hello: 'world' }, credentials)).rejects.toBeInstanceOf(VaultDecryptError);
    await expect(decryptVault({ format: 'trade-count-vault', version: 1, algorithm: 'AES-256-GCM', iv: '!!', ciphertext: '' }, credentials)).rejects.toBeInstanceOf(VaultDecryptError);
  });
});
