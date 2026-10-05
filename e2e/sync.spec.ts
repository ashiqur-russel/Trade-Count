import { expect, test } from './fixtures';
import {
  addBuy,
  addSale,
  addStockWithBuy,
  clickSync,
  joinWithKey,
  openPortfolio,
  stocksOf,
  summaryOf,
  syncPanelOf,
  turnOnSync,
} from './portfolio-page';

test.describe('local database', () => {
  test('keeps a stock and trade after the page is reloaded', async ({ openDevice }) => {
    const page = await openDevice();
    await addStockWithBuy(page, 'Reload Co', '3', '100');
    await expect(await summaryOf(page)).toContainText('300,00');

    await page.reload();

    await expect(await stocksOf(page)).toContainText('Reload Co');
    await expect(await summaryOf(page)).toContainText('300,00');
  });
});

test.describe('encrypted sync between two devices', () => {
  test('a second device joins with the key, and edits travel both ways', async ({ openDevice }) => {
    const phone = await openDevice();
    await addStockWithBuy(phone, 'Sync Co', '3', '100');
    const key = await turnOnSync(phone, { rememberKey: true });

    const laptop = await openDevice();
    await joinWithKey(laptop, key);
    await expect(await summaryOf(laptop)).toContainText('300,00');

    await addBuy(laptop, '2', '110');
    await expect(await summaryOf(laptop)).toContainText('520,00');
    await expect(async () => {
      await clickSync(phone, 'Sync now');
      await expect(await summaryOf(phone)).toContainText('520,00', { timeout: 2000 });
    }).toPass({ timeout: 20_000 });
  });

  test('another device is told when sync is turned off, keeps its data and does not re-create the copy', async ({ openDevice }) => {
    const phone = await openDevice();
    await addStockWithBuy(phone, 'Gone Co', '1', '50');
    const key = await turnOnSync(phone, { rememberKey: true });
    const laptop = await openDevice();
    await joinWithKey(laptop, key);
    await expect(await stocksOf(laptop)).toContainText('Gone Co');

    await clickSync(phone, 'Turn off sync');
    await clickSync(phone, 'Delete synced copy');
    await expect(await syncPanelOf(phone)).toContainText('Turn on sync');
    await clickSync(laptop, 'Sync now');

    await expect(await syncPanelOf(laptop)).toContainText('Turn on sync');
    await expect(await syncPanelOf(laptop)).toContainText('no longer exists');
    await expect(await stocksOf(laptop)).toContainText('Gone Co');
    await expect(laptop.locator('tc-sync-attention')).toContainText('no longer exists');
  });
});

test.describe('sync key that is not stored on the device', () => {
  test('asks for the key after a reload, refuses a wrong key and resumes with the right one', async ({ openDevice }) => {
    const page = await openDevice();
    const key = await turnOnSync(page, { rememberKey: false });

    await page.reload();
    await expect(await syncPanelOf(page)).toContainText('Key needed');

    await page.locator('#sync-unlock-key').fill('AAAA-AAAA-AAAA-AAAA-AAAA-AAAA-AAAA-AAAA');
    await clickSync(page, 'Continue syncing');
    await expect((await syncPanelOf(page)).locator('tc-alert')).toBeVisible();
    await expect(await syncPanelOf(page)).toContainText('Key needed');

    await page.locator('#sync-unlock-key').fill(key);
    await clickSync(page, 'Continue syncing');
    await expect(await syncPanelOf(page)).toContainText('Synced');
  });
});

test.describe('storage unavailable', () => {
  test('explains what to do instead of failing silently when the browser refuses file storage', async ({
    browser,
    browserName,
    baseURL,
  }) => {
    test.skip(browserName !== 'webkit', 'Only WebKit refuses file storage in ephemeral (private) contexts.');
    const page = await (await browser.newContext()).newPage();

    await page.goto(baseURL!);

    await expect(page.locator('main')).toContainText('Private browsing windows may not allow storage');
  });
});

test.describe('two tabs of the same device', () => {
  test('the second tab waits for the first, then continues by itself with the same data', async ({ openDevice }) => {
    const first = await openDevice();
    await addStockWithBuy(first, 'Shared Co', '2', '10');
    const second = await first.context().newPage();

    await second.goto(first.url());

    await expect(second.locator('main')).toContainText('open in another tab');
    await expect(await stocksOf(first)).toContainText('Shared Co');

    await first.close();

    await expect(await stocksOf(second)).toContainText('Shared Co');
    await expect(await summaryOf(second)).toContainText('20,00');
  });

  test('a reloaded page waits for its old worker to end instead of failing', async ({ openDevice }) => {
    const page = await openDevice();
    await addStockWithBuy(page, 'Reload Co', '1', '10');

    await page.reload();
    await page.reload();

    await expect(await stocksOf(page)).toContainText('Reload Co');
  });
});

test.describe('changes that cannot be merged', () => {
  /** Both devices sell from the same 3 shares while offline, so together they would sell more than they hold. */
  async function twoDevicesWithConflictingSales(openDevice: () => Promise<import('@playwright/test').Page>) {
    const phone = await openDevice();
    await addStockWithBuy(phone, 'Acme', '3', '10');
    const key = await turnOnSync(phone, { rememberKey: true });
    const laptop = await openDevice();
    await joinWithKey(laptop, key);
    await expect(await stocksOf(laptop)).toContainText('Acme');

    await phone.context().setOffline(true);
    await laptop.context().setOffline(true);
    await addSale(phone, '3', '11');
    await addSale(laptop, '2', '12');
    await expect(await summaryOf(phone)).toContainText('Shares sold3');
    await expect(await summaryOf(laptop)).toContainText('Shares sold2');

    await phone.context().setOffline(false);
    await clickSync(phone, 'Sync now');
    await expect(await syncPanelOf(phone)).toContainText('Synced');
    await laptop.context().setOffline(false);
    await clickSync(laptop, 'Sync now');
    await expect(await syncPanelOf(laptop)).toContainText('Choose which version to keep');
    await openPortfolio(laptop);
    await expect(laptop.locator('tc-sync-attention')).toContainText('Sync needs your decision');
    return { phone, laptop };
  }

  test('shows what each side changed and lets this device\'s version win everywhere', async ({ openDevice }) => {
    const { phone, laptop } = await twoDevicesWithConflictingSales(openDevice);

    await expect(await syncPanelOf(laptop)).toContainText('Sale 2 × Acme @ 12');
    await expect(await syncPanelOf(laptop)).toContainText('Sale 3 × Acme @ 11');

    await clickSync(laptop, "Keep this device's version");
    await clickSync(laptop, 'Replace the synced copy?');
    await expect(await syncPanelOf(laptop)).toContainText('Synced');
    await expect(await summaryOf(laptop)).toContainText('Shares sold2');

    await clickSync(phone, 'Sync now');
    await expect(await summaryOf(phone)).toContainText('Shares sold2');
  });

  test('using the synced copy saves a backup first, then adopts the other version', async ({ openDevice }) => {
    const { laptop } = await twoDevicesWithConflictingSales(openDevice);
    const download = laptop.waitForEvent('download');

    await clickSync(laptop, 'Use the synced copy');
    await clickSync(laptop, 'Replace this device');

    expect((await download).suggestedFilename()).toMatch(/^trade-count-backup-.*\.json$/);
    await expect(await syncPanelOf(laptop)).toContainText('Synced');
    await expect(await summaryOf(laptop)).toContainText('Shares sold3');
  });
});
