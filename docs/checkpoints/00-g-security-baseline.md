# 00-G Security Baseline

Date: 2026-10-03. Applies to current bodyless operational HTTP surfaces and AR/EN
Next shells only. This is not a global security certification. No Auth, Tenant,
product route/job, provider, or 00-H implementation is included.

## Ownership and threat assumptions

Internet input is untrusted, including Host, Origin, request IDs and all forwarded
headers. Configuration is operator-owned, validated by the existing config
boundary against one shared schema. `packages/observability` already owns HTTP
operational responses; its small security module now applies their shared policy.
It is not a generic security framework. No new package or external dependency.

API owns PostgreSQL; Worker owns Redis. Security controls never add Redis to API
readiness, execute migrations, create jobs, or unwrap infrastructure error causes.
Browsers have no server configuration access. Public-config allowlist remains empty.

## Configuration

All four applications consume `readHttpSecurityConfig` through their existing
server-only entrypoints. Next uses `readWebHttpSecurityConfig` additionally.
Process environment/file precedence is unchanged from 00-C. Turbo forwards only
these explicit keys. Validation identifies keys, never values.

| Key                   | Contract                                                                                                             | Local/CI default                                                                            |
| --------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| HTTP_ALLOWED_HOSTS    | 1-16 comma-separated exact lowercase hostnames/IP literals; IPv6 bracketed; no wildcard, URL or port                 | localhost,127.0.0.1,[::1]                                                                   |
| HTTP_CORS_ORIGINS     | 0-16 exact comma-separated serialized HTTP(S) origins; no credentials/path/trailing slash; empty denies cross-origin | empty                                                                                       |
| HTTP_BODY_MAX_BYTES   | Integer 0-65536, maximum declared body size; current routes reject every nonempty body regardless                    | 16384                                                                                       |
| HTTP_RATE_LIMIT       | Integer 10-10000, requests/process/window                                                                            | 600                                                                                         |
| HTTP_RATE_WINDOW_MS   | Integer 1000-60000                                                                                                   | 60000                                                                                       |
| HTTP_CANONICAL_ORIGIN | Next only; explicit serialized operator-owned HTTP(S) origin for redirects                                           | Loopback with validated listener port; portless loopback for build/typegen without listener |

Preview/staging/production require explicit policy values and HTTPS CORS/canonical
origins. Local/CI may execute production builds with safe local defaults. These
values are not production capacity sizing. Configure examples per application;
never derive a canonical origin or trust relationship from a request.

## Headers and CSP

Every application-handled response, including denials and probes, gets CSP,
`X-Content-Type-Options: nosniff`,
`Referrer-Policy: strict-origin-when-cross-origin`,
`Strict-Transport-Security: max-age=31536000; includeSubDomains`, framing protection,
and disabled camera/microphone/geolocation/payment/USB/display-capture permissions.
API/Worker CSP denies all content; no rendered document exists there.

Dashboard framing is denied; the current renderer shell permits same-origin
framing only. No external embedding provider is approved. Both Next policies deny
by default, permit same-origin scripts/styles/images/fonts/connectivity and nonce
inline framework scripts/styles, forbid objects/base/form submission, and contain
no unsafe-inline, unsafe-eval or report destination. Per-request cryptographic
nonces are passed through the documented Next request-CSP mechanism. Existing
dynamic SSR locale rendering is retained, not changed to a new rendering strategy.
No nonce-bearing document is intentionally publicly cached. Next config supplies
fallback headers for framework responses; proxy covers static resources too.

HSTS header values are verified locally. Browsers ignore HSTS received over HTTP;
this does not prove certificate issuance, TLS termination, HTTPS enforcement or
subdomain readiness. Those are deployment gates. Forwarded-Proto never activates
trust or changes HSTS. Development CSP is not relaxed for eval-based tooling;
production builds are the security/browser acceptance path.

## CORS, proxy trust and Host

Exact Origin allowlist; null, malformed and unapproved origins receive safe 403
without reflection. Approved GET preflights may request X-Request-Id and receive 204. Credentials are not enabled, no wildcard, and responses vary on Origin.
No cookies/sessions or authenticated mutation endpoints exist. CORS is not an
authorization mechanism and does not protect against non-browser clients.

API explicitly disables Express proxy trust. Native Worker uses socket peers.
Neither takes rate identity or HTTPS assumptions from forwarded values. Next has
no authenticated peer-IP API at this boundary, so it uses process-wide limits,
never a client-supplied IP. Forwarded and client-supplied middleware/nonce headers
are stripped before locale processing. Host must match an operator allowlist.
Locale redirects use the configured canonical origin and a path only; query and
alternate-link reflection is removed. Next URL renormalization is disabled so it
does not rewrite the canonical loopback authority. No tenant/domain resolution.

## Input and resource bounds

There is **no accepted JSON/body contract** yet. API bodyParser remains disabled;
nonzero Content-Length, Transfer-Encoding, unsupported methods and oversized
declarations fail before buffering/parsing/merging JSON. Probes also reject query
fields through the existing strict schema. Thus unknown fields, malformed JSON,
deep arrays and prototype keys are rejected, not sanitized into accepted objects.
Next shells also reject query strings because no query contract exists yet. Image
optimization and remote/local image-source patterns are disabled: no hidden
arbitrary-URL image-fetch surface is needed by the current shell.
No mass assignment or dynamic merge. A bodyless GET is the within-limit case;
even a small valid JSON object is deliberately invalid on current surfaces.
All input denials use the existing safe 400 envelope rather than adding a new DTO.

The bounded guard covers probes and all matched public paths, including denials
and Next assets. Fixed windows enforce a process cap; Node surfaces additionally
limit each actual socket peer to half the process cap, minimum ten. Peer inventory
cannot exceed the configured process cap and resets each window. No timer per
peer, Redis dependency, persistent identity or distributed lock. 429 has fixed
`RATE_LIMITED` code and Retry-After seconds. Failure is closed; counters are
ephemeral and resets/restarts do not preserve quotas. API/Worker also bound HTTP
request/header deadlines to 5 seconds, header count to 64 and connections to 256.

These are per-process guards, not distributed DoS protection. Edge connection,
body/header limits, trusted proxy CIDRs and CDN/WAF rules must be configured and
tested after hosting approval, before public pilot/production. No provider was
activated here. Future account/site quotas require Stage 01 identity first.

## Errors, probes and logs

00-F envelopes are unchanged; only `FORBIDDEN` and `RATE_LIMITED` technical codes
were added. Generated OpenAPI reflects 403/429. Operational GETs remain `/health`
and `/ready`, not versioned business routes. Success contains only data/requestId;
failure only fixed error/code/message/details/requestId. Headers and bodies agree.
Liveness is dependency-free; readiness retains coalescing and finite deadlines.

Security rejections use existing request-scoped structured logging. Raw Origin,
Host, forwarded values, body/query, Authorization/Cookie and exceptions never enter
logs or error responses. Safe: fixed `http_completed` with duration and requestId.
Unsafe: logging request.headers, request.url, process.env, job payload, or raw
database/Redis errors. No new diagnostic provider or transmission.

## Supply chain and secret boundary

No dependency/version/lockfile changes. CORE-002 inventory, exact pins, official
registry, frozen installs, strict peers, maturity floor, disabled lifecycle scripts
and existing tracked transitive dispositions remain enforced. Run root dependency
audit and Git-eligible tracked/untracked secret scan. No suppression or scanner
weakening. Existing tracking deadlines/events are unchanged, not restarted.

Browser HTML, scripts and production static output must not contain server canaries
or credential keys. Config server exports remain unavailable under browser
conditions; no arbitrary env forwarding, Next config `env`, or props-based secrets.

## OWASP applicability

| Category                               | Current evidence and limitation                                                                                                                                                                                 |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Broken Access Control                  | Partially applicable: explicit public probes, bodyless deny-by-default input, import/config ownership. Auth/resource/tenant authorization deferred to Stage 01; ADR-001 isolation N/A only while domain absent. |
| Cryptographic Failures                 | Partial: server-only credentials, existing verified DB/Redis TLS configuration, no logging leaks. Deployment TLS/HSTS enforcement and secret-manager operations not locally proven.                             |
| Injection                              | Covered for current inputs: parameter binding regression, no request JSON merge, prototype/deep/large input rejection, strict CSP and injected-script browser test. No product SQL/HTML surface.                |
| Insecure Design                        | Partial: bounded pools/retries/readiness/HTTP work and no Redis authority. Future feature-specific threat models still required.                                                                                |
| Security Misconfiguration              | Covered locally: headers, CORS, Host, forward trust, explicit validated config, safe errors/probes. CDN/WAF and deployed proxy verification remain gates.                                                       |
| Vulnerable/Outdated Components         | Existing audit, frozen graph, tracked risk findings and integrity controls. No claim to detect undisclosed vulnerabilities or scan every container OS package.                                                  |
| Identification/Authentication Failures | Not yet applicable: no login, session, token or identity surface. Stage 01 owns AU rules.                                                                                                                       |
| Software/Data Integrity Failures       | Partial: frozen lockfile, official registry, disabled hooks, explicit operator migrations and privilege regressions. Deployment artifact signing/provenance belongs to CI/deployment checkpoints.               |
| Logging/Monitoring Failures            | Covered local redaction/correlation/error tests; external tracking, alerting and incident destinations not activated. Use existing dependency-outage runbook.                                                   |
| SSRF                                   | No product arbitrary-URL fetch; outbound runtime endpoints are typed operator configuration. Future media import, callbacks, previews and domain verification require SE-030/031/032 before implementation.     |

CSRF runtime tests are N/A: no cookie-authenticated mutations. Future such routes
must implement AU-050 and Security rules, not rely on CORS. No arbitrary raw HTML,
dangerouslySetInnerHTML, user code or open redirect target is introduced. Renderer
content must remain structured; this is not a blanket ban on approved future
sanitized renderer functionality.

## Verification and operation

Use `pnpm test` for actual Redis/PostgreSQL fixtures, package/root tests and
production Chromium checks. `pnpm build`, `pnpm lint`, `pnpm typecheck`,
`pnpm format:check`, `pnpm workspace:check`, `pnpm security:dependencies`, and
`pnpm security:secrets` remain root gates. Security tests are in
`scripts/security.spec.ts`, `apps/api/tests/security.spec.ts` and
`tests/browser/security.spec.ts`. Existing hydration/probe/redaction tests remain.

For a local denial, inspect only requestId and fixed classification. Fix the named
operator policy key, restart and retest; never enable wildcard trust, dump input,
disable CSP, or bypass a scanner. A rate-limit recovery waits the configured window;
do not expose a reset/debug endpoint. Fixture cleanup uses existing exact-owned
container labels, never broad deletion. See the 00-G closure for executed results.

Implementation references: [Next CSP](https://nextjs.org/docs/app/guides/content-security-policy),
[Next proxy](https://nextjs.org/docs/app/api-reference/file-conventions/proxy), and
the installed version's public configuration/adapter interfaces. Nonce use follows
Next's documented server-rendering mechanism; no custom Next server was introduced.
