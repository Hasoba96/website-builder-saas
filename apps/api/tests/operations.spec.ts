import {
  Controller,
  Get,
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import { expect, it } from 'vitest';
import { errorSchema, logSchema } from '@website-builder/schemas/operations';
import { configureOperations } from '../src/bootstrap.js';
import {
  StructuredLogger,
  Readiness,
  currentRequestId,
} from '@website-builder/observability';

const canaries = {
  exception: '00f-raw-error-secret',
  validation: '00f-validation-secret',
  authorization: '00f-auth-secret',
  cookie: '00f-cookie-secret',
  query: '00f-query-secret',
  body: '00f-body-canary',
  requestId: 'untrusted-secret',
  path: 'missing-secret-canary',
} as const;

// Full markers cannot collide with hexadecimal UUID fragments such as "00f-".
function assertSafeEvidence(text: string, kind: 'response' | 'log') {
  for (const canary of Object.values(canaries))
    assert.ok(!text.includes(canary), 'Full security canary leaked');
  assert.doesNotMatch(
    text,
    /stack|node_modules|(?:\\n|\n)\s*at\s/i,
    'Internal diagnostic leaked',
  );
  const schema = kind === 'response' ? errorSchema : logSchema;
  for (const line of text.trim().split('\n')) schema.parse(JSON.parse(line));
}

const collisionId = 'req_1f1dbd0c-dc3f-400f-850b-d9cd09f54bc5';
const evidenceFixtures = (requestId: string) => ({
  response: {
    error: {
      code: 'NOT_FOUND',
      message: 'Resource not found',
      details: {},
      requestId,
    },
  },
  log: {
    timestamp: '2026-10-16T00:00:00.000Z',
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
  },
});

it('accepts fixed valid request IDs containing canary-like hexadecimal fragments', () => {
  expect(collisionId).toMatch(/00f-/);
  for (const id of [
    collisionId,
    'req_0000000f-000f-400f-800f-00f00000000f',
    'req_deadbeef-cafe-4bad-babe-abcdefabcdef',
  ]) {
    const fixtures = evidenceFixtures(id);
    expect(() =>
      assertSafeEvidence(JSON.stringify(fixtures.response), 'response'),
    ).not.toThrow();
    expect(() =>
      assertSafeEvidence(JSON.stringify(fixtures.log), 'log'),
    ).not.toThrow();
  }
});

it('rejects every complete injected canary in responses and log streams', () => {
  for (const canary of Object.values(canaries)) {
    const fixtures = evidenceFixtures(collisionId);
    fixtures.response.error.message = `prefix ${canary} suffix`;
    fixtures.log.message = `prefix ${canary} suffix`;
    expect(() =>
      assertSafeEvidence(JSON.stringify(fixtures.response), 'response'),
    ).toThrow('Full security canary leaked');
    const cleanLog = JSON.stringify(evidenceFixtures(collisionId).log);
    expect(() =>
      assertSafeEvidence(
        `${cleanLog}\n${JSON.stringify(fixtures.log)}\n`,
        'log',
      ),
    ).toThrow('Full security canary leaked');
  }
});

it('rejects internal diagnostics and forbidden response or log fields without canaries', () => {
  for (const value of [
    'stack trace',
    '/srv/node_modules/example/index.js',
    'Error: failure\n    at handler (/srv/app.js:1:1)',
  ]) {
    const fixtures = evidenceFixtures(collisionId);
    fixtures.response.error.message = value;
    fixtures.log.message = value;
    expect(() =>
      assertSafeEvidence(JSON.stringify(fixtures.response), 'response'),
    ).toThrow('Internal diagnostic leaked');
    expect(() =>
      assertSafeEvidence(JSON.stringify(fixtures.log), 'log'),
    ).toThrow('Internal diagnostic leaked');
  }
  for (const key of [
    'password',
    'token',
    'secret',
    'apiKey',
    'authorization',
    'cookie',
    'headers',
    'body',
    'cause',
  ]) {
    const fixtures = evidenceFixtures(collisionId);
    expect(() =>
      assertSafeEvidence(
        JSON.stringify({
          ...fixtures.response,
          error: { ...fixtures.response.error, [key]: 'unapproved' },
        }),
        'response',
      ),
    ).toThrow();
    expect(() =>
      assertSafeEvidence(
        JSON.stringify({
          ...fixtures.response,
          error: {
            ...fixtures.response.error,
            details: { [key]: 'unapproved' },
          },
        }),
        'response',
      ),
    ).toThrow();
    expect(() =>
      assertSafeEvidence(
        JSON.stringify({ ...fixtures.log, [key]: 'unapproved' }),
        'log',
      ),
    ).toThrow();
    expect(() =>
      assertSafeEvidence(
        JSON.stringify({ ...fixtures.log, details: { [key]: 'unapproved' } }),
        'log',
      ),
    ).toThrow();
  }
});

@Controller()
class FailureFixture {
  @Get('/test-unexpected') async unexpected() {
    await Promise.resolve();
    throw new Error(canaries.exception);
  }
  @Get('/test-malformed') malformed() {
    throw new BadRequestException(canaries.validation);
  }
  @Get('/test-invalid') invalid() {
    throw new UnprocessableEntityException(canaries.validation);
  }
}
it('centralizes real Nest exceptions, 404s and HTTP correlation without exposing input or raw causes', async () => {
  const module = await Test.createTestingModule({
    controllers: [FailureFixture],
  }).compile();
  const app = module.createNestApplication({
    logger: false,
    bodyParser: false,
  });
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
  configureOperations(app, new Readiness(async () => {}, 100), logger);
  await app.listen(0, '127.0.0.1');
  const address = await app.getUrl();
  try {
    const supplied = 'req_a3d05046-8318-4d49-852b-bb5703473edc';
    const probe = await fetch(`${address}/health`, {
      headers: { 'x-request-id': supplied },
      signal: AbortSignal.timeout(5000),
    });
    expect(probe.status).toBe(200);
    expect(probe.headers.get('x-request-id')).not.toBe(supplied);
    for (const [path, status, code] of [
      ['/test-unexpected', 500, 'INTERNAL_ERROR'],
      ['/test-malformed', 400, 'MALFORMED_REQUEST'],
      ['/test-invalid', 422, 'VALIDATION_FAILED'],
      [`/${canaries.path}`, 404, 'NOT_FOUND'],
      ['/api/v1/health', 404, 'NOT_FOUND'],
      ['/api/v1/ready', 404, 'NOT_FOUND'],
    ] as const) {
      const response = await fetch(
        `${address}${path}?private=${canaries.query}`,
        {
          headers: {
            authorization: canaries.authorization,
            cookie: canaries.cookie,
            'x-request-id': canaries.requestId,
          },
          signal: AbortSignal.timeout(5000),
        },
      );
      expect(response.status).toBe(status);
      const text = await response.text();
      assertSafeEvidence(text, 'response');
      const body = JSON.parse(text) as {
        error: { code: string; requestId: string };
      };
      expect(body.error.code).toBe(code);
      expect(body.error.requestId).toBe(response.headers.get('x-request-id'));
      expect(output).toContain(body.error.requestId);
    }
    const response = await fetch(`${address}/health`, {
      method: 'POST',
      body: `{"value":"${canaries.body}"`,
      signal: AbortSignal.timeout(5000),
    });
    expect(response.status).toBe(400);
    assertSafeEvidence(await response.text(), 'response');
    assertSafeEvidence(output, 'log');
    const records = output
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line) as { level: string; code?: string });
    expect(records.filter((record) => record.level === 'error')).toHaveLength(
      1,
    );
    expect(currentRequestId()).toBeUndefined();
  } finally {
    await app.close();
  }
});
