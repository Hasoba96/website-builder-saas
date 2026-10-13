import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import type { NextRequest } from 'next/server';
import {
  readWebConfig,
  readWebHttpSecurityConfig,
} from '@website-builder/config/web-server';
import { NextResponse } from 'next/server';
import {
  StructuredLogger,
  webProbe,
  withRequest,
  currentRequestId,
  webSecurity,
  HttpGuard,
} from '@website-builder/observability';
const locale = createMiddleware(routing);
const logger = new StructuredLogger('dashboard-web', readWebConfig().APP_ENV);
const securityConfig = readWebHttpSecurityConfig();
const guard = new HttpGuard(securityConfig);
export default function proxy(request: NextRequest) {
  return withRequest(() => {
    const security = webSecurity(request, guard, 'dashboard-web');
    if (security.rejected) {
      logger.emit('http_dispatched');
      return security.rejected;
    }
    let response: Response;
    const path = request.nextUrl.pathname;
    if (request.method === 'OPTIONS')
      response = new Response(null, { status: 204 });
    else if (['/health', '/ready'].includes(path))
      response = webProbe(request, logger);
    else if (path.startsWith('/_next/') || path.includes('.'))
      response = NextResponse.next({
        request: { headers: security.forwarded },
      });
    else {
      // next-intl reads request headers; downstream Next extracts the nonce from CSP.
      for (const key of [...request.headers.keys()])
        request.headers.delete(key);
      security.forwarded.forEach((value, key) =>
        request.headers.set(key, value),
      );
      response = locale(request);
      // Never forward a client-controlled authority in redirects or alternate links.
      const location = response.headers.get('location');
      if (location) {
        const target = new URL(location, request.url);
        response.headers.set(
          'location',
          new URL(
            target.pathname.startsWith('//') ? '/ar' : target.pathname,
            securityConfig.HTTP_CANONICAL_ORIGIN,
          ).href,
        );
      }
      response.headers.delete('link');
    }
    if (path.startsWith('/_next/static/'))
      security.headers.delete('Cache-Control');
    security.headers.forEach((value, key) => {
      response.headers.set(
        key,
        key === 'vary' && response.headers.has(key)
          ? response.headers.get(key) + ', ' + value
          : value,
      );
    });
    response.headers.set('X-Request-Id', currentRequestId() ?? '');
    logger.emit('http_dispatched');
    return response;
  });
}
export const config = { matcher: ['/:path*'] };
