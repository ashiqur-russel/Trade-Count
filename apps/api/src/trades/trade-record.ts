import type { Trade } from '@trade-count/ledger';
import type { Prisma } from '../generated/prisma/client.js';

export const tradeSelect = {
  id: true,
  stockId: true,
  side: true,
  quantity: true,
  price: true,
  tradedOn: true,
  createdAt: true,
} as const satisfies Prisma.TradeSelect;

type TradeRecord = Prisma.TradeGetPayload<{ select: typeof tradeSelect }>;

export function toLedgerTrade(record: TradeRecord): Trade {
  return {
    id: record.id,
    stockId: record.stockId,
    side: record.side,
    quantity: record.quantity.toFixed(),
    price: record.price.toFixed(),
    tradedOn: toDateString(record.tradedOn),
    createdAt: record.createdAt.toISOString(),
  };
}

/** `date` columns arrive as UTC midnight. */
export function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function fromDateString(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}
