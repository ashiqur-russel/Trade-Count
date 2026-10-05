# Trade Count

Stock portfolio tracker that matches every sale to the oldest open shares first (FIFO) to calculate profit and loss.

**Local-first:** each user's stocks and trades are stored in SQLite inside their own browser (Origin Private File System). There is no backend and no account. The site is static files only, so whoever hosts it never receives any portfolio data. Users move or protect their data with **Export / Import backup** (a JSON file).

## Structure

| Path | What it is |
|---|---|
| `apps/web` | Angular app (UI, design tokens, themes) |
| `apps/web/.../portfolio-db.worker.ts` | Web Worker that runs SQLite (WebAssembly, `opfs-sahpool` VFS) |
| `packages/local-store` | Schema, migrations, save rules and backup format, framework-free and tested in Node |
| `packages/ledger` | FIFO matching, oversell checks and totals, shared by the store and the UI |

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
- **Data safety:** deploys never touch user data; it lives only in each user's browser. Schema changes must be additive migrations (see below), because users may open an old database with a new app version.

## Data and privacy

- **Where data lives:** the browser's private file system for this site, on this device. Clearing site data deletes it.
- **Keeping it:** the app asks the browser for persistent storage after the first save. On iOS, data of sites not added to the Home Screen can be cleared after 7 days without use.
- **Backups:** `trade-count-backup-YYYY-MM-DD.json`, format `trade-count-backup` version 1. Imports are fully validated (fields, references, FIFO consistency) and replace data in one transaction.
- **Schema changes:** append a migration to `packages/local-store/src/schema.ts`; never edit a shipped one. Databases from a newer app version are refused instead of being modified.

## Changing the look

Raw colours live only in `apps/web/src/styles/tokens`; themes map them to semantic `--tc-*` tokens; components use only those tokens (enforced by stylelint). Icons are generated from `apps/web/brand/mark.svg` with `npm run icons -w @trade-count/web`.
