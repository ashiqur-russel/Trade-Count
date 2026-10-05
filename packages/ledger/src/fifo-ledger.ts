import { Big } from 'big.js';
import { sortTrades } from './trade-order.js';
import type { Ledger, OpenLot, Sale, SaleAllocation, Stock, StockLedger, Trade } from './types.js';

const ZERO = new Big(0);

interface StockWork {
  stock: Stock;
  lots: OpenLot[];
  /** Index of the oldest lot that still has shares; lots before it are used up. */
  head: number;
  sales: Sale[];
}

/** Matches every sale against the oldest open buys of the same stock. */
export function computeLedger(stocks: readonly Stock[], trades: readonly Trade[]): Ledger {
  const work = new Map<string, StockWork>();
  for (const stock of stocks) work.set(stock.id, { stock, lots: [], head: 0, sales: [] });

  for (const trade of sortTrades(trades)) {
    const entry = work.get(trade.stockId);
    if (!entry) continue;
    if (trade.side === 'buy') {
      entry.lots.push({ buy: trade, remaining: new Big(trade.quantity) });
    } else {
      entry.sales.push(allocateSale(trade, entry));
    }
  }

  const ledger: Ledger = new Map();
  for (const [id, entry] of work) ledger.set(id, summarize(entry));
  return ledger;
}

function allocateSale(sell: Trade, entry: StockWork): Sale {
  const salePrice = new Big(sell.price);
  let need = new Big(sell.quantity);
  const allocations: SaleAllocation[] = [];

  while (need.gt(0) && entry.head < entry.lots.length) {
    const lot = entry.lots[entry.head]!;
    const quantity = lot.remaining.lt(need) ? lot.remaining : need;
    lot.remaining = lot.remaining.minus(quantity);
    need = need.minus(quantity);
    if (lot.remaining.eq(0)) entry.head++;

    const buyPrice = new Big(lot.buy.price);
    allocations.push({ buy: lot.buy, quantity, buyPrice, profit: salePrice.minus(buyPrice).times(quantity) });
  }

  const matched = allocations.reduce((sum, a) => sum.plus(a.quantity), ZERO);
  const cost = allocations.reduce((sum, a) => sum.plus(a.buyPrice.times(a.quantity)), ZERO);
  const proceeds = salePrice.times(matched);
  return { sell, allocations, matched, uncovered: need, cost, proceeds, profit: proceeds.minus(cost) };
}

function summarize(entry: StockWork): StockLedger {
  const openLots = entry.lots.slice(entry.head).filter((lot) => lot.remaining.gt(0));
  const held = openLots.reduce((sum, lot) => sum.plus(lot.remaining), ZERO);
  const openCost = openLots.reduce((sum, lot) => sum.plus(lot.remaining.times(lot.buy.price)), ZERO);
  return {
    stock: entry.stock,
    openLots,
    sales: entry.sales,
    held,
    openCost,
    averageOpenPrice: held.gt(0) ? openCost.div(held) : null,
    sold: entry.sales.reduce((sum, sale) => sum.plus(sale.matched), ZERO),
    realizedProfit: entry.sales.reduce((sum, sale) => sum.plus(sale.profit), ZERO),
  };
}
