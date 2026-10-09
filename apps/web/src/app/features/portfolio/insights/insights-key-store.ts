import { Injectable, signal } from '@angular/core';

const KEY_STORAGE_KEY = 'tc-insights-key';

/** The remembered Insights key; kept apart from the vault so the top bar doesn't load crypto code. */
@Injectable({ providedIn: 'root' })
export class InsightsKeyStore {
  readonly stored = signal(readKey() !== null);

  read(): string | null {
    return readKey();
  }

  remember(key: string): void {
    try {
      localStorage.setItem(KEY_STORAGE_KEY, key);
      this.stored.set(true);
    } catch {
      // Storage blocked: the notes stay open for this visit only.
    }
  }

  forget(): void {
    try {
      localStorage.removeItem(KEY_STORAGE_KEY);
    } catch {
      // Nothing stored.
    }
    this.stored.set(false);
  }
}

function readKey(): string | null {
  try {
    return localStorage.getItem(KEY_STORAGE_KEY);
  } catch {
    return null;
  }
}
