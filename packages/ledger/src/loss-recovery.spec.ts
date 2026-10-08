import { Big } from 'big.js';
import { describe, expect, it } from 'vitest';
import { computeLedger } from './fifo-ledger.js';
import { breakEvenWithPastLoss, winBackPrice } from './loss-recovery.js';
import { acme, trade } from './trades.fixture.js';

const money = (value: { toFixed(dp: number): string }) => value.toFixed(2);

describe('winBackPrice', () => {
  it('adds the loss spread over the shares to the buy-back price', () => {
    expect(money(winBackPrice(new Big(4900), new Big(50), new Big(450)))).toBe('548.00');
    expect(money(winBackPrice(new Big(4900), new Big(75), new Big(450)))).toBe('515.33');
    expect(money(winBackPrice(new Big(4900), new Big(100), new Big(450)))).toBe('499.00');
  });
});

describe('breakEvenWithPastLoss', () => {
  const history = [
    trade('buy', '20', '560', '2026-01-02'),
    trade('buy', '30', '540', '2026-02-15'),
    trade('sell', '50', '450', '2026-10-08'),
    trade('buy', '30', '450', '2026-10-09'),
  ];

  it('spreads the loss of earlier sales over the shares bought back', () => {
    const entry = computeLedger([acme], history).get(acme.id)!;

    expect(money(entry.realizedProfit)).toBe('-4900.00');
    expect(money(breakEvenWithPastLoss(entry)!)).toBe('613.33');
  });

  it('is null when the sales so far are not a loss or nothing is held', () => {
    const profitable = computeLedger([acme], [trade('buy', '2', '100', '2026-01-01'), trade('sell', '1', '120', '2026-02-01')]).get(acme.id)!;
    const allSold = computeLedger([acme], history.slice(0, 3)).get(acme.id)!;

    expect(breakEvenWithPastLoss(profitable)).toBeNull();
    expect(breakEvenWithPastLoss(allSold)).toBeNull();
  });
});
