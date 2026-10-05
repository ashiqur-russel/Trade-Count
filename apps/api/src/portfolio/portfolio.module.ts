import { Module } from '@nestjs/common';
import { StocksModule } from '../stocks/stocks.module.js';
import { TradesModule } from '../trades/trades.module.js';
import { PortfolioController } from './portfolio.controller.js';

@Module({
  imports: [StocksModule, TradesModule],
  controllers: [PortfolioController],
})
export class PortfolioModule {}
