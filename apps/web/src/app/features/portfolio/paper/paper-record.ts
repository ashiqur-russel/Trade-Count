/** The agent's paper portfolio as published by the signal agent after each US close. */
export interface PaperRecord {
  version: 1;
  startedOn: string;
  /** Latest close the figures use, `YYYY-MM-DD`. */
  asOf: string;
  startCash: number;
  cash: number;
  stocks: PaperStock[];
  trades: PaperTrade[];
  days: PaperDay[];
  /** The agent's orders waiting for their price; absent in records published before orders were. */
  orders?: PaperOrder[];
}

export interface PaperStock {
  symbol: string;
  name: string;
  closeEur: number;
}

export interface PaperTrade {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  shares: number;
  priceEur: number;
  date: string;
  /** ISO 8601 time the agent recorded it. */
  at: string;
  note?: string;
  /** One of the positions the paper portfolio started with. */
  start?: boolean;
}

export type PaperOrderTrigger = 'price-at-or-above' | 'price-at-or-below' | 'close-above' | 'close-below';

/** An order the agent fills on paper once its trigger is met; `info` orders only alert. */
export interface PaperOrder {
  id: string;
  symbol: string;
  action: 'buy' | 'sell' | 'info';
  trigger: PaperOrderTrigger;
  eur: number;
  shares?: number;
  from?: string;
  until?: string;
  note?: string;
}

const TRIGGERS: readonly string[] = ['price-at-or-above', 'price-at-or-below', 'close-above', 'close-below'];

/** End-of-day value of the paper portfolio, and of the start positions left untouched. */
export interface PaperDay {
  date: string;
  value: number;
  hold: number;
}

const isDate = (value: unknown) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
const isNumber = (value: unknown) => typeof value === 'number' && Number.isFinite(value);

export function parsePaperRecord(json: string): PaperRecord {
  const value = JSON.parse(json) as Partial<PaperRecord> | null;
  const symbols = new Set(Array.isArray(value?.stocks) ? value.stocks.map((s) => s?.symbol) : []);
  const valid =
    typeof value === 'object' &&
    value !== null &&
    value.version === 1 &&
    isDate(value.startedOn) &&
    isDate(value.asOf) &&
    isNumber(value.startCash) &&
    isNumber(value.cash) &&
    Array.isArray(value.stocks) &&
    value.stocks.every((s) => typeof s?.symbol === 'string' && typeof s.name === 'string' && isNumber(s.closeEur)) &&
    Array.isArray(value.trades) &&
    value.trades.every(
      (t) =>
        typeof t?.id === 'string' &&
        symbols.has(t.symbol) &&
        (t.side === 'buy' || t.side === 'sell') &&
        Number.isInteger(t.shares) &&
        t.shares > 0 &&
        isNumber(t.priceEur) &&
        isDate(t.date) &&
        typeof t.at === 'string',
    ) &&
    Array.isArray(value.days) &&
    value.days.every((d) => isDate(d?.date) && isNumber(d.value) && isNumber(d.hold)) &&
    (value.orders === undefined ||
      (Array.isArray(value.orders) &&
        value.orders.every(
          (o) =>
            typeof o?.id === 'string' &&
            symbols.has(o.symbol) &&
            ['buy', 'sell', 'info'].includes(o.action) &&
            TRIGGERS.includes(o.trigger) &&
            isNumber(o.eur) &&
            (o.shares === undefined || (Number.isInteger(o.shares) && o.shares > 0)) &&
            (o.from === undefined || isDate(o.from)) &&
            (o.until === undefined || isDate(o.until)),
        )));
  if (!valid) throw new Error('Unreadable paper record');
  return value as PaperRecord;
}
