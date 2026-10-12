import { execFileSync } from 'node:child_process';
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
  const get = (path: string, id = 'malformed-untrusted-id') =>
    fetch(`${address}${path}`, {
      headers: {
        'x-request-id': id,
        authorization: '00f-header-canary',
        cookie: '00f-cookie-canary',
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
      expect(body.requestId).not.toBe('malformed-untrusted-id');
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
    expect((await get('/health?private=00f-query-canary')).status).toBe(400);
    expect(output).not.toMatch(/00f-|malformed-untrusted|foundation_test/);
    expect(output).not.toContain(process.env['DB_PASSWORD']);
    const records = output
      .trim()
      .split('\n')
      .map((line) => logSchema.parse(JSON.parse(line)));
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
