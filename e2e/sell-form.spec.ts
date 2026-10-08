import { expect, test } from './fixtures';
import { addBuy, addSale, addStockWithBuy } from './portfolio-page';

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

test.describe('selling at a loss', () => {
  test('shows the cash it frees and the price that wins the loss back', async ({ openDevice }) => {
    const page = await openDevice();
    await addStockWithBuy(page, 'Tesla', '50', '548');
    const form = page.locator('tc-trade-form');

    await form.getByText('Sell', { exact: true }).click();
    await page.locator('#trade-quantity').fill('50');
    await page.locator('#trade-price').fill('450');

    await expect(form).toContainText('Cash this sale frees22.500,00 €');
    const winBack = form.locator('tc-win-back');
    await expect(winBack.getByTestId('win-back-target')).toHaveText('548,00 €');
    await expect(winBack).toContainText(/50\s*same shares/);
    await expect(winBack).toContainText('515,33 €');
    await expect(winBack).toContainText('499,00 €');
    await expect(winBack).toContainText(/about 1.292\s€ less tax/);
  });

  test('on a partial sale, shows where the kept shares must climb to', async ({ openDevice }) => {
    const page = await openDevice();
    await addStockWithBuy(page, 'Tesla', '50', '548');
    const form = page.locator('tc-trade-form');

    await form.getByText('Sell', { exact: true }).click();
    await page.locator('#trade-quantity').fill('20');
    await page.locator('#trade-price').fill('450');

    await expect(form.locator('tc-win-back').getByTestId('kept-target')).toHaveText('613,33 €');
  });

  test('after buying back, shows the break-even incl. the past loss and the overall result', async ({ openDevice }) => {
    const page = await openDevice();
    await addStockWithBuy(page, 'Tesla', '50', '548');
    await addSale(page, '50', '450');
    await page.locator('tc-trade-form').getByText('Buy', { exact: true }).click();
    await addBuy(page, '30', '450');

    await expect(page.locator('tc-stocks-panel')).toContainText('Break-even incl. past loss 613,33 €');

    const form = page.locator('tc-trade-form');
    await form.getByText('Sell', { exact: true }).click();
    await page.locator('#trade-quantity').fill('30');
    await page.locator('#trade-price').fill('500');
    await expect(form).toContainText('Tesla overall after this sale-3.400,00 €');
    await expect(form.locator('tc-win-back')).toHaveCount(0);
  });
});
