import { afterEach, expect, it, vi } from 'vitest';
import { readApiConfig, ConfigurationError } from '../src/api.js';
import { readWorkerConfig } from '../src/worker.js';
import { readWebConfig, readListenerConfig } from '../src/web-server.js';
import { getPublicConfig, PUBLIC_ENV_KEYS } from '../src/public.js';

const base = { APP_ENV: 'local', NODE_ENV: 'test' };
const api = { ...base, HOST: '127.0.0.1', PORT: '3001' };
afterEach(() => vi.unstubAllEnvs());

it('returns immutable typed API configuration with documented nonproduction timeout', () => {
  const config = readApiConfig(api);
  expect(config).toEqual({
    ...base,
    HOST: '127.0.0.1',
    PORT: 3001,
    SHUTDOWN_TIMEOUT_MS: 10000,
  });
  expect(Object.isFrozen(config)).toBe(true);
});
it.each(['APP_ENV', 'NODE_ENV', 'HOST', 'PORT'])(
  'rejects missing required API key %s',
  (key) => {
    expect(() => readApiConfig({ ...api, [key]: undefined })).toThrow(
      ConfigurationError,
    );
  },
);
it.each([
  ['APP_ENV', 'unknown'],
  ['NODE_ENV', 'staging'],
  ['HOST', 'https://localhost'],
  ['HOST', 'not a host'],
  ['PORT', 3000],
  ['PORT', 'false'],
  ['SHUTDOWN_TIMEOUT_MS', '0'],
  ['SHUTDOWN_TIMEOUT_MS', '30001'],
])('rejects invalid %s without echoing its value', (key, value) => {
  expect(() => readApiConfig({ ...api, [key]: value })).toThrow(
    `Invalid configuration: ${key}`,
  );
});
it('requires explicit production timeout without unsafe fallback', () => {
  const production = { ...api, NODE_ENV: 'production', APP_ENV: 'production' };
  expect(() => readApiConfig(production)).toThrow('SHUTDOWN_TIMEOUT_MS');
  expect(
    readApiConfig({ ...production, SHUTDOWN_TIMEOUT_MS: '5000' })
      .SHUTDOWN_TIMEOUT_MS,
  ).toBe(5000);
  expect(() => readWorkerConfig(production)).toThrow('SHUTDOWN_TIMEOUT_MS');
});
it('limits each consumer to its own settings', () => {
  const input = { ...api, PRIVATE_SECRET: 'not-a-real-credential' };
  expect(Object.keys(readApiConfig(input)).sort()).toEqual([
    'APP_ENV',
    'HOST',
    'NODE_ENV',
    'PORT',
    'SHUTDOWN_TIMEOUT_MS',
  ]);
  expect(Object.keys(readWorkerConfig(input)).sort()).toEqual([
    'APP_ENV',
    'NODE_ENV',
    'SHUTDOWN_TIMEOUT_MS',
  ]);
  expect(readWebConfig(input)).toEqual(base);
  expect(readListenerConfig(input)).toEqual({ HOST: '127.0.0.1', PORT: 3001 });
});
it('never includes supplied values in validation diagnostics', () => {
  const canary = `invalid-sensitive-value-${Date.now()}`;
  try {
    readApiConfig({ ...api, PORT: canary });
    expect.fail('Invalid configuration accepted');
  } catch (error: unknown) {
    expect(error).toBeInstanceOf(ConfigurationError);
    expect(String(error)).toContain('PORT');
    expect(String(error)).not.toContain(canary);
    expect(JSON.stringify(error)).not.toContain(canary);
  }
});
it('does not expose arbitrary environment keys through public configuration', () => {
  vi.stubEnv('PRIVATE_SECRET', 'not-a-real-credential');
  vi.stubEnv('NEXT_PUBLIC_UNAPPROVED', 'not-a-real-credential');
  expect(PUBLIC_ENV_KEYS).toEqual([]);
  expect(getPublicConfig()).toEqual({});
  expect(Object.isFrozen(getPublicConfig())).toBe(true);
  expect(getPublicConfig()['PRIVATE_SECRET']).toBeUndefined();
  expect(getPublicConfig()['HOST']).toBeUndefined();
  expect(() =>
    readWebConfig({ ...base, NEXT_PUBLIC_UNAPPROVED: 'canary' }),
  ).toThrow('not allowlisted');
});
