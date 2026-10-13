import { bootstrap } from './bootstrap.js';
import {
  readApiConfig,
  readDatabaseConfig,
  readOperationsConfig,
  ConfigurationError,
} from '@website-builder/config/api';
import { Database } from '@website-builder/database';
import {
  Readiness,
  StructuredLogger,
  installFatalHandlers,
} from '@website-builder/observability';

let logger = new StructuredLogger('api', 'unconfigured');
async function main() {
  const config = readApiConfig();
  const operations = readOperationsConfig();
  logger = new StructuredLogger('api', config.APP_ENV);
  const database = new Database(readDatabaseConfig(), () =>
    logger.emit('dependency_unavailable', { code: 'DEPENDENCY_UNAVAILABLE' }),
  );
  const readiness = new Readiness(
    () => database.connect(),
    operations.READINESS_TIMEOUT_MS,
  );
  const app = await (async () => {
    try {
      await database.connect();
      return await bootstrap(config, readiness, logger);
    } catch (error) {
      await database.close();
      throw error;
    }
  })();
  let closing = false;
  async function shutdown() {
    if (closing) return;
    closing = true;
    readiness.stop();
    logger.emit('stopping');
    const deadline = setTimeout(() => {
      logger.emit('shutdown_failed');
      process.exit(1);
    }, config.SHUTDOWN_TIMEOUT_MS);
    try {
      try {
        await app.close();
      } finally {
        await database.close();
      }
      logger.emit('stopped');
    } catch {
      logger.emit('shutdown_failed');
      process.exitCode = 1;
    } finally {
      clearTimeout(deadline);
      if (process.connected) process.disconnect();
    }
  }
  installFatalHandlers(logger, shutdown);
  process.once('SIGINT', () => void shutdown());
  process.once('SIGTERM', () => void shutdown());
  if (process.connected) {
    process.on('message', (message: unknown) => {
      if (message === 'shutdown') void shutdown();
    });
    process.once('disconnect', () => void shutdown());
  }
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
