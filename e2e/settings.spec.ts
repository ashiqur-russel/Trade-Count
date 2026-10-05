import { expect, test } from './fixtures';
import { openPortfolio, openSettings } from './portfolio-page';

test.describe('appearance setting', () => {
  test('a chosen theme applies at once and stays after reloading another page', async ({ openDevice }) => {
    const page = await openDevice();
    await openSettings(page);

    await page.getByRole('radiogroup', { name: 'Colour theme' }).getByText('Dark', { exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    await openPortfolio(page);
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });
});
