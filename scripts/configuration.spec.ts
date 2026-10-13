import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, resolve } from 'node:path';
import { expect, it } from 'vitest';
import { boundaryViolation } from './check-boundaries.js';

const base = {
  ...process.env,
  NODE_ENV: 'test',
  APP_ENV: 'ci',
  HOST: '127.0.0.1',
  PORT: '3304',
};
it.each(['api', 'worker'])(
  '%s rejects malformed/missing config before successful startup without leaking values',
  (app) => {
    for (const input of [
      { ...base, APP_ENV: 'invalid-sensitive-canary' },
      { ...base, APP_ENV: undefined },
      { ...base, SHUTDOWN_TIMEOUT_MS: 'invalid-sensitive-canary' },
      { ...base, READINESS_TIMEOUT_MS: 'invalid-sensitive-canary' },
      {
        ...base,
        NODE_ENV: 'production',
        APP_ENV: 'production',
        SHUTDOWN_TIMEOUT_MS: undefined,
      },
      ...(app === 'api' ? [{ ...base, PORT: 'invalid-sensitive-canary' }] : []),
      ...(app === 'worker'
        ? [{ ...base, PROBE_PORT: 'invalid-sensitive-canary' }]
        : []),
    ]) {
      const result = spawnSync(
        process.execPath,
        [resolve('apps', app, 'dist/main.js')],
        { env: input, encoding: 'utf8', timeout: 15000 },
      );
      expect(result.error).toBeUndefined();
      expect(result.status).toBe(1);
      expect(result.stdout).not.toContain('"event":"started"');
      expect(result.stdout + result.stderr).toContain('CONFIGURATION_INVALID');
      expect(result.stdout + result.stderr).not.toContain(
        'invalid-sensitive-canary',
      );
    }
  },
);
it.each(['dashboard-web', 'public-renderer'])(
  '%s rejects invalid build/start settings without exposing supplied values',
  (app) => {
    for (const [command, settings] of [
      ['build', { APP_ENV: 'invalid-sensitive-canary' }],
      ['start', { PORT: 'invalid-sensitive-canary' }],
      ['build', { NEXT_PUBLIC_UNAPPROVED: 'invalid-sensitive-canary' }],
    ] as const) {
      const result = spawnSync(
        process.execPath,
        [resolve('scripts/next.ts'), command],
        {
          cwd: resolve('apps', app),
          env: { ...base, NODE_ENV: 'production', ...settings },
          encoding: 'utf8',
          timeout: 15000,
        },
      );
      expect(result.error).toBeUndefined();
      expect(result.status).toBe(1);
      expect(result.stdout + result.stderr).toContain('CONFIGURATION_INVALID');
      expect(result.stdout + result.stderr).not.toContain(
        'invalid-sensitive-canary',
      );
    }
  },
);
it('server config exports are unavailable under browser resolution, public config is empty', () => {
  for (const entry of ['api', 'worker', 'web-server', 'migration']) {
    const result = spawnSync(
      process.execPath,
      [
        '--conditions=browser',
        '--input-type=module',
        '-e',
        `import '@website-builder/config/${entry}';`,
      ],
      { encoding: 'utf8', timeout: 10000 },
    );
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('ERR_PACKAGE_PATH_NOT_EXPORTED');
  }
  const result = spawnSync(
    process.execPath,
    [
      '--conditions=browser',
      '--input-type=module',
      '-e',
      "import {getPublicConfig} from '@website-builder/config/public'; console.log(JSON.stringify(getPublicConfig()));",
    ],
    {
      env: { ...base, PRIVATE_SECRET: 'invalid-sensitive-canary' },
      encoding: 'utf8',
      timeout: 10000,
    },
  );
  expect(result.status).toBe(0);
  expect(result.stdout.trim()).toBe('{}');
});
it('application config imports cannot cross ownership boundaries', () => {
  const root = process.cwd();
  for (const [app, entry] of [
    ['api', 'worker'],
    ['worker', 'api'],
    ['dashboard-web', 'api'],
    ['public-renderer', 'worker'],
    ['api', 'migration'],
    ['worker', 'migration'],
  ])
    expect(
      boundaryViolation(
        root,
        resolve(`apps/${app}/src/config.ts`),
        resolve(`packages/config/dist/${entry}.js`),
        `@website-builder/config/${entry}`,
      ),
    ).toBe('Application configuration ownership');
});
it('database driver and operator boundary stays out of web and worker applications', () => {
  const root = process.cwd();
  for (const app of ['dashboard-web', 'public-renderer', 'worker'])
    expect(
      boundaryViolation(
        root,
        resolve(`apps/${app}/src/example.ts`),
        resolve('packages/database/dist/index.js'),
        '@website-builder/database',
      ),
    ).toBe('Database runtime ownership');
  for (const dependency of ['pg', 'node-pg-migrate'])
    expect(
      boundaryViolation(
        root,
        resolve('apps/api/src/example.ts'),
        resolve(`node_modules/${dependency}/index.js`),
        dependency,
      ),
    ).toContain('operator-only');
  expect(
    boundaryViolation(
      root,
      resolve('apps/api/src/main.ts'),
      resolve('packages/database/dist/index.js'),
      '@website-builder/database',
    ),
  ).toBeUndefined();
});
it('Redis infrastructure stays server-only, worker-owned, and unavailable to browser resolution', () => {
  for (const app of ['dashboard-web', 'public-renderer', 'api'])
    expect(
      boundaryViolation(
        process.cwd(),
        resolve(`apps/${app}/src/example.ts`),
        resolve('packages/queues/dist/index.js'),
        '@website-builder/queues',
      ),
    ).toBe('Queue runtime ownership');
  for (const dependency of ['bullmq', 'ioredis', 'ioredis/built/Redis'])
    expect(
      boundaryViolation(
        process.cwd(),
        resolve('apps/worker/src/example.ts'),
        resolve(`node_modules/${dependency}/index.js`),
        dependency,
      ),
    ).toContain('queue infrastructure');
  expect(
    boundaryViolation(
      process.cwd(),
      resolve('apps/worker/src/main.ts'),
      resolve('packages/queues/dist/index.js'),
      '@website-builder/queues',
    ),
  ).toBeUndefined();
  const result = spawnSync(
    process.execPath,
    [
      '--conditions=browser',
      '--input-type=module',
      '-e',
      "import '@website-builder/queues';",
    ],
    { encoding: 'utf8', timeout: 10000 },
  );
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain('ERR_PACKAGE_PATH_NOT_EXPORTED');
});
it('native Node and Next env loading preserve process values over local files', () => {
  const fixture = mkdtempSync(resolve(tmpdir(), 'website-config-'));
  if (
    dirname(fixture) !== resolve(tmpdir()) ||
    !basename(fixture).startsWith('website-config-')
  )
    throw new Error('Unsafe config fixture path');
  try {
    writeFileSync(resolve(fixture, '.env'), 'APP_ENV=local\n');
    writeFileSync(resolve(fixture, '.env.local'), 'APP_ENV=staging\n');
    const node = spawnSync(
      process.execPath,
      [
        `--env-file=${resolve(fixture, '.env')}`,
        '-e',
        'console.log(process.env.APP_ENV)',
      ],
      { env: base, encoding: 'utf8', timeout: 10000 },
    );
    expect(node.status).toBe(0);
    expect(node.stdout.trim()).toBe('ci');
    for (const APP_ENV of ['production', undefined]) {
      const next = spawnSync(
        process.execPath,
        [
          '--input-type=module',
          '-e',
          "import nextEnv from '@next/env'; nextEnv.loadEnvConfig(process.argv[1],false); console.log(process.env.APP_ENV);",
          fixture,
        ],
        {
          env: { ...base, NODE_ENV: 'production', APP_ENV },
          encoding: 'utf8',
          timeout: 10000,
        },
      );
      expect(next.status).toBe(0);
      expect(next.stdout.trim()).toBe(APP_ENV ?? 'staging');
    }
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});
