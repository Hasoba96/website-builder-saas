import { expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import { Writable } from 'node:stream';
import { request } from 'node:http';
import { configureOperations } from '../src/bootstrap.js';
import { Readiness, StructuredLogger } from '@website-builder/observability';
import { readHttpSecurityConfig } from '@website-builder/config/api';

it('attack-tests real HTTP headers, CORS, hostile inputs, pollution and socket-based abuse limits', async () => {
  const module = await Test.createTestingModule({}).compile();
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
  configureOperations(
    app,
    new Readiness(async () => {}, 100),
    logger,
    readHttpSecurityConfig({
      NODE_ENV: 'test',
      APP_ENV: 'ci',
      HTTP_CORS_ORIGINS: 'https://dashboard.example',
      HTTP_RATE_LIMIT: '100',
      HTTP_BODY_MAX_BYTES: '128',
    }),
  );
  await app.listen(0, '127.0.0.1');
  const url = await app.getUrl();
  const send = (path: string, init: RequestInit = {}) =>
    fetch(url + path, { ...init, signal: AbortSignal.timeout(5000) });
  try {
    const approved = await send('/health', {
      headers: { origin: 'https://dashboard.example' },
    });
    expect(approved.status).toBe(200);
    expect(approved.headers.get('access-control-allow-origin')).toBe(
      'https://dashboard.example',
    );
    expect(approved.headers.has('access-control-allow-credentials')).toBe(
      false,
    );
    for (const name of [
      'content-security-policy',
      'permissions-policy',
      'strict-transport-security',
      'x-frame-options',
      'referrer-policy',
    ])
      expect(approved.headers.has(name)).toBe(true);
    expect(approved.headers.get('cache-control')).toBe('no-store');
    expect(approved.headers.has('x-powered-by')).toBe(false);
    expect(Object.keys((await approved.json()) as object).sort()).toEqual([
      'data',
      'requestId',
    ]);
    const preflight = await send('/health', {
      method: 'OPTIONS',
      headers: {
        origin: 'https://dashboard.example',
        'access-control-request-method': 'GET',
        'access-control-request-headers': 'X-Request-Id',
      },
    });
    expect(preflight.status).toBe(204);
    for (const origin of [
      'null',
      '%%%origin-canary',
      'https://origin-canary.example',
    ]) {
      const response = await send('/health', { headers: { origin } });
      expect(response.status).toBe(403);
      expect(response.headers.has('access-control-allow-origin')).toBe(false);
      expect(await response.text()).not.toContain('canary');
    }
    const hostileStatus = await new Promise<number | undefined>(
      (resolve, reject) => {
        const call = request(
          url + '/health',
          { headers: { host: 'host-canary.example' }, timeout: 5000 },
          (response) => {
            response.resume();
            response.once('end', () => resolve(response.statusCode));
          },
        );
        call.once('error', reject);
        call.once('timeout', () => call.destroy(new Error('Request timeout')));
        call.end();
      },
    );
    expect(hostileStatus).toBe(400);
    const forwarded = await send('/ready', {
      headers: {
        'x-forwarded-for': 'forwarded-canary',
        'x-forwarded-host': 'host-canary.example',
        'x-forwarded-proto': 'https',
        forwarded: 'host=forwarded-canary',
        authorization: 'auth-canary',
        cookie: 'cookie-canary',
      },
    });
    expect(forwarded.status).toBe(200);
    expect(await forwarded.text()).not.toContain('canary');
    for (const body of [
      '{}',
      '{malformed-canary',
      '{"__proto__":{"polluted":true},"constructor":{"prototype":{"polluted":true}}}',
      JSON.stringify({ unexpected: 'body-canary' }),
      '['.repeat(10000),
      JSON.stringify(Array(1000).fill('body-canary')),
    ]) {
      const response = await send('/health', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body,
      });
      expect(response.status).toBe(400);
      expect(await response.text()).not.toMatch(
        /canary|prototype|polluted|stack/,
      );
    }
    const unsupported = await send('/health', {
      method: 'POST',
      headers: { 'content-type': 'application/octet-stream' },
      body: 'body-canary',
    });
    expect(unsupported.status).toBe(400);
    expect(await unsupported.text()).not.toContain('canary');
    expect(Object.prototype).not.toHaveProperty('polluted');
    const query = await send('/health?key=query-canary');
    expect(query.status).toBe(400);
    expect(await query.text()).not.toContain('canary');
    let limited = false;
    for (let n = 0; n < 55; n++) {
      const response = await send('/health', {
        headers: { 'x-forwarded-for': `192.0.2.${n}` },
      });
      await response.text();
      if (response.status === 429) {
        limited = true;
        expect(Number(response.headers.get('retry-after'))).toBeGreaterThan(0);
        break;
      }
    }
    expect(limited).toBe(true);
    expect(output).not.toMatch(/canary|prototype|polluted/);
  } finally {
    await app.close();
  }
});
