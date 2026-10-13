import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import {
  readApiConfig,
  readHttpSecurityConfig,
} from '@website-builder/config/api';
import {
  Readiness,
  StructuredLogger,
  requestBoundary,
  probeHandler,
  HttpGuard,
  httpSecurity,
} from '@website-builder/observability';
import { SafeErrorFilter } from './error-filter.js';
import type { INestApplication } from '@nestjs/common';
export function configureOperations(
  app: INestApplication,
  readiness: Readiness,
  logger: StructuredLogger,
  security = readHttpSecurityConfig(),
) {
  const adapter = app.getHttpAdapter().getInstance() as {
    set(name: string, value: boolean): unknown;
  };
  adapter.set('trust proxy', false);
  app.use(requestBoundary(logger));
  app.use(httpSecurity(new HttpGuard(security)));
  app.use(probeHandler(readiness, logger));
  app.useGlobalFilters(new SafeErrorFilter(logger));
}
export async function bootstrap(
  config = readApiConfig(),
  readiness = new Readiness(async () => {
    throw new Error('Not connected');
  }, 1000),
  logger = new StructuredLogger('api', config.APP_ENV),
) {
  const security = readHttpSecurityConfig();
  const app = await NestFactory.create(AppModule, {
    logger: false,
    abortOnError: false,
    bodyParser: false,
  });
  configureOperations(app, readiness, logger, security);
  try {
    await app.listen(config.PORT, config.HOST);
    const server = app.getHttpServer() as import('node:http').Server;
    server.requestTimeout = 5000;
    server.headersTimeout = 5000;
    server.maxHeadersCount = 64;
    server.maxConnections = 256;
  } catch (error) {
    await app.close();
    throw error;
  }
  return app;
}
