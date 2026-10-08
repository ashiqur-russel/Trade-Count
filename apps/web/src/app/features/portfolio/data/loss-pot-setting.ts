import { Injectable, signal } from '@angular/core';
import type { LossPotStart } from '@trade-count/ledger';

const LOSS_POT_STORAGE_KEY = 'tc-loss-pot';

/** Share losses the broker carried forward before Trade Count, kept on this device. */
@Injectable({ providedIn: 'root' })
export class LossPotSetting {
  readonly start = signal<LossPotStart | null>(readStoredPot());

  save(start: LossPotStart): void {
    this.start.set(start);
    try {
      localStorage.setItem(LOSS_POT_STORAGE_KEY, JSON.stringify(start));
    } catch {
      // Storage blocked (private mode): the pot still applies for this visit.
    }
  }

  clear(): void {
    this.start.set(null);
    try {
      localStorage.removeItem(LOSS_POT_STORAGE_KEY);
    } catch {
      // Nothing stored to remove.
    }
  }
}

function readStoredPot(): LossPotStart | null {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(LOSS_POT_STORAGE_KEY) ?? 'null');
    return isLossPotStart(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function isLossPotStart(value: unknown): value is LossPotStart {
  const pot = value as Partial<LossPotStart> | null;
  return (
    typeof pot === 'object' &&
    pot !== null &&
    typeof pot.amount === 'string' &&
    /^\d+(\.\d+)?$/.test(pot.amount) &&
    typeof pot.validUpTo === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(pot.validUpTo)
  );
}
