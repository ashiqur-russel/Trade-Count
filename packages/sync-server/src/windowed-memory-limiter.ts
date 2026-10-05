import type { RateLimiter } from './vault-store.js';

/**
 * A rate limiter that lives in the memory of one server instance: it costs no database writes, but its
 * counts are not shared between instances, so it only slows a flood coming through one place.
 */
export class WindowedMemoryRateLimiter implements RateLimiter {
  private readonly counts = new Map<string, { windowStart: number; count: number }>();

  constructor(
    private readonly now: () => number = Date.now,
    private readonly maxKeys = 10_000,
  ) {}

  async consume(key: string, limit: number, windowSeconds: number): Promise<boolean> {
    const windowMs = windowSeconds * 1000;
    const windowStart = Math.floor(this.now() / windowMs) * windowMs;
    const entry = this.counts.get(key);

    if (entry && entry.windowStart === windowStart) {
      entry.count++;
      return entry.count <= limit;
    }
    this.makeRoom(windowStart);
    this.counts.set(key, { windowStart, count: 1 });
    return limit >= 1;
  }

  private makeRoom(currentWindowStart: number): void {
    if (this.counts.size < this.maxKeys) return;
    for (const [key, entry] of this.counts) {
      if (entry.windowStart < currentWindowStart) this.counts.delete(key);
    }
    // Still full of current entries: drop the oldest so memory stays bounded.
    while (this.counts.size >= this.maxKeys) this.counts.delete(this.counts.keys().next().value!);
  }
}
