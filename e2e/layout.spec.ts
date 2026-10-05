import { expect, test } from './fixtures';
import { addStockWithBuy } from './portfolio-page';

const PAGES = ['/', '/settings', '/datenschutz', '/privacy', '/impressum', '/imprint', '/terms', '/nutzungsbedingungen'];

test.describe('page width', () => {
  for (const width of [390, 1440]) {
    test(`no page scrolls sideways at ${width}px`, async ({ openDevice }) => {
      const page = await openDevice();
      await addStockWithBuy(page, 'Advanced Micro Devices', '3', '560');
      await page.setViewportSize({ width, height: 900 });
      const origin = new URL(page.url()).origin;

      for (const path of PAGES) {
        await page.goto(origin + path);
        await page.locator('main').getByRole('heading').first().waitFor();
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(overflow, `${path} overflows by ${overflow}px`).toBeLessThanOrEqual(0);
      }
    });
  }
});
