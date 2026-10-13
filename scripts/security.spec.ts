import { expect, it } from 'vitest';
import {
  HttpGuard,
  securityHeaders,
  webSecurity,
  withRequest,
} from '@website-builder/observability';
import {
  readHttpSecurityConfig,
  ConfigurationError,
} from '@website-builder/config/api';
import { readWebHttpSecurityConfig } from '@website-builder/config/web-server';

const input = { NODE_ENV: 'test', APP_ENV: 'ci' };
it('web guard replaces injected nonce/forwarded metadata and returns bounded correlated denials', () => {
  const guard = new HttpGuard(
    readHttpSecurityConfig({ ...input, HTTP_RATE_LIMIT: '10' }),
  );
  const request = new Request('http://127.0.0.1/ar', {
    headers: {
      host: '127.0.0.1',
      'x-nonce': 'canary',
      'x-forwarded-for': 'canary',
      'x-middleware-subrequest': 'canary',
      'content-security-policy': 'canary',
    },
  });
  const first = withRequest(() => webSecurity(request, guard, 'dashboard-web'));
  expect(first.forwarded.get('x-nonce')).not.toBe('canary');
  expect(first.forwarded.has('x-forwarded-for')).toBe(false);
  expect(first.forwarded.has('x-middleware-subrequest')).toBe(false);
  expect(first.forwarded.get('content-security-policy')).not.toContain(
    'canary',
  );
  for (let n = 0; n < 9; n++) webSecurity(request, guard, 'dashboard-web');
  const limited = webSecurity(request, guard, 'dashboard-web');
  expect(limited.rejected?.status).toBe(429);
  expect(Number(limited.headers.get('retry-after'))).toBeGreaterThan(0);
  expect(limited.headers.get('content-security-policy')).not.toBe(
    first.headers.get('content-security-policy'),
  );
});
it('uses operator-owned canonical origins, rejects deployment plaintext, ignores request-like input', () => {
  expect(
    readWebHttpSecurityConfig({
      ...input,
      HOST: '127.0.0.1',
      PORT: '3102',
      'x-forwarded-host': 'canary.example',
    }).HTTP_CANONICAL_ORIGIN,
  ).toBe('http://127.0.0.1:3102');
  const deployed = {
    NODE_ENV: 'production',
    APP_ENV: 'production',
    HTTP_ALLOWED_HOSTS: 'example.com',
    HTTP_CORS_ORIGINS: '',
    HTTP_BODY_MAX_BYTES: '0',
    HTTP_RATE_LIMIT: '100',
    HTTP_RATE_WINDOW_MS: '10000',
    HTTP_CANONICAL_ORIGIN: 'https://example.com',
  };
  expect(readWebHttpSecurityConfig(deployed).HTTP_CANONICAL_ORIGIN).toBe(
    'https://example.com',
  );
  expect(() =>
    readWebHttpSecurityConfig({
      ...deployed,
      HTTP_CANONICAL_ORIGIN: 'http://example.com',
    }),
  ).toThrow(ConfigurationError);
  expect(() =>
    readHttpSecurityConfig({
      ...deployed,
      HTTP_CORS_ORIGINS: 'http://example.com',
    }),
  ).toThrow(ConfigurationError);
});
it('validates bounded security configuration, defaults only locally, never echoes input', () => {
  expect(readHttpSecurityConfig(input).HTTP_CORS_ORIGINS).toEqual([]);
  for (const change of [
    { HTTP_ALLOWED_HOSTS: '*' },
    { HTTP_CORS_ORIGINS: 'https://good.example/path' },
    { HTTP_CORS_ORIGINS: 'null' },
    { HTTP_CORS_ORIGINS: 'https://user:private-canary@example.com' },
    { HTTP_RATE_LIMIT: '10001' },
    { HTTP_BODY_MAX_BYTES: '-1' },
    { NODE_ENV: 'production', APP_ENV: 'production' },
  ]) {
    expect(() => readHttpSecurityConfig({ ...input, ...change })).toThrow(
      ConfigurationError,
    );
    try {
      readHttpSecurityConfig({ ...input, ...change });
    } catch (error) {
      expect(String(error)).not.toContain('private-canary');
    }
  }
});
it('bounds process/socket rate inventory and resets deterministically; forwarded values cannot supply identity', () => {
  let clock = 10000;
  const guard = new HttpGuard(
    readHttpSecurityConfig({
      ...input,
      HTTP_RATE_LIMIT: '20',
      HTTP_RATE_WINDOW_MS: '1000',
    }),
    () => clock,
  );
  for (let n = 0; n < 10; n++) expect(guard.admit('socket')).toBe(0);
  expect(guard.admit('socket')).toBe(1);
  for (let n = 0; n < 20; n++) guard.admit(`other-${n}`);
  expect(guard.admit('new')).toBe(1);
  clock += 1000;
  expect(guard.admit('socket')).toBe(0);
});
it('fails closed on hostile authority/origin/preflight and any current request body', () => {
  const guard = new HttpGuard(
    readHttpSecurityConfig({
      ...input,
      HTTP_CORS_ORIGINS: 'https://dashboard.example',
    }),
  );
  const headers = (values: Record<string, string> = {}) =>
    new Headers({ host: '127.0.0.1:3001', ...values });
  expect(guard.inspect('GET', headers())).toBe(0);
  expect(
    guard.inspect('GET', headers({ origin: 'https://dashboard.example' })),
  ).toBe(0);
  for (const origin of [
    'null',
    'https://evil.example',
    'https://dashboard.example.evil',
    '%%%',
  ])
    expect(guard.inspect('GET', headers({ origin }))).toBe(403);
  for (const host of [
    'host-canary.example',
    'localhost@evil.example',
    'localhost:65536',
    'localhost/path',
  ])
    expect(guard.inspect('GET', headers({ host }))).toBe(400);
  expect(
    guard.inspect(
      'GET',
      headers({
        'x-forwarded-host': 'host-canary.example',
        'x-forwarded-proto': 'https',
      }),
    ),
  ).toBe(0);
  expect(guard.inspect('GET', headers({ 'content-length': '1' }))).toBe(400);
  expect(
    guard.inspect('GET', headers({ 'transfer-encoding': 'chunked' })),
  ).toBe(400);
  expect(
    guard.inspect(
      'OPTIONS',
      headers({
        origin: 'https://dashboard.example',
        'access-control-request-method': 'GET',
      }),
    ),
  ).toBe(0);
  expect(
    guard.inspect(
      'OPTIONS',
      headers({
        origin: 'https://dashboard.example',
        'access-control-request-method': 'POST',
      }),
    ),
  ).toBe(403);
  expect(guard.cors(headers({ origin: 'null' }))).not.toHaveProperty(
    'Access-Control-Allow-Origin',
  );
  expect(
    guard.cors(headers({ origin: 'https://dashboard.example' })),
  ).not.toHaveProperty('Access-Control-Allow-Credentials');
});
it('has distinct least-privilege policies, no unsafe script modes or external reporting', () => {
  for (const surface of ['api', 'dashboard-web', 'public-renderer'] as const) {
    const headers = securityHeaders(surface, 'noncefixture');
    expect(headers['Content-Security-Policy']).not.toMatch(
      /unsafe-|report-uri|report-to|https:/,
    );
    expect(headers['X-Content-Type-Options']).toBe('nosniff');
  }
  expect(securityHeaders('dashboard-web')['X-Frame-Options']).toBe('DENY');
  expect(securityHeaders('public-renderer')['X-Frame-Options']).toBe(
    'SAMEORIGIN',
  );
});
