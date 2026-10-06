import type { Locator, Page } from '@playwright/test';
import { test } from '../fixtures';
import { openPortfolio, openSettings } from '../portfolio-page';
import { showcaseBackup } from './showcase-portfolio';

/* Regenerates the images in docs/screenshots with a made-up portfolio. Run with `npm run screenshots`. */
const OUT = 'docs/screenshots';

test.use({ deviceScaleFactor: 2 });

async function loadShowcase(page: Page): Promise<void> {
  await openSettings(page);
  await page.locator('tc-backup-panel input[type=file]').setInputFiles({
    name: 'showcase.json',
    mimeType: 'application/json',
    buffer: Buffer.from(showcaseBackup()),
  });
  await page.getByRole('button', { name: 'Replace my data' }).click();
  await page.locator('tc-backup-panel').getByText('Restored').waitFor();
}

async function shotOf(page: Page, file: string, ...parts: Locator[]): Promise<void> {
  const boxes = await Promise.all(parts.map((part) => part.boundingBox()));
  const pad = 16;
  const left = Math.min(...boxes.map((b) => b!.x)) - pad;
  const top = Math.min(...boxes.map((b) => b!.y)) - pad;
  const right = Math.max(...boxes.map((b) => b!.x + b!.width)) + pad;
  const bottom = Math.max(...boxes.map((b) => b!.y + b!.height)) + pad;
  await page.screenshot({ path: `${OUT}/${file}`, fullPage: true, clip: { x: left, y: top, width: right - left, height: bottom - top } });
}

test('README screenshots @screenshots', async ({ openDevice }) => {
  test.setTimeout(120_000);
  const page = await openDevice();
  await page.setViewportSize({ width: 1280, height: 900 });
  await loadShowcase(page);

  await openPortfolio(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${OUT}/portfolio.png` });

  await shotOf(page, 'ledger.png', page.locator('tc-ledger-panel'));

  const form = page.locator('tc-trade-form');
  await form.getByText('Sell', { exact: true }).click();
  await page.locator('#trade-quantity').fill('9');
  await page.locator('#trade-price').fill('128');
  await page.waitForTimeout(300);
  await shotOf(page, 'sell-form.png', form);
  await page.locator('#trade-quantity').fill('');

  await page.getByRole('link', { name: 'Reports', exact: true }).click();
  await page.locator('tc-profit-waterfall').waitFor();
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.waitForTimeout(300);
  await shotOf(page, 'reports.png', page.locator('section.totals'), page.locator('tc-month-charts'));
  await page.emulateMedia({ colorScheme: 'light' });
  await page.waitForTimeout(300);
  await shotOf(page, 'tax-per-share.png', page.locator('tc-sale-tax-table'));

  await openSettings(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await shotOf(page, 'settings.png', page.locator('tc-data-panel'));

  await page.setViewportSize({ width: 390, height: 844 });
  await openPortfolio(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${OUT}/mobile.png` });
});
