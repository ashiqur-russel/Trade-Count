import { Injectable, NotFoundException } from '@nestjs/common';
import {
  findOversellCausedBy,
  type Stock,
  type Trade,
  type TradeChange,
} from '@trade-count/ledger';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { OversellException } from './oversell.exception.js';
import { fromDateString, toLedgerTrade, tradeSelect } from './trade-record.js';
import type { CreateTradeDto, UpdateTradeDto } from './trade.dto.js';

const DRAFT_ID = 'draft';

interface LockedStocks {
  stocks: Stock[];
  trades: Trade[];
}

@Injectable()
export class TradesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Trade[]> {
    const rows = await this.prisma.trade.findMany({
      select: tradeSelect,
      orderBy: [{ stockId: 'asc' }, { tradedOn: 'asc' }, { createdAt: 'asc' }],
    });
    return rows.map(toLedgerTrade);
  }

  create(dto: CreateTradeDto): Promise<Trade> {
    return this.prisma.$transaction(async (tx) => {
      const { stockId, side, quantity, price, tradedOn } = dto;
      const locked = await this.lockStocks(tx, [stockId]);
      const draft: Trade = {
        id: DRAFT_ID,
        stockId,
        side,
        quantity,
        price,
        tradedOn,
        createdAt: new Date().toISOString(),
      };
      this.assertNoOversell(locked, { type: 'add', trade: draft }, DRAFT_ID);

      const created = await tx.trade.create({
        data: {
          stockId,
          side,
          quantity,
          price,
          tradedOn: fromDateString(tradedOn),
        },
        select: tradeSelect,
      });
      return toLedgerTrade(created);
    });
  }

  update(id: string, dto: UpdateTradeDto): Promise<Trade> {
    return this.prisma.$transaction(async (tx) => {
      const current = await this.lockTrade(tx, id);
      const next: Trade = { ...current, ...definedFields(dto) };
      const locked = await this.lockStocks(tx, [current.stockId, next.stockId]);
      this.assertNoOversell(locked, { type: 'update', trade: next }, id);

      const updated = await tx.trade.update({
        where: { id },
        data: {
          ...definedFields(dto),
          tradedOn: dto.tradedOn ? fromDateString(dto.tradedOn) : undefined,
        },
        select: tradeSelect,
      });
      return toLedgerTrade(updated);
    });
  }

  remove(id: string): Promise<void> {
    return this.prisma.$transaction(async (tx) => {
      const current = await this.lockTrade(tx, id);
      const locked = await this.lockStocks(tx, [current.stockId]);
      this.assertNoOversell(locked, { type: 'remove', tradeId: id }, id);
      await tx.trade.delete({ where: { id } });
    });
  }

  private async lockTrade(
    tx: Prisma.TransactionClient,
    id: string,
  ): Promise<Trade> {
    await tx.$queryRaw`SELECT id FROM trades WHERE id = ${id}::uuid FOR UPDATE`;
    const row = await tx.trade.findUnique({
      where: { id },
      select: tradeSelect,
    });
    if (!row) throw new NotFoundException('Trade not found.');
    return toLedgerTrade(row);
  }

  /** Row-locks the stocks (in id order, to avoid deadlocks) so concurrent writes to them queue up. */
  private async lockStocks(
    tx: Prisma.TransactionClient,
    stockIds: string[],
  ): Promise<LockedStocks> {
    const ids = [...new Set(stockIds)].sort();
    const stocks = await tx.$queryRaw<Stock[]>`
      SELECT id::text AS id, name, symbol FROM stocks
      WHERE id IN (${Prisma.join(ids.map((id) => Prisma.sql`${id}::uuid`))})
      ORDER BY id
      FOR UPDATE`;
    if (stocks.length !== ids.length)
      throw new NotFoundException('Stock not found.');

    const rows = await tx.trade.findMany({
      where: { stockId: { in: ids } },
      select: tradeSelect,
    });
    return { stocks, trades: rows.map(toLedgerTrade) };
  }

  private assertNoOversell(
    { stocks, trades }: LockedStocks,
    change: TradeChange,
    changedTradeId: string,
  ): void {
    const oversell = findOversellCausedBy(stocks, trades, change);
    if (oversell) throw new OversellException(oversell, changedTradeId);
  }
}

function definedFields<T extends object>(dto: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(dto).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}
