import type { Portfolio, Stock, Trade } from '@trade-count/ledger';
import type {
  NewStock,
  NewTrade,
  PortfolioBackup,
  StockChanges,
  StoreFailure,
  TradeChanges,
  VaultSnapshot,
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
  exportBackup(): PortfolioBackup;
  lastBackupAt(): string | null;
  /** Takes the parsed file as-is; the worker validates it again before replacing anything. */
  restoreBackup(input: unknown): Portfolio;
  exportVault(): VaultSnapshot;
  syncWith(remote: unknown): VaultSnapshot;
  syncKey(): string | null;
  setSyncKey(key: string | null): void;
  syncEstablishedVault(): string | null;
  markSyncEstablished(vaultId: string): void;
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
