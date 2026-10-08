import { describe, expect, it } from 'vitest';
import { computeLedger } from './fifo-ledger.js';
import { lossPotTimeline } from './loss-pot.js';
import { acme, trade } from './trades.fixture.js';

const RATE = '0.26375';
const money = (value: { toFixed(dp: number): string }) => value.toFixed(2);

describe('lossPotTimeline', () => {
  const trades = [
    trade('buy', '10', '100', '2025-03-01'),
    trade('sell', '2', '80', '2025-06-01'),
    trade('sell', '2', '130', '2025-09-01'),
    trade('sell', '2', '150', '2026-02-01'),
  ];
  const [, lossSale, gainIn2025, gainIn2026] = trades;
  const timeline = (start?: { amount: string; validUpTo: string }) => lossPotTimeline(computeLedger([acme], trades), RATE, start);

  it('adds a loss to the pot and lets a later gain use it up before tax', () => {
    const sales = timeline().sales;

    expect(money(sales.get(lossSale!.id)!.potAfter)).toBe('40.00');
    const gain = sales.get(gainIn2025!.id)!;
    expect([money(gain.covered), money(gain.taxable), money(gain.tax), money(gain.potAfter)]).toEqual(['40.00', '20.00', '5.28', '0.00']);
  });

  it('replaces the computed pot with the entered one from the day after its date', () => {
    const sales = timeline({ amount: '500', validUpTo: '2025-12-31' }).sales;

    expect(money(sales.get(gainIn2025!.id)!.tax)).toBe('5.28');
    const gain = sales.get(gainIn2026!.id)!;
    expect([money(gain.covered), money(gain.tax), money(gain.potAfter)]).toEqual(['100.00', '0.00', '400.00']);
  });

  it('reports the pot balance on any date, including the entered pot before the first later sale', () => {
    const pot = timeline({ amount: '500', validUpTo: '2025-12-31' });

    expect(money(pot.balanceAfter('2025-07-01'))).toBe('40.00');
    expect(money(pot.balanceAfter('2025-12-31'))).toBe('500.00');
    expect(money(pot.balanceAfter('2026-01-15'))).toBe('500.00');
    expect(money(pot.balanceAfter('2026-12-31'))).toBe('400.00');
  });

  it('starts at zero without an entered pot', () => {
    expect(money(timeline().balanceAfter('2024-12-31'))).toBe('0.00');
  });
});
