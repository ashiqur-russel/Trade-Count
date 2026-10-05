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
import type { Trade } from '@trade-count/ledger';
import { CreateTradeDto, UpdateTradeDto } from './trade.dto.js';
import { TradesService } from './trades.service.js';

@Controller('trades')
export class TradesController {
  constructor(private readonly trades: TradesService) {}

  @Post()
  create(@Body() dto: CreateTradeDto): Promise<Trade> {
    return this.trades.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTradeDto,
  ): Promise<Trade> {
    return this.trades.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.trades.remove(id);
  }
}
