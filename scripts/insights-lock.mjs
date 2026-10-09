// Encrypts insights/analysis.json into apps/web/public/insights.vault, the only form that is committed.
// First run: `npm run insights:lock -- --new-key` prints a new key once. Later runs ask for it
// (hidden), or read INSIGHTS_KEY from the environment.
import { readFile, writeFile } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import {
  decryptVault,
  deriveCredentials,
  encryptVault,
  generateSyncKey,
  parseSyncKey,
} from '@trade-count/sync-crypto';

const SOURCE = new URL('../insights/analysis.json', import.meta.url);
const TARGET = new URL('../apps/web/public/insights.vault', import.meta.url);

const plaintext = await readFile(SOURCE, 'utf8').catch(() => fail(`Missing ${SOURCE.pathname}.`));
checkEdition(plaintext);

const key = process.argv.includes('--new-key')
  ? await generateSyncKey()
  : (process.env.INSIGHTS_KEY ?? (await askHidden('Insights key: ')));
await parseSyncKey(key).catch((error) => fail(error.message));

const credentials = await deriveCredentials(key);
const envelope = await encryptVault(plaintext, credentials);
if ((await decryptVault(envelope, credentials)) !== plaintext) fail('Round trip failed; nothing written.');
await writeFile(TARGET, JSON.stringify(envelope) + '\n');

console.log(`Locked ${JSON.parse(plaintext).stocks.length} stock(s) into ${TARGET.pathname}.`);
if (process.argv.includes('--new-key')) {
  console.log(`\nYour Insights key, shown only now. Save it in your password manager:\n\n  ${key}\n`);
}

function checkEdition(text) {
  let edition;
  try {
    edition = JSON.parse(text);
  } catch (error) {
    fail(`analysis.json is not valid JSON: ${error.message}`);
  }
  const ok =
    edition?.version === 1 &&
    /^\d{4}-\d{2}-\d{2}$/.test(edition.asOf ?? '') &&
    edition.usdPerEur > 0 &&
    Array.isArray(edition.stocks) &&
    edition.stocks.every((s) => s.ticker && s.name && Array.isArray(s.aliases) && Array.isArray(s.series));
  if (!ok) fail('analysis.json needs version 1, asOf, usdPerEur and stocks with ticker, name, aliases and series.');
}

function askHidden(question) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = (text) => {
      if (text.includes(question)) process.stdout.write(text);
    };
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write('\n');
      resolve(answer.trim());
    });
  });
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
