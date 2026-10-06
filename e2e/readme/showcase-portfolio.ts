/** A made-up portfolio for the README screenshots: three fictional companies over 2026. */
export function showcaseBackup(): string {
  let entry = 0;
  const trade = (stockId: string, side: 'buy' | 'sell', quantity: string, price: string, tradedOn: string) => ({
    id: `showcase-${++entry}`,
    stockId,
    side,
    quantity,
    price,
    tradedOn,
    createdAt: `${tradedOn}T09:00:${String(entry).padStart(2, '0')}.000Z`,
  });
  return JSON.stringify({
    format: 'trade-count-backup',
    version: 1,
    exportedAt: '2026-10-06T10:00:00.000Z',
    stocks: [
      { id: 'acme', name: 'Acme Corp', symbol: 'ACME' },
      { id: 'globex', name: 'Globex', symbol: 'GLBX' },
      { id: 'initech', name: 'Initech', symbol: 'INIT' },
    ],
    trades: [
      trade('acme', 'buy', '10', '100', '2026-01-08'),
      trade('globex', 'buy', '20', '50', '2026-01-20'),
      trade('initech', 'buy', '8', '75', '2026-02-14'),
      trade('acme', 'buy', '5', '110', '2026-03-03'),
      trade('acme', 'sell', '6', '125', '2026-03-25'),
      trade('globex', 'buy', '10', '48', '2026-04-10'),
      trade('globex', 'sell', '12', '58', '2026-05-06'),
      trade('initech', 'sell', '4', '70', '2026-06-18'),
      trade('initech', 'buy', '6', '68', '2026-07-02'),
      trade('acme', 'sell', '6', '132', '2026-08-21'),
      trade('acme', 'buy', '4', '120', '2026-09-15'),
      trade('globex', 'sell', '10', '61', '2026-10-01'),
    ],
  });
}
