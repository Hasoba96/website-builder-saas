import { randomBytes } from 'node:crypto';
import { expect, it } from 'vitest';
import {
  readRedisConfig,
  readQueueConfig,
  readWorkerConfig,
} from '../src/worker.js';
import { readWebConfig } from '../src/web-server.js';
import { readApiConfig } from '../src/api.js';
import { getPublicConfig } from '../src/public.js';
const input = {
  NODE_ENV: 'test',
  APP_ENV: 'ci',
  REDIS_HOST: '127.0.0.1',
  REDIS_PORT: '6379',
  REDIS_USERNAME: 'worker',
  REDIS_PASSWORD: randomBytes(32).toString('hex'),
  REDIS_TLS: 'disable',
  REDIS_CONNECT_TIMEOUT_MS: '1000',
  REDIS_COMMAND_TIMEOUT_MS: '1000',
  REDIS_OUTAGE_TIMEOUT_MS: '2500',
  REDIS_RECONNECT_LIMIT: '3',
  REDIS_RECONNECT_DELAY_MS: '100',
  SHUTDOWN_TIMEOUT_MS: '3000',
  QUEUE_NAMESPACE: 'test',
  QUEUE_ATTEMPTS: '3',
  QUEUE_BACKOFF_MS: '100',
  QUEUE_RETENTION_COUNT: '2',
  QUEUE_RETENTION_AGE_SECONDS: '60',
  QUEUE_CONCURRENCY: '1',
  QUEUE_JOB_TIMEOUT_MS: '1000',
};
it('validates and selects only the Redis/queue configuration owned by the consumer', () => {
  expect(readRedisConfig(input).REDIS_PORT).toBe(6379);
  expect(readRedisConfig(input)).not.toHaveProperty('QUEUE_NAMESPACE');
  expect(readQueueConfig(input).QUEUE_ATTEMPTS).toBe(3);
  for (const value of [
    readWorkerConfig(input),
    readWebConfig(input),
    readApiConfig({ ...input, HOST: '127.0.0.1', PORT: '3001' }),
    getPublicConfig(),
  ])
    expect(JSON.stringify(value)).not.toContain(input.REDIS_PASSWORD);
});
it('rejects missing Redis settings, unsafe bounds, malformed namespaces and unknown TLS without leaking secrets', () => {
  for (const key of Object.keys(input).filter(
    (key) => key.startsWith('REDIS_') || key.startsWith('QUEUE_'),
  ))
    expect(() => readQueueConfig({ ...input, [key]: undefined })).toThrow(
      'Invalid configuration',
    );
  for (const change of [
    { REDIS_PORT: '0' },
    { REDIS_PORT: '1.5' },
    { REDIS_RECONNECT_LIMIT: '11' },
    { REDIS_COMMAND_TIMEOUT_MS: 'Infinity' },
    { REDIS_HOST: 'redis://secret@host' },
    { QUEUE_NAMESPACE: 'other:tenant' },
    { QUEUE_ATTEMPTS: '0' },
    { QUEUE_RETENTION_COUNT: '0' },
    { QUEUE_CONCURRENCY: '11' },
    { QUEUE_JOB_TIMEOUT_MS: '0' },
    { REDIS_PASSWORD: 'REPLACE_ME' },
    { REDIS_TLS: 'prefer' },
    { APP_ENV: 'unknown' },
  ])
    expect(() => readQueueConfig({ ...input, ...change })).toThrow(
      'Invalid configuration',
    );
  try {
    readRedisConfig({ ...input, REDIS_PORT: input.REDIS_PASSWORD });
    throw new Error('Expected validation failure');
  } catch (error) {
    expect(String(error)).toContain('REDIS_PORT');
    expect(String(error)).not.toContain(input.REDIS_PASSWORD);
  }
});
it('requires verified TLS for deployed/remote Redis, and never exposes public values', () => {
  expect(() =>
    readRedisConfig({ ...input, REDIS_HOST: 'redis.example.com' }),
  ).toThrow('REDIS_TLS');
  expect(() =>
    readRedisConfig({
      ...input,
      NODE_ENV: 'production',
      APP_ENV: 'production',
    }),
  ).toThrow('REDIS_TLS');
  expect(
    readRedisConfig({
      ...input,
      NODE_ENV: 'production',
      APP_ENV: 'production',
      REDIS_TLS: 'verify-full',
    }).REDIS_TLS,
  ).toBe('verify-full');
  expect(() => readRedisConfig({ ...input, REDIS_CA: 'invalid' })).toThrow(
    'REDIS_CA',
  );
  expect(() =>
    readRedisConfig({
      ...input,
      NEXT_PUBLIC_REDIS_PASSWORD: input.REDIS_PASSWORD,
    }),
  ).toThrow('not allowlisted');
});
