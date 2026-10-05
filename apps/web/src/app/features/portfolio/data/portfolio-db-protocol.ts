import type { Portfolio, Stock, Trade } from '@trade-count/ledger';
import type {
  NewStock,
  NewTrade,
  StockChanges,
  StoreFailure,
  TradeChanges,
} from '@trade-count/local-store';

/** What the page may ask the database worker to do; mirrors PortfolioDatabase. */
export interface PortfolioDbMethods {
  getPortfolio(): Portfolio;
  createStock(input: NewStock): Stock;
  updateStock(id: string, changes: StockChanges): Stock;
  deleteStock(id: string): void;
  createTrade(input: NewTrade): Trade;
  updateTrade(id: string, changes: TradeChanges): Trade;
  deleteTrade(id: string): void;
}

export type PortfolioDbMethod = keyof PortfolioDbMethods;

export interface DbRequest<M extends PortfolioDbMethod = PortfolioDbMethod> {
  id: number;
  method: M;
  args: Parameters<PortfolioDbMethods[M]>;
}

/** A rule the data broke, or storage this browser can't provide. */
export type DbFailure = StoreFailure | { code: 'UNAVAILABLE'; message: string };

export type DbResponse =
  { id: number; ok: true; result: unknown } | { id: number; ok: false; failure: DbFailure };
