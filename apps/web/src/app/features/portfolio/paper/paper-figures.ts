import { Big, computeLedger, portfolioTotals, type Stock, type Trade } from '@trade-count/ledger';
import type { PaperRecord } from './paper-record';

export interface PaperPosition {
  symbol: string;
  name: string;
  shares: Big;
  averagePrice: Big;
  close: Big;
  marketValue: Big;
  unrealized: Big;
}

export interface PaperFigures {
  startValue: Big;
  value: Big;
  /** What the start positions and cash would be worth with no trading. */
  hold: Big;
  /** Trading result compared with holding: value − hold. */
  versusHold: Big;
  /** value / startValue − 1 */
  change: Big;
  realized: Big;
  cash: Big;
  positions: PaperPosition[];
}

/** Paper trades in the ledger's own shape, so the page matches sales FIFO exactly like real ones. */
function ledgerInput(record: PaperRecord): { stocks: Stock[]; trades: Trade[] } {
  return {
    stocks: record.stocks.map((s) => ({ id: s.symbol, name: s.name, symbol: s.symbol })),
    trades: record.trades.map((t) => ({
      id: t.id,
      stockId: t.symbol,
      side: t.side,
      quantity: String(t.shares),
      price: String(t.priceEur),
      tradedOn: t.date,
      createdAt: t.at,
    })),
  };
}

export function paperFigures(record: PaperRecord): PaperFigures {
  const { stocks, trades } = ledgerInput(record);
  const ledger = computeLedger(stocks, trades);
  const closes = new Map(record.stocks.map((s) => [s.symbol, new Big(s.closeEur)]));

  const positions = [...ledger.values()]
    .filter((entry) => entry.held.gt(0))
    .map((entry): PaperPosition => {
      const close = closes.get(entry.stock.id)!;
      const marketValue = entry.held.times(close);
      return {
        symbol: entry.stock.id,
        name: entry.stock.name,
        shares: entry.held,
        averagePrice: entry.averageOpenPrice!,
        close,
        marketValue,
        unrealized: marketValue.minus(entry.openCost),
      };
    });

  const cash = new Big(record.cash);
  const value = positions.reduce((sum, p) => sum.plus(p.marketValue), cash);
  const startTrades = record.trades.filter((t) => t.start);
  const startValue = startTrades.reduce(
    (sum, t) => sum.plus(new Big(t.priceEur).times(t.shares)),
    new Big(record.startCash),
  );
  const hold = startTrades.reduce(
    (sum, t) => sum.plus(closes.get(t.symbol)!.times(t.shares)),
    new Big(record.startCash),
  );
  return {
    startValue,
    value,
    hold,
    versusHold: value.minus(hold),
    change: value.div(startValue).minus(1),
    realized: portfolioTotals(ledger).realizedProfit,
    cash,
    positions,
  };
}
