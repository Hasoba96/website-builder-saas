import { Writable } from 'node:stream';
import { setTimeout as delay } from 'node:timers/promises';
import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import {
  readOperationsConfig,
  readWorkerProbeConfig,
} from '@website-builder/config/worker';
import {
  StructuredLogger,
  withRequest,
  currentRequestId,
  Readiness,
} from '@website-builder/observability';
import {
  logSchema,
  operationalOpenApi,
  probeInputSchema,
} from '@website-builder/schemas/operations';

it('accepts only the strict shared bodyless probe input contract', () => {
  const input = {
    method: 'GET',
    hasQuery: false,
    hasTransferEncoding: false,
    contentLength: '0',
  };
  expect(probeInputSchema.safeParse(input).success).toBe(true);
  for (const extra of [
    { hasQuery: true },
    { contentLength: '1' },
    { method: 'POST' },
    { hasTransferEncoding: true },
    { unknown: 'canary' },
  ])
    expect(probeInputSchema.safeParse({ ...input, ...extra }).success).toBe(
      false,
    );
});

it('keeps generated OpenAPI aligned with the shared strict contracts', () => {
  expect(
    JSON.parse(readFileSync('docs/api/operations.openapi.json', 'utf8')),
  ).toEqual(operationalOpenApi());
});

it('validates bounded operational config and requires explicit production values', () => {
  const local = { NODE_ENV: 'test', APP_ENV: 'ci' };
  expect(readOperationsConfig(local)).toEqual({ READINESS_TIMEOUT_MS: 1000 });
  expect(readWorkerProbeConfig(local)).toEqual({
    PROBE_HOST: '127.0.0.1',
    PROBE_PORT: 3004,
  });
  const production = { NODE_ENV: 'production', APP_ENV: 'production' };
  expect(() => readOperationsConfig(production)).toThrow(
    'READINESS_TIMEOUT_MS',
  );
  expect(() => readWorkerProbeConfig(production)).toThrow(
    'PROBE_HOST, PROBE_PORT',
  );
  for (const value of ['0', '5001', '1.5', 'private-canary'])
    expect(() =>
      readOperationsConfig({ ...local, READINESS_TIMEOUT_MS: value }),
    ).toThrow('READINESS_TIMEOUT_MS');
  expect(() =>
    readWorkerProbeConfig({
      ...local,
      PROBE_HOST: 'private-canary',
      PROBE_PORT: '70000',
    }),
  ).toThrow('PROBE_HOST, PROBE_PORT');
});

it('denies browser imports of the operational server boundary', () => {
  const result = spawnSync(
    process.execPath,
    [
      '--conditions=browser',
      '--input-type=module',
      '-e',
      "import '@website-builder/observability';",
    ],
    { encoding: 'utf8', timeout: 10000 },
  );
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain('ERR_PACKAGE_PATH_NOT_EXPORTED');
});

it.each(['throw', 'reject'])(
  'sanitizes fatal process %s and initiates shutdown with nonzero exit',
  (mode) => {
    const result = spawnSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        `
    import { StructuredLogger, installFatalHandlers } from '@website-builder/observability';
    const logger = new StructuredLogger('worker', 'ci');
    installFatalHandlers(logger, async () => { logger.emit('stopped'); });
    ${mode === 'throw' ? "setImmediate(() => { throw new Error('fatal-private-canary'); });" : "void Promise.reject(new Error('fatal-private-canary'));"}
  `,
      ],
      { encoding: 'utf8', timeout: 10000 },
    );
    expect(result.status).toBe(1);
    expect(result.error).toBeUndefined();
    expect(result.stderr).toBe('');
    expect(result.stdout).not.toContain('canary');
    expect(
      result.stdout
        .trim()
        .split('\n')
        .map((line) => logSchema.parse(JSON.parse(line)).event),
    ).toEqual(['unexpected_error', 'stopped']);
  },
);

it('rejects unexpected forwarded fields and suppresses production debug records', () => {
  let output = '';
  const logger = new StructuredLogger(
    'api',
    'production',
    new Writable({
      write(chunk, _encoding, done) {
        output += String(chunk);
        done();
      },
    }),
  );
  logger.emit('started');
  const record = logSchema.parse(JSON.parse(output.trim()));
  output = '';
  logger.forward({ ...record, level: 'debug' });
  expect(output).toBe('');
  logger.forward({ ...record, secret: 'forwarded-private-canary' });
  expect(output).not.toContain('canary');
  expect(logSchema.parse(JSON.parse(output.trim())).event).toBe(
    'invalid_log_input',
  );
});

it('projects structured fields only and automatically discards secret-bearing objects', () => {
  let output = '';
  const sink = new Writable({
    write(chunk, _encoding, done) {
      output += String(chunk);
      done();
    },
  });
  const logger = new StructuredLogger('api', 'production', sink);
  logger.emit('started', {
    password: '00f-password-canary',
    token: '00f-token-canary',
    authorization: '00f-auth-canary',
    cookie: '00f-cookie-canary',
    message: '00f-message-canary',
    cause: new Error('00f-error-canary'),
    code: '00f-code-canary',
    durationMs: NaN,
  });
  logger.emit('unexpected_error', { code: 'INTERNAL_ERROR' });
  logger.emit('startup_failed', {
    code: 'CONFIGURATION_INVALID',
    details: { fields: [{ path: 'APP_ENV', code: 'INVALID' }] },
  });
  const records = output
    .trim()
    .split('\n')
    .map((line) => logSchema.parse(JSON.parse(line)));
  expect(records).toHaveLength(3);
  expect(output).not.toContain('canary');
  expect(records[0]).toMatchObject({
    level: 'info',
    organizationId: null,
    siteId: null,
    userId: null,
    durationMs: 0,
  });
  expect(records[1]).toMatchObject({ level: 'error', code: 'INTERNAL_ERROR' });
  expect(records[0]?.requestId).toBe(records[1]?.requestId);
  expect(records[2]?.details).toEqual({
    fields: [{ path: 'APP_ENV', code: 'INVALID' }],
  });
});
it('isolates async correlation across overlapping requests and clears it afterward', async () => {
  const ids = await Promise.all(
    Array.from({ length: 30 }, (_, index) =>
      withRequest(async () => {
        const before = currentRequestId();
        await delay(index % 5);
        expect(currentRequestId()).toBe(before);
        return before;
      }),
    ),
  );
  expect(new Set(ids).size).toBe(30);
  expect(currentRequestId()).toBeUndefined();
});
it('coalesces readiness work and never starts new work behind an expired deadline', async () => {
  let calls = 0;
  let release: (() => void) | undefined;
  const ready = new Readiness(async () => {
    calls++;
    await new Promise<void>((resolve) => {
      release = resolve;
    });
  }, 100);
  const start = Date.now();
  expect(
    await Promise.all(Array.from({ length: 20 }, () => ready.ready())),
  ).toEqual(Array(20).fill(false));
  expect(Date.now() - start).toBeLessThan(1000);
  expect(await ready.ready()).toBe(false);
  expect(calls).toBe(1);
  release?.();
  ready.stop();
  expect(await ready.ready()).toBe(false);
});
it('does not grow a blocked log sink queue', async () => {
  let complete: (() => void) | undefined;
  const sink = new Writable({
    highWaterMark: 1,
    write(_chunk, _encoding, done) {
      complete = done;
    },
  });
  const logger = new StructuredLogger('worker', 'ci', sink);
  logger.emit('started');
  const length = sink.writableLength;
  for (let n = 0; n < 1000; n++) logger.emit('ready');
  expect(sink.writableLength).toBe(length);
  sink.destroy();
  complete?.();
});

it('contains log transport errors without raw error fallback or recursive logging', async () => {
  let writes = 0;
  const sink = new Writable({
    write(_chunk, _encoding, done) {
      writes++;
      done(new Error('sink-private-canary'));
    },
  });
  const logger = new StructuredLogger('api', 'ci', sink);
  logger.emit('started');
  await delay(10);
  logger.emit('ready');
  expect(writes).toBe(1);
  const broken = new StructuredLogger(
    'api',
    'ci',
    new Writable({
      write() {
        throw new Error('synchronous-private-canary');
      },
    }),
  );
  expect(() => broken.emit('started')).toThrow(
    'Structured log transport failed',
  );
});
