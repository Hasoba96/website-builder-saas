import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { readWorkerConfig } from '@website-builder/config/worker';
export async function bootstrap() {
  readWorkerConfig();
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false,
    abortOnError: false,
  });
  await app.init();
  return app;
}
