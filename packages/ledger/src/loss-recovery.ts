import { Big } from 'big.js';
import type { StockLedger } from './types.js';

/** The price `shares` bought at `buyPrice` must reach to make up `loss` (a positive amount). */
export function winBackPrice(loss: Big, shares: Big, buyPrice: Big): Big {
  return buyPrice.plus(loss.div(shares));
}

/**
 * For a stock still held whose sales so far add up to a loss: the price its shares must reach to
 * cover both their own cost and that loss. Null when nothing is held or the sales are not a loss.
 */
export function breakEvenWithPastLoss(entry: StockLedger): Big | null {
  if (entry.held.lte(0) || entry.realizedProfit.gte(0)) return null;
  return entry.openCost.minus(entry.realizedProfit).div(entry.held);
}
