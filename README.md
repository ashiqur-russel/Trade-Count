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
```
