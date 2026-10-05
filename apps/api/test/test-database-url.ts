import { config } from 'dotenv';

config({ path: new URL('../../../.env', import.meta.url), quiet: true });

/** TEST_DATABASE_URL, or the dev DATABASE_URL pointed at a separate `<name>_test` database. */
export function testDatabaseUrl(): string {
  if (process.env.TEST_DATABASE_URL) return process.env.TEST_DATABASE_URL;
  const devUrl = process.env.DATABASE_URL;
  if (!devUrl)
    throw new Error('Set DATABASE_URL or TEST_DATABASE_URL to run e2e tests.');
  const url = new URL(devUrl);
  url.pathname = `${url.pathname}_test`;
  return url.toString();
}
