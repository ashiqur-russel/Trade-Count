import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnvironment } from './config/environment.js';
import { HealthModule } from './health/health.module.js';
import { PortfolioModule } from './portfolio/portfolio.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { StocksModule } from './stocks/stocks.module.js';
import { TradesModule } from './trades/trades.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env'],
      validate: validateEnvironment,
    }),
    PrismaModule,
    StocksModule,
    TradesModule,
    PortfolioModule,
    HealthModule,
  ],
})
export class AppModule {}
