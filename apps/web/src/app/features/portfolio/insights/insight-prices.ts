import { Injectable, signal } from '@angular/core';

const PRICES_STORAGE_KEY = 'tc-insights-prices';

interface StoredPrices {
  asOf: string;
  euros: Record<string, string>;
}

/** "Price now" the user typed per ticker; forgotten when a newer edition arrives. */
@Injectable({ providedIn: 'root' })
export class InsightPrices {
  private readonly stored = signal<StoredPrices>(readStored());

  priceFor(asOf: string, ticker: string): string | null {
    const stored = this.stored();
    return stored.asOf === asOf ? (stored.euros[ticker] ?? null) : null;
  }

  set(asOf: string, ticker: string, euros: string | null): void {
    const current = this.stored();
    const prices = { ...(current.asOf === asOf ? current.euros : {}) };
    if (euros === null) delete prices[ticker];
    else prices[ticker] = euros;
    const next = { asOf, euros: prices };
    this.stored.set(next);
    try {
      localStorage.setItem(PRICES_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Kept for this visit only.
    }
  }
}

function readStored(): StoredPrices {
  try {
    const parsed = JSON.parse(
      localStorage.getItem(PRICES_STORAGE_KEY) ?? 'null',
    ) as StoredPrices | null;
    if (parsed && typeof parsed.asOf === 'string' && typeof parsed.euros === 'object')
      return parsed;
  } catch {
    // Unreadable: start empty.
  }
  return { asOf: '', euros: {} };
}
