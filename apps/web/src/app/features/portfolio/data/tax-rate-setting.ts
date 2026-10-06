import { Injectable, signal } from '@angular/core';
import { Big, DEFAULT_TAX_RATE } from '@trade-count/ledger';

const TAX_RATE_STORAGE_KEY = 'tc-tax-rate';
const MAX_RATE = new Big(1);

/** The rate Reports uses to estimate tax on each profitable sale, kept on this device. */
@Injectable({ providedIn: 'root' })
export class TaxRateSetting {
  /** A fraction, e.g. "0.26375" for 26,375 %. */
  readonly rate = signal(readStoredRate());

  /** Takes a percentage as typed ("26,375"); returns false and keeps the old rate when it isn't 0–100. */
  setPercent(input: string): boolean {
    const rate = percentToRate(input);
    if (rate === null) return false;
    this.rate.set(rate);
    writeStoredRate(rate);
    return true;
  }

  reset(): void {
    this.rate.set(DEFAULT_TAX_RATE);
    writeStoredRate(DEFAULT_TAX_RATE);
  }
}

export function percentToRate(input: string): string | null {
  const text = input.trim().replace('%', '').replace(',', '.').trim();
  if (!/^\d{1,3}(\.\d{1,4})?$/.test(text)) return null;
  const rate = new Big(text).div(100);
  return rate.gt(MAX_RATE) ? null : rate.toString();
}

export function rateToPercentText(rate: string): string {
  return new Big(rate).times(100).toString().replace('.', ',');
}

function readStoredRate(): string {
  try {
    const stored = localStorage.getItem(TAX_RATE_STORAGE_KEY);
    return stored !== null && isRate(stored) ? stored : DEFAULT_TAX_RATE;
  } catch {
    return DEFAULT_TAX_RATE;
  }
}

function writeStoredRate(rate: string): void {
  try {
    if (rate === DEFAULT_TAX_RATE) localStorage.removeItem(TAX_RATE_STORAGE_KEY);
    else localStorage.setItem(TAX_RATE_STORAGE_KEY, rate);
  } catch {
    // Storage blocked (private mode): the rate still applies for this visit.
  }
}

function isRate(value: string): boolean {
  return /^(0(\.\d{1,6})?|1)$/.test(value);
}
