import { expect, type Page } from '@playwright/test';

export async function addStockWithBuy(page: Page, name: string, quantity: string, price: string): Promise<void> {
  await page.locator('input[aria-label="Stock name"]').fill(name);
  await page.locator('form.add button[type=submit]').click();
  await expect(page.locator('tc-stocks-panel')).toContainText(name);
  await addBuy(page, quantity, price);
}

export async function addBuy(page: Page, quantity: string, price: string): Promise<void> {
  await page.locator('#trade-quantity').fill(quantity);
  await page.locator('#trade-price').fill(price);
  await page.locator('tc-trade-form button[type=submit]').click();
}

export async function addSale(page: Page, quantity: string, price: string): Promise<void> {
  await page.locator('tc-trade-form').getByText('Sell', { exact: true }).click();
  await addBuy(page, quantity, price);
}

export const syncPanel = (page: Page) => page.locator('tc-sync-panel');

export const syncButton = (page: Page, name: string) =>
  syncPanel(page).getByRole('button', { name, exact: false }).first();

/** Turns sync on from the panel and returns the new key. */
export async function turnOnSync(page: Page, options: { rememberKey: boolean }): Promise<string> {
  await syncButton(page, 'Turn on sync').click();
  const key = (await syncPanel(page).locator('code.key').textContent())!.trim();
  const [keySaved, remember] = await syncPanel(page).locator('input[type=checkbox]').all();
  await keySaved!.check();
  if (!options.rememberKey) await remember!.uncheck();
  await syncButton(page, 'Start syncing').click();
  await expect(syncPanel(page)).toContainText('Synced');
  return key;
}

export async function joinWithKey(page: Page, key: string): Promise<void> {
  await syncButton(page, 'Join with a key').click();
  await page.locator('#sync-join-key').fill(key);
  await syncPanel(page).getByRole('button', { name: 'Join', exact: true }).click();
}
