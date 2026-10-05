import { findOversells, computeLedger, type Portfolio, type Stock, type Trade } from '@trade-count/ledger';
import { validName, validSymbol, validTradeFields } from './record-validation.js';
import { StoreError } from './store-error.js';

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
  if (typeof input['exportedAt'] !== 'string' || Number.isNaN(Date.parse(input['exportedAt']))) {
    throw invalid('This backup has no valid export date.');
  }
  if (!Array.isArray(input['stocks']) || !Array.isArray(input['trades'])) {
    throw invalid('This backup is missing its stocks or trades.');
  }

  const stocks = input['stocks'].map((raw, i) => parseStock(raw, i + 1));
  const trades = input['trades'].map((raw, i) => parseTrade(raw, i + 1));
  assertUnique(stocks.map((s) => s.id), 'stock');
  assertUnique(stocks.map((s) => s.name.normalize('NFC').toLowerCase()), 'stock name');
  assertUnique(trades.map((t) => t.id), 'trade');

  const stockIds = new Set(stocks.map((s) => s.id));
  const orphan = trades.find((t) => !stockIds.has(t.stockId));
  if (orphan) throw invalid('This backup has a trade for a stock that is not in it.');

  const oversell = findOversells(computeLedger(stocks, trades))[0];
  if (oversell) {
    throw invalid(`This backup sells ${oversell.stock.name} shares that weren't held on ${oversell.sale.sell.tradedOn}.`);
  }

  return { format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: input['exportedAt'], stocks, trades };
}

function parseStock(raw: unknown, position: number): Stock {
  if (!isRecord(raw) || !isId(raw['id'])) throw invalid(`Stock ${position} in this backup is damaged.`);
  return { id: raw['id'], name: inRecord(() => validName(raw['name']), position, 'Stock'), symbol: inRecord(() => validSymbol(raw['symbol']), position, 'Stock') };
}

function parseTrade(raw: unknown, position: number): Trade {
  if (!isRecord(raw) || !isId(raw['id']) || typeof raw['createdAt'] !== 'string' || Number.isNaN(Date.parse(raw['createdAt']))) {
    throw invalid(`Trade ${position} in this backup is damaged.`);
  }
  const fields = inRecord(
    () =>
      validTradeFields({
        stockId: raw['stockId'] as string,
        side: raw['side'] as Trade['side'],
        quantity: raw['quantity'] as string,
        price: raw['price'] as string,
        tradedOn: raw['tradedOn'] as string,
      }),
    position,
    'Trade',
  );
  return { id: raw['id'], ...fields, createdAt: new Date(raw['createdAt']).toISOString() };
}

/** Prefixes a field rule's message with where in the file it failed. */
function inRecord<T>(read: () => T, position: number, kind: 'Stock' | 'Trade'): T {
  try {
    return read();
  } catch (error) {
    if (error instanceof StoreError) throw invalid(`${kind} ${position} in this backup: ${error.message}`);
    throw error;
  }
}

function assertUnique(values: string[], kind: string): void {
  if (new Set(values).size !== values.length) throw invalid(`This backup lists the same ${kind} twice.`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 64;
}

function invalid(message: string): StoreError {
  return new StoreError('INVALID', message);
}
