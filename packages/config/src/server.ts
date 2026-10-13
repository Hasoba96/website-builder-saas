import process from 'node:process';
import {
  redisConfigSchema,
  queueConfigSchema,
} from '@website-builder/schemas/queues';
import { databaseConfigSchema } from '@website-builder/schemas/database';
import {
  apiConfigSchema,
  workerConfigSchema,
  environmentSchema,
  listenerSchema,
  operationsConfigSchema,
  workerProbeConfigSchema,
  httpSecuritySchema,
  webHttpSecuritySchema,
} from '@website-builder/schemas/configuration';

type Environment = Readonly<Record<string, unknown>>;
export class ConfigurationError extends Error {
  constructor(readonly keys: readonly string[]) {
    super(
      `Invalid configuration: ${keys.join(', ')}. Check the documented environment contract.`,
    );
    this.name = 'ConfigurationError';
  }
}

function parse<T>(
  schema: {
    safeParse: (input: unknown) =>
      | { success: true; data: T }
      | {
          success: false;
          error: { issues: readonly { path: readonly PropertyKey[] }[] };
        };
  },
  input: unknown,
): Readonly<T> {
  const result = schema.safeParse(input);
  if (!result.success)
    throw new ConfigurationError([
      ...new Set(
        result.error.issues.map((issue) =>
          String(issue.path[0] ?? 'configuration'),
        ),
      ),
    ]);
  return Object.freeze(result.data);
}

function environment(input: Environment) {
  // No public values are needed by the current shells. Fail closed on exposure.
  if (Object.keys(input).some((key) => key.startsWith('NEXT_PUBLIC_')))
    throw new ConfigurationError(['NEXT_PUBLIC_* (not allowlisted)']);
  return parse(environmentSchema, {
    NODE_ENV: input['NODE_ENV'],
    APP_ENV: input['APP_ENV'],
  });
}
function shutdown(input: Environment, mode: string) {
  return (
    input['SHUTDOWN_TIMEOUT_MS'] ??
    (mode === 'production' ? undefined : '10000')
  );
}
export function readApiConfig(input: Environment = process.env) {
  const common = environment(input);
  return parse(apiConfigSchema, {
    ...common,
    HOST: input['HOST'],
    PORT: input['PORT'],
    SHUTDOWN_TIMEOUT_MS: shutdown(input, common.NODE_ENV),
  });
}
export function readWorkerConfig(input: Environment = process.env) {
  const common = environment(input);
  return parse(workerConfigSchema, {
    ...common,
    SHUTDOWN_TIMEOUT_MS: shutdown(input, common.NODE_ENV),
  });
}
function redisInput(input: Environment) {
  const common = environment(input);
  return {
    ...common,
    REDIS_HOST: input['REDIS_HOST'],
    REDIS_PORT: input['REDIS_PORT'],
    REDIS_USERNAME: input['REDIS_USERNAME'],
    REDIS_PASSWORD: input['REDIS_PASSWORD'],
    REDIS_TLS: input['REDIS_TLS'],
    REDIS_CA: input['REDIS_CA'],
    REDIS_CONNECT_TIMEOUT_MS: input['REDIS_CONNECT_TIMEOUT_MS'],
    REDIS_COMMAND_TIMEOUT_MS: input['REDIS_COMMAND_TIMEOUT_MS'],
    REDIS_OUTAGE_TIMEOUT_MS: input['REDIS_OUTAGE_TIMEOUT_MS'],
    REDIS_RECONNECT_LIMIT: input['REDIS_RECONNECT_LIMIT'],
    REDIS_RECONNECT_DELAY_MS: input['REDIS_RECONNECT_DELAY_MS'],
    SHUTDOWN_TIMEOUT_MS: shutdown(input, common.NODE_ENV),
  };
}
export function readOperationsConfig(input: Environment = process.env) {
  const common = environment(input);
  return parse(operationsConfigSchema, {
    READINESS_TIMEOUT_MS:
      input['READINESS_TIMEOUT_MS'] ??
      (common.NODE_ENV === 'production' ? undefined : '1000'),
  });
}
export function readHttpSecurityConfig(input: Environment = process.env) {
  const common = environment(input);
  const local = ['local', 'ci'].includes(common.APP_ENV);
  const config = parse(httpSecuritySchema, {
    HTTP_ALLOWED_HOSTS:
      input['HTTP_ALLOWED_HOSTS'] ??
      (local ? 'localhost,127.0.0.1,[::1]' : undefined),
    HTTP_CORS_ORIGINS: input['HTTP_CORS_ORIGINS'] ?? (local ? '' : undefined),
    HTTP_BODY_MAX_BYTES:
      input['HTTP_BODY_MAX_BYTES'] ?? (local ? '16384' : undefined),
    HTTP_RATE_LIMIT: input['HTTP_RATE_LIMIT'] ?? (local ? '600' : undefined),
    HTTP_RATE_WINDOW_MS:
      input['HTTP_RATE_WINDOW_MS'] ?? (local ? '60000' : undefined),
  });
  if (
    !local &&
    config.HTTP_CORS_ORIGINS.some((origin) => !origin.startsWith('https://'))
  )
    throw new ConfigurationError(['HTTP_CORS_ORIGINS']);
  return config;
}
export function readWebHttpSecurityConfig(input: Environment = process.env) {
  const common = environment(input);
  const local = ['local', 'ci'].includes(common.APP_ENV);
  const port =
    input['PORT'] === undefined
      ? ''
      : `:${parse(listenerSchema, { HOST: input['HOST'], PORT: input['PORT'] }).PORT}`;
  const config = Object.freeze({
    ...readHttpSecurityConfig(input),
    ...parse(webHttpSecuritySchema, {
      HTTP_CANONICAL_ORIGIN:
        input['HTTP_CANONICAL_ORIGIN'] ??
        (local ? `http://127.0.0.1${port}` : undefined),
    }),
  });
  if (!local && !config.HTTP_CANONICAL_ORIGIN.startsWith('https://'))
    throw new ConfigurationError(['HTTP_CANONICAL_ORIGIN']);
  return config;
}
export function readWorkerProbeConfig(input: Environment = process.env) {
  const common = environment(input);
  return parse(workerProbeConfigSchema, {
    PROBE_HOST:
      input['PROBE_HOST'] ??
      (common.NODE_ENV === 'production' ? undefined : '127.0.0.1'),
    PROBE_PORT:
      input['PROBE_PORT'] ??
      (common.NODE_ENV === 'production' ? undefined : '3004'),
  });
}
export function readRedisConfig(input: Environment = process.env) {
  return parse(redisConfigSchema, redisInput(input));
}
export function readQueueConfig(input: Environment = process.env) {
  return parse(queueConfigSchema, {
    ...redisInput(input),
    QUEUE_NAMESPACE: input['QUEUE_NAMESPACE'],
    QUEUE_ATTEMPTS: input['QUEUE_ATTEMPTS'],
    QUEUE_BACKOFF_MS: input['QUEUE_BACKOFF_MS'],
    QUEUE_RETENTION_COUNT: input['QUEUE_RETENTION_COUNT'],
    QUEUE_RETENTION_AGE_SECONDS: input['QUEUE_RETENTION_AGE_SECONDS'],
    QUEUE_CONCURRENCY: input['QUEUE_CONCURRENCY'],
    QUEUE_JOB_TIMEOUT_MS: input['QUEUE_JOB_TIMEOUT_MS'],
  });
}
export function readWebConfig(input: Environment = process.env) {
  return environment(input);
}
export function readListenerConfig(input: Environment = process.env) {
  return parse(listenerSchema, { HOST: input['HOST'], PORT: input['PORT'] });
}

function database(input: Environment, migration: boolean) {
  const common = environment(input);
  return parse(databaseConfigSchema, {
    ...common,
    DB_HOST: input['DB_HOST'],
    DB_PORT: input['DB_PORT'],
    DB_NAME: input['DB_NAME'],
    DB_USER: input[migration ? 'MIGRATION_DB_USER' : 'DB_USER'],
    DB_PASSWORD: input[migration ? 'MIGRATION_DB_PASSWORD' : 'DB_PASSWORD'],
    DB_TLS: input['DB_TLS'],
    DB_CA: input['DB_CA'],
    DB_POOL_MAX: migration ? '1' : input['DB_POOL_MAX'],
    DB_CONNECT_TIMEOUT_MS: input['DB_CONNECT_TIMEOUT_MS'],
    DB_IDLE_TIMEOUT_MS: input['DB_IDLE_TIMEOUT_MS'],
    DB_STATEMENT_TIMEOUT_MS: input['DB_STATEMENT_TIMEOUT_MS'],
    DB_QUERY_TIMEOUT_MS: input['DB_QUERY_TIMEOUT_MS'],
    DB_LOCK_TIMEOUT_MS: input['DB_LOCK_TIMEOUT_MS'],
  });
}
export function readDatabaseConfig(input: Environment = process.env) {
  return database(input, false);
}
export function readMigrationConfig(input: Environment = process.env) {
  try {
    return database(input, true);
  } catch (error) {
    if (error instanceof ConfigurationError)
      throw new ConfigurationError(
        error.keys.map((key) =>
          key === 'DB_USER'
            ? 'MIGRATION_DB_USER'
            : key === 'DB_PASSWORD'
              ? 'MIGRATION_DB_PASSWORD'
              : key,
        ),
      );
    throw error;
  }
}
