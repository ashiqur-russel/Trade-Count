import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configureApp } from './app.setup.js';
import type { Environment } from './config/environment.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  await app.listen(
    app
      .get<ConfigService<Environment, true>>(ConfigService)
      .get('PORT', { infer: true }),
  );
}
await bootstrap();
