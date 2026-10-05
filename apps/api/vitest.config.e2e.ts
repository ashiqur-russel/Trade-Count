import { defineConfig } from 'vitest/config';
import { testDatabaseUrl } from './test/test-database-url.js';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['test/**/*.e2e-spec.ts'],
    globalSetup: ['./test/global-setup.ts'],
    env: { NODE_ENV: 'test', DATABASE_URL: testDatabaseUrl() },
    // The suites share one database and truncate it between tests.
    fileParallelism: false,
  },
});
