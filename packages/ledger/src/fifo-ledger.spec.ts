import { describe, expect, it } from 'vitest';
import { computeLedger } from './fifo-ledger.js';
import { portfolioTotals } from './portfolio-totals.js';
import { acme, globex, trade } from './trades.fixture.js';

describe('computeLedger', () => {
  it('sells the oldest lot first and spreads a batch sale across lots', () => {
    const ledger = computeLedger([acme], [
      trade('buy', '3', '560', '2026-10-01'),
      trade('buy', '2', '600', '2026-10-02'),
      trade('sell', '4', '620', '2026-10-03'),
    ]);
    const entry = ledger.get(acme.id)!;
    const sale = entry.sales[0]!;

    expect(sale.allocations.map((a) => [a.buyPrice.toString(), a.quantity.toString(), a.profit.toString()])).toEqual([
      ['560', '3', '180'],
      ['600', '1', '20'],
    ]);
    expect(sale.profit.toString()).toBe('200');
    expect(sale.uncovered.toString()).toBe('0');
    expect(entry.held.toString()).toBe('1');
    expect(entry.openCost.toString()).toBe('600');
    expect(entry.openLots.map((l) => l.buy.price)).toEqual(['600']);
    expect(entry.realizedProfit.toString()).toBe('200');
  });

  it('orders by trade date, so a backdated sale uses the lots held on that date', () => {
    const lateBuy = trade('buy', '1', '700', '2026-10-05');
    const ledger = computeLedger([acme], [
      lateBuy,
      trade('buy', '1', '500', '2026-10-01'),
      trade('sell', '1', '550', '2026-10-02'),
    ]);
    const entry = ledger.get(acme.id)!;

    expect(entry.sales[0]!.allocations[0]!.buyPrice.toString()).toBe('500');
    expect(entry.openLots.map((l) => l.buy.id)).toEqual([lateBuy.id]);
  });

  it('orders trades on the same date by entry time', () => {
    const first = trade('buy', '1', '100', '2026-10-01');
    const second = trade('buy', '1', '200', '2026-10-01');
    const ledger = computeLedger([acme], [second, first, trade('sell', '1', '150', '2026-10-01')]);

    expect(ledger.get(acme.id)!.sales[0]!.allocations[0]!.buy.id).toBe(first.id);
  });

  it('keeps cent amounts exact where floating point would drift', () => {
    const ledger = computeLedger([acme], [trade('buy', '3', '0.1', '2026-10-01'), trade('sell', '3', '0.3', '2026-10-02')]);

    expect(ledger.get(acme.id)!.realizedProfit.toString()).toBe('0.6');
  });

  it('handles fractional shares', () => {
    const ledger = computeLedger([acme], [
      trade('buy', '0.5', '100', '2026-10-01'),
      trade('buy', '1.25', '120', '2026-10-02'),
      trade('sell', '1', '130', '2026-10-03'),
    ]);
    const entry = ledger.get(acme.id)!;

    expect(entry.sales[0]!.allocations.map((a) => a.quantity.toString())).toEqual(['0.5', '0.5']);
    expect(entry.held.toString()).toBe('0.75');
    expect(entry.averageOpenPrice!.toString()).toBe('120');
  });

  it('reports shares sold beyond what was held as uncovered', () => {
    const ledger = computeLedger([acme], [trade('buy', '2', '10', '2026-10-01'), trade('sell', '5', '12', '2026-10-02')]);
    const sale = ledger.get(acme.id)!.sales[0]!;

    expect(sale.matched.toString()).toBe('2');
    expect(sale.uncovered.toString()).toBe('3');
    expect(sale.profit.toString()).toBe('4');
  });

  it('keeps each stock separate and ignores trades of unknown stocks', () => {
    const ledger = computeLedger([acme, globex], [
      trade('buy', '1', '10', '2026-10-01'),
      trade('buy', '1', '99', '2026-10-01', { stockId: globex.id }),
      trade('sell', '1', '15', '2026-10-02'),
      trade('buy', '1', '1', '2026-10-01', { stockId: 'deleted' }),
    ]);

    expect(ledger.get(acme.id)!.realizedProfit.toString()).toBe('5');
    expect(ledger.get(globex.id)!.held.toString()).toBe('1');
    expect(ledger.has('deleted')).toBe(false);
  });

  it('returns null average price when nothing is held', () => {
    const ledger = computeLedger([acme], []);

    expect(ledger.get(acme.id)!.averageOpenPrice).toBeNull();
  });
});

describe('portfolioTotals', () => {
  it('adds up profit, open cost and share counts across stocks', () => {
    const totals = portfolioTotals(computeLedger([acme, globex], [
      trade('buy', '2', '10', '2026-10-01'),
      trade('sell', '1', '13', '2026-10-02'),
      trade('buy', '4', '5', '2026-10-01', { stockId: globex.id }),
    ]));

    expect(totals.realizedProfit.toString()).toBe('3');
    expect(totals.openCost.toString()).toBe('30');
    expect(totals.held.toString()).toBe('5');
    expect(totals.sold.toString()).toBe('1');
  });
});
