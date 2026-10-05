import { expect, test as base, type BrowserContext, type Page } from '@playwright/test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

type OpenDevice = () => Promise<Page>;

/** Each device presents its own client address, as separate users would, so the server's per-client limits don't pile up. */
let nextClientNumber = 1;

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
      const context = await playwright[browserName].launchPersistentContext(profile, {
        extraHTTPHeaders: { 'cf-connecting-ip': `10.0.${nextClientNumber++ % 250}.1` },
      });
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
