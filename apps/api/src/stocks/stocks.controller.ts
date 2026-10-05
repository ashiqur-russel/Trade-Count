import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import type { Stock } from '@trade-count/ledger';
import { CreateStockDto, UpdateStockDto } from './stock.dto.js';
import { StocksService } from './stocks.service.js';

@Controller('stocks')
export class StocksController {
  constructor(private readonly stocks: StocksService) {}

  @Post()
  create(@Body() dto: CreateStockDto): Promise<Stock> {
    return this.stocks.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStockDto,
  ): Promise<Stock> {
    return this.stocks.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.stocks.remove(id);
  }
}
