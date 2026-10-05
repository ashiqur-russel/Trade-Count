import type { Stock, Trade } from '@trade-count/ledger';
import {
  assertUnique,
  invalid,
  isId,
  isIsoTime,
  isRecord,
  parseStockRecord,
  parseTradeRecord,
} from './record-parsing.js';

export const VAULT_DATA_FORMAT = 'trade-count-vault-data';
export const VAULT_DATA_VERSION = 1;

export interface SyncedStock extends Stock {
  updatedAt: string;
}

export interface SyncedTrade extends Trade {
  updatedAt: string;
}

/** Remembers a deleted record so the deletion reaches other devices too. */
export interface Deletion {
  kind: 'stock' | 'trade';
  id: string;
  deletedAt: string;
}

/** Everything one device knows, including deletions; this is what gets encrypted and synced. */
export interface VaultSnapshot {
  format: typeof VAULT_DATA_FORMAT;
  version: typeof VAULT_DATA_VERSION;
  stocks: SyncedStock[];
  trades: SyncedTrade[];
  deletions: Deletion[];
}

/** Checks decrypted, untrusted sync data; cross-record rules are checked when merging. */
export function parseVaultSnapshot(input: unknown): VaultSnapshot {
  if (!isRecord(input) || input['format'] !== VAULT_DATA_FORMAT) throw invalid("The synced data isn't Trade Count data.");
  if (typeof input['version'] !== 'number' || input['version'] > VAULT_DATA_VERSION) {
    throw invalid('Your other device runs a newer version of Trade Count. Update this app to sync.');
  }
  if (!Array.isArray(input['stocks']) || !Array.isArray(input['trades']) || !Array.isArray(input['deletions'])) {
    throw invalid('The synced data is incomplete.');
  }

  const stocks = input['stocks'].map((raw, i) => ({
    ...parseStockRecord(raw, i + 1, 'the synced data'),
    updatedAt: updatedAt(raw, `Stock ${i + 1}`),
  }));
  const trades = input['trades'].map((raw, i) => ({
    ...parseTradeRecord(raw, i + 1, 'the synced data'),
    updatedAt: updatedAt(raw, `Trade ${i + 1}`),
  }));
  const deletions = input['deletions'].map(parseDeletion);
  assertUnique(stocks.map((s) => s.id), 'The synced data lists the same stock twice.');
  assertUnique(trades.map((t) => t.id), 'The synced data lists the same trade twice.');

  return { format: VAULT_DATA_FORMAT, version: VAULT_DATA_VERSION, stocks, trades, deletions };
}

function updatedAt(raw: unknown, where: string): string {
  const value = isRecord(raw) ? raw['updatedAt'] : undefined;
  if (!isIsoTime(value)) throw invalid(`${where} in the synced data is damaged.`);
  return new Date(value).toISOString();
}

function parseDeletion(raw: unknown, index: number): Deletion {
  if (
    !isRecord(raw) ||
    (raw['kind'] !== 'stock' && raw['kind'] !== 'trade') ||
    !isId(raw['id']) ||
    !isIsoTime(raw['deletedAt'])
  ) {
    throw invalid(`Deletion ${index + 1} in the synced data is damaged.`);
  }
  return { kind: raw['kind'], id: raw['id'], deletedAt: new Date(raw['deletedAt']).toISOString() };
}
