/** The sample year from the Reports design, as a backup file the app can import. */
export function sampleYearBackup(): string {
  const at = (date: string, n: number) => `${date}T10:00:0${n}.000Z`;
  const trade = (id: string, stockId: string, side: 'buy' | 'sell', quantity: string, price: string, tradedOn: string, n = 0) => ({
    id,
    stockId,
    side,
    quantity,
    price,
    tradedOn,
    createdAt: at(tradedOn, n),
  });
  return JSON.stringify({
    format: 'trade-count-backup',
    version: 1,
    exportedAt: '2026-10-06T10:00:00.000Z',
    stocks: [
      { id: 'acme', name: 'Acme Corp', symbol: 'ACME' },
      { id: 'globex', name: 'Globex', symbol: null },
    ],
    trades: [
      trade('t1', 'acme', 'buy', '5', '100', '2026-01-12'),
      trade('t2', 'globex', 'buy', '10', '50', '2026-02-10'),
      trade('t3', 'acme', 'buy', '3', '110', '2026-03-03'),
      trade('t4', 'acme', 'sell', '4', '120', '2026-04-14'),
      trade('t5', 'acme', 'buy', '4', '95', '2026-05-20'),
      trade('t6', 'acme', 'sell', '3', '105', '2026-08-02'),
      trade('t7', 'globex', 'sell', '6', '58', '2026-09-15'),
    ],
  });
}
