import { describe, expect, it } from 'vitest';
import { WindowedMemoryRateLimiter } from './windowed-memory-limiter.js';

describe('WindowedMemoryRateLimiter', () => {
  it('allows up to the limit per key in a window, then refuses, without affecting other keys', async () => {
    const limiter = new WindowedMemoryRateLimiter(() => 1_000);

    expect([await limiter.consume('a', 2, 3600), await limiter.consume('a', 2, 3600), await limiter.consume('a', 2, 3600)]).toEqual([true, true, false]);
    expect(await limiter.consume('b', 2, 3600)).toBe(true);
  });

  it('starts a fresh count in the next window', async () => {
    let now = 0;
    const limiter = new WindowedMemoryRateLimiter(() => now);
    await limiter.consume('a', 1, 60);
    expect(await limiter.consume('a', 1, 60)).toBe(false);

    now = 61_000;

    expect(await limiter.consume('a', 1, 60)).toBe(true);
  });

  it('keeps memory bounded by dropping old entries when full', async () => {
    let now = 0;
    const limiter = new WindowedMemoryRateLimiter(() => now, 100);
    for (let i = 0; i < 100; i++) await limiter.consume(`k${i}`, 5, 60);
    now = 120_000;
    for (let i = 0; i < 100; i++) await limiter.consume(`n${i}`, 5, 60);

    expect((limiter as unknown as { counts: Map<string, unknown> }).counts.size).toBeLessThanOrEqual(100);
  });
});
