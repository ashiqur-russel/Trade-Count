import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

const record = JSON.stringify({
  version: 1,
  asOf: '2026-10-28',
  stocks: [
    {
      ticker: 'NVDA',
      name: 'Nvidia',
      summary: 'Test summary.',
      series: [
        ['2026-10-12', 202.8, 205, 201],
        ['2026-10-28', 193.06, 197, 192],
      ],
    },
  ],
  signals: [
    { id: 'A', ticker: 'NVDA', givenOn: '2026-10-09', activeFrom: '2026-10-12', activeTo: null, text: 'Sell all on a close below $227', levelEur: 202.8, reachedOn: '2026-10-12', priceEur: 202.8, status: 'missed', resultEur: 380 },
    { id: 'J', ticker: 'NVDA', givenOn: '2026-10-19', activeFrom: '2026-10-20', activeTo: '2026-10-30', text: 'Limit sell 20 at 199 €', levelEur: 199, reachedOn: null, priceEur: null, status: 'open', resultEur: null },
  ],
});

/** WebKit can't intercept requests from a page its service worker controls, so the page runs without one. */
async function openSignals(page: Page): Promise<void> {
  await page.route('**/ngsw-worker.js', (route) => route.abort());
  await page.route('**/signals.json', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: record }));
  await page.evaluate(async () => {
    for (const registration of await navigator.serviceWorker.getRegistrations()) await registration.unregister();
  });
  await page.goto(new URL('/signals', page.url()).href);
  await page.locator('tc-signals-page').waitFor();
}

test.describe('signal track record page', () => {
  test('charts each stock and filters the ledger by status', async ({ openDevice }) => {
    const page = await openDevice();
    await openSignals(page);

    await expect(page.locator('tc-signal-chart')).toHaveCount(1);
    const rows = page.locator('tbody tr');
    await expect(rows).toHaveCount(2);
    await expect(rows.first()).toContainText('+380,00 €');

    await page.getByRole('button', { name: 'Show signals' }).click();
    await page.getByRole('option', { name: 'Open' }).click();
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText('Limit sell 20 at 199 €');
  });
});
