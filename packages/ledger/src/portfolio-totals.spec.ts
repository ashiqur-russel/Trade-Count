import { describe, expect, it } from 'vitest';
import { computeLedger } from './fifo-ledger.js';
import { monthRealizedProfit } from './portfolio-totals.js';
import { acme, globex, trade } from './trades.fixture.js';

describe('monthRealizedProfit', () => {
  const ledger = computeLedger(
    [acme, globex],
    [
      trade('buy', '10', '100', '2026-09-01'),
      trade('sell', '2', '110', '2026-09-30'),
      trade('sell', '3', '90', '2026-10-01'),
      trade('buy', '5', '50', '2026-10-02', { stockId: globex.id }),
      trade('sell', '5', '60', '2026-10-31', { stockId: globex.id }),
    ],
  );

  it('adds the gains and losses of every stock sold in that month', () => {
    expect(monthRealizedProfit(ledger, '2026-10').toFixed(2)).toBe('20.00');
    expect(monthRealizedProfit(ledger, '2026-09').toFixed(2)).toBe('20.00');
  });

  it('returns zero for a month without sales', () => {
    expect(monthRealizedProfit(ledger, '2026-11').toFixed(2)).toBe('0.00');
  });
});
