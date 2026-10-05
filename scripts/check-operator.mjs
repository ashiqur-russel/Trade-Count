// Fails when the Imprint/Privacy operator details still hold placeholders, so a public deploy can't ship without them.
import { readFileSync } from 'node:fs';

const file = new URL('../apps/web/src/app/legal/operator.ts', import.meta.url);
const missing = [...readFileSync(file, 'utf8').matchAll(/^\s+(\w+): 'REPLACE_ME',?$/gm)].map((m) => m[1]);

if (missing.length) {
  console.error(`Cannot deploy: fill in the operator details in apps/web/src/app/legal/operator.ts first (still REPLACE_ME: ${missing.join(', ')}).`);
  process.exit(1);
}
console.log('Operator details present for the Imprint and Privacy policy.');
