import { expect, test } from './fixtures';
import { addStockWithBuy } from './portfolio-page';

test.describe('sell form', () => {
  test('shows the open shares, fills them in with "All", and blocks selling more', async ({ openDevice }) => {
    const page = await openDevice();
    await addStockWithBuy(page, 'Acme', '4', '100');
    const form = page.locator('tc-trade-form');

    await form.getByText('Sell', { exact: true }).click();
    await expect(form).toContainText('4 open');

    await form.getByRole('button', { name: 'Sell all 4 open shares' }).click();
    await expect(page.locator('#trade-quantity')).toHaveValue('4');

    await page.locator('#trade-quantity').fill('5');
    await page.locator('#trade-price').fill('120');
    await expect(form).toContainText("so you can't sell 5");
    await expect(form.getByRole('button', { name: 'Add sale' })).toBeDisabled();

    await page.locator('#trade-quantity').fill('4');
    await expect(form.getByRole('button', { name: 'Add sale' })).toBeEnabled();
    await form.getByRole('button', { name: 'Add sale' }).click();
    await expect(page.locator('tc-portfolio-summary')).toContainText('Shares sold4');
    await form.getByText('Sell', { exact: true }).click();
    await expect(form).toContainText('0 open');
    await expect(form.getByRole('button', { name: /Sell all/ })).toHaveCount(0);
  });

  test('shows no open-shares badge while recording a buy', async ({ openDevice }) => {
    const page = await openDevice();
    await addStockWithBuy(page, 'Acme', '2', '100');

    await expect(page.locator('tc-trade-form .open-badge')).toHaveCount(0);
  });
});
