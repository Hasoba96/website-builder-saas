import { randomBytes, randomUUID } from 'node:crypto';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:net';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { afterEach, expect, it } from 'vitest';
import { Redis } from 'ioredis';
import {
  logSchema,
  probeSchema,
  errorSchema,
} from '@website-builder/schemas/operations';
import {
  readQueueConfig,
  readRedisConfig,
} from '@website-builder/config/worker';
import {
  RedisConnection,
  QueueProducer,
  QueueConsumer,
  queuePrefix,
  UnrecoverableError,
} from '@website-builder/queues';

const resources: { close: () => Promise<void> }[] = [];
const failures: string[] = [];
const onFailure = (error: Error) => {
  failures.push(error.message);
};
const owned = <T extends { close: () => Promise<void> }>(resource: T): T => {
  resources.push(resource);
  return resource;
};
const config = () =>
  readQueueConfig({ ...process.env, QUEUE_NAMESPACE: `test-${randomUUID()}` });
let paused = false;
function interrupt(action: 'pause' | 'unpause') {
  const name = process.env['TEST_REDIS_CONTAINER'];
  if (!name || !/^wbp-00e-[a-f0-9-]{36}$/.test(name))
    throw new Error('Invalid owned fixture identifier');
  execFileSync('docker', [action, name], { timeout: 15000, stdio: 'pipe' });
  paused = action === 'pause';
}
afterEach(async () => {
  if (paused) interrupt('unpause');
  const results = await Promise.allSettled(
    resources.splice(0).map((resource) => resource.close()),
  );
  expect(results.every((result) => result.status === 'fulfilled')).toBe(true);
  expect(failures.join('\n')).not.toContain(process.env['REDIS_PASSWORD']);
  failures.length = 0;
});
async function until(check: () => Promise<boolean>, milliseconds = 10000) {
  const deadline = Date.now() + milliseconds;
  while (!(await check())) {
    if (Date.now() > deadline)
      throw new Error('Redis test condition exceeded deadline');
    await delay(30);
  }
}
async function pair(
  processor: (data: unknown, signal: AbortSignal) => Promise<unknown>,
  settings = config(),
) {
  const producer = owned(new QueueProducer(settings, 'technical', onFailure));
  const consumer = owned(
    new QueueConsumer(settings, 'technical', processor, onFailure),
  );
  await producer.connect();
  await consumer.connect();
  return { producer, consumer, settings };
}
it('connects to real Redis, PING succeeds and repeated close is safe', async () => {
  const client = owned(new RedisConnection(readRedisConfig(), onFailure));
  await client.connect();
  expect(await client.ping()).toBe('PONG');
  await client.close();
  await client.close();
  await expect(client.ping()).rejects.toThrow('ping failed');
});
it('invalid credentials and an unreachable endpoint fail within bounded time without value leakage', async () => {
  for (const override of [
    { REDIS_PASSWORD: randomBytes(32).toString('hex') },
    { REDIS_PORT: '1' },
  ]) {
    const start = Date.now();
    const client = owned(
      new RedisConnection(
        readRedisConfig({ ...process.env, ...override }),
        onFailure,
      ),
    );
    await expect(client.connect()).rejects.toThrow('Queue infrastructure');
    expect(Date.now() - start).toBeLessThan(4500);
    expect(failures.join()).not.toContain(
      override.REDIS_PASSWORD ?? 'never-present',
    );
  }
});
it('a TCP peer that never speaks Redis cannot hold startup forever', async () => {
  const server = createServer();
  const sockets = new Set<import('node:net').Socket>();
  server.on('connection', (socket) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
  });
  await new Promise<void>((accept) => server.listen(0, '127.0.0.1', accept));
  const address = server.address();
  if (!address || typeof address === 'string')
    throw new Error('Missing fixture port');
  try {
    const client = owned(
      new RedisConnection(
        readRedisConfig({ ...process.env, REDIS_PORT: String(address.port) }),
        onFailure,
      ),
    );
    const start = Date.now();
    await expect(client.connect()).rejects.toThrow('startup');
    expect(Date.now() - start).toBeLessThan(4500);
  } finally {
    for (const socket of sockets) socket.destroy();
    await new Promise<void>((accept) => server.close(() => accept()));
  }
});
it('BullMQ processes only a test job, returns a result, and deduplicates its retained jobId', async () => {
  let calls = 0;
  const { producer } = await pair(async (data) => {
    calls++;
    return { echo: data };
  });
  await producer.add('foundation.echo', { value: 7 }, 'test-identity');
  await until(
    async () =>
      (await producer.inspect('test-identity'))?.state === 'completed',
  );
  expect((await producer.inspect('test-identity'))?.result).toEqual({
    echo: { value: 7 },
  });
  await producer.add('foundation.echo', { value: 8 }, 'test-identity');
  await delay(200);
  expect(calls).toBe(1);
  expect((await producer.counts())['completed']).toBe(1);
});
it('completed and failed retention counts remain bounded through BullMQ lifecycle', async () => {
  const { producer } = await pair(async (data) => {
    if (data === 'fail') throw new UnrecoverableError('safe-test');
    return data;
  });
  for (const kind of ['complete', 'fail'])
    for (let n = 0; n < 5; n++) {
      const id = `test-${kind}-${n}`;
      await producer.add('foundation.retention', kind, id);
      await until(
        async () =>
          (await producer.inspect(id))?.state ===
          (kind === 'fail' ? 'failed' : 'completed'),
      );
    }
  const counts = await producer.counts();
  expect(counts['completed']).toBe(2);
  expect(counts['failed']).toBe(2);
});
it('transient failures retry exactly to the limit; permanent failures do not retry; messages are sanitized', async () => {
  const secret = randomBytes(32).toString('hex');
  let transient = 0;
  let permanent = 0;
  const { producer, settings } = await pair(async (data) => {
    if (data === 'permanent') {
      permanent++;
      throw new UnrecoverableError(secret);
    }
    transient++;
    throw new Error(secret);
  });
  await producer.add('foundation.retry', 'transient', 'test-transient');
  await producer.add('foundation.retry', 'permanent', 'test-permanent');
  await until(
    async () =>
      (await producer.inspect('test-transient'))?.state === 'failed' &&
      (await producer.inspect('test-permanent'))?.state === 'failed',
  );
  expect(transient).toBe(settings.QUEUE_ATTEMPTS);
  expect(permanent).toBe(1);
  expect(
    JSON.stringify(await producer.inspect('test-transient')),
  ).not.toContain(secret);
  expect((await producer.inspect('test-permanent'))?.failure).toBe(
    'Permanent processor failure',
  );
});
it('two environment/application namespaces with identical job IDs do not interfere', async () => {
  const one = await pair(async () => 1);
  const two = await pair(async () => 2);
  expect(queuePrefix(one.settings)).not.toBe(queuePrefix(two.settings));
  await one.producer.add('foundation.isolation', null, 'test-same');
  await two.producer.add('foundation.isolation', null, 'test-same');
  await until(
    async () =>
      (await one.producer.inspect('test-same'))?.state === 'completed' &&
      (await two.producer.inspect('test-same'))?.state === 'completed',
  );
  expect((await one.producer.inspect('test-same'))?.result).toBe(1);
  expect((await two.producer.inspect('test-same'))?.result).toBe(2);
});
it('job execution deadline aborts cooperative test work and does not store a secret-bearing failure', async () => {
  let aborted = false;
  const { producer } = await pair(
    async (_data, signal) => {
      try {
        await delay(60000, undefined, { signal });
      } finally {
        aborted = signal.aborted;
      }
    },
    { ...config(), QUEUE_ATTEMPTS: 1, QUEUE_JOB_TIMEOUT_MS: 200 },
  );
  await producer.add('foundation.timeout', null, 'test-deadline');
  await until(
    async () => (await producer.inspect('test-deadline'))?.state === 'failed',
  );
  expect(aborted).toBe(true);
});
it('active work receives cancellation and both BullMQ owners close within the configured deadline', async () => {
  let started = false;
  let aborted = false;
  const { producer, consumer, settings } = await pair(async (_data, signal) => {
    started = true;
    try {
      await delay(60000, undefined, { signal });
    } finally {
      aborted = signal.aborted;
    }
  });
  await producer.add('foundation.shutdown', null, 'test-active');
  await until(async () => started);
  const start = Date.now();
  await consumer.close();
  await producer.close();
  expect(Date.now() - start).toBeLessThan(settings.SHUTDOWN_TIMEOUT_MS + 1000);
  expect(aborted).toBe(true);
});
it('Redis interruption bounds producer calls and exhausts worker recovery rather than reconnecting forever', async () => {
  const { producer, consumer } = await pair(async () => true);
  interrupt('pause');
  const start = Date.now();
  await expect(
    producer.add('foundation.outage', null, 'test-outage'),
  ).rejects.toThrow('enqueue');
  expect(Date.now() - start).toBeLessThan(2500);
  await until(
    async () => failures.some((value) => value.includes('recovery budget')),
    9000,
  );
  await consumer.close();
  await producer.close();
  const count = failures.length;
  await delay(400);
  expect(failures.length).toBe(count);
  interrupt('unpause');
  const recovered = await pair(async () => true);
  await recovered.producer.add('foundation.recovery', null, 'test-recovered');
  await until(
    async () =>
      (await recovered.producer.inspect('test-recovered'))?.state ===
      'completed',
  );
});
it('runtime ACL denies administration and out-of-namespace writes', async () => {
  const settings = readRedisConfig();
  const client = new Redis({
    host: settings.REDIS_HOST,
    port: settings.REDIS_PORT,
    username: settings.REDIS_USERNAME,
    password: settings.REDIS_PASSWORD,
    protocol: 2,
    maxRetriesPerRequest: 0,
    connectTimeout: 1000,
    commandTimeout: 1000,
    retryStrategy: null,
  });
  const errors: string[] = [];
  client.on('error', () => errors.push('connection failed'));
  try {
    await expect(client.config('GET', 'maxmemory')).rejects.toThrow('NOPERM');
    await expect(client.acl('WHOAMI')).rejects.toThrow('NOPERM');
    await expect(client.client('LIST')).rejects.toThrow('NOPERM');
    await expect(
      client.set('outside-owned-namespace', 'technical'),
    ).rejects.toThrow('NOPERM');
    expect(errors).toEqual([]);
  } finally {
    client.disconnect();
  }
});
it('BullMQ producer and consumer startup reject invalid credentials with sanitized errors', async () => {
  const settings = {
    ...config(),
    REDIS_PASSWORD: randomBytes(32).toString('hex'),
  };
  const producer = owned(new QueueProducer(settings, 'technical', onFailure));
  const consumer = owned(
    new QueueConsumer(settings, 'technical', async () => null, onFailure),
  );
  for (const resource of [producer, consumer]) {
    await expect(resource.connect()).rejects.toThrow('Queue infrastructure');
  }
  expect(failures.join()).not.toContain(settings.REDIS_PASSWORD);
});
it('expired completed jobs are removed lazily on the next completion, not by manual internal-key TTL', async () => {
  const { producer } = await pair(async () => true, {
    ...config(),
    QUEUE_RETENTION_AGE_SECONDS: 1,
  });
  await producer.add('foundation.age', null, 'test-old');
  await until(
    async () => (await producer.inspect('test-old'))?.state === 'completed',
  );
  await delay(1500);
  await producer.add('foundation.age', null, 'test-new');
  await until(
    async () => (await producer.inspect('test-new'))?.state === 'completed',
  );
  expect(await producer.inspect('test-old')).toBeUndefined();
});
it('worker rejects malformed configuration and invalid authentication with nonzero sanitized startup failure', () => {
  for (const change of [
    { REDIS_PORT: 'sensitive-invalid-value' },
    { REDIS_PASSWORD: randomBytes(32).toString('hex') },
    { REDIS_PORT: '1' },
  ]) {
    const result = spawnSync(
      process.execPath,
      [resolve('apps/worker/dist/main.js')],
      { env: { ...process.env, ...change }, encoding: 'utf8', timeout: 15000 },
    );
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(1);
    expect(result.stdout).not.toContain('"started"');
    expect(result.stdout + result.stderr).not.toContain(
      change.REDIS_PASSWORD ?? 'sensitive-invalid-value',
    );
  }
});
it('worker process owns connectivity only, creates no jobs, and terminates after Redis outage', async () => {
  const producer = owned(new QueueProducer(config(), 'technical', onFailure));
  await producer.connect();
  const child = spawn(process.execPath, [resolve('apps/worker/dist/main.js')], {
    env: { ...process.env, PROBE_PORT: '3314', READINESS_TIMEOUT_MS: '200' },
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
  });
  let output = '';
  child.stdout?.on('data', (data) => {
    output += String(data);
  });
  child.stderr?.on('data', (data) => {
    output += String(data);
  });
  const exited = new Promise<number | null>((accept) =>
    child.once('exit', accept),
  );
  try {
    await until(async () => output.includes('"event":"started"'));
    for (const path of ['/health', '/ready']) {
      const response = await fetch(`http://127.0.0.1:3314${path}`, {
        signal: AbortSignal.timeout(2000),
      });
      expect(response.status).toBe(200);
      const body = probeSchema.parse(await response.json());
      expect(response.headers.get('x-request-id')).toBe(body.requestId);
      expect(response.headers.get('content-security-policy')).toContain(
        "default-src 'none'",
      );
      expect(response.headers.get('x-content-type-options')).toBe('nosniff');
      expect(response.headers.get('cache-control')).toBe('no-store');
    }
    expect(await producer.counts()).toMatchObject({
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
    });
    interrupt('pause');
    await delay(300);
    const health = await fetch('http://127.0.0.1:3314/health', {
      signal: AbortSignal.timeout(2000),
    });
    expect(health.status).toBe(200);
    const ready = await fetch('http://127.0.0.1:3314/ready', {
      signal: AbortSignal.timeout(2000),
    });
    expect(ready.status).toBe(503);
    expect(errorSchema.parse(await ready.json()).error.code).toBe('NOT_READY');
    const timer = setTimeout(() => child.kill(), 12000);
    try {
      expect(await exited).toBe(1);
    } finally {
      clearTimeout(timer);
    }
    expect(output).toContain('"event":"infrastructure_failure"');
    expect(output).toContain('"event":"stopped"');
    expect(output).not.toContain(process.env['REDIS_PASSWORD']);
    for (const line of output.trim().split('\n')) {
      expect(logSchema.parse(JSON.parse(line))).toMatchObject({
        organizationId: null,
        siteId: null,
        userId: null,
      });
    }
  } finally {
    if (paused) interrupt('unpause');
    if (child.exitCode === null) {
      child.kill();
      await exited;
    }
  }
});
