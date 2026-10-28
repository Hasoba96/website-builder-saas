import { afterAll, beforeAll, expect, it } from 'vitest';
import { createServer } from 'node:net';
import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { appendFileSync, rmSync } from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';
import pg from 'pg';
import { Redis } from 'ioredis';
import {
  compose,
  docker,
  initializeLocal,
  localEnvironment,
  localUp,
  localReset,
  runLocal,
} from '../../scripts/local-infrastructure.ts';
import { readDatabaseConfig } from '@website-builder/config/api';
import { probeSchema, errorSchema } from '@website-builder/schemas/operations';

const id = randomUUID();
const project = `wb-local-test-${id}`;
const directory = resolve('.local', project);
const children: ChildProcess[] = [];
// Match existing process-lifecycle bounds; measured cold API imports take ~14s.
const startupTimeoutMs = 25_000;
function startupState(
  child: Pick<ChildProcess, 'exitCode' | 'signalCode'>,
  output: string[],
) {
  return {
    reason:
      child.exitCode !== null || child.signalCode !== null
        ? 'process_exited'
        : 'readiness_deadline',
    exitCode: child.exitCode,
    terminated: child.signalCode !== null,
    outputObserved: output.some((chunk) => chunk.length > 0),
  };
}

it('startup diagnostics distinguish silent live/exited processes without exposing captured values', () => {
  const live = { exitCode: null, signalCode: null };
  expect(startupState(live, [])).toEqual({
    reason: 'readiness_deadline',
    exitCode: null,
    terminated: false,
    outputObserved: false,
  });
  const output = [
    'raw-process-private-value',
    '{"details":{"password":"raw-process-private-value"}}',
  ];
  expect(startupState({ exitCode: 1, signalCode: null }, output)).toEqual({
    reason: 'process_exited',
    exitCode: 1,
    terminated: false,
    outputObserved: true,
  });
  expect(
    startupState({ exitCode: null, signalCode: 'SIGTERM' }, output),
  ).toEqual({
    reason: 'process_exited',
    exitCode: null,
    terminated: true,
    outputObserved: true,
  });
  expect(JSON.stringify(startupState(live, output))).not.toContain(
    'raw-process-private-value',
  );
});

async function freePort() {
  const server = createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string')
    throw new Error('Missing test port');
  await new Promise<void>((accept) => server.close(() => accept()));
  return String(address.port);
}
async function client() {
  const c = readDatabaseConfig(localEnvironment(directory, 'api'));
  const connection = new pg.Client({
    host: c.DB_HOST,
    port: c.DB_PORT,
    database: c.DB_NAME,
    user: c.DB_USER,
    password: c.DB_PASSWORD,
    connectionTimeoutMillis: 1000,
    query_timeout: 2000,
  });
  await connection.connect();
  return connection;
}
beforeAll(async () => {
  initializeLocal(directory, await freePort(), await freePort());
  await localUp(directory, project);
});
afterAll(() => {
  for (const child of children)
    if (child.exitCode === null && child.signalCode === null) child.kill();
  localReset(directory, project, '--delete-local-data');
  rmSync(directory, { recursive: true, force: true });
});

it('resolved Compose contract is restricted, pinned, bounded and healthy', () => {
  const config = JSON.parse(
    compose(directory, project, ['config', '--format', 'json']),
  ) as {
    services: Record<
      string,
      {
        image: string;
        privileged?: boolean;
        network_mode?: string;
        devices?: unknown[];
        cap_add?: string[];
        ports: { host_ip: string }[];
        healthcheck: object;
        labels: Record<string, string>;
        mem_limit: string;
        volumes?: { source: string; type: string }[];
      }
    >;
  };
  expect(Object.keys(config.services).sort()).toEqual(['postgres', 'redis']);
  for (const service of Object.values(config.services)) {
    expect(service.image).toMatch(/^(postgres|redis)@sha256:[a-f0-9]{64}$/);
    expect(service.privileged).not.toBe(true);
    expect(service.network_mode).not.toBe('host');
    expect(service.devices ?? []).toEqual([]);
    expect(service.cap_add ?? []).toEqual([]);
    expect(service.ports).toHaveLength(1);
    expect(service.ports[0]?.host_ip).toBe('127.0.0.1');
    expect(service.healthcheck).toBeTruthy();
    expect(service.mem_limit).toBeTruthy();
    expect(service.labels['website-builder.local']).toBe(project);
    expect(
      service.volumes?.every(
        (v) => v.type === 'volume' && v.source === 'postgres-data',
      ) ?? true,
    ).toBe(true);
  }
  const ids = compose(directory, project, ['ps', '--quiet']).split('\n');
  expect(ids).toHaveLength(2);
  for (const container of ids) {
    const info = JSON.parse(docker(['inspect', container])) as {
      State: { Health: { Status: string } };
      NetworkSettings: { Ports: Record<string, { HostIp: string }[]> };
    }[];
    expect(info[0]?.State.Health.Status).toBe('healthy');
    expect(
      Object.values(info[0]?.NetworkSettings.Ports ?? {})
        .flat()
        .every((p) => p.HostIp === '127.0.0.1'),
    ).toBe(true);
  }
});

it('explicit migrations and runtime/migrator privilege separation survive restart', async () => {
  const runtime = await client();
  try {
    expect((await runtime.query('SELECT current_user')).rows[0]).toEqual({
      current_user: 'wb_runtime',
    });
    await expect(
      runtime.query('CREATE SCHEMA forbidden'),
    ).rejects.toMatchObject({ code: '42501' });
  } finally {
    await runtime.end();
  }
  await runLocal(directory, 'migration', ['up']);
  await runLocal(directory, 'migration', ['check']);
  compose(directory, project, ['down']);
  await localUp(directory, project);
  await runLocal(directory, 'migration', ['check']);
  const after = await client();
  try {
    await expect(
      after.query('SELECT * FROM migration_meta.pgmigrations'),
    ).rejects.toMatchObject({ code: '42501' });
    expect(
      (await after.query('SELECT $1::text AS value', ['bound-local-value']))
        .rows[0],
    ).toEqual({ value: 'bound-local-value' });
  } finally {
    await after.end();
  }
});

it('Redis ACL is scoped, authenticated and intentionally ephemeral', async () => {
  const env = localEnvironment(directory, 'worker');
  const options = {
    protocol: 2 as const,
    host: '127.0.0.1',
    port: Number(env['REDIS_PORT']),
    username: env['REDIS_USERNAME'],
    password: env['REDIS_PASSWORD'],
    lazyConnect: true,
    retryStrategy: () => null,
    maxRetriesPerRequest: 0,
    commandTimeout: 2000,
  };
  const redis = new Redis(options);
  redis.on('error', () => {});
  try {
    await redis.connect();
    expect(await redis.ping()).toBe('PONG');
    await expect(redis.set('outside-scope', 'test')).rejects.toThrow(/NOPERM/);
    await expect(redis.config('GET', '*')).rejects.toThrow(/NOPERM/);
    await redis.set(
      'website-builder:local:verification',
      'disposable',
      'EX',
      60,
    );
  } finally {
    redis.disconnect();
  }
  compose(directory, project, ['restart', 'redis']);
  compose(directory, project, [
    'up',
    '--detach',
    '--wait',
    '--wait-timeout',
    '60',
  ]);
  const next = new Redis(options);
  next.on('error', () => {});
  try {
    await next.connect();
    expect(await next.get('website-builder:local:verification')).toBeNull();
  } finally {
    next.disconnect();
  }
  const anonymous = new Redis({
    ...options,
    username: undefined,
    password: undefined,
    enableReadyCheck: false,
  });
  anonymous.on('error', () => {});
  try {
    await anonymous.connect();
    await expect(anonymous.ping()).rejects.toThrow(/NOAUTH/);
  } finally {
    anonymous.disconnect();
  }
});

it('real app probes reflect only their dependency and safely handle local outages', async () => {
  const ports = { api: await freePort(), worker: await freePort() };
  const outputs: string[] = [];
  const get = (app: keyof typeof ports, path: string) =>
    fetch(`http://127.0.0.1:${ports[app]}${path}`, {
      signal: AbortSignal.timeout(3000),
    });
  // Start one process at a time; both remain live for the dependency-isolation checks.
  for (const app of ['api', 'worker'] as const) {
    const appOutput: string[] = [];
    appendFileSync(
      resolve(directory, `${app}.env`),
      `\n${app === 'api' ? 'PORT' : 'PROBE_PORT'}=${ports[app]}\n`,
    );
    const child = spawn(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        "import {runLocal} from './scripts/local-infrastructure.ts'; process.once('message', () => process.emit('SIGINT')); await runLocal(process.argv[1], process.argv[2], []); process.disconnect();",
        directory,
        app,
      ],
      {
        env: process.env,
        stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
      },
    );
    children.push(child);
    const capture = (data: Buffer) => {
      const text = data.toString();
      outputs.push(text);
      appOutput.push(text);
    };
    child.stdout?.on('data', capture);
    child.stderr?.on('data', capture);
    await expect
      .poll(
        async () => {
          try {
            return (await get(app, '/ready')).status;
          } catch {
            return 0;
          }
        },
        { timeout: startupTimeoutMs },
      )
      .toBe(200)
      .catch(() => {
        throw new Error(
          `Local ${app} startup failed: ${JSON.stringify(startupState(child, appOutput))}`,
        );
      });
  }
  try {
    docker(['pause', `${project}-postgres-1`]);
    await delay(300);
    expect((await get('api', '/health')).status).toBe(200);
    const response = await get('api', '/ready');
    expect(response.status).toBe(503);
    errorSchema.parse(await response.json());
  } finally {
    docker(['unpause', `${project}-postgres-1`]);
  }
  await expect
    .poll(async () => (await get('api', '/ready')).status, { timeout: 10000 })
    .toBe(200);
  try {
    docker(['pause', `${project}-redis-1`]);
    await delay(300);
    const health = await get('worker', '/health');
    expect(health.status).toBe(200);
    probeSchema.parse(await health.json());
    expect((await get('worker', '/ready')).status).toBe(503);
    expect((await get('api', '/ready')).status).toBe(200);
  } finally {
    docker(['unpause', `${project}-redis-1`]);
  }
  for (const child of children) {
    const exit = once(child, 'exit');
    child.send('shutdown');
    const [code] = await Promise.race([
      exit,
      delay(12000).then(() => {
        throw new Error('Local app shutdown timed out');
      }),
    ]);
    expect(code).toBe(0);
  }
  for (const [app, key] of [
    ['api', 'DB_PASSWORD'],
    ['worker', 'REDIS_PASSWORD'],
  ] as const)
    expect(outputs.join('')).not.toContain(
      localEnvironment(directory, app)[key],
    );
});

it('port collision fails safely and reset requires deliberate exact-owned destruction', async () => {
  await runLocal(directory, 'migration', ['up']);
  expect(() => localReset(directory, project, undefined)).toThrow(/destroys/);
  compose(directory, project, ['down']);
  const blocker = createServer();
  blocker.listen(
    Number(localEnvironment(directory, 'api')['DB_PORT']),
    '127.0.0.1',
  );
  await once(blocker, 'listening');
  try {
    await expect(localUp(directory, project)).rejects.toThrow(
      /Docker operation failed/,
    );
  } finally {
    await new Promise<void>((accept) => blocker.close(() => accept()));
  }
  await localUp(directory, project);
  await runLocal(directory, 'migration', ['check']);
  localReset(directory, project, '--delete-local-data');
  expect(
    docker([
      'ps',
      '-a',
      '--filter',
      `label=website-builder.local=${project}`,
      '--format',
      '{{.ID}}',
    ]),
  ).toBe('');
  expect(
    docker([
      'volume',
      'ls',
      '--filter',
      `label=website-builder.local=${project}`,
      '--format',
      '{{.Name}}',
    ]),
  ).toBe('');
  await localUp(directory, project);
  await expect(runLocal(directory, 'migration', ['check'])).rejects.toThrow(
    /unsuccessfully/,
  );
});

it('foreign-volume ownership is refused before creation or deletion', async () => {
  const foreignProject = `wb-local-test-${randomUUID()}`;
  const name = `${foreignProject}_postgres-data`;
  docker([
    'volume',
    'create',
    '--label',
    'website-builder.local=verification-sentinel',
    name,
  ]);
  try {
    await expect(localUp(directory, foreignProject)).rejects.toThrow(
      /unexpected ownership/,
    );
    expect(() =>
      localReset(directory, foreignProject, '--delete-local-data'),
    ).toThrow(/unexpected ownership/);
    expect(docker(['volume', 'inspect', '--format', '{{.Name}}', name])).toBe(
      name,
    );
  } finally {
    docker(['volume', 'rm', name]);
  }
});
