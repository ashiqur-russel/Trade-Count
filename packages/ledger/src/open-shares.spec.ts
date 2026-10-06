import { describe, expect, it } from 'vitest';
import { openSharesBefore } from './open-shares.js';
import { globex, trade } from './trades.fixture.js';

describe('openSharesBefore', () => {
  const history = [
    trade('buy', '5', '100', '2026-01-12'),
    trade('buy', '3', '110', '2026-03-03'),
    trade('sell', '4', '120', '2026-04-14'),
    trade('buy', '2', '50', '2026-02-01', { stockId: globex.id }),
  ];
  const draftSale = (tradedOn: string, overrides = {}) =>
    trade('sell', '1', '130', tradedOn, { id: 'draft', createdAt: '2099-01-01T00:00:00.000Z', ...overrides });

  it('counts the shares of that stock bought and not yet sold before the sale date', () => {
    expect(openSharesBefore(history, draftSale('2026-05-01')).toString()).toBe('4');
  });

  it('only counts trades up to the sale date', () => {
    expect(openSharesBefore(history, draftSale('2026-02-15')).toString()).toBe('5');
    expect(openSharesBefore(history, draftSale('2026-01-01')).toString()).toBe('0');
  });

  it('includes earlier trades on the same date, since a new sale is entered after them', () => {
    expect(openSharesBefore(history, draftSale('2026-04-14')).toString()).toBe('4');
  });

  it('leaves out the sale being edited, so its own quantity is available again', () => {
    const sale = history[2]!;
    expect(openSharesBefore(history, { ...sale, quantity: '6' }).toString()).toBe('8');
  });

  it('ignores other stocks', () => {
    expect(openSharesBefore(history, draftSale('2026-05-01', { stockId: globex.id })).toString()).toBe('2');
  });
});
