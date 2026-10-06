import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { openSettings } from './portfolio-page';
import { sampleYearBackup } from './sample-year';

async function importSampleYear(page: Page): Promise<void> {
  await openSettings(page);
  await page.locator('tc-backup-panel input[type=file]').setInputFiles({
    name: 'sample.json',
    mimeType: 'application/json',
    buffer: Buffer.from(sampleYearBackup()),
  });
  await page.getByRole('button', { name: 'Replace my data' }).click();
  await expect(page.locator('tc-backup-panel')).toContainText('Restored');
}

test.describe('reports page', () => {
  test('shows the year: invested, profit, loss, estimated tax and what you keep', async ({ openDevice }) => {
    const page = await openDevice();
    await importSampleYear(page);

    await page.getByRole('link', { name: 'Reports', exact: true }).click();

    const totals = page.locator('section.totals');
    await expect(totals).toContainText('1.710,00 €');
    await expect(totals).toContainText('+128,00 €');
    await expect(totals).toContainText('-5,00 €');
    await expect(totals).toContainText('-33,76 €');
    await expect(totals).toContainText('+89,24 €');
    await expect(page.locator('tc-profit-waterfall')).toContainText('You keep');
  });

  test('lists every sale with the tax per share, and no tax on a sale that is a loss', async ({ openDevice }) => {
    const page = await openDevice();
    await importSampleYear(page);
    await page.getByRole('link', { name: 'Reports', exact: true }).click();

    const table = page.locator('tc-sale-tax-table');
    await expect(table).toContainText('5,28 €');
    await expect(table).toContainText('2,11 €');
    await expect(table).toContainText('loss, no tax');
  });

  test('follows the tax rate set in Settings', async ({ openDevice }) => {
    const page = await openDevice();
    await importSampleYear(page);
    await page.locator('#tax-rate').fill('0');
    await page.getByRole('button', { name: 'Save', exact: true }).click();

    await page.getByRole('link', { name: 'Reports', exact: true }).click();

    await expect(page.locator('section.totals')).toContainText('+123,00 €');
    await expect(page.locator('section.totals')).toContainText('0 % of each profit');
  });

  test('exports the year as CSV', async ({ openDevice }) => {
    const page = await openDevice();
    await importSampleYear(page);
    await page.getByRole('link', { name: 'Reports', exact: true }).click();

    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export CSV' }).click();

    expect((await download).suggestedFilename()).toBe('trade-count-sales-2026.csv');
  });
});
