import { Injectable, inject, signal } from '@angular/core';
import {
  SyncKeyError,
  VaultDecryptError,
  decryptVault,
  deriveCredentials,
} from '@trade-count/sync-crypto';
import { InsightsBundleError, parseInsightsBundle, type InsightsBundle } from './insights-bundle';
import { InsightsKeyStore } from './insights-key-store';

const VAULT_URL = '/insights.vault';

export type InsightsVaultState =
  | { status: 'locked' }
  | { status: 'opening' }
  | { status: 'open'; bundle: InsightsBundle }
  | { status: 'failed'; message: string };

/** The encrypted notes edition shipped with the app, opened in the browser with the holder's key. */
@Injectable({ providedIn: 'root' })
export class InsightsVault {
  private readonly keys = inject(InsightsKeyStore);
  readonly state = signal<InsightsVaultState>({ status: 'locked' });

  /** Opens with the remembered key, if this device has one. */
  async openWithStoredKey(): Promise<void> {
    const key = this.keys.read();
    if (key && this.state().status === 'locked') await this.unlock(key, true);
  }

  async unlock(key: string, remember: boolean): Promise<void> {
    this.state.set({ status: 'opening' });
    try {
      const bundle = await openEdition(key);
      if (remember) this.keys.remember(key);
      this.state.set({ status: 'open', bundle });
    } catch (error) {
      this.state.set({ status: 'failed', message: messageFor(error) });
    }
  }

  forget(): void {
    this.keys.forget();
    this.state.set({ status: 'locked' });
  }
}

class NoEditionError extends Error {}

async function openEdition(key: string): Promise<InsightsBundle> {
  const credentials = await deriveCredentials(key);
  // The service worker never caches an edition, so the request skips it and goes straight to the network.
  const response = await fetch(VAULT_URL, {
    cache: 'no-cache',
    headers: { 'ngsw-bypass': 'true' },
  });
  // Pages answers unknown paths with the app shell, so anything but an envelope means "none published".
  const envelope: unknown = response.ok ? await response.json().catch(() => null) : null;
  if (!envelope) throw new NoEditionError();
  return parseInsightsBundle(await decryptVault(envelope, credentials));
}

function messageFor(error: unknown): string {
  if (error instanceof SyncKeyError) return error.message.replace('sync key', 'key');
  if (error instanceof VaultDecryptError) return "That key doesn't open these notes.";
  if (error instanceof NoEditionError) return 'No notes are published in this version of the app.';
  if (error instanceof InsightsBundleError) return error.message;
  return "The notes couldn't be loaded. Check the connection and try again.";
}
