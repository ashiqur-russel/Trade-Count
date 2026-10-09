import { computeLedger, type Stock, type Trade } from '@trade-count/ledger';
import type { InsightStock, InsightsBundle } from './insights-bundle';
import { matchInsights } from './insights-match';

const insight = (ticker: string, aliases: string[], rank: number) =>
  ({ ticker, name: ticker, aliases, rank }) as InsightStock;
const bundle = {
  stocks: [
    insight('NVDA', ['NVIDIA', 'NVIDIA Corporation'], 1),
    insight('AMD', ['Advanced Micro Devices'], 2),
    insight('TSLA', ['Tesla', 'Tesla Inc.'], 3),
  ],
} as InsightsBundle;

let trades: Trade[] = [];
const trade = (stockId: string, side: Trade['side'], quantity: string, tradedOn: string): Trade => {
  const t = {
    id: `t${trades.length}`,
    stockId,
    side,
    quantity,
    price: '100',
    tradedOn,
    createdAt: `${tradedOn}T10:00:00Z`,
  };
  trades.push(t);
  return t;
};
const tickers = (stocks: Stock[]) =>
  matchInsights(bundle, computeLedger(stocks, trades)).map(
    (m) => `${m.insight.ticker}${m.held ? '' : ' (not held)'}`,
  );

describe('matchInsights', () => {
  beforeEach(() => (trades = []));

  it('shows only the notes for stocks the user has traded, matched on symbol or name', () => {
    const stocks: Stock[] = [
      { id: 'n', name: 'NVIDIA Corporation', symbol: 'NVIDIA' },
      { id: 't', name: 'Tesla Inc.', symbol: 'TSLA' },
      { id: 'x', name: 'Untraded Corp', symbol: 'AMD' },
    ];
    trade('n', 'buy', '39', '2026-09-01');
    trade('t', 'buy', '50', '2026-09-01');

    expect(tickers(stocks)).toEqual(['NVDA', 'TSLA']);
  });

  it('lists a sold-out stock after the held ones, marked as not held', () => {
    const stocks: Stock[] = [
      { id: 'a', name: 'Advanced Micro Devices', symbol: 'AMD' },
      { id: 't', name: 'Tesla', symbol: null },
    ];
    trade('a', 'buy', '21', '2026-09-01');
    trade('a', 'sell', '21', '2026-09-20');
    trade('t', 'buy', '50', '2026-09-01');

    expect(tickers(stocks)).toEqual(['TSLA', 'AMD (not held)']);
  });

  it('shows nothing for a user without any of the edition’s stocks', () => {
    trade('o', 'buy', '5', '2026-09-01');
    expect(tickers([{ id: 'o', name: 'Apple', symbol: 'AAPL' }])).toEqual([]);
  });
});
