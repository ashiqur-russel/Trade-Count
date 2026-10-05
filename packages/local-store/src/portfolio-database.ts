import type { Database, SqlValue } from '@sqlite.org/sqlite-wasm';
import {
  describeOversell,
  findOversellCausedBy,
  type Portfolio,
  type Stock,
  type Trade,
  type TradeChange,
  type TradeSide,
} from '@trade-count/ledger';
import { createBackup, parseBackup, type PortfolioBackup } from './backup.js';
import { mergeVaults } from './vault-merge.js';
import {
  VAULT_DATA_FORMAT,
  VAULT_DATA_VERSION,
  parseVaultSnapshot,
  type VaultSnapshot,
} from './vault-snapshot.js';
import { validName, validSymbol, validTradeFields } from './record-validation.js';
import { migrate } from './schema.js';
import { StoreError } from './store-error.js';
import type { NewStock, NewTrade, StockChanges, TradeChanges } from './store-inputs.js';

export interface PortfolioDatabaseOptions {
  now?: () => Date;
  newId?: () => string;
  /** How dates read in user-facing messages; ISO by default. */
  formatDate?: (isoDate: string) => string;
}

type Row = Record<string, SqlValue>;

const TRADE_COLUMNS = 'id, stock_id, side, quantity, price, traded_on, created_at';
const DRAFT_ID = 'draft';

/**
 * The portfolio stored on this device. Every write runs in one SQLite transaction and is refused,
 * with a message for the user, if it breaks a rule (duplicate name, selling shares not held, …).
 */
export class PortfolioDatabase {
  private readonly now: () => Date;
  private readonly newId: () => string;
  private readonly formatDate: (isoDate: string) => string;
  /** Entry times must strictly increase: they order trades made on the same day. */
  private lastCreatedAt: number;

  constructor(
    private readonly db: Database,
    options: PortfolioDatabaseOptions = {},
  ) {
    this.now = options.now ?? (() => new Date());
    this.newId = options.newId ?? (() => crypto.randomUUID());
    this.formatDate = options.formatDate ?? ((isoDate) => isoDate);
    migrate(db);
    const latest = db.selectValue('SELECT max(created_at) FROM trades');
    this.lastCreatedAt = typeof latest === 'string' ? Date.parse(latest) : 0;
  }

  getPortfolio(): Portfolio {
    return {
      stocks: this.db.selectObjects('SELECT id, name, symbol FROM stocks ORDER BY name_key').map(toStock),
      trades: this.db
        .selectObjects(`SELECT ${TRADE_COLUMNS} FROM trades ORDER BY stock_id, traded_on, created_at`)
        .map(toTrade),
    };
  }

  createStock(input: NewStock): Stock {
    const name = validName(input.name);
    const symbol = validSymbol(input.symbol);
    return this.db.transaction('IMMEDIATE', () => {
      this.assertNameFree(name);
      const stock: Stock = { id: this.newId(), name, symbol };
      const at = this.now().toISOString();
      this.db.exec(
        'INSERT INTO stocks (id, name, name_key, symbol, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        { bind: [stock.id, name, nameKey(name), symbol, at, at] },
      );
      return stock;
    });
  }

  updateStock(id: string, changes: StockChanges): Stock {
    return this.db.transaction('IMMEDIATE', () => {
      const current = this.findStock(id);
      const name = changes.name === undefined ? current.name : validName(changes.name);
      const symbol = changes.symbol === undefined ? current.symbol : validSymbol(changes.symbol);
      this.assertNameFree(name, id);
      this.db.exec('UPDATE stocks SET name = ?, name_key = ?, symbol = ?, updated_at = ? WHERE id = ?', {
        bind: [name, nameKey(name), symbol, this.now().toISOString(), id],
      });
      return { id, name, symbol };
    });
  }

  deleteStock(id: string): void {
    this.db.transaction('IMMEDIATE', () => {
      this.findStock(id);
      if (this.db.selectValue('SELECT 1 FROM trades WHERE stock_id = ? LIMIT 1', [id]) !== undefined) {
        throw new StoreError('CONFLICT', 'This stock still has trades. Delete its trades first.');
      }
      this.db.exec('DELETE FROM stocks WHERE id = ?', { bind: [id] });
      this.recordDeletion('stock', id);
    });
  }

  createTrade(input: NewTrade): Trade {
    const fields = validTradeFields(input);
    return this.db.transaction('IMMEDIATE', () => {
      const draft: Trade = { id: DRAFT_ID, ...fields, createdAt: this.nextCreatedAt() };
      this.assertNoOversell([fields.stockId], { type: 'add', trade: draft }, DRAFT_ID);

      const trade: Trade = { ...draft, id: this.newId() };
      this.db.exec(
        `INSERT INTO trades (${TRADE_COLUMNS}, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        {
          bind: [
            trade.id,
            trade.stockId,
            trade.side,
            trade.quantity,
            trade.price,
            trade.tradedOn,
            trade.createdAt,
            trade.createdAt,
          ],
        },
      );
      return trade;
    });
  }

  updateTrade(id: string, changes: TradeChanges): Trade {
    return this.db.transaction('IMMEDIATE', () => {
      const current = this.findTrade(id);
      const next: Trade = { ...current, ...validTradeFields({ ...current, ...definedOnly(changes) }) };
      this.assertNoOversell([current.stockId, next.stockId], { type: 'update', trade: next }, id);

      this.db.exec(
        `UPDATE trades SET stock_id = ?, side = ?, quantity = ?, price = ?, traded_on = ?, updated_at = ?
         WHERE id = ?`,
        { bind: [next.stockId, next.side, next.quantity, next.price, next.tradedOn, this.now().toISOString(), id] },
      );
      return next;
    });
  }

  deleteTrade(id: string): void {
    this.db.transaction('IMMEDIATE', () => {
      const current = this.findTrade(id);
      this.assertNoOversell([current.stockId], { type: 'remove', tradeId: id }, id);
      this.db.exec('DELETE FROM trades WHERE id = ?', { bind: [id] });
      this.recordDeletion('trade', id);
    });
  }

  /** A full copy of the data; also remembered as the latest backup. */
  exportBackup(): PortfolioBackup {
    const backup = createBackup(this.getPortfolio(), this.now());
    this.setMeta('last_backup_at', backup.exportedAt);
    return backup;
  }

  /** When the data was last exported or restored, or null if never. */
  lastBackupAt(): string | null {
    const value = this.db.selectValue("SELECT value FROM app_meta WHERE key = 'last_backup_at'");
    return typeof value === 'string' ? value : null;
  }

  /** Replaces everything with a backup in one transaction: on any failure the current data stays. */
  restoreBackup(input: unknown): Portfolio {
    const backup = parseBackup(input);
    this.db.transaction('IMMEDIATE', () => {
      const at = this.now().toISOString();
      const restoredIds = new Set([...backup.stocks, ...backup.trades].map((r) => r.id));
      // Removed records become deletions, so syncing an older device can't bring them back.
      for (const row of this.db.selectObjects("SELECT 'stock' AS kind, id FROM stocks UNION ALL SELECT 'trade', id FROM trades")) {
        if (!restoredIds.has(String(row['id']))) this.recordDeletion(row['kind'] as 'stock' | 'trade', String(row['id']));
      }
      for (const id of restoredIds) this.db.exec('DELETE FROM deletions WHERE id = ?', { bind: [id] });
      this.db.exec('DELETE FROM trades');
      this.db.exec('DELETE FROM stocks');
      for (const stock of backup.stocks) {
        this.db.exec(
          'INSERT INTO stocks (id, name, name_key, symbol, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
          { bind: [stock.id, stock.name, nameKey(stock.name), stock.symbol, at, at] },
        );
      }
      for (const trade of backup.trades) {
        this.db.exec(`INSERT INTO trades (${TRADE_COLUMNS}, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, {
          bind: [trade.id, trade.stockId, trade.side, trade.quantity, trade.price, trade.tradedOn, trade.createdAt, at],
        });
      }
      this.setMeta('last_backup_at', backup.exportedAt);
    });
    this.lastCreatedAt = Math.max(0, ...backup.trades.map((t) => Date.parse(t.createdAt)));
    return this.getPortfolio();
  }

  /** Everything this device knows, with change times and deletions, ready to be encrypted and synced. */
  exportVault(): VaultSnapshot {
    const stocks = this.db
      .selectObjects('SELECT id, name, symbol, updated_at FROM stocks ORDER BY id')
      .map((row) => ({ ...toStock(row), updatedAt: String(row['updated_at']) }));
    const trades = this.db
      .selectObjects(`SELECT ${TRADE_COLUMNS}, updated_at FROM trades ORDER BY id`)
      .map((row) => ({ ...toTrade(row), updatedAt: String(row['updated_at']) }));
    const deletions = this.db
      .selectObjects('SELECT kind, id, deleted_at FROM deletions ORDER BY kind, id')
      .map((row) => ({ kind: row['kind'] as 'stock' | 'trade', id: String(row['id']), deletedAt: String(row['deleted_at']) }));
    return { format: VAULT_DATA_FORMAT, version: VAULT_DATA_VERSION, stocks, trades, deletions };
  }

  /**
   * Merges another device's (decrypted, untrusted) data into this one and returns the merged
   * snapshot to upload. If the merge is refused or invalid, nothing changes here.
   */
  syncWith(remote: unknown): VaultSnapshot {
    const merged = mergeVaults(this.exportVault(), parseVaultSnapshot(remote), this.formatDate);
    this.db.transaction('IMMEDIATE', () => {
      this.db.exec('DELETE FROM trades');
      this.db.exec('DELETE FROM stocks');
      this.db.exec('DELETE FROM deletions');
      for (const stock of merged.stocks) {
        this.db.exec(
          'INSERT INTO stocks (id, name, name_key, symbol, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
          { bind: [stock.id, stock.name, nameKey(stock.name), stock.symbol, stock.updatedAt, stock.updatedAt] },
        );
      }
      for (const trade of merged.trades) {
        this.db.exec(`INSERT INTO trades (${TRADE_COLUMNS}, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, {
          bind: [trade.id, trade.stockId, trade.side, trade.quantity, trade.price, trade.tradedOn, trade.createdAt, trade.updatedAt],
        });
      }
      for (const deletion of merged.deletions) {
        this.db.exec('INSERT INTO deletions (kind, id, deleted_at) VALUES (?, ?, ?)', {
          bind: [deletion.kind, deletion.id, deletion.deletedAt],
        });
      }
    });
    this.lastCreatedAt = Math.max(this.lastCreatedAt, ...merged.trades.map((t) => Date.parse(t.createdAt)));
    return merged;
  }

  private recordDeletion(kind: 'stock' | 'trade', id: string): void {
    this.db.exec(
      'INSERT INTO deletions (kind, id, deleted_at) VALUES (?, ?, ?) ON CONFLICT (kind, id) DO UPDATE SET deleted_at = excluded.deleted_at',
      { bind: [kind, id, this.now().toISOString()] },
    );
  }

  private setMeta(key: string, value: string): void {
    this.db.exec('INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value', {
      bind: [key, value],
    });
  }

  private findStock(id: string): Stock {
    const row = this.db.selectObject('SELECT id, name, symbol FROM stocks WHERE id = ?', [id]);
    if (!row) throw new StoreError('NOT_FOUND', 'Stock not found.');
    return toStock(row);
  }

  private findTrade(id: string): Trade {
    const row = this.db.selectObject(`SELECT ${TRADE_COLUMNS} FROM trades WHERE id = ?`, [id]);
    if (!row) throw new StoreError('NOT_FOUND', 'Trade not found.');
    return toTrade(row);
  }

  private assertNameFree(name: string, exceptId?: string): void {
    const taken = this.db.selectValue('SELECT id FROM stocks WHERE name_key = ? AND id IS NOT ?', [
      nameKey(name),
      exceptId ?? null,
    ]);
    if (taken !== undefined) throw new StoreError('CONFLICT', `${name} is already in your list.`);
  }

  private assertNoOversell(stockIds: string[], change: TradeChange, changedTradeId: string): void {
    const ids = [...new Set(stockIds)];
    const placeholders = ids.map(() => '?').join(', ');
    const stocks = this.db
      .selectObjects(`SELECT id, name, symbol FROM stocks WHERE id IN (${placeholders})`, ids)
      .map(toStock);
    if (stocks.length !== ids.length) throw new StoreError('NOT_FOUND', 'Stock not found.');

    const trades = this.db
      .selectObjects(`SELECT ${TRADE_COLUMNS} FROM trades WHERE stock_id IN (${placeholders})`, ids)
      .map(toTrade);
    const oversell = findOversellCausedBy(stocks, trades, change);
    if (oversell) throw new StoreError('CONFLICT', describeOversell(oversell, changedTradeId, this.formatDate));
  }

  private nextCreatedAt(): string {
    this.lastCreatedAt = Math.max(this.now().getTime(), this.lastCreatedAt + 1);
    return new Date(this.lastCreatedAt).toISOString();
  }
}

function toStock(row: Row): Stock {
  return { id: String(row['id']), name: String(row['name']), symbol: row['symbol'] === null ? null : String(row['symbol']) };
}

function toTrade(row: Row): Trade {
  return {
    id: String(row['id']),
    stockId: String(row['stock_id']),
    side: row['side'] as TradeSide,
    quantity: String(row['quantity']),
    price: String(row['price']),
    tradedOn: String(row['traded_on']),
    createdAt: String(row['created_at']),
  };
}

function nameKey(name: string): string {
  return name.normalize('NFC').toLowerCase();
}

function definedOnly<T extends object>(changes: T): Partial<T> {
  return Object.fromEntries(Object.entries(changes).filter(([, value]) => value !== undefined)) as Partial<T>;
}
