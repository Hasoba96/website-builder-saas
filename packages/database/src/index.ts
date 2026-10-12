import pg from 'pg';
import type { DatabaseConfig } from '@website-builder/schemas/database';

export class DatabaseError extends Error {
  readonly code: string | undefined;
  constructor(operation: string, error: unknown) {
    super(`Database ${operation} failed`);
    this.name = 'DatabaseError';
    const code =
      typeof error === 'object' && error !== null && 'code' in error
        ? error.code
        : undefined;
    this.code =
      typeof code === 'string' && /^[A-Z0-9]{5}$/.test(code) ? code : undefined;
    // Do not retain the driver cause: it may contain SQL, parameter values or credentials.
  }
}

export function connectionOptions(config: DatabaseConfig): pg.ClientConfig {
  return {
    host: config.DB_HOST,
    port: config.DB_PORT,
    database: config.DB_NAME,
    user: config.DB_USER,
    password: config.DB_PASSWORD,
    ssl:
      config.DB_TLS === 'disable'
        ? false
        : {
            rejectUnauthorized: true,
            ...(config.DB_CA ? { ca: config.DB_CA } : {}),
          },
    application_name: 'website-builder',
    connectionTimeoutMillis: config.DB_CONNECT_TIMEOUT_MS,
    statement_timeout: config.DB_STATEMENT_TIMEOUT_MS,
    query_timeout: config.DB_QUERY_TIMEOUT_MS,
    lock_timeout: config.DB_LOCK_TIMEOUT_MS,
    idle_in_transaction_session_timeout: config.DB_STATEMENT_TIMEOUT_MS,
    options: '-c timezone=UTC -c search_path=pg_catalog',
  };
}

/** One owner per application lifecycle. No checked-out clients escape this boundary. */
export class Database {
  readonly #pool: pg.Pool;
  #closing: Promise<void> | undefined;
  constructor(
    config: DatabaseConfig,
    onIdleError: (error: DatabaseError) => void,
  ) {
    this.#pool = new pg.Pool({
      ...connectionOptions(config),
      max: config.DB_POOL_MAX,
      idleTimeoutMillis: config.DB_IDLE_TIMEOUT_MS,
    });
    this.#pool.on('error', (error) =>
      onIdleError(new DatabaseError('idle connection', error)),
    );
  }
  async query(
    text: string,
    values: readonly unknown[] = [],
  ): Promise<pg.QueryResult<Record<string, unknown>>> {
    if (this.#closing) throw new DatabaseError('closed pool', undefined);
    try {
      return await this.#pool.query<Record<string, unknown>>(text, [...values]);
    } catch (error) {
      throw new DatabaseError('query', error);
    }
  }
  async connect(): Promise<void> {
    await this.query('SELECT 1');
  }
  get statistics() {
    return Object.freeze({
      total: this.#pool.totalCount,
      idle: this.#pool.idleCount,
      waiting: this.#pool.waitingCount,
      max: this.#pool.options.max,
    });
  }
  close(): Promise<void> {
    this.#closing ??= this.#pool.end().catch((error: unknown) => {
      throw new DatabaseError('shutdown', error);
    });
    return this.#closing;
  }
}
