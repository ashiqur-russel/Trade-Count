/** An example portfolio for the README screenshots: well-known stocks, made-up trades over 2026. */
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
      { id: 'amd', name: 'Advanced Micro Devices', symbol: 'AMD' },
      { id: 'tesla', name: 'Tesla', symbol: 'TSLA' },
      { id: 'apple', name: 'Apple', symbol: 'AAPL' },
      { id: 'amazon', name: 'Amazon', symbol: 'AMZN' },
    ],
    trades: [
      trade('amd', 'buy', '10', '520', '2026-01-08'),
      trade('tesla', 'buy', '10', '380', '2026-01-23'),
      trade('apple', 'buy', '15', '195', '2026-02-14'),
      trade('amd', 'buy', '5', '540', '2026-03-03'),
      trade('amd', 'sell', '6', '565', '2026-03-25'),
      trade('amazon', 'buy', '12', '178', '2026-04-10'),
      trade('tesla', 'buy', '5', '315', '2026-04-23'),
      trade('apple', 'sell', '8', '214', '2026-05-06'),
      trade('tesla', 'sell', '4', '350', '2026-06-18'),
      trade('apple', 'buy', '6', '205', '2026-07-02'),
      trade('amd', 'sell', '6', '572', '2026-08-21'),
      trade('amazon', 'sell', '7', '196', '2026-09-04'),
      trade('amd', 'buy', '4', '548', '2026-09-15'),
      trade('tesla', 'sell', '6', '405', '2026-10-01'),
    ],
  });
}
