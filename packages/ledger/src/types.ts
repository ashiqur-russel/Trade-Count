import type { Big } from 'big.js';

export type TradeSide = 'buy' | 'sell';

export interface Stock {
  id: string;
  name: string;
  symbol: string | null;
}

/** Decimal values are strings so no precision is lost on the wire. */
export interface Trade {
  id: string;
  stockId: string;
  side: TradeSide;
  quantity: string;
  price: string;
  /** Calendar date, `YYYY-MM-DD`. */
  tradedOn: string;
  /** ISO 8601 timestamp; orders trades entered on the same date. */
  createdAt: string;
}

export interface OpenLot {
  buy: Trade;
  remaining: Big;
}

/** The part of one buy lot that a sale used up. */
export interface SaleAllocation {
  buy: Trade;
  quantity: Big;
  buyPrice: Big;
  profit: Big;
}

export interface Sale {
  sell: Trade;
  allocations: SaleAllocation[];
  /** Shares covered by open lots. */
  matched: Big;
  /** Shares sold beyond what was held; zero in a valid ledger. */
  uncovered: Big;
  cost: Big;
  proceeds: Big;
  profit: Big;
}

export interface StockLedger {
  stock: Stock;
  /** Lots with shares left, oldest first: the first one is sold next. */
  openLots: OpenLot[];
  sales: Sale[];
  held: Big;
  openCost: Big;
  averageOpenPrice: Big | null;
  sold: Big;
  realizedProfit: Big;
}

export type Ledger = Map<string, StockLedger>;
