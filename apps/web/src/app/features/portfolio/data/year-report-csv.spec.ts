import { yearReport, type Stock, type Trade } from '@trade-count/ledger';
import { yearReportCsv } from './year-report-csv';

const acme: Stock = { id: 's1', name: 'Acme; "Holdings"', symbol: null };
const trade = (
  id: string,
  side: Trade['side'],
  quantity: string,
  price: string,
  tradedOn: string,
): Trade => ({
  id,
  stockId: acme.id,
  side,
  quantity,
  price,
  tradedOn,
  createdAt: `${tradedOn}T10:00:00.000Z`,
});

describe('yearReportCsv', () => {
  const report = yearReport(
    [acme],
    [
      trade('b1', 'buy', '1', '100', '2026-01-12'),
      trade('b2', 'buy', '2', '110', '2026-03-03'),
      trade('s1', 'sell', '3', '105', '2026-08-02'),
    ],
    2026,
    '0.26375',
  );
  const lines = yearReportCsv(report).replace('﻿', '').trimEnd().split('\r\n');

  it('starts with a byte-order mark and uses semicolons with decimal commas', () => {
    expect(yearReportCsv(report).startsWith('﻿')).toBe(true);
    expect(lines[1]).toBe('2026-08-02;"Acme; ""Holdings""";1;105;2026-01-12;100;5;;-5;0;-5');
  });

  it('writes one line per lot a sale used', () => {
    expect(lines).toHaveLength(3);
    expect(lines[2]).toContain(';2;105;2026-03-03;110;-5;;');
  });
});
