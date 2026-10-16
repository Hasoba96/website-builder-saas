import { spawn, execFileSync } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import pg from 'pg';

const image =
  'postgres@sha256:77f585114c32fbca283dc835b0596f4e52b51b4c6662d7810b2f4084f60a1873';
const name = `wbp-00d-${randomUUID()}`;
const password = () => randomBytes(32).toString('hex');
const administrator = password();
const runtime = password();
const migration = password();
let created = false;
function docker(args: string[], env = process.env): string {
  try {
    return execFileSync('docker', args, {
      env,
      encoding: 'utf8',
      timeout: 60000,
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch {
    throw new Error(
      'Disposable PostgreSQL container operation failed (credentials redacted)',
    );
  }
}
function cleanup() {
  if (!created) return;
  docker(['rm', '--force', '--volumes', name]);
  created = false;
}
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.once(signal, () => {
    try {
      cleanup();
    } finally {
      process.exit(1);
    }
  });

async function run(command: string[], env: NodeJS.ProcessEnv) {
  const child = spawn(process.execPath, command, { env, stdio: 'inherit' });
  const timeout = setTimeout(() => child.kill(), 600000);
  try {
    await new Promise<void>((accept, reject) => {
      child.once('error', () =>
        reject(new Error('Test command could not start')),
      );
      child.once('exit', (code) =>
        code === 0 ? accept() : reject(new Error('Test command failed')),
      );
    });
  } finally {
    clearTimeout(timeout);
  }
}

try {
  await run(
    ['scripts/turbo.ts', 'run', 'build', '--filter=@website-builder/api'],
    process.env,
  );
  docker(
    [
      'run',
      '--detach',
      '--rm',
      '--name',
      name,
      '--label',
      'website-builder.test=00-d',
      '--publish',
      '127.0.0.1::5432',
      '--memory',
      '512m',
      '--cpus',
      '1',
      '--pids-limit',
      '128',
      '--tmpfs',
      '/var/lib/postgresql:rw,nosuid,nodev',
      '--env',
      'POSTGRES_PASSWORD',
      '--env',
      'POSTGRES_DB=foundation_test',
      '--env',
      'POSTGRES_INITDB_ARGS=--auth-host=scram-sha-256',
      image,
    ],
    { ...process.env, POSTGRES_PASSWORD: administrator },
  );
  created = true;
  const port = docker(['port', name, '5432/tcp']).split(':').at(-1);
  if (!port || !/^\d+$/.test(port))
    throw new Error('Missing isolated PostgreSQL port');
  const deadline = Date.now() + 45000;
  while (true) {
    try {
      docker([
        'exec',
        name,
        'pg_isready',
        '-h',
        '127.0.0.1',
        '-U',
        'postgres',
        '-d',
        'foundation_test',
      ]);
      break;
    } catch {
      if (Date.now() > deadline)
        throw new Error('PostgreSQL test startup exceeded 45 seconds');
      await delay(250);
    }
  }
  const admin = new pg.Client({
    host: '127.0.0.1',
    port: Number(port),
    database: 'foundation_test',
    user: 'postgres',
    password: administrator,
    connectionTimeoutMillis: 5000,
    query_timeout: 10000,
    ssl: false,
  });
  try {
    await admin.connect();
    // PostgreSQL role DDL does not accept bind parameters. Server-side format(%L)
    // quotes the bound secret; never concatenate credentials or log this result.
    for (const [role, secret] of [
      ['wb_runtime', runtime],
      ['wb_migrator', migration],
    ] as const) {
      const result = await admin.query<{ sql: string }>(
        "SELECT format('CREATE ROLE %I LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD %L', $1::text, $2::text) AS sql",
        [role, secret],
      );
      const sql = result.rows[0]?.sql;
      if (!sql) throw new Error('Test role provisioning failed');
      await admin.query(sql);
    }
    await admin.query('REVOKE ALL ON DATABASE foundation_test FROM PUBLIC');
    await admin.query(
      'GRANT CONNECT ON DATABASE foundation_test TO wb_runtime, wb_migrator',
    );
    await admin.query(
      'GRANT CREATE ON DATABASE foundation_test TO wb_migrator',
    );
    await admin.query('REVOKE CREATE ON SCHEMA public FROM PUBLIC');
    await admin.query('CREATE SCHEMA migration_meta AUTHORIZATION wb_migrator');
  } catch {
    throw new Error(
      'PostgreSQL fixture provisioning failed (credentials redacted)',
    );
  } finally {
    await admin.end();
  }
  const environment = {
    ...process.env,
    NODE_ENV: 'test',
    APP_ENV: 'ci',
    TEST_POSTGRES_CONTAINER: name,
    DB_HOST: '127.0.0.1',
    DB_PORT: port,
    DB_NAME: 'foundation_test',
    DB_USER: 'wb_runtime',
    DB_PASSWORD: runtime,
    DB_TLS: 'disable',
    DB_POOL_MAX: '2',
    DB_CONNECT_TIMEOUT_MS: '1000',
    DB_IDLE_TIMEOUT_MS: '500',
    DB_STATEMENT_TIMEOUT_MS: '2000',
    DB_QUERY_TIMEOUT_MS: '3000',
    DB_LOCK_TIMEOUT_MS: '1000',
    MIGRATION_DB_USER: 'wb_migrator',
    MIGRATION_DB_PASSWORD: migration,
  };
  process.stdout.write(
    'Disposable PostgreSQL 18.6 started; isolated loopback port and generated credentials.\n',
  );
  await run(
    [
      resolve('node_modules/vitest/vitest.mjs'),
      'run',
      '--config',
      'vitest.database.config.ts',
      ...(process.argv.includes('--backup')
        ? ['tests/database/backup.spec.ts']
        : []),
    ],
    environment,
  );
  if (process.argv.includes('--all')) {
    const {
      MIGRATION_DB_USER: _user,
      MIGRATION_DB_PASSWORD: _password,
      ...runtimeEnvironment
    } = environment;
    void _user;
    void _password;
    // Next build selects production mode; Vitest independently selects test mode.
    const regressionEnvironment = {
      ...runtimeEnvironment,
      NODE_ENV: undefined,
    };
    await run(['scripts/turbo.ts', 'run', 'test'], regressionEnvironment);
    await run(
      [resolve('node_modules/vitest/vitest.mjs'), 'run'],
      regressionEnvironment,
    );
    await run(
      [resolve('node_modules/@playwright/test/cli.js'), 'test'],
      Object.fromEntries(
        Object.entries(regressionEnvironment).filter(
          ([key]) =>
            !key.startsWith('DB_') &&
            !key.startsWith('REDIS_') &&
            !key.startsWith('QUEUE_') &&
            key !== 'TEST_REDIS_CONTAINER' &&
            key !== 'TEST_POSTGRES_CONTAINER',
        ),
      ),
    );
  }
} catch (error) {
  process.stderr.write(
    (error instanceof Error ? error.message : 'Database test failed') + '\n',
  );
  process.exitCode = 1;
} finally {
  try {
    cleanup();
    process.stdout.write('Disposable PostgreSQL container removed.\n');
  } catch {
    process.stderr.write(
      `Cleanup failed; remove only test container ${name}.\n`,
    );
    process.exitCode = 1;
  }
}
