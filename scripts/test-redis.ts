import { spawn, execFileSync } from 'node:child_process';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import {
  mkdtempSync,
  writeFileSync,
  unlinkSync,
  rmdirSync,
  existsSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const image =
  'redis@sha256:29e8589c3f9ba699b5f7aa4b3c7733c58852a3626439e619aa0ee78de08c6ca0';
const name = `wbp-00e-${randomUUID()}`;
const password = randomBytes(32).toString('hex');
const directory = mkdtempSync(resolve(tmpdir(), 'wbp-00e-'));
const configFile = resolve(directory, 'redis.conf');
let created = false;
function docker(args: string[]) {
  try {
    return execFileSync('docker', args, {
      encoding: 'utf8',
      timeout: 60000,
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch {
    throw new Error(
      'Disposable Redis container operation failed (credentials redacted)',
    );
  }
}
function cleanup() {
  if (created) {
    docker(['rm', '--force', '--volumes', name]);
    created = false;
  }
  if (existsSync(configFile)) unlinkSync(configFile);
  if (existsSync(directory)) rmdirSync(directory);
}
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.once(signal, () => {
    try {
      cleanup();
    } finally {
      process.exit(1);
    }
  });
async function run(args: string[], env: NodeJS.ProcessEnv) {
  const child = spawn(process.execPath, args, { env, stdio: 'inherit' });
  const timeout = setTimeout(() => child.kill(), 900000);
  try {
    await new Promise<void>((accept, reject) => {
      child.once('error', () =>
        reject(new Error('Redis verification command could not start')),
      );
      child.once('exit', (code) =>
        code === 0
          ? accept()
          : reject(new Error('Redis verification command failed')),
      );
    });
  } finally {
    clearTimeout(timeout);
  }
}
try {
  await run(
    ['scripts/turbo.ts', 'run', 'build', '--filter=@website-builder/worker'],
    process.env,
  );
  // Generated password hash only; no credential in command arguments or container environment.
  writeFileSync(
    configFile,
    [
      'bind 0.0.0.0',
      'protected-mode yes',
      'port 6379',
      'save ""',
      'appendonly no',
      'maxmemory 96mb',
      'maxmemory-policy noeviction',
      'maxclients 64',
      'loglevel warning',
      'user default off',
      `user worker on #${createHash('sha256').update(password).digest('hex')} ~website-builder:ci:* &website-builder:ci:* +@connection +@read +@write -@dangerous -client +info +eval +evalsha +script|load +script|exists +client|setname +client|setinfo +client|unblock +client|id`,
    ].join('\n') + '\n',
  );
  docker([
    'run',
    '--detach',
    '--rm',
    '--name',
    name,
    '--label',
    'website-builder.test=00-e',
    '--publish',
    '127.0.0.1::6379',
    '--memory',
    '256m',
    '--cpus',
    '1',
    '--pids-limit',
    '64',
    '--read-only',
    '--user',
    '999:999',
    '--cap-drop',
    'ALL',
    '--security-opt',
    'no-new-privileges',
    '--tmpfs',
    '/data:rw,nosuid,nodev,size=16m',
    '--mount',
    `type=bind,source=${configFile},target=/usr/local/etc/redis/redis.conf,readonly`,
    image,
    'redis-server',
    '/usr/local/etc/redis/redis.conf',
  ]);
  created = true;
  const port = docker(['port', name, '6379/tcp']).split(':').at(-1);
  if (!port || !/^\d+$/.test(port))
    throw new Error('Missing isolated Redis port');
  if (docker(['inspect', '--format', '{{.State.Running}}', name]) !== 'true')
    throw new Error('Redis container failed startup');
  const env = {
    ...process.env,
    NODE_ENV: 'test',
    APP_ENV: 'ci',
    REDIS_HOST: '127.0.0.1',
    REDIS_PORT: port,
    REDIS_USERNAME: 'worker',
    REDIS_PASSWORD: password,
    REDIS_TLS: 'disable',
    REDIS_CONNECT_TIMEOUT_MS: '1000',
    REDIS_COMMAND_TIMEOUT_MS: '1000',
    REDIS_OUTAGE_TIMEOUT_MS: '2500',
    REDIS_RECONNECT_LIMIT: '3',
    REDIS_RECONNECT_DELAY_MS: '100',
    SHUTDOWN_TIMEOUT_MS: '3000',
    QUEUE_NAMESPACE: 'verification',
    QUEUE_ATTEMPTS: '3',
    QUEUE_BACKOFF_MS: '100',
    QUEUE_RETENTION_COUNT: '2',
    QUEUE_RETENTION_AGE_SECONDS: '60',
    QUEUE_CONCURRENCY: '1',
    QUEUE_JOB_TIMEOUT_MS: '1000',
    TEST_REDIS_CONTAINER: name,
  };
  const { readRedisConfig } = await import('@website-builder/config/worker');
  const { RedisConnection } = await import('@website-builder/queues');
  const deadline = Date.now() + 15000;
  while (true) {
    let lastFailure = false;
    const connection = new RedisConnection(readRedisConfig(env), () => {
      lastFailure = true;
    });
    try {
      await connection.connect();
      break;
    } catch {
      if (Date.now() > deadline)
        throw new Error(
          `Redis readiness timeout (connection failure: ${lastFailure})`,
        );
      await delay(100);
    } finally {
      await connection.close();
    }
  }
  process.stdout.write(
    'Disposable Redis 7.2.16: generated ACL credential, loopback port, bounded resources.\n',
  );
  await run(
    [
      resolve('node_modules/vitest/vitest.mjs'),
      'run',
      '--config',
      'vitest.redis.config.ts',
    ],
    env,
  );
  if (process.argv.includes('--all')) {
    // Only worker/root process tests consume Redis; Turbo does not forward these secrets to builds.
    await run(['scripts/test-database.ts', '--all'], {
      ...env,
      NODE_ENV: undefined,
    });
  }
} catch (error) {
  process.stderr.write(
    (error instanceof Error ? error.message : 'Redis verification failed') +
      '\n',
  );
  process.exitCode = 1;
} finally {
  try {
    cleanup();
    process.stdout.write(
      'Disposable Redis container and generated ACL file removed.\n',
    );
  } catch {
    process.stderr.write(
      `Cleanup failed; inspect only owned container ${name} and its temporary ACL file.\n`,
    );
    process.exitCode = 1;
  }
}
