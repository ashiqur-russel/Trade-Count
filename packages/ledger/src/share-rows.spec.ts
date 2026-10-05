import { describe, expect, it } from 'vitest';
import { shareRows } from './share-rows.js';
import { acme, trade } from './trades.fixture.js';

describe('shareRows', () => {
  it('gives every bought share its own row and closes them oldest first', () => {
    const rows = shareRows([acme], [
      trade('buy', '3', '560', '2026-10-01'),
      trade('buy', '2', '600', '2026-10-02'),
      trade('sell', '4', '620', '2026-10-03'),
    ]).get(acme.id)!;

    expect(rows.map((r) => [r.buy.price, r.sell?.price ?? null, r.profit?.toString() ?? null])).toEqual([
      ['560', '620', '60'],
      ['560', '620', '60'],
      ['560', '620', '60'],
      ['600', '620', '20'],
      ['600', null, null],
    ]);
  });

  it('splits a fractional share when a sale only uses part of it', () => {
    const rows = shareRows([acme], [trade('buy', '1.5', '10', '2026-10-01'), trade('sell', '0.25', '12', '2026-10-02')]).get(acme.id)!;

    expect(rows.map((r) => [r.quantity.toString(), r.sell ? 'sold' : 'open'])).toEqual([
      ['0.25', 'sold'],
      ['0.75', 'open'],
      ['0.5', 'open'],
    ]);
    expect(rows[0]!.profit!.toString()).toBe('0.5');
  });

  it('continues after the last closed share on the next sale', () => {
    const rows = shareRows([acme], [
      trade('buy', '2', '10', '2026-10-01'),
      trade('sell', '1', '11', '2026-10-02'),
      trade('sell', '1', '15', '2026-10-03'),
    ]).get(acme.id)!;

    expect(rows.map((r) => r.sell?.price)).toEqual(['11', '15']);
  });
});
