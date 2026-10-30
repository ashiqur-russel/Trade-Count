import { paperFigures } from './paper-figures';
import { parsePaperRecord, type PaperRecord } from './paper-record';

const record: PaperRecord = {
  version: 1,
  startedOn: '2026-10-30',
  asOf: '2026-11-03',
  startCash: 1000,
  cash: 1000 + 10 * 370 - 3 * 140,
  stocks: [
    { symbol: 'TSLA', name: 'Tesla', closeEur: 360 },
    { symbol: 'PLTR', name: 'Palantir', closeEur: 150 },
  ],
  trades: [
    { id: 'start-tsla', symbol: 'TSLA', side: 'buy', shares: 35, priceEur: 358, date: '2026-10-30', at: '2026-10-30T20:00:00Z', start: true },
    { id: 'sell', symbol: 'TSLA', side: 'sell', shares: 10, priceEur: 370, date: '2026-11-02', at: '2026-11-02T15:00:00Z' },
    { id: 'buy', symbol: 'PLTR', side: 'buy', shares: 3, priceEur: 140, date: '2026-11-03', at: '2026-11-03T15:00:00Z' },
  ],
  days: [{ date: '2026-10-30', value: 13530, hold: 13530 }],
};

const money = (value: { toFixed(dp: number): string }) => value.toFixed(2);

describe('paperFigures', () => {
  it('values the paper portfolio at the latest close and compares it with holding the start positions', () => {
    const figures = paperFigures(record);

    expect(money(figures.startValue)).toBe('13530.00');
    expect(money(figures.value)).toBe('13730.00');
    expect(money(figures.hold)).toBe('13600.00');
    expect(money(figures.versusHold)).toBe('130.00');
    expect(money(figures.realized)).toBe('120.00');
  });

  it('lists the open positions with FIFO average price and unrealized result', () => {
    const [tesla, palantir] = paperFigures(record).positions;

    expect(tesla!.shares.toString()).toBe('25');
    expect(money(tesla!.unrealized)).toBe('50.00');
    expect(money(palantir!.averagePrice)).toBe('140.00');
    expect(money(palantir!.unrealized)).toBe('30.00');
  });
});

describe('parsePaperRecord', () => {
  it('accepts a published record and rejects a trade in a stock it does not list', () => {
    expect(parsePaperRecord(JSON.stringify(record)).trades).toHaveLength(3);
    const bad = { ...record, trades: [{ ...record.trades[0], symbol: 'AMD' }] };
    expect(() => parsePaperRecord(JSON.stringify(bad))).toThrow();
  });
});
