import { createServer } from 'node:http';
import { bootstrap } from './bootstrap.js';
import { RedisConnection } from '@website-builder/queues';
import {
  readWorkerConfig,
  readRedisConfig,
  readWorkerProbeConfig,
  readOperationsConfig,
  readHttpSecurityConfig,
  ConfigurationError,
} from '@website-builder/config/worker';
import {
  Readiness,
  StructuredLogger,
  installFatalHandlers,
  requestBoundary,
  probeHandler,
  send,
  failure,
  responseRequestId,
  HttpGuard,
  httpSecurity,
} from '@website-builder/observability';

let logger = new StructuredLogger('worker', 'unconfigured');
async function main() {
  const config = readWorkerConfig();
  const listener = readWorkerProbeConfig();
  const operations = readOperationsConfig();
  const security = httpSecurity(new HttpGuard(readHttpSecurityConfig()));
  logger = new StructuredLogger('worker', config.APP_ENV);
  let terminalFailure: (() => void) | undefined = undefined;
  let failed = false;
  const redis = new RedisConnection(readRedisConfig(), (error) => {
    logger.emit('dependency_unavailable', { code: 'DEPENDENCY_UNAVAILABLE' });
    if (error.message.includes('recovery budget')) {
      failed = true;
      terminalFailure?.();
    }
  });
  await redis.connect();
  const readiness = new Readiness(async () => {
    await redis.ping();
  }, operations.READINESS_TIMEOUT_MS);
  const boundary = requestBoundary(logger);
  const probes = probeHandler(readiness, logger);
  const server = createServer((request, response) =>
    boundary(request, response, () =>
      security(request, response, () =>
        probes(request, response, () =>
          send(
            response,
            404,
            failure('NOT_FOUND', responseRequestId(response)),
          ),
        ),
      ),
    ),
  );
  server.requestTimeout = 5000;
  server.headersTimeout = 5000;
  server.maxHeadersCount = 64;
  server.maxConnections = 256;
  let app: Awaited<ReturnType<typeof bootstrap>> | undefined;
  try {
    app = await bootstrap();
    await new Promise<void>((accept, reject) => {
      server.once('error', reject);
      server.listen(listener.PROBE_PORT, listener.PROBE_HOST, () => {
        server.removeListener('error', reject);
        accept();
      });
    });
  } catch (error) {
    await redis.close();
    await app?.close();
    server.close();
    throw error;
  }
  const context = app;
  let closing = false;
  async function shutdown() {
    if (closing) return;
    closing = true;
    readiness.stop();
    logger.emit('stopping');
    const deadline = setTimeout(() => {
      logger.emit('shutdown_failed');
      server.closeAllConnections();
      process.exit(1);
    }, config.SHUTDOWN_TIMEOUT_MS);
    try {
      let listenerFailed = false;
      try {
        await new Promise<void>((accept, reject) =>
          server.close((error) => (error ? reject(error) : accept())),
        );
      } catch {
        listenerFailed = true;
      }
      const results = await Promise.allSettled([
        redis.close(),
        context.close(),
      ]);
      if (
        listenerFailed ||
        results.some((result) => result.status === 'rejected')
      )
        throw new Error('Shutdown failed');
      logger.emit('stopped');
    } catch {
      logger.emit('shutdown_failed');
      process.exitCode = 1;
    } finally {
      clearTimeout(deadline);
      if (process.connected) process.disconnect();
    }
  }
  terminalFailure = () => {
    logger.emit('infrastructure_failure', { code: 'DEPENDENCY_UNAVAILABLE' });
    process.exitCode = 1;
    void shutdown();
  };
  installFatalHandlers(logger, shutdown);
  server.on('error', terminalFailure);
  if (failed) {
    terminalFailure();
    return;
  }
  process.once('SIGINT', () => void shutdown());
  process.once('SIGTERM', () => void shutdown());
  if (process.connected) {
    process.on('message', (message: unknown) => {
      if (message === 'shutdown') void shutdown();
    });
    process.once('disconnect', () => void shutdown());
  }
  logger.emit('ready');
  logger.emit('started');
}
main().catch((error: unknown) => {
  logger.emit('startup_failed', {
    code:
      error instanceof ConfigurationError
        ? 'CONFIGURATION_INVALID'
        : 'DEPENDENCY_UNAVAILABLE',
    ...(error instanceof ConfigurationError
      ? {
          details: {
            fields: error.keys.map((path) => ({ path, code: 'INVALID' })),
          },
        }
      : {}),
  });
  process.exitCode = 1;
  if (process.connected) process.disconnect();
});
