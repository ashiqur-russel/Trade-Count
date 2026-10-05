import { PRICE_LIMITS, QUANTITY_LIMITS, canonicalDecimal } from './decimal-text.js';
import { StoreError } from './store-error.js';
import type { NewTrade } from './store-inputs.js';

const SYMBOL_PATTERN = /^[A-Z0-9.-]{1,12}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function validName(value: unknown): string {
  const name = typeof value === 'string' ? value.trim() : '';
  if (name.length < 1 || name.length > 60) throw new StoreError('INVALID', "Enter the stock's name (up to 60 characters).");
  return name;
}

export function validSymbol(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const symbol = typeof value === 'string' ? value.trim().toUpperCase() : '';
  if (symbol === '') return null;
  if (!SYMBOL_PATTERN.test(symbol)) {
    throw new StoreError('INVALID', 'Symbols use letters, digits, dots and dashes, up to 12 characters.');
  }
  return symbol;
}

export function validTradeFields(input: NewTrade): NewTrade {
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
