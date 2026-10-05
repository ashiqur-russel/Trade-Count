import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Stock } from '@trade-count/ledger';
import { isPrismaError, PrismaErrorCode } from '../prisma/prisma-error-code.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateStockDto, UpdateStockDto } from './stock.dto.js';

const stockSelect = { id: true, name: true, symbol: true } as const;

@Injectable()
export class StocksService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(): Promise<Stock[]> {
    return this.prisma.stock.findMany({
      select: stockSelect,
      orderBy: { name: 'asc' },
    });
  }

  async create(dto: CreateStockDto): Promise<Stock> {
    try {
      return await this.prisma.stock.create({
        data: { name: dto.name, symbol: dto.symbol ?? null },
        select: stockSelect,
      });
    } catch (error) {
      throw this.translate(error, dto.name);
    }
  }

  async update(id: string, dto: UpdateStockDto): Promise<Stock> {
    try {
      return await this.prisma.stock.update({
        where: { id },
        data: dto,
        select: stockSelect,
      });
    } catch (error) {
      throw this.translate(error, dto.name);
    }
  }

  async remove(id: string): Promise<void> {
    try {
      await this.prisma.stock.delete({ where: { id } });
    } catch (error) {
      if (isPrismaError(error, PrismaErrorCode.ForeignKeyViolation)) {
        throw new ConflictException(
          'This stock still has trades. Delete its trades first.',
        );
      }
      throw this.translate(error);
    }
  }

  private translate(error: unknown, name?: string): unknown {
    if (isPrismaError(error, PrismaErrorCode.UniqueViolation)) {
      return new ConflictException(
        `${name ?? 'This stock'} is already in your list.`,
      );
    }
    if (isPrismaError(error, PrismaErrorCode.RecordNotFound))
      return new NotFoundException('Stock not found.');
    return error;
  }
}
