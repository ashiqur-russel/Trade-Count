import { expect, test } from './fixtures';
import { addBuy, addStockWithBuy, joinWithKey, syncButton, syncPanel, turnOnSync } from './portfolio-page';

const summary = (page: import('@playwright/test').Page) => page.locator('tc-portfolio-summary');

test.describe('local database', () => {
  test('keeps a stock and trade after the page is reloaded', async ({ openDevice }) => {
    const page = await openDevice();
    await addStockWithBuy(page, 'Reload Co', '3', '100');
    await expect(summary(page)).toContainText('300,00');

    await page.reload();

    await expect(page.locator('tc-stocks-panel')).toContainText('Reload Co');
    await expect(summary(page)).toContainText('300,00');
  });
});

test.describe('encrypted sync between two devices', () => {
  test('a second device joins with the key, and edits travel both ways', async ({ openDevice }) => {
    const phone = await openDevice();
    await addStockWithBuy(phone, 'Sync Co', '3', '100');
    const key = await turnOnSync(phone, { rememberKey: true });

    const laptop = await openDevice();
    await joinWithKey(laptop, key);
    await expect(summary(laptop)).toContainText('300,00');

    await addBuy(laptop, '2', '110');
    await expect(summary(laptop)).toContainText('520,00');
    await expect(async () => {
      await syncButton(phone, 'Sync now').click();
      await expect(summary(phone)).toContainText('520,00', { timeout: 2000 });
    }).toPass({ timeout: 20_000 });
  });

  test('another device is told when sync is turned off, keeps its data and does not re-create the copy', async ({ openDevice }) => {
    const phone = await openDevice();
    await addStockWithBuy(phone, 'Gone Co', '1', '50');
    const key = await turnOnSync(phone, { rememberKey: true });
    const laptop = await openDevice();
    await joinWithKey(laptop, key);
    await expect(laptop.locator('tc-stocks-panel')).toContainText('Gone Co');

    await syncButton(phone, 'Turn off sync').click();
    await syncButton(phone, 'Delete synced copy').click();
    await expect(syncPanel(phone)).toContainText('Turn on sync');
    await syncButton(laptop, 'Sync now').click();

    await expect(syncPanel(laptop)).toContainText('Turn on sync');
    await expect(syncPanel(laptop)).toContainText('no longer exists');
    await expect(laptop.locator('tc-stocks-panel')).toContainText('Gone Co');
  });
});

test.describe('sync key that is not stored on the device', () => {
  test('asks for the key after a reload, refuses a wrong key and resumes with the right one', async ({ openDevice }) => {
    const page = await openDevice();
    const key = await turnOnSync(page, { rememberKey: false });

    await page.reload();
    await expect(syncPanel(page)).toContainText('Key needed');

    await page.locator('#sync-unlock-key').fill('AAAA-AAAA-AAAA-AAAA-AAAA-AAAA-AAAA-AAAA');
    await syncButton(page, 'Continue syncing').click();
    await expect(syncPanel(page).locator('tc-alert')).toBeVisible();
    await expect(syncPanel(page)).toContainText('Key needed');

    await page.locator('#sync-unlock-key').fill(key);
    await syncButton(page, 'Continue syncing').click();
    await expect(syncPanel(page)).toContainText('Synced');
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
    await expect(first.locator('tc-stocks-panel')).toContainText('Shared Co');

    await first.close();

    await expect(second.locator('tc-stocks-panel')).toContainText('Shared Co');
    await expect(second.locator('tc-portfolio-summary')).toContainText('20,00');
  });

  test('a reloaded page waits for its old worker to end instead of failing', async ({ openDevice }) => {
    const page = await openDevice();
    await addStockWithBuy(page, 'Reload Co', '1', '10');

    await page.reload();
    await page.reload();

    await expect(page.locator('tc-stocks-panel')).toContainText('Reload Co');
  });
});
