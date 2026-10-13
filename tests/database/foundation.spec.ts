import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { randomBytes } from 'node:crypto';
import { afterAll, expect, it } from 'vitest';
import { readDatabaseConfig } from '@website-builder/config/api';
import {
  Database,
  DatabaseError,
  connectionOptions,
} from '@website-builder/database';

const config = readDatabaseConfig();
const idleErrors: DatabaseError[] = [];
const database = new Database(config, (error) => idleErrors.push(error));
const {
  MIGRATION_DB_USER: _migrationUser,
  MIGRATION_DB_PASSWORD: _migrationPassword,
  ...runtimeEnvironment
} = process.env;
void _migrationUser;
void _migrationPassword;
afterAll(async () => {
  await database.close();
  expect(idleErrors).toEqual([]);
});
function command(action: string, overrides: NodeJS.ProcessEnv = {}) {
  const result = spawnSync(process.execPath, ['scripts/migrate.ts', action], {
    env: { ...process.env, ...overrides },
    encoding: 'utf8',
    timeout: 15000,
  });
  expect(result.error).toBeUndefined();
  for (const secret of [
    process.env['DB_PASSWORD'],
    process.env['MIGRATION_DB_PASSWORD'],
  ])
    if (secret)
      expect((result.stdout + result.stderr).includes(secret)).toBe(false);
  return result;
}
it('connects with UTC, bounded pool and server timeouts; binds hostile values as data', async () => {
  await database.connect();
  expect(database.statistics.max).toBe(2);
  expect(
    Number(
      (await database.query('SHOW max_connections')).rows[0]?.[
        'max_connections'
      ],
    ),
  ).toBe(100);
  expect((await database.query('SHOW timezone')).rows[0]?.['TimeZone']).toBe(
    'UTC',
  );
  expect(
    (await database.query('SHOW statement_timeout')).rows[0]?.[
      'statement_timeout'
    ],
  ).toBe('2s');
  const value = "'; DROP SCHEMA application CASCADE; --";
  expect(
    (await database.query('SELECT $1::text AS value', [value])).rows[0]?.[
      'value'
    ],
  ).toBe(value);
});
it('limits concurrent connections and drains the pool', async () => {
  const tasks = Array.from({ length: 5 }, () =>
    database.query('SELECT pg_sleep($1::double precision)', [0.1]),
  );
  expect(database.statistics.total).toBeLessThanOrEqual(2);
  expect(database.statistics.waiting).toBeGreaterThan(0);
  await Promise.all(tasks);
  await expect.poll(() => database.statistics.total, { timeout: 3000 }).toBe(0);
});
it('auth failure and driver errors cannot leak passwords, SQL values or raw causes', async () => {
  const secret = randomBytes(32).toString('hex');
  const bad = new Database({ ...config, DB_PASSWORD: secret }, () => {});
  try {
    await expect(bad.connect()).rejects.toMatchObject({
      name: 'DatabaseError',
      code: '28P01',
      message: 'Database query failed',
    });
  } finally {
    await bad.close();
  }
  try {
    await database.query('SELECT $1::integer', [secret]);
    throw new Error('Expected query failure');
  } catch (error) {
    expect(error).toBeInstanceOf(DatabaseError);
    expect(String(error).includes(secret)).toBe(false);
    expect(JSON.stringify(error).includes(secret)).toBe(false);
    expect(error).not.toHaveProperty('cause');
  }
});
it('non-responsive server fails within connection timeout, without startup retries', async () => {
  const sockets = new Set<import('node:net').Socket>();
  const server = createServer((socket) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string')
    throw new Error('Missing test listener');
  const pool = new Database(
    { ...config, DB_PORT: address.port, DB_CONNECT_TIMEOUT_MS: 300 },
    () => {},
  );
  const started = Date.now();
  try {
    await expect(pool.connect()).rejects.toThrow('Database query failed');
    expect(Date.now() - started).toBeLessThan(3000);
  } finally {
    await pool.close();
    for (const socket of sockets) socket.destroy();
    await new Promise<void>((done) => server.close(() => done()));
  }
});
it('statement timeout is bounded and pool remains usable', async () => {
  const pool = new Database(
    { ...config, DB_STATEMENT_TIMEOUT_MS: 150, DB_QUERY_TIMEOUT_MS: 500 },
    () => {},
  );
  try {
    const started = Date.now();
    await expect(
      pool.query('SELECT pg_sleep($1::double precision)', [5]),
    ).rejects.toMatchObject({ code: '57014' });
    expect(Date.now() - started).toBeLessThan(2000);
    await pool.connect();
  } finally {
    await pool.close();
  }
  await expect(pool.connect()).rejects.toThrow('closed pool');
  await pool.close();
  expect(pool.statistics.total).toBe(0);
});
it('pool close drains active queries, is idempotent, and verified TLS cannot disable certificate checks', async () => {
  const pool = new Database(config, () => {});
  const query = pool.query('SELECT pg_sleep($1::double precision)', [0.1]);
  await delay(20);
  const close = pool.close();
  expect(pool.close()).toBe(close);
  await query;
  await close;
  expect(pool.statistics.total).toBe(0);
  expect(connectionOptions({ ...config, DB_TLS: 'verify-full' }).ssl).toEqual({
    rejectUnauthorized: true,
  });
});
it('runtime role cannot create schemas, tables, temp objects, or assume migration role', async () => {
  for (const sql of [
    'CREATE SCHEMA forbidden',
    'CREATE TABLE public.forbidden (id integer)',
    'CREATE TEMP TABLE forbidden (id integer)',
    'SET ROLE wb_migrator',
  ])
    await expect(database.query(sql)).rejects.toMatchObject({ code: '42501' });
});
it('real API startup/shutdown never executes migrations and receives runtime credentials only', async () => {
  expect(command('status').stdout).toContain('"applied":[]');
  const child = spawn(process.execPath, [resolve('apps/api/dist/main.js')], {
    env: { ...runtimeEnvironment, HOST: '127.0.0.1', PORT: '3315' },
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
  });
  let output = '';
  let errors = '';
  child.stdout?.setEncoding('utf8');
  child.stderr?.setEncoding('utf8');
  child.stderr?.on('data', (chunk: string) => {
    errors += chunk;
  });
  const exit = once(child, 'exit');
  const deadline = setTimeout(() => child.kill(), 25000);
  try {
    await new Promise<void>((accept, reject) => {
      child.once('error', reject);
      child.once('exit', () =>
        reject(
          new Error(
            `API exited before startup: ${errors || 'no startup output'}`,
          ),
        ),
      );
      child.stdout?.on('data', (chunk: string) => {
        output += chunk;
        if (output.includes('"event":"started"')) accept();
      });
    });
    child.send('shutdown');
    expect((await exit)[0]).toBe(0);
    expect(output).toContain('"event":"stopped"');
    expect(errors).toBe('');
    expect(command('status').stdout).toContain('"applied":[]');
  } finally {
    clearTimeout(deadline);
    if (child.exitCode === null && child.signalCode === null) {
      child.kill();
      await exit;
    }
  }
});
it('API rejects bad DB configuration and credentials without leakage', () => {
  for (const overrides of [
    { DB_PASSWORD: undefined },
    { DB_PASSWORD: randomBytes(32).toString('hex') },
    { DB_PORT: 'not-a-port' },
  ]) {
    const result = spawnSync(process.execPath, ['apps/api/dist/main.js'], {
      env: {
        ...runtimeEnvironment,
        HOST: '127.0.0.1',
        PORT: '3315',
        ...overrides,
      },
      encoding: 'utf8',
      timeout: 10000,
    });
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(1);
    expect(result.stdout).not.toContain('"event":"started"');
    expect(result.stdout + result.stderr).toContain('startup_failed');
    if (overrides.DB_PASSWORD)
      expect(
        (result.stdout + result.stderr).includes(overrides.DB_PASSWORD),
      ).toBe(false);
  }
});
it('migration status/check are read-only, up is deterministic, down is reversible and runtime cannot migrate', async () => {
  try {
    expect(command('status').status).toBe(0);
    expect(command('check').status).toBe(1);
    expect(
      (
        await database.query(
          'SELECT count(*)::integer AS count FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = $1 AND c.relname = $2',
          ['migration_meta', 'pgmigrations'],
        )
      ).rows[0]?.['count'],
    ).toBe(0);
    const up = command('up');
    expect(up.status).toBe(0);
    expect(up.stdout).toContain('1790812800000_application-schema');
    expect(command('check').status).toBe(0);
    expect(command('up').stdout).toContain('"executed":[]');
    expect(command('status').stdout).toContain('"pending":[]');
    await expect(
      database.query('CREATE TABLE application.forbidden (id integer)'),
    ).rejects.toMatchObject({ code: '42501' });
    await expect(
      database.query('SELECT * FROM migration_meta.pgmigrations'),
    ).rejects.toMatchObject({ code: '42501' });
    const denied = command('up', {
      MIGRATION_DB_USER: config.DB_USER,
      MIGRATION_DB_PASSWORD: config.DB_PASSWORD,
    });
    expect(denied.status).toBe(1);
    expect(command('down').status).toBe(0);
    expect(command('status').stdout).toContain('"applied":[]');
    expect(command('up').status).toBe(0);
    expect(command('check').status).toBe(0);
    expect(
      command('down', {
        APP_ENV: 'production',
        NODE_ENV: 'production',
        DB_TLS: 'verify-full',
      }).status,
    ).toBe(1);
  } finally {
    // Restore the fixture even after assertion failure; no later test inherits applied state.
    expect(command('down').status).toBe(0);
  }
});
