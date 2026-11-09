import { expect, it, vi } from 'vitest';
import { Writable } from 'node:stream';
import { EventEmitter } from 'node:events';
import type { ServerResponse } from 'node:http';
import {
  BoundedMetrics,
  ObserverInputError,
  StructuredLogger,
  observeResponse,
} from '@website-builder/observability';
import { logSchema } from '@website-builder/schemas/operations';
import { observerFixture } from './observer-fixture.js';

const fixture = (fail = false) => observerFixture('api', fail);
it('uses domain errors for invalid diagnostic contexts', () => {
  expect(() => new StructuredLogger('private-canary' as 'api', 'ci')).toThrow(
    ObserverInputError,
  );
  expect(() => new StructuredLogger('api', 'private-canary' as 'ci')).toThrow(
    ObserverInputError,
  );
});
it('retains the safe journal when synchronous or asynchronous write callbacks fail', async () => {
  for (const later of [false, true]) {
    const output = new Writable({
      write(_b, _e, done) {
        const fail = () => done(Error('async-private-canary'));
        if (later) queueMicrotask(fail);
        else fail();
      },
    });
    const write = vi.spyOn(output, 'write');
    const logger = new StructuredLogger('api', 'ci', output);
    expect(() => logger.observerFailure()).not.toThrow();
    await new Promise<void>((done) => setImmediate(done));
    expect(logger.observerDiagnostic.delivery).toBe('unavailable');
    expect(logSchema.safeParse(logger.observerDiagnostic.record).success).toBe(
      true,
    );
    expect(JSON.stringify(logger.observerDiagnostic)).not.toContain(
      'async-private-canary',
    );
    logger.observerFailure();
    expect(write).toHaveBeenCalledTimes(1);
    logger.clearObserverDiagnostic();
    output.emit('error', Error('late-private-canary'));
    expect(logger.observerDiagnostic.record).toBeNull();
    expect(write).toHaveBeenCalledTimes(1);
  }
});
it('submits at most one strict constant diagnostic per existing logger owner', () => {
  const f = fixture();
  expect(f.logger.observerDiagnostic).toMatchObject({
    attempted: false,
    delivery: 'none',
    record: null,
  });
  for (let i = 0; i < 1000; i++) f.logger.observerFailure();
  expect(f.write).toHaveBeenCalledTimes(1);
  const record = logSchema.parse(JSON.parse(f.lines[0]!));
  expect(record).toMatchObject({
    event: 'infrastructure_failure',
    code: 'INTERNAL_ERROR',
    organizationId: null,
    siteId: null,
    userId: null,
  });
  expect(Buffer.byteLength(f.lines[0]!)).toBeLessThan(512);
  expect(f.logger.observerDiagnostic.delivery).toBe('submitted');
});
it('records a bounded safe fallback when the actual logger transport throws', () => {
  const f = fixture(true);
  expect(() => f.logger.observerFailure()).not.toThrow();
  for (let i = 0; i < 1000; i++) f.logger.observerFailure();
  expect(f.write).toHaveBeenCalledTimes(1);
  const result = f.logger.observerDiagnostic;
  expect(result.delivery).toBe('unavailable');
  expect(logSchema.safeParse(result.record).success).toBe(true);
  expect(JSON.stringify(result)).not.toContain('diagnostic-private-canary');
  result.record!.message = 'unexpected_error';
  expect(f.logger.observerDiagnostic.record!.message).toBe(
    'infrastructure_failure',
  );
  f.logger.clearObserverDiagnostic();
  f.logger.clearObserverDiagnostic();
  f.logger.observerFailure();
  expect(f.logger.observerDiagnostic).toEqual({
    attempted: true,
    delivery: 'unavailable',
    record: null,
  });
  expect(f.write).toHaveBeenCalledTimes(1);
});
it('journals destroyed, failed and backpressured output without recursive writes', () => {
  const f = fixture(true);
  expect(() => f.logger.emit('started')).toThrow(
    'Structured log transport failed',
  );
  f.logger.observerFailure();
  expect(f.write).toHaveBeenCalledTimes(1);
  expect(f.logger.observerDiagnostic.delivery).toBe('unavailable');
  const stopped = fixture();
  stopped.output.destroy();
  stopped.logger.observerFailure();
  expect(stopped.write).not.toHaveBeenCalled();
  expect(stopped.logger.observerDiagnostic.delivery).toBe('unavailable');
  const output = new Writable({ highWaterMark: 1, write() {} });
  const logger = new StructuredLogger('worker', 'ci', output);
  for (let i = 0; i < 1000; i++) logger.observerFailure();
  expect(output.writableLength).toBeLessThan(512);
  expect(output.listenerCount('drain')).toBe(1);
  expect(logger.observerDiagnostic.delivery).toBe('unavailable');
  logger.clearObserverDiagnostic();
  output.destroy();
});
it('contains collector plus logger failure without changing terminal HTTP state', () => {
  const f = fixture(true),
    metrics = new BoundedMetrics();
  vi.spyOn(metrics, 'record').mockImplementation(() => {
    throw Error('request-private-canary');
  });
  const response = Object.assign(new EventEmitter(), {
    statusCode: 204,
    destroyed: false,
    writableFinished: false,
  });
  const stop = observeResponse(
    metrics,
    'api',
    'other',
    response as ServerResponse,
    f.logger,
    () => 0,
  );
  expect(() => {
    response.emit('finish');
    response.emit('close');
    stop();
    stop();
  }).not.toThrow();
  expect(response.statusCode).toBe(204);
  expect(
    response.listenerCount('finish') + response.listenerCount('close'),
  ).toBe(0);
  expect(f.write).toHaveBeenCalledTimes(1);
  expect(JSON.stringify(f.logger.observerDiagnostic)).not.toContain(
    'request-private-canary',
  );
  const broken = observeResponse(
    metrics,
    'api',
    'other',
    response as ServerResponse,
    f.logger,
    () => {
      throw Error('request-private-canary');
    },
  );
  expect(() => broken()).not.toThrow();
});
