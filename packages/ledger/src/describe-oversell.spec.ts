import { describe, expect, it } from 'vitest';
import { describeOversell } from './describe-oversell.js';
import { findOversellCausedBy } from './oversell.js';
import { acme, trade } from './trades.fixture.js';

describe('describeOversell', () => {
  const buy = trade('buy', '3', '560', '2026-10-01');
  const sell = trade('sell', '2', '600', '2026-10-03');

  it('tells the seller how many shares they held when their own sale is too big', () => {
    const draft = trade('sell', '4', '610', '2026-10-04');
    const oversell = findOversellCausedBy([acme], [buy, sell], { type: 'add', trade: draft })!;

    expect(describeOversell(oversell, draft.id)).toBe("You only hold 1 Acme share(s) on 2026-10-04, so you can't sell 4.");
  });

  it('names the later sale a change would break, with dates in the caller format', () => {
    const oversell = findOversellCausedBy([acme], [buy, sell], { type: 'remove', tradeId: buy.id })!;
    const german = (iso: string) => iso.split('-').reverse().join('.');

    expect(describeOversell(oversell, buy.id, german)).toBe(
      'This would leave the sale of 2 Acme share(s) on 03.10.2026 without enough shares. Change or delete that sale first.',
    );
  });
});
