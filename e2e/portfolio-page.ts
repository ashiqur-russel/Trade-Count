import { expect, type Locator, type Page } from '@playwright/test';

/** Goes to the portfolio page through the app's own links, as a user would (the database stays open). */
export async function openPortfolio(page: Page): Promise<void> {
  if (new URL(page.url()).pathname !== '/') {
    await page.getByRole('link', { name: /back to your portfolio/i }).first().click();
  }
  await page.locator('tc-portfolio-page').waitFor();
}

export async function openSettings(page: Page): Promise<void> {
  if (new URL(page.url()).pathname !== '/settings') {
    await page.getByRole('link', { name: 'Settings', exact: true }).click();
  }
  await page.locator('tc-settings-page').waitFor();
}

export async function summaryOf(page: Page): Promise<Locator> {
  await openPortfolio(page);
  return page.locator('tc-portfolio-summary');
}

export async function stocksOf(page: Page): Promise<Locator> {
  await openPortfolio(page);
  return page.locator('tc-stocks-panel');
}

export async function syncPanelOf(page: Page): Promise<Locator> {
  await openSettings(page);
  return page.locator('tc-sync-panel');
}

export async function clickSync(page: Page, name: string): Promise<void> {
  await (await syncPanelOf(page)).getByRole('button', { name, exact: false }).first().click();
}

export async function addStockWithBuy(page: Page, name: string, quantity: string, price: string): Promise<void> {
  await openPortfolio(page);
  await page.locator('input[aria-label="Stock name"]').fill(name);
  await page.locator('form.add button[type=submit]').click();
  await expect(page.locator('tc-stocks-panel')).toContainText(name);
  await addBuy(page, quantity, price);
}

export async function addBuy(page: Page, quantity: string, price: string): Promise<void> {
  await openPortfolio(page);
  await page.locator('#trade-quantity').fill(quantity);
  await page.locator('#trade-price').fill(price);
  await page.locator('tc-trade-form button[type=submit]').click();
}

export async function addSale(page: Page, quantity: string, price: string): Promise<void> {
  await openPortfolio(page);
  await page.locator('tc-trade-form').getByText('Sell', { exact: true }).click();
  await addBuy(page, quantity, price);
}

/** Turns sync on from the settings page and returns the new key. */
export async function turnOnSync(page: Page, options: { rememberKey: boolean }): Promise<string> {
  const panel = await syncPanelOf(page);
  await clickSync(page, 'Turn on sync');
  const key = (await panel.locator('code.key').textContent())!.trim();
  const [keySaved, remember] = await panel.locator('input[type=checkbox]').all();
  await keySaved!.check();
  if (!options.rememberKey) await remember!.uncheck();
  await clickSync(page, 'Start syncing');
  await expect(panel).toContainText('Synced');
  return key;
}

export async function joinWithKey(page: Page, key: string): Promise<void> {
  const panel = await syncPanelOf(page);
  await clickSync(page, 'Join with a key');
  await page.locator('#sync-join-key').fill(key);
  await panel.getByRole('button', { name: 'Join', exact: true }).click();
  await expect(panel).toContainText('Synced');
}
