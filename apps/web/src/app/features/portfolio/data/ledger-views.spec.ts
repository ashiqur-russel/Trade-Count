import { computeLedger, shareRows, type Trade } from '@trade-count/ledger';
import { NO_FILTER, isFiltered, type LedgerFilter } from './ledger-filter';
import {
  historyRows,
  openLotRows,
  saleRows,
  sheetGroups,
  sheetLines,
  sheetTotals,
} from './ledger-views';

const acme = { id: 'acme', name: 'Acme', symbol: null };
const zeta = { id: 'zeta', name: 'Zeta', symbol: 'ZT' };
let seq = 0;
const trade = (
  stockId: string,
  side: Trade['side'],
  quantity: string,
  price: string,
  tradedOn: string,
): Trade => ({
  id: `t${seq}`,
  stockId,
  side,
  quantity,
  price,
  tradedOn,
  createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, seq++)).toISOString(),
});
const filter = (changes: Partial<LedgerFilter>): LedgerFilter => ({ ...NO_FILTER, ...changes });

describe('ledger views', () => {
  const stocks = [acme, zeta];
  const trades = [
    trade('acme', 'buy', '2', '10', '2026-10-01'),
    trade('acme', 'buy', '1', '20', '2026-10-02'),
    trade('acme', 'sell', '2', '15', '2026-10-03'),
    trade('zeta', 'buy', '1', '5', '2026-10-01'),
  ];
  const ledger = computeLedger(stocks, trades);
  const rows = shareRows(stocks, trades);

  it('sheetGroups totals each stock and keeps only the selected stock', () => {
    const groups = sheetGroups(stocks, rows, NO_FILTER);

    expect(
      groups.map((g) => [g.stock.id, g.sold.toString(), g.open.toString(), g.profit.toString()]),
    ).toEqual([
      ['acme', '2', '1', '10'],
      ['zeta', '0', '1', '0'],
    ]);
    expect(sheetGroups(stocks, rows, filter({ stockId: 'zeta' })).map((g) => g.stock.id)).toEqual([
      'zeta',
    ]);
  });

  it('sheetGroups filters shares by status and recomputes the subtotals', () => {
    const [closed] = sheetGroups(stocks, rows, filter({ status: 'closed' }));

    expect(closed.rows).toHaveLength(2);
    expect([closed.sold.toString(), closed.open.toString()]).toEqual(['2', '0']);
    expect(sheetGroups(stocks, rows, filter({ status: 'open' })).map((g) => g.rows.length)).toEqual(
      [1, 1],
    );
  });

  it('sheetGroups keeps a share when it was bought or sold inside the date range', () => {
    const [acmeGroup] = sheetGroups(stocks, rows, filter({ from: '2026-10-03', to: '2026-10-03' }));

    expect(acmeGroup.rows.map((r) => r.buy.tradedOn)).toEqual(['2026-10-01', '2026-10-01']);
  });

  it('sheetLines puts a subtotal after each stock and sheetTotals adds them up', () => {
    const groups = sheetGroups(stocks, rows, NO_FILTER);

    expect(sheetLines(groups).map((l) => l.kind)).toEqual([
      'share',
      'share',
      'share',
      'subtotal',
      'share',
      'subtotal',
    ]);
    expect(sheetTotals(groups).open.toString()).toBe('2');
  });

  it('openLotRows marks the oldest open lot as sold next even when a date filter hides others', () => {
    expect(
      openLotRows(stocks, ledger, NO_FILTER).map((r) => [r.stock.id, r.lot.buy.price, r.soldNext]),
    ).toEqual([
      ['acme', '20', true],
      ['zeta', '5', true],
    ]);
    expect(
      openLotRows(stocks, ledger, filter({ from: '2026-10-02' })).map((r) => r.stock.id),
    ).toEqual(['acme']);
  });

  it('saleRows filters by sale date and historyRows by side, newest first', () => {
    expect(saleRows(stocks, ledger, filter({ to: '2026-10-02' }))).toEqual([]);
    expect(
      historyRows(stocks, trades, filter({ stockId: 'acme' })).map((r) => r.trade.tradedOn),
    ).toEqual(['2026-10-03', '2026-10-02', '2026-10-01']);
    expect(historyRows(stocks, trades, filter({ side: 'sell' })).map((r) => r.trade.side)).toEqual([
      'sell',
    ]);
  });

  it('isFiltered is false only for the empty filter', () => {
    expect(isFiltered(NO_FILTER)).toBe(false);
    expect(isFiltered(filter({ side: 'buy' }))).toBe(true);
  });
});
