# Trade Count

Stock portfolio tracker that matches every sale to the oldest open shares first (FIFO) to calculate profit and loss.

## Stack

- `apps/web` — Angular
- `apps/api` — NestJS + Prisma
- `packages/ledger` — FIFO calculation shared by web and api
- PostgreSQL 17 (Docker)

## Local setup

Requires npm ≥ 11.6 (11.4 crashes on Vitest's optional peers); `npx npm@12 install` works too.

```bash
cp .env.example .env   # then set POSTGRES_PASSWORD (and the same value in DATABASE_URL)
npm install            # also generates the Prisma client
npm run db:up          # starts Postgres on 127.0.0.1:5434
npm run db:migrate -w @trade-count/api
npm run start:dev -w @trade-count/api   # http://localhost:3000/api
```

## API

| Method | Path | |
|---|---|---|
| GET | `/api/portfolio` | All stocks and trades in one response |
| POST / PATCH / DELETE | `/api/stocks[/:id]` | Name is unique ignoring case; a stock with trades can't be deleted |
| POST / PATCH / DELETE | `/api/trades[/:id]` | Quantities and prices are decimal strings; returns `409 OVERSELL` when a change would sell shares not held |
| GET | `/api/health` | Checks the database connection |

Trade writes lock the affected stock row, so concurrent sales can't oversell.

## Tests

```bash
npm test -w @trade-count/ledger         # FIFO unit tests
npm run test:e2e -w @trade-count/api    # API against a separate <db>_test database (created and migrated automatically)
```
