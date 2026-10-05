import { computeLedger } from './fifo-ledger.js';
import type { Ledger, Sale, Stock, Trade } from './types.js';

export interface Oversell {
  stock: Stock;
  sale: Sale;
}

export type TradeChange =
  | { type: 'add'; trade: Trade }
  | { type: 'update'; trade: Trade }
  | { type: 'remove'; tradeId: string };

export function findOversells(ledger: Ledger): Oversell[] {
  const found: Oversell[] = [];
  for (const entry of ledger.values()) {
    for (const sale of entry.sales) {
      if (sale.uncovered.gt(0)) found.push({ stock: entry.stock, sale });
    }
  }
  return found;
}

export function applyTradeChange(trades: readonly Trade[], change: TradeChange): Trade[] {
  switch (change.type) {
    case 'add':
      return [...trades, change.trade];
    case 'update':
      return trades.map((t) => (t.id === change.trade.id ? change.trade : t));
    case 'remove':
      return trades.filter((t) => t.id !== change.tradeId);
  }
}

/**
 * Returns the first sale the change would leave without enough shares, or null when it is safe.
 * Sales that were already short before the change are not blamed on it.
 */
export function findOversellCausedBy(
  stocks: readonly Stock[],
  trades: readonly Trade[],
  change: TradeChange,
): Oversell | null {
  const shortBefore = new Map(
    findOversells(computeLedger(stocks, trades)).map((o) => [o.sale.sell.id, o.sale.uncovered]),
  );
  const after = findOversells(computeLedger(stocks, applyTradeChange(trades, change)));
  return after.find((o) => {
    const before = shortBefore.get(o.sale.sell.id);
    return before === undefined || o.sale.uncovered.gt(before);
  }) ?? null;
}
