import type { Stock, Trade } from '@trade-count/ledger';
import { validName, validSymbol, validTradeFields } from './record-validation.js';
import { StoreError } from './store-error.js';

/** Where untrusted records came from, for messages like "Trade 3 in this backup: …". */
export type RecordSource = 'this backup' | 'the synced data';

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 64;
}

export function isIsoTime(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

export function parseStockRecord(raw: unknown, position: number, source: RecordSource): Stock {
  if (!isRecord(raw) || !isId(raw['id'])) throw invalid(`Stock ${position} in ${source} is damaged.`);
  return {
    id: raw['id'],
    name: inRecord(() => validName(raw['name']), `Stock ${position} in ${source}`),
    symbol: inRecord(() => validSymbol(raw['symbol']), `Stock ${position} in ${source}`),
  };
}

export function parseTradeRecord(raw: unknown, position: number, source: RecordSource): Trade {
  if (!isRecord(raw) || !isId(raw['id']) || !isIsoTime(raw['createdAt'])) {
    throw invalid(`Trade ${position} in ${source} is damaged.`);
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
    `Trade ${position} in ${source}`,
  );
  return { id: raw['id'], ...fields, createdAt: new Date(raw['createdAt']).toISOString() };
}

export function assertUnique(values: string[], message: string): void {
  if (new Set(values).size !== values.length) throw invalid(message);
}

export function invalid(message: string): StoreError {
  return new StoreError('INVALID', message);
}

/** Prefixes a field rule's message with where in the file it failed. */
function inRecord<T>(read: () => T, where: string): T {
  try {
    return read();
  } catch (error) {
    if (error instanceof StoreError) throw invalid(`${where}: ${error.message}`);
    throw error;
  }
}
