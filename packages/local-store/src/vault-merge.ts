import { computeLedger, describeOversell, findOversells } from '@trade-count/ledger';
import { StoreError } from './store-error.js';
import {
  VAULT_DATA_FORMAT,
  VAULT_DATA_VERSION,
  type Deletion,
  type SyncedStock,
  type SyncedTrade,
  type VaultSnapshot,
} from './vault-snapshot.js';

const NAME_MAX = 60;

/**
 * Combines two devices' data record by record: the newest edit or deletion of each record wins.
 * The result is the same whichever side is `a`, so devices converge. Throws a CONFLICT StoreError
 * when the combined history would sell shares that weren't held.
 */
export function mergeVaults(
  a: VaultSnapshot,
  b: VaultSnapshot,
  formatDate: (isoDate: string) => string = (isoDate) => isoDate,
): VaultSnapshot {
  const deletions = latestDeletions([...a.deletions, ...b.deletions]);
  const stocks = mergeRecords('stock', a.stocks, b.stocks, deletions);
  const trades = mergeRecords('trade', a.trades, b.trades, deletions);

  keepStocksThatHaveTrades(stocks, trades, deletions, [...a.stocks, ...b.stocks]);
  renameClashingStocks(stocks);

  const merged: VaultSnapshot = {
    format: VAULT_DATA_FORMAT,
    version: VAULT_DATA_VERSION,
    stocks: [...stocks.values()].sort(byId),
    trades: [...trades.values()].sort(byId),
    deletions: [...deletions.values()].sort((x, y) => key(x.kind, x.id).localeCompare(key(y.kind, y.id))),
  };

  const oversell = findOversells(computeLedger(merged.stocks, merged.trades))[0];
  if (oversell) {
    throw new StoreError(
      'CONFLICT',
      `Changes from your other device conflict with this one: ${describeOversell(oversell, '', formatDate)}`,
    );
  }
  return merged;
}

function mergeRecords<T extends { id: string; updatedAt: string }>(
  kind: Deletion['kind'],
  a: readonly T[],
  b: readonly T[],
  deletions: Map<string, Deletion>,
): Map<string, T> {
  const candidates = new Map<string, T>();
  for (const record of [...a, ...b]) {
    const current = candidates.get(record.id);
    candidates.set(record.id, current ? newer(current, record) : record);
  }

  const merged = new Map<string, T>();
  for (const [id, record] of candidates) {
    const deletion = deletions.get(key(kind, id));
    if (deletion && deletion.deletedAt >= record.updatedAt) continue;
    deletions.delete(key(kind, id));
    merged.set(id, record);
  }
  return merged;
}

/** A stock can only be deleted while it has no trades, so a trade added elsewhere brings it back. */
function keepStocksThatHaveTrades(
  stocks: Map<string, SyncedStock>,
  trades: Map<string, SyncedTrade>,
  deletions: Map<string, Deletion>,
  allStockVersions: readonly SyncedStock[],
): void {
  for (const trade of trades.values()) {
    if (stocks.has(trade.stockId)) continue;
    const versions = allStockVersions.filter((s) => s.id === trade.stockId);
    if (versions.length === 0) {
      throw new StoreError('CONFLICT', 'A synced trade belongs to a stock that no longer exists on any device.');
    }
    stocks.set(trade.stockId, versions.reduce(newer));
    deletions.delete(key('stock', trade.stockId));
  }
}

/** Two devices may each add "Tesla"; keep both, renaming the later id "Tesla (2)" so nothing is merged silently. */
function renameClashingStocks(stocks: Map<string, SyncedStock>): void {
  const taken = new Set<string>();
  for (const stock of [...stocks.values()].sort(byId)) {
    let name = stock.name;
    for (let n = 2; taken.has(nameKey(name)); n++) {
      const suffix = ` (${n})`;
      name = stock.name.slice(0, NAME_MAX - suffix.length) + suffix;
    }
    taken.add(nameKey(name));
    if (name !== stock.name) stocks.set(stock.id, { ...stock, name });
  }
}

function latestDeletions(all: readonly Deletion[]): Map<string, Deletion> {
  const latest = new Map<string, Deletion>();
  for (const deletion of all) {
    const k = key(deletion.kind, deletion.id);
    const current = latest.get(k);
    if (!current || deletion.deletedAt > current.deletedAt) latest.set(k, deletion);
  }
  return latest;
}

/** Newest edit wins; identical times fall back to comparing content so every device picks the same one. */
function newer<T extends { updatedAt: string }>(x: T, y: T): T {
  if (x.updatedAt !== y.updatedAt) return x.updatedAt > y.updatedAt ? x : y;
  return JSON.stringify(x) >= JSON.stringify(y) ? x : y;
}

function byId(x: { id: string }, y: { id: string }): number {
  return x.id < y.id ? -1 : x.id > y.id ? 1 : 0;
}

function key(kind: Deletion['kind'], id: string): string {
  return `${kind}:${id}`;
}

function nameKey(name: string): string {
  return name.normalize('NFC').toLowerCase();
}
