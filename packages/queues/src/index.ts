import { Redis, type RedisOptions } from 'ioredis';
import { Queue, Worker, UnrecoverableError, type JobsOptions } from 'bullmq';
import type { RedisConfig, QueueConfig } from '@website-builder/schemas/queues';

export { UnrecoverableError } from 'bullmq';
export class QueueInfrastructureError extends Error {
  constructor(operation: string) {
    super(`Queue infrastructure ${operation} failed`);
    this.name = 'QueueInfrastructureError';
  }
}

async function bounded<T>(
  work: Promise<T>,
  milliseconds: number,
  operation: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new QueueInfrastructureError(operation)),
          milliseconds,
        );
      }),
    ]);
  } catch (error) {
    // Redis replies and driver causes may contain credentials or job values.
    if (error instanceof UnrecoverableError)
      throw new UnrecoverableError('Permanent processor failure');
    throw new QueueInfrastructureError(operation);
  } finally {
    clearTimeout(timer);
  }
}

/** One finite recovery budget per owner lifetime, shared by duplicated connections. */
class ConnectionBudget {
  #timer: ReturnType<typeof setTimeout> | undefined;
  #stopped = false;
  #reconnects = 0;
  constructor(
    readonly config: RedisConfig,
    readonly failed: () => void,
  ) {}
  stop() {
    this.#stopped = true;
    clearTimeout(this.#timer);
  }
  failedCommand() {
    if (!this.#stopped)
      this.#timer ??= setTimeout(
        () => this.exhaust(),
        this.config.REDIS_OUTAGE_TIMEOUT_MS,
      );
  }
  options(blocking = false) {
    const config = this.config;
    return {
      host: config.REDIS_HOST,
      port: config.REDIS_PORT,
      username: config.REDIS_USERNAME,
      password: config.REDIS_PASSWORD,
      protocol: 2 as const,
      lazyConnect: true,
      enableReadyCheck: true,
      enableOfflineQueue: false,
      autoResendUnfulfilledCommands: false,
      autoResubscribe: false,
      maxRetriesPerRequest: blocking ? null : 0,
      connectTimeout: config.REDIS_CONNECT_TIMEOUT_MS,
      // Blocking reads use a short BullMQ drain interval; socket silence stays bounded.
      socketTimeout: Math.max(2000, config.REDIS_COMMAND_TIMEOUT_MS),
      ...(blocking ? {} : { commandTimeout: config.REDIS_COMMAND_TIMEOUT_MS }),
      ...(config.REDIS_TLS === 'verify-full'
        ? {
            tls: {
              rejectUnauthorized: true,
              ...(config.REDIS_CA ? { ca: config.REDIS_CA } : {}),
            },
          }
        : {}),
      retryStrategy: () => {
        if (this.#stopped) return null;
        this.#timer ??= setTimeout(
          () => this.exhaust(),
          config.REDIS_OUTAGE_TIMEOUT_MS,
        );
        if (++this.#reconnects > config.REDIS_RECONNECT_LIMIT) {
          queueMicrotask(() => this.exhaust());
          return null;
        }
        const ceiling = Math.min(
          config.REDIS_RECONNECT_DELAY_MS * 2 ** (this.#reconnects - 1),
          2000,
        );
        return Math.floor(ceiling * (0.5 + Math.random() * 0.5));
      },
      reconnectOnError: () => false,
    } satisfies RedisOptions;
  }
  exhaust() {
    if (this.#stopped) return;
    this.stop();
    this.failed();
  }
}

/** Connectivity only. No application-owned data or production queues. */
export class RedisConnection {
  readonly #client: Redis;
  readonly #budget: ConnectionBudget;
  #closing: Promise<void> | undefined;
  #heartbeat: ReturnType<typeof setInterval> | undefined;
  constructor(
    readonly config: RedisConfig,
    onFailure: (error: QueueInfrastructureError) => void,
  ) {
    this.#budget = new ConnectionBudget(config, () => {
      clearInterval(this.#heartbeat);
      this.#client.disconnect();
      void this.close().catch(() =>
        onFailure(new QueueInfrastructureError('shutdown')),
      );
      onFailure(new QueueInfrastructureError('recovery budget'));
    });
    this.#client = new Redis(this.#budget.options());
    this.#client.on('error', () =>
      onFailure(new QueueInfrastructureError('connection')),
    );
  }
  async connect() {
    if (this.#closing) throw new QueueInfrastructureError('closed connection');
    try {
      await bounded(
        this.#client.connect(),
        this.config.REDIS_CONNECT_TIMEOUT_MS,
        'startup',
      );
      await this.ping();
      this.#heartbeat = setInterval(() => {
        void this.ping().catch(() => this.#budget.failedCommand());
      }, this.config.REDIS_COMMAND_TIMEOUT_MS);
    } catch (error) {
      await this.close();
      throw error;
    }
  }
  async ping() {
    return bounded(
      this.#client.ping(),
      this.config.REDIS_COMMAND_TIMEOUT_MS,
      'ping',
    );
  }
  close(): Promise<void> {
    this.#closing ??= (async () => {
      this.#budget.stop();
      clearInterval(this.#heartbeat);
      try {
        if (this.#client.status === 'ready')
          await bounded(
            this.#client.quit(),
            this.config.SHUTDOWN_TIMEOUT_MS,
            'shutdown',
          );
      } finally {
        this.#client.disconnect();
      }
    })();
    return this.#closing;
  }
}

export function queuePrefix(config: QueueConfig) {
  return `website-builder:${config.APP_ENV}:${config.QUEUE_NAMESPACE}`;
}
function queueName(name: string) {
  if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(name) || name.length > 64)
    throw new QueueInfrastructureError('queue name validation');
  return name;
}
function defaults(config: QueueConfig): JobsOptions {
  const retention = {
    count: config.QUEUE_RETENTION_COUNT,
    age: config.QUEUE_RETENTION_AGE_SECONDS,
  };
  return {
    attempts: config.QUEUE_ATTEMPTS,
    backoff: {
      type: 'exponential',
      delay: config.QUEUE_BACKOFF_MS,
      jitter: 0.5,
    },
    removeOnComplete: retention,
    removeOnFail: retention,
    stackTraceLimit: 0,
  };
}

/** Owns its Queue and command connection. No automatic replay after ambiguous failure. */
export class QueueProducer {
  readonly #client: Redis;
  readonly #queue: Queue<unknown, unknown, string>;
  readonly #budget: ConnectionBudget;
  #closing: Promise<void> | undefined;
  constructor(
    readonly config: QueueConfig,
    name: string,
    onFailure: (error: QueueInfrastructureError) => void,
  ) {
    queueName(name);
    this.#budget = new ConnectionBudget(config, () => {
      void this.close().catch(() =>
        onFailure(new QueueInfrastructureError('shutdown')),
      );
      onFailure(new QueueInfrastructureError('recovery budget'));
    });
    this.#client = new Redis(this.#budget.options());
    this.#client.on('error', () =>
      onFailure(new QueueInfrastructureError('producer connection')),
    );
    this.#queue = new Queue<unknown, unknown, string>(name, {
      connection: this.#client,
      prefix: queuePrefix(config),
      defaultJobOptions: defaults(config),
      streams: { events: { maxLen: 1000 } },
    });
    this.#queue.on('error', () =>
      onFailure(new QueueInfrastructureError('producer')),
    );
  }
  async connect() {
    try {
      await bounded(
        this.#queue.waitUntilReady(),
        this.config.REDIS_CONNECT_TIMEOUT_MS,
        'producer startup',
      );
    } catch (error) {
      await this.close();
      throw error;
    }
  }
  async add(name: string, data: unknown, id: string): Promise<string> {
    if (
      this.#closing ||
      !/^[a-z][a-z0-9-]*\.[a-z][a-z0-9-]*$/.test(name) ||
      !/^[a-z][a-z0-9-]{0,127}$/.test(id)
    )
      throw new QueueInfrastructureError('job validation');
    const job = await bounded(
      this.#queue.add(name, data, { jobId: id }),
      this.config.REDIS_COMMAND_TIMEOUT_MS,
      'enqueue',
    );
    if (!job.id) throw new QueueInfrastructureError('job identifier');
    return job.id;
  }
  async inspect(id: string) {
    return bounded(
      (async () => {
        const job = await this.#queue.getJob(id);
        return job
          ? {
              state: await job.getState(),
              result: job.returnvalue as unknown,
              attempts: job.attemptsMade,
              failure: job.failedReason,
            }
          : undefined;
      })(),
      this.config.REDIS_COMMAND_TIMEOUT_MS,
      'inspect',
    );
  }
  async counts() {
    return bounded(
      this.#queue.getJobCounts('completed', 'failed', 'waiting', 'active'),
      this.config.REDIS_COMMAND_TIMEOUT_MS,
      'counts',
    );
  }
  close(): Promise<void> {
    this.#closing ??= (async () => {
      this.#budget.stop();
      try {
        await bounded(
          this.#queue.close(),
          this.config.SHUTDOWN_TIMEOUT_MS,
          'producer shutdown',
        );
      } finally {
        this.#client.disconnect();
      }
    })();
    return this.#closing;
  }
}

/** Only test processors currently consume this lifecycle. No product registration. */
export class QueueConsumer {
  readonly #client: Redis;
  readonly #worker: Worker<unknown, unknown, string>;
  readonly #budget: ConnectionBudget;
  readonly #abort = new AbortController();
  #closing: Promise<void> | undefined;
  constructor(
    readonly config: QueueConfig,
    name: string,
    processor: (data: unknown, signal: AbortSignal) => Promise<unknown>,
    onFailure: (error: QueueInfrastructureError) => void,
  ) {
    queueName(name);
    this.#budget = new ConnectionBudget(config, () => {
      void this.close().catch(() =>
        onFailure(new QueueInfrastructureError('shutdown')),
      );
      onFailure(new QueueInfrastructureError('recovery budget'));
    });
    this.#client = new Redis(this.#budget.options(true));
    this.#client.on('error', () =>
      onFailure(new QueueInfrastructureError('consumer connection')),
    );
    this.#worker = new Worker<unknown, unknown, string>(
      name,
      async (job) => {
        const timeout = new AbortController();
        const timer = setTimeout(
          () => timeout.abort(),
          config.QUEUE_JOB_TIMEOUT_MS,
        );
        try {
          return await bounded(
            processor(
              job.data,
              AbortSignal.any([this.#abort.signal, timeout.signal]),
            ),
            config.QUEUE_JOB_TIMEOUT_MS,
            'job deadline',
          );
        } catch (error) {
          if (error instanceof UnrecoverableError)
            throw new UnrecoverableError('Permanent processor failure');
          throw new QueueInfrastructureError('transient processor');
        } finally {
          clearTimeout(timer);
        }
      },
      {
        connection: this.#client,
        prefix: queuePrefix(config),
        autorun: false,
        concurrency: config.QUEUE_CONCURRENCY,
        maxStalledCount: 1,
        maxStartedAttempts: config.QUEUE_ATTEMPTS + 1,
        drainDelay: 0.5,
        removeOnComplete: {
          count: config.QUEUE_RETENTION_COUNT,
          age: config.QUEUE_RETENTION_AGE_SECONDS,
        },
        removeOnFail: {
          count: config.QUEUE_RETENTION_COUNT,
          age: config.QUEUE_RETENTION_AGE_SECONDS,
        },
      },
    );
    this.#worker.on('error', () =>
      onFailure(new QueueInfrastructureError('consumer')),
    );
  }
  async connect() {
    try {
      await bounded(
        this.#worker.waitUntilReady(),
        this.config.REDIS_CONNECT_TIMEOUT_MS,
        'consumer startup',
      );
      void this.#worker.run().catch(() => this.#budget.exhaust());
    } catch (error) {
      await this.close();
      throw error;
    }
  }
  close(): Promise<void> {
    this.#closing ??= (async () => {
      this.#budget.stop();
      // Abort cooperative active work, then force-close BullMQ's owned blocking connection.
      this.#abort.abort();
      try {
        await bounded(
          this.#worker.close(true),
          this.config.SHUTDOWN_TIMEOUT_MS,
          'consumer shutdown',
        );
      } finally {
        this.#client.disconnect();
      }
    })();
    return this.#closing;
  }
}
