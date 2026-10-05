import { Injectable } from '@angular/core';

/** Asks the browser not to evict this site's storage (e.g. Safari's 7-day rule for unused sites). */
@Injectable({ providedIn: 'root' })
export class PersistentStorage {
  private requested = false;

  async request(): Promise<void> {
    if (this.requested || typeof navigator === 'undefined' || !navigator.storage?.persist) return;
    this.requested = true;
    try {
      await navigator.storage.persist();
    } catch {
      // Browsers that refuse or don't support it keep best-effort storage; nothing else to do.
    }
  }
}
