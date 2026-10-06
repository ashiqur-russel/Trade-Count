import { Big } from 'big.js';
import { compareTrades } from './trade-order.js';
import type { Trade } from './types.js';

/**
 * Shares of `sale.stockId` held right before `sale` executes, in ledger order (date, then entry
 * time), ignoring any stored trade with the sale's own id so an edited sale doesn't count itself.
 */
export function openSharesBefore(trades: readonly Trade[], sale: Trade): Big {
  let held = new Big(0);
  for (const trade of trades) {
    if (trade.stockId !== sale.stockId || trade.id === sale.id || compareTrades(trade, sale) >= 0) continue;
    held = trade.side === 'buy' ? held.plus(trade.quantity) : held.minus(trade.quantity);
  }
  return held.lt(0) ? new Big(0) : held;
}
