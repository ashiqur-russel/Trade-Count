import { Controller, Get } from '@nestjs/common';
import type { Stock, Trade } from '@trade-count/ledger';
import { StocksService } from '../stocks/stocks.service.js';
import { TradesService } from '../trades/trades.service.js';

export interface Portfolio {
  stocks: Stock[];
  trades: Trade[];
}

@Controller('portfolio')
export class PortfolioController {
  constructor(
    private readonly stocks: StocksService,
    private readonly trades: TradesService,
  ) {}

  @Get()
  async get(): Promise<Portfolio> {
    const [stocks, trades] = await Promise.all([
      this.stocks.findAll(),
      this.trades.findAll(),
    ]);
    return { stocks, trades };
  }
}
