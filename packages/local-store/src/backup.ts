import { findOversells, computeLedger, type Portfolio } from '@trade-count/ledger';
import {
  assertUnique,
  invalid,
  isIsoTime,
  isRecord,
  parseStockRecord,
  parseTradeRecord,
} from './record-parsing.js';

export const BACKUP_FORMAT = 'trade-count-backup';
export const BACKUP_VERSION = 1;

/** A complete, portable copy of one device's portfolio. */
export interface PortfolioBackup extends Portfolio {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  exportedAt: string;
}

export function createBackup(portfolio: Portfolio, exportedAt: Date): PortfolioBackup {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: exportedAt.toISOString(),
    stocks: portfolio.stocks,
    trades: portfolio.trades,
  };
}

export function backupFileName(exportedAt: Date): string {
  return `trade-count-backup-${exportedAt.toISOString().slice(0, 10)}.json`;
}

/**
 * Checks an untrusted, already JSON-parsed file and returns it as a backup, or throws a StoreError
 * saying what is wrong. Nothing in a rejected file ever reaches the database.
 */
export function parseBackup(input: unknown): PortfolioBackup {
  if (!isRecord(input) || input['format'] !== BACKUP_FORMAT) {
    throw invalid("This file isn't a Trade Count backup.");
  }
  if (typeof input['version'] !== 'number' || input['version'] > BACKUP_VERSION) {
    throw invalid('This backup was made by a newer version of Trade Count. Update the app, then import it.');
  }
  if (!isIsoTime(input['exportedAt'])) {
    throw invalid('This backup has no valid export date.');
  }
  if (!Array.isArray(input['stocks']) || !Array.isArray(input['trades'])) {
    throw invalid('This backup is missing its stocks or trades.');
  }

  const stocks = input['stocks'].map((raw, i) => parseStockRecord(raw, i + 1, 'this backup'));
  const trades = input['trades'].map((raw, i) => parseTradeRecord(raw, i + 1, 'this backup'));
  assertUnique(stocks.map((s) => s.id), 'This backup lists the same stock twice.');
  assertUnique(stocks.map((s) => s.name.normalize('NFC').toLowerCase()), 'This backup lists the same stock name twice.');
  assertUnique(trades.map((t) => t.id), 'This backup lists the same trade twice.');

  const stockIds = new Set(stocks.map((s) => s.id));
  const orphan = trades.find((t) => !stockIds.has(t.stockId));
  if (orphan) throw invalid('This backup has a trade for a stock that is not in it.');

  const oversell = findOversells(computeLedger(stocks, trades))[0];
  if (oversell) {
    throw invalid(`This backup sells ${oversell.stock.name} shares that weren't held on ${oversell.sale.sell.tradedOn}.`);
  }

  return { format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: input['exportedAt'], stocks, trades };
}
