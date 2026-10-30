import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

const record = JSON.stringify({
  version: 1,
  startedOn: '2026-10-30',
  asOf: '2026-11-03',
  startCash: 1000,
  cash: 4280,
  stocks: [
    { symbol: 'TSLA', name: 'Tesla', closeEur: 360 },
    { symbol: 'PLTR', name: 'Palantir', closeEur: 150 },
  ],
  trades: [
    { id: 'start-tsla', symbol: 'TSLA', side: 'buy', shares: 35, priceEur: 358, date: '2026-10-30', at: '2026-10-30T20:00:00Z', start: true },
    { id: 'sell', symbol: 'TSLA', side: 'sell', shares: 10, priceEur: 370, date: '2026-11-02', at: '2026-11-02T15:00:00Z', note: 'Limit sell at resistance' },
    { id: 'buy', symbol: 'PLTR', side: 'buy', shares: 3, priceEur: 140, date: '2026-11-03', at: '2026-11-03T15:00:00Z', note: 'Buy the dip' },
  ],
  days: [
    { date: '2026-10-30', value: 13530, hold: 13530 },
    { date: '2026-11-02', value: 13700, hold: 13600 },
    { date: '2026-11-03', value: 13730, hold: 13600 },
  ],
});

/** WebKit can't intercept requests from a page its service worker controls, so the page runs without one. */
async function openPaper(page: Page): Promise<void> {
  await page.route('**/ngsw-worker.js', (route) => route.abort());
  await page.route('**/paper.json', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: record }));
  await page.evaluate(async () => {
    for (const registration of await navigator.serviceWorker.getRegistrations()) await registration.unregister();
  });
  await page.goto(new URL('/paper', page.url()).href);
  await page.locator('tc-paper-page').waitFor();
}

test.describe('agent paper trading page', () => {
  test('shows the paper value against holding, the open positions and every paper trade', async ({ openDevice }) => {
    const page = await openDevice();
    await openPaper(page);

    await expect(page.getByLabel('Paper portfolio totals')).toContainText('+130,00 €');
    await expect(page.locator('tc-paper-value-chart')).toHaveCount(1);
    const positions = page.locator('section[aria-labelledby="positions-title"] tbody tr');
    await expect(positions).toHaveCount(2);
    const trades = page.locator('section[aria-labelledby="trades-title"] tbody tr');
    await expect(trades).toHaveCount(3);
    await expect(trades.first()).toContainText('Buy the dip');
  });
});
