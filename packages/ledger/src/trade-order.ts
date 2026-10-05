import type { Trade } from './types.js';

/** Execution order: trade date, then entry time, then id (UUIDv7 ids sort by creation). */
export function compareTrades(a: Trade, b: Trade): number {
  if (a.tradedOn !== b.tradedOn) return a.tradedOn < b.tradedOn ? -1 : 1;
  const byEntry = Date.parse(a.createdAt) - Date.parse(b.createdAt);
  if (byEntry !== 0) return byEntry;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

export function sortTrades(trades: readonly Trade[]): Trade[] {
  return [...trades].sort(compareTrades);
}
