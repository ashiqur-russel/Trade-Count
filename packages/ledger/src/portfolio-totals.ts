import { Big } from 'big.js';
import type { Ledger } from './types.js';

export interface PortfolioTotals {
  realizedProfit: Big;
  openCost: Big;
  held: Big;
  sold: Big;
}

export function portfolioTotals(ledger: Ledger): PortfolioTotals {
  const totals: PortfolioTotals = { realizedProfit: new Big(0), openCost: new Big(0), held: new Big(0), sold: new Big(0) };
  for (const entry of ledger.values()) {
    totals.realizedProfit = totals.realizedProfit.plus(entry.realizedProfit);
    totals.openCost = totals.openCost.plus(entry.openCost);
    totals.held = totals.held.plus(entry.held);
    totals.sold = totals.sold.plus(entry.sold);
  }
  return totals;
}
