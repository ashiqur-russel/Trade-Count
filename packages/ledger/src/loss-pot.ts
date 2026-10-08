import { Big } from 'big.js';
import { compareTrades } from './trade-order.js';
import type { Ledger, Sale } from './types.js';

const ZERO = new Big(0);

/** A loss pot the broker already carried forward: its balance as of a date (`YYYY-MM-DD`). */
export interface LossPotStart {
  amount: string;
  validUpTo: string;
}

export interface SaleTax {
  profit: Big;
  /** Part of the gain the loss pot covered, so no tax is due on it. */
  covered: Big;
  taxable: Big;
  tax: Big;
  potBefore: Big;
  potAfter: Big;
}

export interface LossPotTimeline {
  /** Keyed by the sell trade's id. */
  sales: Map<string, SaleTax>;
  /** The pot after every sale up to and including this date. */
  balanceAfter(isoDate: string): Big;
}

/**
 * Estimated tax of every sale in the order they happened, the way a German broker keeps the share
 * loss pot: a loss is added to the pot, a gain uses the pot up first and only the rest is taxed. A
 * pot entered by the user replaces the computed balance from the day after its date.
 */
export function lossPotTimeline(ledger: Ledger, rate: Big | string, start?: LossPotStart | null): LossPotTimeline {
  const taxRate = new Big(rate);
  const ordered = [...ledger.values()].flatMap((entry) => entry.sales).sort((a, b) => compareTrades(a.sell, b.sell));
  const sales = new Map<string, SaleTax>();
  const history: { date: string; potAfter: Big }[] = [];
  let pot = ZERO;
  let startApplied = false;

  for (const sale of ordered) {
    if (start && !startApplied && sale.sell.tradedOn > start.validUpTo) {
      pot = new Big(start.amount);
      startApplied = true;
    }
    const tax = taxSale(sale, pot, taxRate);
    sales.set(sale.sell.id, tax);
    history.push({ date: sale.sell.tradedOn, potAfter: tax.potAfter });
    pot = tax.potAfter;
  }

  return {
    sales,
    balanceAfter(isoDate) {
      let balance = ZERO;
      let startUsedBy: string | null = null;
      for (const entry of history) {
        if (entry.date > isoDate) break;
        balance = entry.potAfter;
        if (start && !startUsedBy && entry.date > start.validUpTo) startUsedBy = entry.date;
      }
      return start && isoDate >= start.validUpTo && !startUsedBy ? new Big(start.amount) : balance;
    },
  };
}

function taxSale(sale: Sale, pot: Big, rate: Big): SaleTax {
  if (sale.profit.lte(0)) {
    return { profit: sale.profit, covered: ZERO, taxable: ZERO, tax: ZERO, potBefore: pot, potAfter: pot.minus(sale.profit) };
  }
  const covered = pot.lt(sale.profit) ? pot : sale.profit;
  const taxable = sale.profit.minus(covered);
  return {
    profit: sale.profit,
    covered,
    taxable,
    tax: taxable.times(rate).round(2, Big.roundHalfUp),
    potBefore: pot,
    potAfter: pot.minus(covered),
  };
}
