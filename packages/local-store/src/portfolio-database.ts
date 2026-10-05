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
import { PRICE_LIMITS, QUANTITY_LIMITS, canonicalDecimal } from './decimal-text.js';
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
const SYMBOL_PATTERN = /^[A-Z0-9.-]{1,12}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
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

function validName(value: unknown): string {
  const name = typeof value === 'string' ? value.trim() : '';
  if (name.length < 1 || name.length > 60) throw new StoreError('INVALID', "Enter the stock's name (up to 60 characters).");
  return name;
}

function validSymbol(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const symbol = typeof value === 'string' ? value.trim().toUpperCase() : '';
  if (symbol === '') return null;
  if (!SYMBOL_PATTERN.test(symbol)) {
    throw new StoreError('INVALID', 'Symbols use letters, digits, dots and dashes, up to 12 characters.');
  }
  return symbol;
}

function validTradeFields(input: NewTrade): NewTrade {
  if (typeof input.stockId !== 'string' || input.stockId === '') throw new StoreError('INVALID', 'Choose a stock.');
  if (input.side !== 'buy' && input.side !== 'sell') throw new StoreError('INVALID', 'Choose buy or sell.');
  const quantity = canonicalDecimal(input.quantity, QUANTITY_LIMITS);
  if (!quantity) throw new StoreError('INVALID', 'Enter a quantity above 0, with up to 6 decimals.');
  const price = canonicalDecimal(input.price, PRICE_LIMITS);
  if (!price) throw new StoreError('INVALID', 'Enter a price above 0, with up to 4 decimals.');
  if (!isCalendarDate(input.tradedOn)) throw new StoreError('INVALID', 'Enter a date like 2026-10-05.');
  return { stockId: input.stockId, side: input.side, quantity, price, tradedOn: input.tradedOn };
}

function isCalendarDate(value: unknown): value is string {
  return typeof value === 'string' && DATE_PATTERN.test(value) && !Number.isNaN(Date.parse(value)) &&
    new Date(`${value}T00:00:00Z`).toISOString().startsWith(value);
}

function definedOnly<T extends object>(changes: T): Partial<T> {
  return Object.fromEntries(Object.entries(changes).filter(([, value]) => value !== undefined)) as Partial<T>;
}
