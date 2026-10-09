import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { testEdition } from './insights-edition';
import { addStockWithBuy } from './portfolio-page';

async function serveEdition(page: Page): Promise<string> {
  const { key, vault } = await testEdition();
  await page.route('**/insights.vault', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: vault }),
  );
  return key;
}

/** WebKit can't intercept requests from a page its service worker controls, so the page runs without one. */
async function openInsights(page: Page): Promise<void> {
  await page.route('**/ngsw-worker.js', (route) => route.abort());
  await page.evaluate(async () => {
    for (const registration of await navigator.serviceWorker.getRegistrations()) await registration.unregister();
  });
  await page.goto(new URL('/insights', page.url()).href);
  await page.locator('tc-insights-page').waitFor();
}

test.describe('insights page', () => {
  test('shows only a key field until the right key is entered', async ({ openDevice }) => {
    const page = await openDevice();
    await serveEdition(page);
    await expect(page.getByRole('link', { name: 'Insights' })).toHaveCount(0);

    await openInsights(page);
    await page.locator('#insights-key').fill((await testEdition()).key);
    await page.getByRole('button', { name: 'Unlock' }).click();

    await expect(page.getByRole('alert')).toHaveText("That key doesn't open these notes.");
    await expect(page.locator('tc-insight-stock')).toHaveCount(0);
  });

  test('opens with the key, shows only the stocks the user trades, and works the plan from their shares', async ({
    openDevice,
  }) => {
    const page = await openDevice();
    const key = await serveEdition(page);
    await addStockWithBuy(page, 'Tesla Inc.', '50', '348,60');

    await openInsights(page);
    await page.locator('#insights-key').fill(key);
    await page.getByRole('button', { name: 'Unlock' }).click();

    const tesla = page.locator('tc-insight-stock');
    await expect(tesla).toHaveCount(1);
    await expect(tesla).toContainText('Tesla');
    await expect(tesla).toContainText('limit sell 25 shares around 349,04 €');
    await expect(tesla).toContainText('-1.997,20 €');
    await expect(page.locator('main')).not.toContainText('NVIDIA');
    await expect(page.getByRole('link', { name: 'Insights', exact: true })).toBeVisible();

    await page.reload();
    await expect(page.locator('tc-insight-stock')).toHaveCount(1);

    await page.getByRole('button', { name: 'Forget key' }).click();
    await expect(page.locator('#insights-key')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Insights', exact: true })).toHaveCount(0);
  });
});
