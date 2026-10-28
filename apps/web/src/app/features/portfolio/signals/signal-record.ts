/** The published track record: every trade signal, checked against the prices that followed. */
export interface SignalRecord {
  version: 1;
  /** Latest close the record is checked against, `YYYY-MM-DD`. */
  asOf: string;
  stocks: SignalStock[];
  signals: Signal[];
}

export interface SignalStock {
  ticker: string;
  name: string;
  summary: string;
  /** Daily `[date, close, high, low]` in euros, oldest first. */
  series: [string, number, number, number][];
}

export type SignalStatus = 'acted' | 'missed' | 'open' | 'unreached';

export interface Signal {
  id: string;
  ticker: string;
  givenOn: string;
  activeFrom: string;
  /** Last day the signal counted; `null` while it has no end date. */
  activeTo: string | null;
  text: string;
  note?: string;
  levelEur: number;
  reachedOn: string | null;
  /** Price the signal would have traded at when reached. */
  priceEur: number | null;
  status: SignalStatus;
  /** Following it compared with the latest close; for an acted signal, the actual result. */
  resultEur: number | null;
}

export class SignalRecordError extends Error {
  constructor() {
    super("The track record can't be read: the file isn't in a format this app understands.");
    this.name = 'SignalRecordError';
  }
}

const STATUSES: readonly SignalStatus[] = ['acted', 'missed', 'open', 'unreached'];
const isDate = (value: unknown) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);

export function parseSignalRecord(json: string): SignalRecord {
  const value = JSON.parse(json) as Partial<SignalRecord> | null;
  const valid =
    typeof value === 'object' &&
    value !== null &&
    value.version === 1 &&
    isDate(value.asOf) &&
    Array.isArray(value.stocks) &&
    value.stocks.every(isStockShape) &&
    Array.isArray(value.signals) &&
    value.signals.every((s) => isSignalShape(s, value.stocks!));
  if (!valid) throw new SignalRecordError();
  return value as SignalRecord;
}

function isStockShape(stock: Partial<SignalStock> | null): boolean {
  return (
    typeof stock === 'object' &&
    stock !== null &&
    typeof stock.ticker === 'string' &&
    typeof stock.name === 'string' &&
    Array.isArray(stock.series) &&
    stock.series.length > 1
  );
}

function isSignalShape(signal: Partial<Signal> | null, stocks: SignalStock[]): boolean {
  return (
    typeof signal === 'object' &&
    signal !== null &&
    typeof signal.id === 'string' &&
    stocks.some((s) => s.ticker === signal.ticker) &&
    isDate(signal.givenOn) &&
    isDate(signal.activeFrom) &&
    typeof signal.text === 'string' &&
    typeof signal.levelEur === 'number' &&
    STATUSES.includes(signal.status as SignalStatus)
  );
}
