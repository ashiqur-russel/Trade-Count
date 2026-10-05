import { describe, expect, it } from 'vitest';
import { findOversellCausedBy } from './oversell.js';
import { acme, trade } from './trades.fixture.js';

describe('findOversellCausedBy', () => {
  const buy = trade('buy', '3', '560', '2026-10-01');
  const sell = trade('sell', '2', '600', '2026-10-03');
  const trades = [buy, sell];

  it('allows a sale that fits the shares held', () => {
    expect(findOversellCausedBy([acme], trades, { type: 'add', trade: trade('sell', '1', '610', '2026-10-04') })).toBeNull();
  });

  it('blocks a sale of more shares than are held and says how many were available', () => {
    const result = findOversellCausedBy([acme], trades, { type: 'add', trade: trade('sell', '2', '610', '2026-10-04') });

    expect(result?.sale.matched.toString()).toBe('1');
    expect(result?.sale.uncovered.toString()).toBe('1');
  });

  it('blocks a sale dated before the shares were bought', () => {
    const result = findOversellCausedBy([acme], trades, { type: 'add', trade: trade('sell', '1', '610', '2026-09-30') });

    expect(result?.sale.matched.toString()).toBe('0');
  });

  it('blocks deleting a buy whose shares were already sold', () => {
    const result = findOversellCausedBy([acme], trades, { type: 'remove', tradeId: buy.id });

    expect(result?.sale.sell.id).toBe(sell.id);
  });

  it('blocks shrinking a buy below what was already sold', () => {
    const result = findOversellCausedBy([acme], trades, { type: 'update', trade: { ...buy, quantity: '1' } });

    expect(result?.sale.sell.id).toBe(sell.id);
  });

  it('allows editing a price, which never changes share counts', () => {
    expect(findOversellCausedBy([acme], trades, { type: 'update', trade: { ...buy, price: '500' } })).toBeNull();
  });

  it('does not blame a change for a sale that was already short', () => {
    const shortSale = trade('sell', '5', '600', '2026-10-05');

    expect(findOversellCausedBy([acme], [...trades, shortSale], { type: 'add', trade: trade('buy', '1', '1', '2026-10-06') })).toBeNull();
  });
});
