import { Big } from 'big.js';
import { computeLedger } from './fifo-ledger.js';
import type { Stock, Trade } from './types.js';

/** Abgeltungsteuer 25 % plus Solidaritätszuschlag 5,5 % of it. */
export const DEFAULT_TAX_RATE = '0.26375';

const ZERO = new Big(0);

export interface ReportLot {
  buy: Trade;
  quantity: Big;
  buyPrice: Big;
  profitPerShare: Big;
  /** Null when this lot made no profit or the sale as a whole is a loss. */
  taxPerShare: Big | null;
}

export interface ReportSale {
  stock: Stock;
  sell: Trade;
  quantity: Big;
  salePrice: Big;
  proceeds: Big;
  profit: Big;
  tax: Big;
  afterTax: Big;
  lots: ReportLot[];
}

export interface ReportFigures {
  invested: Big;
  soldFor: Big;
  /** Sum of the sales that made a profit. */
  profit: Big;
  /** Sum of the sales that made a loss, as a negative number. */
  loss: Big;
  tax: Big;
  /** profit + loss − tax */
  afterTax: Big;
  sharesSold: Big;
}

export interface ReportMonth extends ReportFigures {
  /** 1 = January. */
  month: number;
  hasTrades: boolean;
  /** After-tax result of the year up to and including this month. */
  runningAfterTax: Big;
}

export interface ReportStock extends ReportFigures {
  stock: Stock;
}

export interface YearReport {
  year: number;
  taxRate: Big;
  totals: ReportFigures;
  months: ReportMonth[];
  sales: ReportSale[];
  byStock: ReportStock[];
  buyCount: number;
  profitableSales: number;
  losingSales: number;
  /** The month that kept the most after tax; null when no month ended above zero. */
  bestMonth: ReportMonth | null;
  afterTaxPerShareSold: Big | null;
}

/** Years that have at least one trade, newest first. */
export function reportYears(trades: readonly Trade[]): number[] {
  return [...new Set(trades.map((t) => yearOf(t.tradedOn)))].sort((a, b) => b - a);
}

/**
 * Invested, profit, loss and estimated tax of one calendar year. Sales are matched FIFO against the
 * whole history, so lots bought in earlier years count. Tax is the rate times each profitable sale's
 * total profit, rounded to the cent; a sale at a loss adds no tax and offsets nothing.
 */
export function yearReport(stocks: readonly Stock[], trades: readonly Trade[], year: number, rate: Big | string): YearReport {
  const taxRate = new Big(rate);
  const ledger = computeLedger(stocks, trades);
  const months = Array.from({ length: 12 }, (_, i) => ({ ...emptyFigures(), month: i + 1, hasTrades: false, runningAfterTax: ZERO }));
  const byStock = new Map<string, ReportStock>();
  const sales: ReportSale[] = [];
  let buyCount = 0;

  for (const trade of trades) {
    if (trade.side !== 'buy' || yearOf(trade.tradedOn) !== year) continue;
    const amount = new Big(trade.quantity).times(trade.price);
    const month = months[monthOf(trade.tradedOn) - 1]!;
    month.invested = month.invested.plus(amount);
    month.hasTrades = true;
    buyCount++;
    const stock = stocks.find((s) => s.id === trade.stockId);
    if (stock) addTo(stockFigures(byStock, stock), { invested: amount });
  }

  for (const entry of ledger.values()) {
    for (const sale of entry.sales) {
      if (yearOf(sale.sell.tradedOn) !== year) continue;
      const report = reportSale(entry.stock, sale.sell, sale.allocations, sale.matched, sale.proceeds, sale.profit, taxRate);
      sales.push(report);
      const month = months[monthOf(sale.sell.tradedOn) - 1]!;
      month.hasTrades = true;
      const figures = saleFigures(report);
      addTo(month, figures);
      addTo(stockFigures(byStock, entry.stock), figures);
    }
  }

  let running = ZERO;
  for (const month of months) {
    running = running.plus(month.afterTax);
    month.runningAfterTax = running;
  }

  const totals = months.reduce<ReportFigures>((sum, month) => {
    addTo(sum, month);
    return sum;
  }, emptyFigures());
  const best = months.filter((m) => m.afterTax.gt(0)).sort((a, b) => b.afterTax.cmp(a.afterTax))[0] ?? null;

  return {
    year,
    taxRate,
    totals,
    months,
    sales: sales.sort((a, b) => a.sell.tradedOn.localeCompare(b.sell.tradedOn) || a.sell.createdAt.localeCompare(b.sell.createdAt)),
    byStock: [...byStock.values()].sort((a, b) => a.stock.name.localeCompare(b.stock.name)),
    buyCount,
    profitableSales: sales.filter((s) => s.profit.gt(0)).length,
    losingSales: sales.filter((s) => s.profit.lt(0)).length,
    bestMonth: best,
    afterTaxPerShareSold: totals.sharesSold.gt(0) ? totals.afterTax.div(totals.sharesSold).round(2, Big.roundHalfUp) : null,
  };
}

function reportSale(
  stock: Stock,
  sell: Trade,
  allocations: { buy: Trade; quantity: Big; buyPrice: Big }[],
  quantity: Big,
  proceeds: Big,
  profit: Big,
  taxRate: Big,
): ReportSale {
  const salePrice = new Big(sell.price);
  const taxed = profit.gt(0);
  const tax = taxed ? profit.times(taxRate).round(2, Big.roundHalfUp) : ZERO;
  return {
    stock,
    sell,
    quantity,
    salePrice,
    proceeds,
    profit,
    tax,
    afterTax: profit.minus(tax),
    lots: allocations.map(({ buy, quantity: shares, buyPrice }) => {
      const profitPerShare = salePrice.minus(buyPrice);
      return {
        buy,
        quantity: shares,
        buyPrice,
        profitPerShare,
        taxPerShare: taxed && profitPerShare.gt(0) ? profitPerShare.times(taxRate).round(2, Big.roundHalfUp) : null,
      };
    }),
  };
}

function saleFigures(sale: ReportSale): Partial<ReportFigures> {
  return {
    soldFor: sale.proceeds,
    profit: sale.profit.gt(0) ? sale.profit : ZERO,
    loss: sale.profit.lt(0) ? sale.profit : ZERO,
    tax: sale.tax,
    afterTax: sale.afterTax,
    sharesSold: sale.quantity,
  };
}

function emptyFigures(): ReportFigures {
  return { invested: ZERO, soldFor: ZERO, profit: ZERO, loss: ZERO, tax: ZERO, afterTax: ZERO, sharesSold: ZERO };
}

const FIGURE_KEYS = ['invested', 'soldFor', 'profit', 'loss', 'tax', 'afterTax', 'sharesSold'] as const;

function addTo(target: ReportFigures, add: Partial<ReportFigures>): void {
  for (const key of FIGURE_KEYS) {
    const value = add[key];
    if (value) target[key] = target[key].plus(value);
  }
}

function stockFigures(byStock: Map<string, ReportStock>, stock: Stock): ReportStock {
  let figures = byStock.get(stock.id);
  if (!figures) byStock.set(stock.id, (figures = { ...emptyFigures(), stock }));
  return figures;
}

function yearOf(isoDate: string): number {
  return Number(isoDate.slice(0, 4));
}

function monthOf(isoDate: string): number {
  return Number(isoDate.slice(5, 7));
}
