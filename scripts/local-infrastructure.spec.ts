import { expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { appendFileSync, existsSync, rmSync, writeFileSync } from 'node:fs';
import {
  initializeLocal,
  localEnvironment,
  compose,
  docker,
} from './local-infrastructure.ts';

it('local configuration is validated, owned and never silently overwritten', () => {
  const directory = resolve('.local', `local-config-${randomUUID()}`);
  try {
    expect(() => localEnvironment(directory, 'api')).toThrow();
    expect(() => initializeLocal(directory, 'bad', '16379')).toThrow(/PORT/);
    expect(existsSync(directory)).toBe(false);
    initializeLocal(directory);
    appendFileSync(
      resolve(directory, 'api.env'),
      'MIGRATION_DB_PASSWORD=synthetic-private-value\nREDIS_PASSWORD=synthetic-private-value\n',
    );
    expect(() => initializeLocal(directory)).toThrow(/never overwritten/);
    const api = localEnvironment(directory, 'api');
    expect(api['DB_PORT']).toBe('15432');
    expect(api).not.toHaveProperty('MIGRATION_DB_PASSWORD');
    expect(api).not.toHaveProperty('REDIS_PASSWORD');
    expect(localEnvironment(directory, 'worker')).not.toHaveProperty(
      'DB_PASSWORD',
    );
    expect(() => compose(directory, 'unrelated', ['down'])).toThrow(
      /ownership/,
    );
    writeFileSync(
      resolve(directory, 'api.env'),
      'NODE_ENV=development\nAPP_ENV=local\nDB_PASSWORD=synthetic-private-value\n',
    );
    expect(() => localEnvironment(directory, 'api')).toThrow(
      /Invalid configuration/,
    );
    try {
      localEnvironment(directory, 'api');
    } catch (error) {
      expect(String(error)).not.toContain('synthetic-private-value');
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
it('Docker command failures never fall back or expose raw command output', () => {
  expect(() =>
    docker(['wbp-deliberately-invalid-command'], process.env, 10000),
  ).toThrow(/Local Docker operation failed/);
});
