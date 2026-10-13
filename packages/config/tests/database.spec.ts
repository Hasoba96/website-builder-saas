import { randomBytes } from 'node:crypto';
import { expect, it } from 'vitest';
import { readDatabaseConfig, readApiConfig } from '../src/api.js';
import { readMigrationConfig } from '../src/migration.js';
import { readWorkerConfig } from '../src/worker.js';
import { getPublicConfig } from '../src/public.js';
const input = {
  NODE_ENV: 'test',
  APP_ENV: 'ci',
  DB_HOST: '127.0.0.1',
  DB_PORT: '5432',
  DB_NAME: 'foundation',
  DB_USER: 'runtime',
  DB_PASSWORD: randomBytes(32).toString('hex'),
  DB_TLS: 'disable',
  DB_POOL_MAX: '2',
  DB_CONNECT_TIMEOUT_MS: '1000',
  DB_IDLE_TIMEOUT_MS: '1000',
  DB_STATEMENT_TIMEOUT_MS: '2000',
  DB_QUERY_TIMEOUT_MS: '3000',
  DB_LOCK_TIMEOUT_MS: '1000',
  MIGRATION_DB_USER: 'migrator',
  MIGRATION_DB_PASSWORD: randomBytes(32).toString('hex'),
};
it('validates typed DB settings and selects runtime/operator credentials explicitly', () => {
  expect(readDatabaseConfig(input).DB_PORT).toBe(5432);
  expect(readDatabaseConfig(input).DB_USER).toBe('runtime');
  expect(readMigrationConfig(input).DB_USER).toBe('migrator');
  expect(readMigrationConfig(input).DB_POOL_MAX).toBe(1);
  expect(readDatabaseConfig(input)).not.toHaveProperty('MIGRATION_DB_PASSWORD');
});
it('rejects every missing required setting and malformed bounds with no value disclosure', () => {
  for (const key of Object.keys(input).filter(
    (key) => !key.startsWith('MIGRATION_'),
  ))
    expect(() => readDatabaseConfig({ ...input, [key]: undefined })).toThrow(
      'Invalid configuration',
    );
  for (const settings of [
    { DB_PORT: '0' },
    { DB_POOL_MAX: '21' },
    { DB_CONNECT_TIMEOUT_MS: '0' },
    { DB_IDLE_TIMEOUT_MS: 'Infinity' },
    { DB_QUERY_TIMEOUT_MS: '1' },
    { DB_NAME: 'bad/name' },
    { DB_TLS: 'prefer' },
    { DB_HOST: 'bad/host' },
  ])
    expect(() => readDatabaseConfig({ ...input, ...settings })).toThrow(
      'Invalid configuration',
    );
  expect(() =>
    readDatabaseConfig({ ...input, DB_PORT: input.DB_PASSWORD }),
  ).toThrow('Invalid configuration');
  try {
    readDatabaseConfig({ ...input, DB_PORT: input.DB_PASSWORD });
  } catch (error) {
    expect(String(error).includes(input.DB_PASSWORD)).toBe(false);
  }
  expect(() =>
    readMigrationConfig({ ...input, MIGRATION_DB_PASSWORD: undefined }),
  ).toThrow('MIGRATION_DB_PASSWORD');
});
it('never permits plaintext remote/deployed DB or disabled certificate verification', () => {
  expect(() =>
    readDatabaseConfig({ ...input, DB_HOST: 'database.example.com' }),
  ).toThrow('DB_TLS');
  expect(() =>
    readDatabaseConfig({
      ...input,
      APP_ENV: 'production',
      NODE_ENV: 'production',
    }),
  ).toThrow('DB_TLS');
  expect(
    readDatabaseConfig({
      ...input,
      APP_ENV: 'production',
      NODE_ENV: 'production',
      DB_TLS: 'verify-full',
    }).DB_TLS,
  ).toBe('verify-full');
  expect(() =>
    readDatabaseConfig({ ...input, DB_TLS: 'disable', DB_CA: 'invalid' }),
  ).toThrow('DB_CA');
});
it('API listener, Worker and public surfaces do not forward database secrets', () => {
  for (const value of [
    readApiConfig({ ...input, HOST: '127.0.0.1', PORT: '3001' }),
    readWorkerConfig(input),
    getPublicConfig(),
  ]) {
    expect(value).not.toHaveProperty('DB_PASSWORD');
    expect(JSON.stringify(value).includes(input.MIGRATION_DB_PASSWORD)).toBe(
      false,
    );
  }
});
