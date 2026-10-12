import {
  Controller,
  Get,
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Writable } from 'node:stream';
import { expect, it } from 'vitest';
import { configureOperations } from '../src/bootstrap.js';
import {
  StructuredLogger,
  Readiness,
  currentRequestId,
} from '@website-builder/observability';

@Controller()
class FailureFixture {
  @Get('/test-unexpected') async unexpected() {
    await Promise.resolve();
    throw new Error('00f-raw-error-secret');
  }
  @Get('/test-malformed') malformed() {
    throw new BadRequestException('00f-validation-secret');
  }
  @Get('/test-invalid') invalid() {
    throw new UnprocessableEntityException('00f-validation-secret');
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
      ['/missing-secret-canary', 404, 'NOT_FOUND'],
      ['/api/v1/health', 404, 'NOT_FOUND'],
      ['/api/v1/ready', 404, 'NOT_FOUND'],
    ] as const) {
      const response = await fetch(
        `${address}${path}?private=00f-query-secret`,
        {
          headers: {
            authorization: '00f-auth-secret',
            cookie: '00f-cookie-secret',
            'x-request-id': 'untrusted-secret',
          },
          signal: AbortSignal.timeout(5000),
        },
      );
      expect(response.status).toBe(status);
      const text = await response.text();
      expect(text).not.toMatch(/00f-|secret|stack|node_modules/);
      const body = JSON.parse(text) as {
        error: { code: string; requestId: string };
      };
      expect(body.error.code).toBe(code);
      expect(body.error.requestId).toBe(response.headers.get('x-request-id'));
      expect(output).toContain(body.error.requestId);
    }
    const response = await fetch(`${address}/health`, {
      method: 'POST',
      body: '{"value":"00f-body-canary"',
      signal: AbortSignal.timeout(5000),
    });
    expect(response.status).toBe(400);
    expect(await response.text()).not.toContain('00f-');
    expect(output).not.toMatch(/00f-|secret|untrusted/);
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
