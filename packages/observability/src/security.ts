import type { HttpSecurityConfig } from '@website-builder/schemas/configuration';

export type HttpSurface = 'api' | 'dashboard-web' | 'public-renderer';
export function securityHeaders(
  surface: HttpSurface,
  nonce?: string,
): Record<string, string> {
  const scripts = nonce ? `'nonce-${nonce}'` : "'none'";
  const csp =
    surface === 'api'
      ? "default-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'"
      : `default-src 'none'; script-src 'self' ${scripts}; style-src 'self' ${scripts}; img-src 'self'; font-src 'self'; connect-src 'self'; base-uri 'none'; object-src 'none'; form-action 'none'; frame-ancestors ${surface === 'dashboard-web' ? "'none'" : "'self'"}`;
  return {
    'Content-Security-Policy': csp,
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Frame-Options': surface === 'public-renderer' ? 'SAMEORIGIN' : 'DENY',
    'Permissions-Policy':
      'camera=(), microphone=(), geolocation=(), payment=(), usb=(), display-capture=()',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  };
}

/** Process cap plus a bounded socket-peer inventory; no forwarded identity. */
export class HttpGuard {
  #start = 0;
  #count = 0;
  readonly #peers = new Map<string, number>();
  constructor(
    readonly policy: HttpSecurityConfig,
    readonly clock = Date.now,
  ) {}
  admit(peer?: string): number {
    const now = this.clock();
    if (now - this.#start >= this.policy.HTTP_RATE_WINDOW_MS) {
      this.#start = now;
      this.#count = 0;
      this.#peers.clear();
    }
    this.#count++;
    const used = peer ? (this.#peers.get(peer) ?? 0) + 1 : 0;
    if (
      peer &&
      (this.#peers.has(peer) || this.#peers.size < this.policy.HTTP_RATE_LIMIT)
    )
      this.#peers.set(peer, used);
    const blocked =
      this.#count > this.policy.HTTP_RATE_LIMIT ||
      used > Math.max(10, Math.floor(this.policy.HTTP_RATE_LIMIT / 2));
    return blocked
      ? Math.max(
          1,
          Math.ceil(
            (this.#start + this.policy.HTTP_RATE_WINDOW_MS - now) / 1000,
          ),
        )
      : 0;
  }
  inspect(method: string, headers: Headers): 0 | 400 | 403 {
    const host = headers.get('host') ?? '';
    // Parse authority only, never a URL or userinfo supplied by a client.
    const match = /^(\[[0-9a-f:]+\]|[a-z0-9.-]+)(?::([0-9]{1,5}))?$/i.exec(
      host,
    );
    if (
      !match ||
      !this.policy.HTTP_ALLOWED_HOSTS.includes(
        (match[1] ?? '').toLowerCase(),
      ) ||
      (match[2] !== undefined &&
        (Number(match[2]) < 1 || Number(match[2]) > 65535))
    )
      return 400;
    const origin = headers.get('origin');
    if (origin !== null && !this.policy.HTTP_CORS_ORIGINS.includes(origin))
      return 403;
    const length = headers.get('content-length') ?? '0';
    if (
      !/^\d{1,10}$/.test(length) ||
      Number(length) > this.policy.HTTP_BODY_MAX_BYTES
    )
      return 400;
    // Current public surfaces accept no bodies: parsing/merging untrusted JSON
    // would introduce an unnecessary attack surface. Reject before buffering.
    if (
      Number(length) !== 0 ||
      headers.has('transfer-encoding') ||
      !['GET', 'HEAD', 'OPTIONS'].includes(method)
    )
      return 400;
    if (
      method === 'OPTIONS' &&
      (!origin ||
        headers.get('access-control-request-method') !== 'GET' ||
        (headers.get('access-control-request-headers') ?? '')
          .split(',')
          .some(
            (key) => !['', 'x-request-id'].includes(key.trim().toLowerCase()),
          ))
    )
      return 403;
    return 0;
  }
  cors(headers: Headers): Record<string, string> {
    const origin = headers.get('origin');
    return origin && this.policy.HTTP_CORS_ORIGINS.includes(origin)
      ? {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Methods': 'GET',
          'Access-Control-Allow-Headers': 'X-Request-Id',
          'Access-Control-Expose-Headers': 'X-Request-Id',
          Vary: 'Origin',
        }
      : { Vary: 'Origin' };
  }
}
