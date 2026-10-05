import { expect, test as base, type BrowserContext, type Page } from '@playwright/test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

type OpenDevice = () => Promise<Page>;

/*
 * A device is a persistent browser profile on its own origin. Not Playwright's default ephemeral context:
 * WebKit refuses file storage there (as in Private Browsing). And WebKit shares storage between persistent
 * profiles, so only a different origin (a unique *.localhost host) gives a device its own database.
 */
export const test = base.extend<{ openDevice: OpenDevice }>({
  openDevice: async ({ browserName, playwright, baseURL }, use) => {
    const opened: { context: BrowserContext; profile: string }[] = [];
    let deviceNumber = 0;
    await use(async () => {
      const profile = mkdtempSync(join(tmpdir(), 'trade-count-e2e-'));
      const context = await playwright[browserName].launchPersistentContext(profile);
      opened.push({ context, profile });
      const page = await context.newPage();
      const origin = new URL(baseURL!);
      origin.hostname = `device-${process.pid}-${Date.now()}-${deviceNumber++}.localhost`;
      await page.goto(origin.href);
      await expect(page.locator('main')).toContainText('No stocks yet');
      return page;
    });
    for (const { context, profile } of opened) {
      await context.close();
      rmSync(profile, { recursive: true, force: true });
    }
  },
});

export { expect };
