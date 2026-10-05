import { Big } from 'big.js';
import { sortTrades } from './trade-order.js';
import type { Stock, Trade } from './types.js';

/** One share (or the fractional rest of a lot) with the sale that closed it, if any. */
export interface ShareRow {
  buy: Trade;
  sell: Trade | null;
  quantity: Big;
  profit: Big | null;
}

const ONE = new Big(1);

/**
 * Splits every buy into single shares and closes them oldest first, one row per share.
 * Row count grows with total shares held, so it suits personal portfolios, not bulk positions.
 */
export function shareRows(stocks: readonly Stock[], trades: readonly Trade[]): Map<string, ShareRow[]> {
  const rows = new Map<string, ShareRow[]>();
  const nextOpen = new Map<string, number>();
  for (const stock of stocks) {
    rows.set(stock.id, []);
    nextOpen.set(stock.id, 0);
  }

  for (const trade of sortTrades(trades)) {
    const list = rows.get(trade.stockId);
    if (!list) continue;

    if (trade.side === 'buy') {
      for (let left = new Big(trade.quantity); left.gt(0); left = left.minus(ONE)) {
        list.push({ buy: trade, sell: null, quantity: left.lt(ONE) ? left : ONE, profit: null });
      }
      continue;
    }

    const salePrice = new Big(trade.price);
    let need = new Big(trade.quantity);
    let index = nextOpen.get(trade.stockId)!;
    while (need.gt(0) && index < list.length) {
      const row = list[index]!;
      if (row.quantity.gt(need)) {
        list.splice(index + 1, 0, { buy: row.buy, sell: null, quantity: row.quantity.minus(need), profit: null });
        row.quantity = need;
      }
      row.sell = trade;
      row.profit = salePrice.minus(row.buy.price).times(row.quantity);
      need = need.minus(row.quantity);
      index++;
    }
    nextOpen.set(trade.stockId, index);
  }

  return rows;
}
