# Trade Count

Stock portfolio tracker that matches every sale to the oldest open shares first (FIFO) to calculate profit and loss.

Live: https://trade-count.pages.dev · Source: https://github.com/ashiqur-russel/Trade-Count · License: AGPL-3.0

**Local-first:** each user's stocks and trades are stored in SQLite inside their own browser (Origin Private File System). There are no accounts and no readable data on any server. Users protect and move their data with **Export / Import backup** (a JSON file) or with **opt-in end-to-end encrypted sync**: an encrypted copy is kept in a Cloudflare D1 database (EU jurisdiction) that only the user's **sync key** can decrypt.

## Structure

| Path | What it is |
|---|---|
| `apps/web` | Angular app (UI, design tokens, themes) |
| `apps/web/.../portfolio-db.worker.ts` | Web Worker that runs SQLite (WebAssembly, `opfs-sahpool` VFS) |
| `packages/local-store` | Schema, migrations, save rules and backup format, framework-free and tested in Node |
| `packages/ledger` | FIFO matching, oversell checks and totals, shared by the store and the UI |
| `packages/sync-crypto` | Sync key, HKDF key derivation, AES-256-GCM vault encryption (WebCrypto) |
| `packages/sync-server` | Storage-agnostic request handler for `/api/vaults/:id`, D1 adapters, rate limiting |
| `packages/sync-client` | The sync algorithm (pull → decrypt → merge → encrypt → push) and the fetch API client |
| `functions/` | Cloudflare Pages Function that wires the handler to D1 |
| `migrations/` | D1 schema (`wrangler d1 migrations`) |

## Development

Requires Node ≥ 22.12 and npm ≥ 11.6 (npm 11.4 crashes on Vitest's optional peers; `npx npm@12 install` works too).

```bash
npm install      # also builds packages/ledger and packages/local-store
npm start        # http://localhost:4200
npm test         # ledger, local-store and web tests
npm run lint     # ESLint (incl. template accessibility) + stylelint
npm run build    # static production build in apps/web/dist/web/browser
```

Only one tab can open the on-device database at a time (a limit of the `opfs-sahpool` VFS).

`npm start` has no API, so the Sync panel shows "sync service is not available" there. To try sync locally run the production build with the Function and a local D1:

```bash
npm run db:migrate:local   # once, creates the local vault tables
npm run preview:prod       # http://localhost:8788 (app + /api)
```

## Deploying (Cloudflare Pages)

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

## Sync design

- **Key:** a random 128-bit sync key (`XXXX-…`, 8 groups) is the whole account. HKDF-SHA256 splits it into a vault id, an auth token and a non-extractable AES-256-GCM key. Only the vault id and token are sent; the encryption key never leaves the device.
- **Server stores:** vault id, SHA-256 of the token, ciphertext and a version number. No plaintext, emails or IP addresses (rate limiting uses salted hashes that expire).
- **Merging:** the newest edit of each stock or trade wins, deletions are remembered, and a merge that would sell shares not held is refused (`packages/local-store/src/vault-merge.ts`).
- **Conflicts between devices:** writes carry the version they were based on; a stale write gets `409`, and the client re-reads, re-merges and retries.
- **Turning sync off** deletes the server copy; local data stays.
- **Lost key:** unrecoverable by design. The app makes users save it before the first upload.

## Data and privacy

- **Where data lives:** the browser's private file system for this site, on this device. Clearing site data deletes it.
- **Keeping it:** the app asks the browser for persistent storage after the first save. On iOS, data of sites not added to the Home Screen can be cleared after 7 days without use.
- **Backups:** `trade-count-backup-YYYY-MM-DD.json`, format `trade-count-backup` version 1. Imports are fully validated (fields, references, FIFO consistency) and replace data in one transaction.
- **Schema changes:** append a migration to `packages/local-store/src/schema.ts`; never edit a shipped one. Databases from a newer app version are refused instead of being modified.

## Changing the look

Raw colours live only in `apps/web/src/styles/tokens`; themes map them to semantic `--tc-*` tokens; components use only those tokens (enforced by stylelint). Icons are generated from `apps/web/brand/mark.svg` with `npm run icons -w @trade-count/web`.

## License

Trade Count is free software under the [GNU Affero General Public License v3.0](LICENSE) (`AGPL-3.0-only`). You may use, study, change and share it. If you run a modified version as a network service, the AGPL requires you to offer its users the corresponding source code under the same license. All dependencies shipped in the app are permissively licensed (MIT, BSD, Apache-2.0, 0BSD, OFL-1.1 for the Geist fonts) and compatible with it.

The Imprint and Privacy policy pages describe the operator of https://trade-count.pages.dev. If you deploy your own copy, put your own details in `apps/web/src/app/legal/operator.ts` (and review the texts for your situation).

