<p align="center">
  <img src="apps/web/brand/mark.svg" width="72" alt="Trade Count logo">
</p>

<h1 align="center">Trade Count</h1>

<p align="center">
  <b>Know the real profit of every sale. No spreadsheet needed.</b><br>
  A free, private stock tracker that matches each sale to your oldest open buys first (FIFO),<br>
  works offline, and keeps your trades on your own device.
</p>

<p align="center">
  <a href="https://trade-count.pages.dev"><b>Open the app →</b></a>
  &nbsp;·&nbsp; No account &nbsp;·&nbsp; No Excel or Google Sheets &nbsp;·&nbsp; No ads or trackers &nbsp;·&nbsp; Open source (AGPL-3.0)
</p>

![Trade Count portfolio page: totals, the trade form and the stocks you hold](docs/screenshots/portfolio.png?v=2)

<sub>Screenshots show an example portfolio of well-known stocks with made-up trades and prices. Regenerate them with `npm run screenshots`.</sub>

## Features

### No more Excel or Google Sheets
No formulas to write and no spreadsheet to maintain. Enter each buy and sale once; Trade Count splits batches into lots, matches every sale to the right buys, and keeps profit, open shares and averages up to date on its own. Correcting a trade, or adding one you forgot weeks later, recalculates everything that depends on it.

### Profit and loss the way your broker counts it
Every sale is matched against the **oldest shares you still hold** (FIFO), across as many buys as it needs. Realized profit, open investment, average buy price and shares held are always exact: amounts are calculated in decimal, never rounded floating point.

### A sell form that won't let you make mistakes
While recording a sale you see how many shares are **open on that date**, fill them all in with one click, and get a preview of exactly which buys the sale uses. Selling more than you hold, or editing a trade so that a later sale would no longer be covered, is refused with a clear explanation.

<p align="center"><img src="docs/screenshots/sell-form.png?v=2" width="380" alt="Sell form showing 7 open shares, an All 7 button, a warning that 9 is too many, and the FIFO lots the sale would use"></p>

### Reports: what you invested, earned and keep, month by month
A separate **Reports** page shows each year at a glance: a waterfall from profit to what you keep after losses and estimated tax, and three charts on one shared month axis for money invested, the monthly result and the running total after tax.

![Reports page in dark mode: year totals, the profit-to-what-you-keep waterfall and the month-by-month charts](docs/screenshots/reports.png?v=2)

### Tax per share, for every sale
Each sale is listed with the buys it used, the profit and **estimated tax per share**, and how much of the profit you keep. The rate is yours to set (default 26,375 %, German Abgeltungsteuer plus Soli). A sale at a loss is never taxed. Export the year as CSV for Excel or Numbers.

![Every sale with profit per share, tax per share and the share of the profit you keep](docs/screenshots/tax-per-share.png?v=2)

### Every share, every lot
The ledger shows each share on its own line, plus open lots, FIFO-matched sales and the full trade history, with filters for stock, dates and status. Edit or delete any trade; everything recalculates instantly.

![Sheet view of the ledger: one line per share with buy and sale price, profit and status](docs/screenshots/ledger.png?v=2)

### Your data, your devices
Keep a **backup file**, or turn on **end-to-end encrypted sync** to use the same portfolio on your phone and laptop. Sync is optional and needs no account: one sync key is all it takes. Settings is also where you set your tax rate and choose light, dark or automatic appearance.

<p align="center"><img src="docs/screenshots/settings.png?v=2" width="720" alt="Settings page: encrypted sync, backup file, tax rate and light or dark appearance"></p>

### Made for every screen
Installable as an app (PWA), works offline, light and dark themes, and a layout that adapts to phones.

<p align="center"><img src="docs/screenshots/mobile.png?v=2" width="300" alt="Trade Count on a phone"></p>

## How it works

1. **Add a stock** (name and optional symbol).
2. **Record buys and sales** with quantity, price and date. A batch buy of 3 shares is one lot; a sale of 5 takes the 5 oldest open shares, across as many lots as needed.
3. **Read the result:** realized profit per stock and overall, what is still open and at what average price, and the yearly report.

Example: you buy 5 shares at 100 € in January and 3 at 110 € in March, then sell 6 at 125 €. FIFO sells the 5 January shares (+125 €) and 1 March share (+15 €): **+140 €** realized, with 2 shares at 110 € still open.

## Security and privacy

- **Your trades stay on your device.** They are stored in a SQLite database inside your browser (its private file system for this site). There is no account and no server that holds readable data.
- **The browser enforces it.** The site's Content-Security-Policy only allows requests to its own address (`connect-src 'self'`), so the page cannot send anything anywhere else, even by mistake. There are no analytics, ads, cookies or third-party scripts and fonts.
- **Sync is end-to-end encrypted.** Your sync key is turned into a vault id, an access token and an AES-256-GCM key on your device. The server only ever receives ciphertext, the vault id and a hash of the token. It cannot read your portfolio, and neither can the people who run it. Data is stored in the EU (Cloudflare D1, EU jurisdiction).
- **Abuse protection without tracking.** Rate limits use salted hashes of network addresses that expire, never the addresses themselves. Unused synced copies are deleted automatically.
- **Your key, your control.** Turning sync off deletes the server copy. On a shared computer you can choose not to remember the key. A lost key cannot be recovered by anyone, by design.
- **Tested in real browsers.** Every change runs unit tests and end-to-end tests in Chromium, Firefox and WebKit in CI.
- **Open source.** Every line is in this repository under the AGPL-3.0, so you can check these claims yourself.

Trade Count is a calculator, not tax or investment advice. Tax figures are estimates for your own overview.

---

## For developers

### Project structure

| Path | What it is |
|---|---|
| `apps/web` | Angular app (UI, design tokens, themes) |
| `apps/web/.../portfolio-db.worker.ts` | Web Worker that runs SQLite (WebAssembly, `opfs-sahpool` VFS) |
| `packages/local-store` | Schema, migrations, save rules and backup format, framework-free and tested in Node |
| `packages/ledger` | FIFO matching, oversell checks, totals and the year report, shared by the store and the UI |
| `packages/sync-crypto` | Sync key, HKDF key derivation, AES-256-GCM vault encryption (WebCrypto) |
| `packages/sync-server` | Storage-agnostic request handler for `/api/vaults/:id`, D1 adapters, rate limiting |
| `packages/sync-client` | The sync algorithm (pull → decrypt → merge → encrypt → push) and the fetch API client |
| `functions/` | Cloudflare Pages Function that wires the handler to D1 |
| `migrations/` | D1 schema (`wrangler d1 migrations`) |

### Development

Requires Node ≥ 22.12 and npm ≥ 11.6 (npm 11.4 crashes on Vitest's optional peers; `npx npm@12 install` works too).

```bash
npm install      # also builds packages/ledger and packages/local-store
npm start        # http://localhost:4200
npm test         # ledger, local-store and web tests
npm run lint     # ESLint (incl. template accessibility) + stylelint
npm run build    # static production build in apps/web/dist/web/browser
npx playwright test     # end-to-end tests in Chromium, Firefox and WebKit
npm run screenshots     # regenerate the README images in docs/screenshots
```

Only one tab can use the on-device database at a time (a limit of the `opfs-sahpool` VFS); a second tab waits and continues when the first closes.

`npm start` has no API, so the Sync section in Settings shows "sync service is not available" there. To try sync locally run the production build with the Function and a local D1:

```bash
npm run db:migrate:local   # once, creates the local vault tables
npm run preview:prod       # http://localhost:8788 (app + /api)
```

### Deploying (Cloudflare Pages)

The production build is static files plus `apps/web/public/_headers`, which sets the Content-Security-Policy and other security headers. `connect-src 'self'` is the privacy guarantee: the browser blocks any request to another origin. `wasm-unsafe-eval` is needed for SQLite; inline scripts are not allowed (the theme bootstrap lives in `public/theme-init.js`).

```bash
npx wrangler login                                                        # once, opens the browser
npx wrangler pages project create trade-count --production-branch main   # once
npm run preview:prod   # production build under local Pages emulation, http://localhost:8788
npm run deploy         # build + upload; prints the https://<hash>.trade-count.pages.dev URL
```

- **Rollback:** Cloudflare dashboard → Workers & Pages → trade-count → Deployments → "Rollback" on any earlier deployment. Users get it on their next visit; the service worker shows "A new version is ready".
- **Custom domain:** dashboard → trade-count → Custom domains. No code change needed.
- **Data safety:** deploys never touch user data. Local schema changes must be additive migrations (see below), because users may open an old database with a new app version.
- **Server schema changes:** add a new file to `migrations/`, run `npx wrangler d1 migrations apply DB --remote`, then deploy. The `RATE_LIMIT_SALT` secret is set once with `wrangler pages secret put RATE_LIMIT_SALT --project-name trade-count`.

### Sync design

- **Key:** a random 128-bit sync key (`XXXX-…`, 8 groups) is the whole account. HKDF-SHA256 splits it into a vault id, an auth token and a non-extractable AES-256-GCM key. Only the vault id and token are sent; the encryption key never leaves the device.
- **Server stores:** vault id, SHA-256 of the token, ciphertext and a version number. No plaintext, emails or IP addresses (rate limiting uses salted hashes that expire).
- **Merging:** the newest edit of each stock or trade wins, deletions are remembered, and a merge that would sell shares not held is refused (`packages/local-store/src/vault-merge.ts`).
- **Conflicts between devices:** writes carry the version they were based on; a stale write gets `409`, and the client re-reads, re-merges and retries.
- **Turning sync off** deletes the server copy; local data stays.
- **Lost key:** unrecoverable by design. The app makes users save it before the first upload.

### Data and privacy

- **Where data lives:** the browser's private file system for this site, on this device. Clearing site data deletes it.
- **Keeping it:** the app asks the browser for persistent storage after the first save. On iOS, data of sites not added to the Home Screen can be cleared after 7 days without use.
- **Backups:** `trade-count-backup-YYYY-MM-DD.json`, format `trade-count-backup` version 1. Imports are fully validated (fields, references, FIFO consistency) and replace data in one transaction.
- **Schema changes:** append a migration to `packages/local-store/src/schema.ts`; never edit a shipped one. Databases from a newer app version are refused instead of being modified.

### Changing the look

Raw colours live only in `apps/web/src/styles/tokens`; themes map them to semantic `--tc-*` tokens; components use only those tokens (enforced by stylelint). Icons are generated from `apps/web/brand/mark.svg` with `npm run icons -w @trade-count/web`.

## License

Trade Count is free software under the [GNU Affero General Public License v3.0](LICENSE) (`AGPL-3.0-only`). You may use, study, change and share it. If you run a modified version as a network service, the AGPL requires you to offer its users the corresponding source code under the same license. All dependencies shipped in the app are permissively licensed (MIT, BSD, Apache-2.0, 0BSD, OFL-1.1 for the Geist fonts) and compatible with it.

The Imprint and Privacy policy pages describe the operator of https://trade-count.pages.dev. If you deploy your own copy, put your own details in `apps/web/src/app/legal/operator.ts` (and review the texts for your situation).

