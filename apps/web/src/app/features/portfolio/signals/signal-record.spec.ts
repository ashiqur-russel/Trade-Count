import { parseSignalRecord, SignalRecordError } from './signal-record';

const record = (signalOverrides: Record<string, unknown> = {}) =>
  JSON.stringify({
    version: 1,
    asOf: '2026-10-28',
    stocks: [
      {
        ticker: 'NVDA',
        name: 'Nvidia',
        summary: '',
        series: [
          ['2026-10-27', 196, 197, 195],
          ['2026-10-28', 193, 197, 192],
        ],
      },
    ],
    signals: [
      {
        id: 'A',
        ticker: 'NVDA',
        givenOn: '2026-10-09',
        activeFrom: '2026-10-12',
        activeTo: null,
        text: 'Sell on a close below $227',
        levelEur: 202.8,
        reachedOn: '2026-10-12',
        priceEur: 202.8,
        status: 'missed',
        resultEur: 380,
        ...signalOverrides,
      },
    ],
  });

describe('parseSignalRecord', () => {
  it('reads a record whose signals all belong to a listed stock', () => {
    const parsed = parseSignalRecord(record());

    expect(parsed.signals[0]!.status).toBe('missed');
    expect(parsed.stocks[0]!.series.length).toBe(2);
  });

  it('rejects a signal for a stock the record has no prices for', () => {
    expect(() => parseSignalRecord(record({ ticker: 'TSLA' }))).toThrowError(SignalRecordError);
  });

  it('rejects an unknown status instead of showing it unstyled', () => {
    expect(() => parseSignalRecord(record({ status: 'maybe' }))).toThrowError(SignalRecordError);
  });
});
