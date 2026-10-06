import { defineConfig, devices } from '@playwright/test';

const PORT = 8788;
const STATE_DIR = '.wrangler/e2e-state';

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  workers: 1,
  expect: { timeout: 15_000 },
  // README screenshots only run on request (`npm run screenshots`), never in the normal suite.
  grepInvert: process.env['SCREENSHOTS'] ? undefined : /@screenshots/,
  retries: process.env['CI'] ? 1 : 0,
  reporter: process.env['CI'] ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: `http://localhost:${PORT}`, trace: 'retain-on-failure' },
  webServer: {
    command:
      `rm -rf ${STATE_DIR} && npm run build && ` +
      `npx wrangler d1 migrations apply DB --local --persist-to ${STATE_DIR} && ` +
      `npx wrangler pages dev --port ${PORT} --persist-to ${STATE_DIR} --binding RATE_LIMIT_SALT=e2e-only-salt`,
    url: `http://localhost:${PORT}`,
    timeout: 240_000,
    reuseExistingServer: !process.env['CI'],
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
