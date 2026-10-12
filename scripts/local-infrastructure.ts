import { execFileSync, spawn } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { resolve } from 'node:path';
import { parseEnv } from 'node:util';
import pg from 'pg';
import {
  readDatabaseConfig,
  readApiConfig,
  readHttpSecurityConfig,
  readOperationsConfig,
} from '@website-builder/config/api';
import {
  readRedisConfig,
  readWorkerConfig,
  readWorkerProbeConfig,
} from '@website-builder/config/worker';
import { readMigrationConfig } from '@website-builder/config/migration';
import { readListenerConfig } from '@website-builder/config/web-server';

export const localDirectory = resolve('.local/infrastructure');
export const localProject = `wb-local-${createHash('sha256').update(resolve('.')).digest('hex').slice(0, 12)}`;
const secret = () => randomBytes(32).toString('hex');
const hash = (value: string) =>
  createHash('sha256').update(value).digest('hex');
const read = (directory: string, file: string) =>
  readFileSync(resolve(directory, file), 'utf8');
export function localEnvironment(directory: string, app: string) {
  if (!['api', 'worker', 'migration'].includes(app))
    throw new Error('Unknown local configuration owner');
  const input = parseEnv(read(directory, `${app}.env`));
  if (input['APP_ENV'] !== 'local' || input['NODE_ENV'] !== 'development')
    throw new Error(
      'Local tooling accepts only local development configuration',
    );
  let keys: string[];
  if (app === 'api') {
    keys = Object.keys({
      ...readApiConfig(input),
      ...readDatabaseConfig(input),
      ...readOperationsConfig(input),
      ...readHttpSecurityConfig(input),
    });
    if (
      input['DB_HOST'] !== '127.0.0.1' ||
      input['DB_NAME'] !== 'foundation' ||
      input['DB_USER'] !== 'wb_runtime'
    )
      throw new Error(
        'Local database identity must match the provisioned contract',
      );
  } else if (app === 'worker') {
    keys = Object.keys({
      ...readWorkerConfig(input),
      ...readRedisConfig(input),
      ...readWorkerProbeConfig(input),
      ...readOperationsConfig(input),
      ...readHttpSecurityConfig(input),
    });
    if (
      input['REDIS_HOST'] !== '127.0.0.1' ||
      input['REDIS_USERNAME'] !== 'worker'
    )
      throw new Error(
        'Local Redis identity must match the provisioned contract',
      );
  } else {
    keys = Object.keys(readMigrationConfig(input)).map((key) =>
      key === 'DB_USER'
        ? 'MIGRATION_DB_USER'
        : key === 'DB_PASSWORD'
          ? 'MIGRATION_DB_PASSWORD'
          : key,
    );
    if (
      input['DB_HOST'] !== '127.0.0.1' ||
      input['DB_NAME'] !== 'foundation' ||
      input['MIGRATION_DB_USER'] !== 'wb_migrator'
    )
      throw new Error(
        'Local migration identity must match the provisioned contract',
      );
  }
  return Object.fromEntries(
    Object.entries(input).filter(([key]) => keys.includes(key)),
  );
}

export function initializeLocal(
  directory: string,
  dbPort = '15432',
  redisPort = '16379',
) {
  for (const port of [dbPort, redisPort])
    readListenerConfig({ HOST: '127.0.0.1', PORT: port });
  if (dbPort === redisPort) throw new Error('Local service ports must differ');
  if (existsSync(directory))
    throw new Error(
      'Local configuration already exists; never overwritten. Inspect it or follow the reset runbook.',
    );
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const save = (file: string, value: string) =>
    writeFileSync(resolve(directory, file), value, { flag: 'wx', mode: 0o600 });
  const runtime = secret(),
    migrator = secret(),
    worker = secret(),
    health = secret();
  save('postgres-password', secret());
  save('redis-health-password', health);
  for (const [app, source, substitutions] of [
    ['api', 'apps/api/.env.example', { DB_PORT: dbPort, DB_PASSWORD: runtime }],
    [
      'worker',
      'apps/worker/.env.example',
      { REDIS_PORT: redisPort, REDIS_PASSWORD: worker },
    ],
    [
      'migration',
      '.env.migration.example',
      { DB_PORT: dbPort, MIGRATION_DB_PASSWORD: migrator },
    ],
  ] as const) {
    const values = {
      ...parseEnv(readFileSync(source, 'utf8')),
      ...substitutions,
    };
    save(
      `${app}.env`,
      Object.entries(values)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n') + '\n',
    );
  }
  save(
    'redis.conf',
    [
      'bind 0.0.0.0',
      'protected-mode yes',
      'save ""',
      'appendonly no',
      'maxmemory 96mb',
      'maxmemory-policy noeviction',
      'maxclients 64',
      'user default off',
      `user health on #${hash(health)} -@all +ping`,
      `user worker on #${hash(worker)} ~website-builder:local:* &website-builder:local:* +@connection +@read +@write -@dangerous -client +info +eval +evalsha +script|load +script|exists +client|setname +client|setinfo +client|unblock +client|id`,
    ].join('\n') + '\n',
  );
  // File modes are restrictive on POSIX. Windows inherits the checkout user's ACL.
  // Compose file secrets are bind mounts: Redis UID 999 must read these two files.
  // Their containing directory remains private (0700) on the host.
  chmodSync(resolve(directory, 'redis.conf'), 0o444);
  chmodSync(resolve(directory, 'redis-health-password'), 0o444);
  for (const app of ['api', 'worker', 'migration'])
    localEnvironment(directory, app);
}

export function docker(args: string[], env = process.env, timeout = 120000) {
  try {
    return execFileSync('docker', args, {
      env,
      timeout,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch {
    throw new Error(
      'Local Docker operation failed. Check Docker Desktop, image availability, service health and occupied ports; no native fallback.',
    );
  }
}

export function compose(directory: string, project: string, args: string[]) {
  if (!/^wb-local-(?:test-)?[a-f0-9-]{8,36}$/.test(project))
    throw new Error('Invalid local project ownership');
  const api = localEnvironment(directory, 'api');
  const worker = localEnvironment(directory, 'worker');
  return docker(
    [
      'compose',
      '--project-name',
      project,
      '--file',
      resolve('infra/compose.yaml'),
      ...args,
    ],
    {
      ...process.env,
      COMPOSE_DISABLE_ENV_FILE: 'true',
      LOCAL_PROJECT: project,
      LOCAL_STATE_DIR: resolve(directory),
      DB_PORT: api['DB_PORT'],
      REDIS_PORT: worker['REDIS_PORT'],
    },
  );
}

export async function provisionLocal(directory: string) {
  const config = readDatabaseConfig(localEnvironment(directory, 'api'));
  const migration = readMigrationConfig(
    localEnvironment(directory, 'migration'),
  );
  const admin = new pg.Client({
    host: config.DB_HOST,
    port: config.DB_PORT,
    database: config.DB_NAME,
    user: 'postgres',
    password: read(directory, 'postgres-password'),
    ssl: false,
    connectionTimeoutMillis: 3000,
    query_timeout: 10000,
  });
  try {
    await admin.connect();
    await admin.query('BEGIN');
    for (const [role, password] of [
      [config.DB_USER, config.DB_PASSWORD],
      [migration.DB_USER, migration.DB_PASSWORD],
    ]) {
      const existing = await admin.query(
        'SELECT 1 FROM pg_roles WHERE rolname=$1',
        [role],
      );
      if (existing.rowCount === 0) {
        // PostgreSQL DDL requires server-side identifier/literal quoting, not raw interpolation.
        const result = await admin.query<{ sql: string }>(
          "SELECT format('CREATE ROLE %I LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD %L', $1::text, $2::text) AS sql",
          [role, password],
        );
        const sql = result.rows[0]?.sql;
        if (!sql) throw new Error('Missing role statement');
        await admin.query(sql);
      }
    }
    await admin.query('REVOKE ALL ON DATABASE foundation FROM PUBLIC');
    await admin.query(
      'GRANT CONNECT ON DATABASE foundation TO wb_runtime, wb_migrator',
    );
    await admin.query('GRANT CREATE ON DATABASE foundation TO wb_migrator');
    await admin.query('REVOKE CREATE ON SCHEMA public FROM PUBLIC');
    await admin.query(
      'CREATE SCHEMA IF NOT EXISTS migration_meta AUTHORIZATION wb_migrator',
    );
    await admin.query('COMMIT');
  } catch {
    throw new Error(
      'Local role provisioning failed; credentials and SQL redacted. Verify the original credential files match the persistent volume.',
    );
  } finally {
    await admin.end();
  }
}

export async function localUp(directory: string, project: string) {
  ownedVolume(project);
  try {
    compose(directory, project, [
      'up',
      '--detach',
      '--wait',
      '--wait-timeout',
      '60',
    ]);
    await provisionLocal(directory);
  } catch (error) {
    // Stop this project only; preserve its data and configuration for diagnosis/retry.
    try {
      compose(directory, project, ['stop', '--timeout', '15']);
    } catch {
      process.stderr.write(
        `Local cleanup incomplete; inspect exact project ${project}.\n`,
      );
    }
    throw error;
  }
}

export function localReset(
  directory: string,
  project: string,
  confirmation: string | undefined,
) {
  if (confirmation !== '--delete-local-data')
    throw new Error(
      'Reset destroys local PostgreSQL data. Supply --delete-local-data deliberately.',
    );
  const volume = ownedVolume(project);
  compose(directory, project, ['down', '--timeout', '15']);
  if (volume) docker(['volume', 'rm', volume]);
}

function ownedVolume(project: string): string | undefined {
  if (!/^wb-local-(?:test-)?[a-f0-9-]{8,36}$/.test(project))
    throw new Error('Invalid local project ownership');
  const volume = `${project}_postgres-data`;
  const names = docker(['volume', 'ls', '--format', '{{.Name}}']).split('\n');
  if (names.includes(volume)) {
    const label = docker([
      'volume',
      'inspect',
      '--format',
      '{{index .Labels "website-builder.local"}}',
      volume,
    ]);
    if (label !== project)
      throw new Error('Refusing volume with unexpected ownership');
    return volume;
  }
  return undefined;
}

export async function runLocal(directory: string, app: string, args: string[]) {
  const config = localEnvironment(directory, app);
  const env = Object.fromEntries(
    Object.entries(process.env).filter(
      ([key]) =>
        !/^(DB_|MIGRATION_|REDIS_|QUEUE_|NODE_ENV$|APP_ENV$|HOST$|PORT$|PROBE_|HTTP_|READINESS_|SHUTDOWN_|NEXT_PUBLIC_)/.test(
          key,
        ),
    ),
  );
  const entry =
    app === 'migration' ? 'scripts/migrate.ts' : `apps/${app}/dist/main.js`;
  const child = spawn(process.execPath, [entry, ...args], {
    env: { ...env, ...config },
    stdio:
      app === 'migration'
        ? 'inherit'
        : ['inherit', 'inherit', 'inherit', 'ipc'],
  });
  const signal = () => {
    if (child.connected) child.send('shutdown');
    else child.kill('SIGTERM');
  };
  process.once('SIGINT', signal);
  process.once('SIGTERM', signal);
  try {
    await new Promise<void>((accept, reject) => {
      child.once('error', () =>
        reject(new Error('Local process failed to start')),
      );
      child.once('exit', (code) =>
        code === 0
          ? accept()
          : reject(new Error('Local process exited unsuccessfully')),
      );
    });
  } finally {
    process.off('SIGINT', signal);
    process.off('SIGTERM', signal);
  }
}
