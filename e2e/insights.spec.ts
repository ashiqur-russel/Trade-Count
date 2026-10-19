import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { testEdition } from './insights-edition';
import { addStockWithBuy } from './portfolio-page';

/** WebKit can't intercept requests from a page its service worker controls, so the page runs without one. */
async function openInsights(page: Page): Promise<void> {
  await page.route('**/ngsw-worker.js', (route) => route.abort());
  await page.route('**/insights.json', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: testEdition }),
  );
  await page.evaluate(async () => {
    for (const registration of await navigator.serviceWorker.getRegistrations()) await registration.unregister();
  });
  await page.goto(new URL('/insights', page.url()).href);
  await page.locator('tc-insights-page').waitFor();
}

test.describe('insights page', () => {
  test('is open to everyone and says which stocks the edition covers when the user has none of them', async ({
    openDevice,
  }) => {
    const page = await openDevice();
    await openInsights(page);

    await expect(page.getByRole('note')).toContainText('not investment advice');
    await expect(page.locator('main')).toContainText('None of your stocks is in this edition. It covers NVIDIA, Tesla.');
    await expect(page.locator('#insights-key')).toHaveCount(0);
  });

  test('shows only the stocks the user trades and works the plan from their shares', async ({ openDevice }) => {
    const page = await openDevice();
    await addStockWithBuy(page, 'Tesla Inc.', '50', '348,60');
    await openInsights(page);

    const tesla = page.locator('tc-insight-stock');
    await expect(tesla).toHaveCount(1);
    await expect(tesla).toContainText('limit sell 25 shares around 349,04 €');
    await expect(tesla).toContainText('-1.997,20 €');
    await expect(page.locator('main')).not.toContainText('NVIDIA');
  });
});
