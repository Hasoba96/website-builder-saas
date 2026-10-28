import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import { expect, it } from 'vitest';
import { bootstrap } from '../../apps/api/src/bootstrap.js';
import { readApiConfig, readDatabaseConfig } from '@website-builder/config/api';
import { Database } from '@website-builder/database';
import { Readiness, StructuredLogger } from '@website-builder/observability';
import {
  probeSchema,
  errorSchema,
  logSchema,
} from '@website-builder/schemas/operations';

const canaries = {
  authorization: '00f-header-canary',
  cookie: '00f-cookie-canary',
  query: '00f-query-canary',
  requestId: 'malformed-untrusted-id',
} as const;

function assertSafeLogs(output: string, password: string) {
  for (const value of [...Object.values(canaries), password]) {
    assert.ok(value.length > 0, 'Missing security fixture');
    assert.ok(!output.includes(value), 'Complete sensitive value leaked');
  }
  assert.doesNotMatch(
    output,
    /foundation_test|stack|node_modules|(?:\\n|\n)\s*at\s/i,
    'Internal diagnostic leaked',
  );
  return output
    .trim()
    .split('\n')
    .map((line) => logSchema.parse(JSON.parse(line)));
}

const safeRecord = (requestId: string) => ({
  timestamp: '2026-10-27T00:00:00.000Z',
  level: 'info',
  service: 'api',
  environment: 'ci',
  requestId,
  organizationId: null,
  siteId: null,
  userId: null,
  event: 'http_completed',
  message: 'http_completed',
  durationMs: 1,
});
const safeId = 'req_1f1dbd0c-dc3f-400f-850b-d9cd09f54bc5';
const fixturePassword = 'database-fixture-private-value';

it('accepts valid request IDs with hexadecimal canary fragments in PostgreSQL probe logs', () => {
  expect(safeId).toMatch(/00f-/);
  for (const id of [safeId, 'req_0000000f-000f-400f-800f-00f00000000f'])
    expect(
      assertSafeLogs(JSON.stringify(safeRecord(id)), fixturePassword)[0]
        ?.requestId,
    ).toBe(id);
});

it('rejects complete PostgreSQL probe canaries, credentials, diagnostics and forbidden log fields', () => {
  const clean = JSON.stringify(safeRecord(safeId));
  for (const value of [...Object.values(canaries), fixturePassword]) {
    const leaked = JSON.stringify({
      ...safeRecord(safeId),
      message: `prefix ${value} suffix`,
    });
    expect(() =>
      assertSafeLogs(`${clean}\n${leaked}\n`, fixturePassword),
    ).toThrow('Complete sensitive value leaked');
  }
  for (const value of [
    'foundation_test',
    'stack trace',
    '/srv/node_modules/pg/index.js',
    'Error: failure\n    at query (/srv/app.js:1:1)',
  ])
    expect(() =>
      assertSafeLogs(
        JSON.stringify({ ...safeRecord(safeId), message: value }),
        fixturePassword,
      ),
    ).toThrow('Internal diagnostic leaked');
  for (const key of [
    'password',
    'authorization',
    'cookie',
    'headers',
    'body',
    'cause',
  ]) {
    expect(() =>
      assertSafeLogs(
        JSON.stringify({ ...safeRecord(safeId), [key]: 'unapproved' }),
        fixturePassword,
      ),
    ).toThrow();
    expect(() =>
      assertSafeLogs(
        JSON.stringify({
          ...safeRecord(safeId),
          details: { [key]: 'unapproved' },
        }),
        fixturePassword,
      ),
    ).toThrow();
  }
});

it('real API probes preserve liveness and bounded private readiness across a PostgreSQL outage', async () => {
  const name = process.env['TEST_POSTGRES_CONTAINER'];
  if (!name || !/^wbp-00d-[a-f0-9-]{36}$/.test(name))
    throw new Error('Missing owned PostgreSQL fixture');
  let output = '';
  const logger = new StructuredLogger(
    'api',
    'ci',
    new Writable({
      write(chunk, _encoding, done) {
        output += String(chunk);
        done();
      },
    }),
  );
  const database = new Database(readDatabaseConfig(), () =>
    logger.emit('dependency_unavailable'),
  );
  let calls = 0;
  const readiness = new Readiness(async () => {
    calls++;
    await database.connect();
  }, 200);
  const app = await bootstrap(
    readApiConfig({
      NODE_ENV: 'test',
      APP_ENV: 'ci',
      HOST: '127.0.0.1',
      PORT: '3306',
    }),
    readiness,
    logger,
  );
  const address = await app.getUrl();
  let paused = false;
  const get = (path: string, id: string = canaries.requestId) =>
    fetch(`${address}${path}`, {
      headers: {
        'x-request-id': id,
        authorization: canaries.authorization,
        cookie: canaries.cookie,
      },
      signal: AbortSignal.timeout(3000),
    });
  try {
    const health = await get('/health');
    expect(health.status).toBe(200);
    probeSchema.parse(await health.json());
    expect(calls).toBe(0);
    const responses = await Promise.all(
      Array.from({ length: 12 }, () => get('/ready')),
    );
    const ids: string[] = [];
    for (const response of responses) {
      expect(response.status).toBe(200);
      const body = probeSchema.parse(await response.json());
      expect(response.headers.get('x-request-id')).toBe(body.requestId);
      expect(body.requestId).not.toBe(canaries.requestId);
      ids.push(body.requestId);
    }
    expect(new Set(ids).size).toBe(12);
    expect(calls).toBe(1);
    execFileSync('docker', ['pause', name], { timeout: 15000, stdio: 'pipe' });
    paused = true;
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect((await get('/health')).status).toBe(200);
    const start = Date.now();
    const unavailable = await get('/ready');
    expect(unavailable.status).toBe(503);
    expect(Date.now() - start).toBeLessThan(1500);
    const body = errorSchema.parse(await unavailable.json());
    expect(body.error.code).toBe('NOT_READY');
    expect(JSON.stringify(body)).not.toMatch(
      /postgres|redis|host|port|password|foundation_test|SQL/i,
    );
    expect(calls).toBe(2);
    expect((await get('/ready')).status).toBe(503);
    expect(calls).toBe(2);
    expect((await get(`/health?private=${canaries.query}`)).status).toBe(400);
    const records = assertSafeLogs(output, readDatabaseConfig().DB_PASSWORD);
    for (const id of ids)
      expect(records.some((record) => record.requestId === id)).toBe(true);
  } finally {
    if (paused)
      execFileSync('docker', ['unpause', name], {
        timeout: 15000,
        stdio: 'pipe',
      });
    readiness.stop();
    await app.close();
    await database.close();
  }
});
