import type { VaultSnapshot } from './vault-snapshot.js';

/** How far ahead of the receiver's clock a record's time may be before it counts as coming from a wrong clock. */
export const CLOCK_TOLERANCE_MS = 60_000;

/** Offsets smaller than this are measurement noise (the server's Date header has one-second resolution). */
export const MIN_CLOCK_OFFSET_MS = 5_000;

/** Caps every edit and deletion time at `limit` (an ISO time), so a wrong clock can't make a record win forever. */
export function clampStamps(snapshot: VaultSnapshot, limit: string): VaultSnapshot {
  const cap = (time: string) => (time > limit ? limit : time);
  return {
    ...snapshot,
    stocks: snapshot.stocks.map((s) => ({ ...s, updatedAt: cap(s.updatedAt) })),
    trades: snapshot.trades.map((t) => ({ ...t, updatedAt: cap(t.updatedAt) })),
    deletions: snapshot.deletions.map((d) => ({ ...d, deletedAt: cap(d.deletedAt) })),
  };
}

/** The latest edit or deletion time in a snapshot, in milliseconds (0 when it is empty). */
export function latestStamp(snapshot: VaultSnapshot): number {
  const times = [
    ...snapshot.stocks.map((s) => s.updatedAt),
    ...snapshot.trades.map((t) => t.updatedAt),
    ...snapshot.deletions.map((d) => d.deletedAt),
  ];
  return times.reduce((latest, time) => Math.max(latest, Date.parse(time)), 0);
}
