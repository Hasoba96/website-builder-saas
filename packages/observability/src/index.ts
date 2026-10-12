import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID, randomBytes } from 'node:crypto';
import type { Writable } from 'node:stream';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { HttpGuard, securityHeaders, type HttpSurface } from './security.js';
export { HttpGuard, securityHeaders } from './security.js';
import {
  eventSchema,
  errorCodeSchema,
  logSchema,
  logDetailsSchema,
  probeSchema,
  probeInputSchema,
  errorSchema,
  type LogRecord,
  type OperationalEvent,
  type ErrorCode,
} from '@website-builder/schemas/operations';

const context = new AsyncLocalStorage<Readonly<{ requestId: string }>>();
export const newRequestId = () => `req_${randomUUID()}`;
export const currentRequestId = () => context.getStore()?.requestId;
export function withRequest<T>(work: () => T) {
  return context.run(Object.freeze({ requestId: newRequestId() }), work);
}

export class StructuredLogger {
  readonly #operationId = newRequestId();
  #blocked = false;
  #failed = false;
  constructor(
    readonly service: LogRecord['service'],
    readonly environment: LogRecord['environment'],
    readonly output: Writable = process.stdout,
  ) {
    output.on('error', () => {
      this.#failed = true;
    });
  }
  emit(event: OperationalEvent, fields: unknown = {}) {
    const parsed = eventSchema.safeParse(event);
    const safeEvent = parsed.success ? parsed.data : 'invalid_log_input';
    const input = typeof fields === 'object' && fields !== null ? fields : {};
    const code = errorCodeSchema.safeParse(
      'code' in input ? input.code : undefined,
    );
    const duration = 'durationMs' in input ? input.durationMs : 0;
    const details = logDetailsSchema.safeParse(
      'details' in input ? input.details : undefined,
    );
    const level = [
      'startup_failed',
      'shutdown_failed',
      'infrastructure_failure',
      'unexpected_error',
    ].includes(safeEvent)
      ? 'error'
      : [
            'dependency_unavailable',
            'invalid_log_input',
            'framework_warning',
          ].includes(safeEvent)
        ? 'warn'
        : 'info';
    const record = logSchema.parse({
      timestamp: new Date().toISOString(),
      level,
      service: this.service,
      environment: this.environment,
      requestId: currentRequestId() ?? this.#operationId,
      organizationId: null,
      siteId: null,
      userId: null,
      event: safeEvent,
      message: safeEvent,
      durationMs:
        typeof duration === 'number' &&
        Number.isFinite(duration) &&
        duration >= 0
          ? duration
          : 0,
      ...(code.success ? { code: code.data } : {}),
      ...(details.success ? { details: details.data } : {}),
    });
    this.write(record);
  }
  forward(value: unknown) {
    const record = logSchema.safeParse(value);
    if (
      !record.success ||
      record.data.service !== this.service ||
      record.data.environment !== this.environment
    ) {
      this.emit('invalid_log_input');
      return;
    }
    this.write(record.data);
  }
  private write(record: LogRecord) {
    if (this.environment === 'production' && record.level === 'debug') return;
    // Never grow the stream queue while the output consumer is backpressured.
    if (this.#blocked || this.#failed || this.output.destroyed) return;
    try {
      if (!this.output.write(JSON.stringify(record) + '\n')) {
        this.#blocked = true;
        this.output.once('drain', () => {
          this.#blocked = false;
          this.emit('logging_resumed');
        });
      }
    } catch {
      this.#failed = true;
      throw new Error('Structured log transport failed');
    }
  }
}

export function success(requestId: string) {
  return probeSchema.parse({ data: {}, requestId });
}
const messages: Record<ErrorCode, string> = {
  MALFORMED_REQUEST: 'Request is malformed',
  VALIDATION_FAILED: 'Request is invalid',
  NOT_FOUND: 'Resource not found',
  NOT_READY: 'Service is not ready',
  INTERNAL_ERROR: 'An unexpected error occurred',
  CONFIGURATION_INVALID: 'Configuration is invalid',
  DEPENDENCY_UNAVAILABLE: 'Service is unavailable',
  FORBIDDEN: 'Request is not allowed',
  RATE_LIMITED: 'Too many requests',
};
export function failure(code: ErrorCode, requestId: string) {
  return errorSchema.parse({
    error: { code, message: messages[code], details: {}, requestId },
  });
}

/** One underlying check at a time, including after its HTTP deadline expires. */
export class Readiness {
  #active: Promise<boolean> | undefined;
  #pending = false;
  #stopping = false;
  #last = false;
  #checkedAt = 0;
  constructor(
    readonly check: () => Promise<void>,
    readonly timeoutMs: number,
  ) {}
  stop() {
    this.#stopping = true;
  }
  async ready(): Promise<boolean> {
    if (this.#stopping) return false;
    if (this.#active) return this.#active;
    if (this.#pending) return false;
    if (Date.now() - this.#checkedAt < 250) return this.#last;
    this.#pending = true;
    const work = Promise.resolve()
      .then(this.check)
      .then(
        () => true,
        () => false,
      )
      .finally(() => {
        this.#pending = false;
      });
    let timer: ReturnType<typeof setTimeout> | undefined;
    this.#active = Promise.race([
      work,
      new Promise<false>((resolve) => {
        timer = setTimeout(() => resolve(false), this.timeoutMs);
      }),
    ])
      .then((ready) => {
        this.#last = ready && !this.#stopping;
        this.#checkedAt = Date.now();
        return this.#last;
      })
      .finally(() => {
        clearTimeout(timer);
        this.#active = undefined;
      });
    return this.#active;
  }
}

const responses = new WeakMap<ServerResponse, string>();
export function responseRequestId(response: ServerResponse) {
  return responses.get(response) ?? currentRequestId() ?? newRequestId();
}
export function send(response: ServerResponse, status: number, body: unknown) {
  if (response.writableEnded || response.destroyed) return;
  response.statusCode = status;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('X-Request-Id', responseRequestId(response));
  response.end(JSON.stringify(body));
}
export function requestBoundary(logger: StructuredLogger) {
  return (
    request: IncomingMessage,
    response: ServerResponse,
    next: () => void,
  ) =>
    withRequest(() => {
      const id = currentRequestId();
      if (!id) throw new Error('Missing request context');
      responses.set(response, id);
      response.setHeader('X-Request-Id', id);
      response.removeHeader('X-Powered-By');
      const start = performance.now();
      const path = request.url?.split('?')[0];
      const event =
        path === '/health'
          ? 'health_completed'
          : path === '/ready'
            ? 'ready_completed'
            : 'http_completed';
      response.once('finish', () =>
        context.run({ requestId: id }, () =>
          logger.emit(event, { durationMs: performance.now() - start }),
        ),
      );
      next();
    });
}
export function probeHandler(readiness: Readiness, logger: StructuredLogger) {
  return (
    request: IncomingMessage,
    response: ServerResponse,
    next: () => void,
  ) => {
    const path = request.url?.split('?')[0];
    if (path !== '/health' && path !== '/ready') {
      next();
      return;
    }
    const id = responseRequestId(response);
    const valid = probeInputSchema.safeParse({
      method: request.method,
      hasQuery: request.url?.includes('?') ?? false,
      hasTransferEncoding: request.headers['transfer-encoding'] !== undefined,
      contentLength: request.headers['content-length'] ?? '0',
    }).success;
    if (!valid) {
      response.setHeader('Connection', 'close');
      send(response, 400, failure('MALFORMED_REQUEST', id));
      return;
    }
    void (async () => {
      const ready = path === '/health' || (await readiness.ready());
      if (!ready) logger.emit('dependency_unavailable', { code: 'NOT_READY' });
      send(
        response,
        ready ? 200 : 503,
        ready ? success(id) : failure('NOT_READY', id),
      );
    })().catch(() => {
      logger.emit('unexpected_error', { code: 'INTERNAL_ERROR' });
      send(response, 500, failure('INTERNAL_ERROR', id));
    });
  };
}
export function httpSecurity(guard: HttpGuard) {
  return (
    request: IncomingMessage,
    response: ServerResponse,
    next: () => void,
  ) => {
    for (const [key, value] of Object.entries(securityHeaders('api')))
      response.setHeader(key, value);
    response.setHeader('Cache-Control', 'no-store');
    const headers = new Headers();
    for (const key of [
      'host',
      'origin',
      'content-length',
      'transfer-encoding',
      'access-control-request-method',
      'access-control-request-headers',
    ]) {
      const value = request.headers[key];
      if (typeof value === 'string') headers.set(key, value);
    }
    const retry = guard.admit(request.socket.remoteAddress);
    for (const [key, value] of Object.entries(guard.cors(headers)))
      response.setHeader(key, value);
    const status = retry ? 429 : guard.inspect(request.method ?? '', headers);
    if (retry) response.setHeader('Retry-After', String(retry));
    if (status) {
      response.setHeader('Connection', 'close');
      send(
        response,
        status,
        failure(
          status === 429
            ? 'RATE_LIMITED'
            : status === 403
              ? 'FORBIDDEN'
              : 'MALFORMED_REQUEST',
          responseRequestId(response),
        ),
      );
      return;
    }
    if (request.method === 'OPTIONS') {
      response.statusCode = 204;
      response.end();
      return;
    }
    next();
  };
}

export function webSecurity(
  request: Request,
  guard: HttpGuard,
  surface: HttpSurface,
) {
  const nonce = randomBytes(16).toString('base64');
  const headers = new Headers(securityHeaders(surface, nonce));
  for (const [key, value] of Object.entries(guard.cors(request.headers)))
    headers.set(key, value);
  headers.set('Cache-Control', 'no-store');
  const retry = guard.admit(); // Next exposes no authenticated socket identity.
  const status = retry
    ? 429
    : new URL(request.url).search
      ? 400
      : guard.inspect(request.method, request.headers);
  if (retry) headers.set('Retry-After', String(retry));
  const id = currentRequestId() ?? newRequestId();
  headers.set('X-Request-Id', id);
  const rejected = status
    ? Response.json(
        failure(
          status === 429
            ? 'RATE_LIMITED'
            : status === 403
              ? 'FORBIDDEN'
              : 'MALFORMED_REQUEST',
          id,
        ),
        { status, headers },
      )
    : undefined;
  const forwarded = new Headers(request.headers);
  for (const key of [...forwarded.keys()]) {
    if (
      key === 'forwarded' ||
      key.startsWith('x-forwarded-') ||
      key.startsWith('x-middleware-') ||
      key === 'x-nonce'
    )
      forwarded.delete(key);
  }
  forwarded.set(
    'Content-Security-Policy',
    headers.get('Content-Security-Policy') ?? '',
  );
  forwarded.set('x-nonce', nonce);
  return { headers, forwarded, rejected };
}
export function installFatalHandlers(
  logger: StructuredLogger,
  shutdown: () => Promise<void>,
) {
  const fatal = () => {
    logger.emit('unexpected_error', { code: 'INTERNAL_ERROR' });
    process.exitCode = 1;
    void shutdown().catch(() => {
      logger.emit('shutdown_failed');
      process.exit(1);
    });
  };
  process.on('uncaughtException', fatal);
  process.on('unhandledRejection', fatal);
}
export function webProbe(request: Request, logger: StructuredLogger): Response {
  const run = () => {
    const id = currentRequestId();
    if (!id) throw new Error('Missing request context');
    const url = new URL(request.url);
    const valid = probeInputSchema.safeParse({
      method: request.method,
      hasQuery: request.url.includes('?'),
      hasTransferEncoding: request.headers.has('transfer-encoding'),
      contentLength: request.headers.get('content-length') ?? '0',
    }).success;
    logger.emit(
      url.pathname === '/health' ? 'health_completed' : 'ready_completed',
    );
    return Response.json(
      valid ? success(id) : failure('MALFORMED_REQUEST', id),
      {
        status: valid ? 200 : 400,
        headers: { 'X-Request-Id': id, 'Cache-Control': 'no-store' },
      },
    );
  };
  return currentRequestId() ? run() : withRequest(run);
}
