# 00-F operational contract

Owner: Engineering Platform. Scope: local operational foundation, not an external monitoring provider.

## Wire contract

Reuse existing API-020/021/023 fields only; no new product API fields. Successful GET `/health` and `/ready` return HTTP 200 with `{ "data": {}, "requestId": "req_<UUIDv4>" }`. Liveness has no dependency check. Readiness failure returns HTTP 503 with `{ "error": { "code": "NOT_READY", "message": "Service is not ready", "details": {}, "requestId": "req_<UUIDv4>" } }`. `X-Request-Id` matches the body; responses are `Cache-Control: no-store`. No status metadata, timestamp, version or dependency name in the body. The HTTP status communicates ready/not-ready. Schemas are strict and live in `packages/schemas` (CORE-022); the API error envelope is unchanged.

Server-owned `req_` plus a random UUIDv4 is generated at the HTTP edge. Incoming IDs are never trusted or echoed, regardless of apparent validity. AsyncLocalStorage carries the generated ID; response completion retains the same context. Native process lifecycle operations also have generated operation correlation in the `requestId` field, as required by OB-002/005, not fabricated tenant/user identity. `organizationId`, `siteId` and `userId` are null while these contexts do not exist.

The only probes are `/health` and `/ready`, outside `/api/v1`. API readiness uses PostgreSQL only. Worker readiness uses Redis only. IN-004 explicitly requires both probes on every service: Worker therefore receives a small operational-only HTTP listener, not a product server. Next applications check their local process only and never acquire DB/Redis dependencies. No additional HTTP diagnostic endpoint.

## Logging safety

Both probes require no application authentication or role; they expose no data beyond their minimal contract. Access restriction belongs at the configured listener/deployment boundary, not an invented Stage 00 Auth system. GET only, no body or query (400 `MALFORMED_REQUEST` otherwise); both use the shared strict probe-input schema. `/ready` may additionally return 503 `NOT_READY`; unexpected failures use 500 `INTERNAL_ERROR`. Success/failure examples above are the complete bodies. No endpoint-specific rate limiter is introduced before 00-G; readiness coalescing bounds dependency work now.

Structured JSON uses OB-002 names: timestamp (UTC), level, service, environment, requestId, organizationId, siteId, userId, message and durationMs. A bounded event enum and safe error-code enum provide classification. Logger projects approved fields only; arbitrary message strings, objects, headers, bodies, payloads, URLs and causes cannot enter records. Unknown fields, including password/token/authorization/cookie, are discarded automatically. This fail-closed projection is the default redaction mechanism, not a caller opt-in.

Safe: emit a fixed `started`, `stopped`, `http_completed`, or `dependency_unavailable` event. Unsafe: serialize an Error, request, environment, credential, raw URL, query, SQL or job payload. Invalid logger inputs become a fixed diagnostic event; never reflect the supplied value. Expected 4xx failures are not error-level; unexpected failures are error-level. Debug output is disabled in production. Output is local stdout only; no Sentry SDK, DSN, external sink or provider abstraction.

## Failure and recovery

Checks are bounded and coalesced: at most one underlying dependency operation per readiness owner, with a short result reuse interval. An HTTP deadline cannot create a new query storm while the original operation is pending. Existing DB/Redis timeouts and ownership remain authoritative for resource cleanup. Probes do not run migrations or write state. Shutdown changes readiness to false before draining HTTP and closing infrastructure.

Public error messages are fixed. `MALFORMED_REQUEST` (400), `VALIDATION_FAILED` (422), `NOT_FOUND` (404), `NOT_READY` (503), and `INTERNAL_ERROR` (500) are technical classifications only, not domain errors. Details remain an empty object for these foundation errors. No raw exception message, SQLSTATE, path, host or credential is returned. Probe input accepts no body/query data; no business payload schema exists yet.

## Dependency review

No new third-party package or version is required. Node AsyncLocalStorage/crypto/http/streams and existing Nest capabilities suffice. The new observability workspace package consumes existing shared schemas. Current CORE-002 tracking and scans remain in force. No ADR trigger: no error envelope, stack, datastore, provider or tracing architecture change.

## Configuration and local use

Existing 00-C environment names and precedence are unchanged. API/Worker `dev` loads that app's ignored `.env`; inherited process values win. Production `start` requires operator-supplied environment. No new public configuration key. Copy the relevant safe `.env.example` only after following the [PostgreSQL](00-d-postgresql.md) or [Redis](00-e-redis-bullmq.md) setup; never put migration credentials in API/Worker environment.

| Setting                | Owner                      | Bounds and default                                                                  |
| ---------------------- | -------------------------- | ----------------------------------------------------------------------------------- |
| `READINESS_TIMEOUT_MS` | API, Worker                | Integer 100-5000 ms; 1000 only outside production Node mode; explicit in production |
| `PROBE_HOST`           | Worker                     | IP literal or localhost; loopback default only outside production Node mode         |
| `PROBE_PORT`           | Worker                     | Integer 1-65535; 3004 default only outside production Node mode                     |
| `SHUTDOWN_TIMEOUT_MS`  | Existing API/Worker config | Existing 100-30000 ms bound, explicit in production                                 |

Missing/invalid settings fail before successful startup with nonzero exit. `CONFIGURATION_INVALID` logs may include `details.fields` containing allowlisted config key names and fixed `INVALID` codes, never values. `unconfigured` is a log-only environment marker before validation succeeds, not an accepted deployment environment.

After valid configuration, build from root with `pnpm build`; run a selected app with `pnpm --filter @website-builder/api dev` (or worker/dashboard-web/public-renderer). Default local probe ports: API 3001, Worker 3004, dashboard 3000, renderer 3002. Example: `curl --fail http://127.0.0.1:3001/health`, then `/ready`. A 503 is readiness failure, not a dependency inventory. `/api/v1/health` and `/api/v1/ready` are not operational routes. Production proxy/access control remains part of the later deployment/security setup; do not expose a local listener publicly by accident.

Readiness reuses a result for at most 250 ms and coalesces concurrent checks. A failed/timed-out check returns 503, without making liveness dependent on infrastructure. An underlying timed-out query remains covered by existing driver deadlines; further probes cannot accumulate new checks behind it. API can recover on later successful checks. Worker terminates after the existing bounded Redis outage budget, requiring an operator/process supervisor to restart after recovery; no restart loop is added here.

## Runtime log transport and shutdown

Native API/Worker emit local structured stdout only. The Next launcher forwards records only after strict schema/service/environment validation; raw framework stdout/stderr is reduced to fixed `framework_output`/`framework_warning` events. Build/typegen output remains tool diagnostics, not runtime logs. Proxy request logs describe dispatch, not completed-page latency; no inaccurate Next p95/p99 claim. Framework assets outside the locale matcher are not application request-correlation surfaces.

Backpressure does not create an unbounded log queue: records are dropped while the sink is blocked, with a fixed `logging_resumed` event once writable again. A failed/destroyed sink stops accepting records without recursive logging or raw error fallback. This local baseline is not a durable audit trail; operators must also supervise the log transport. No free-text logger API is provided. Production debug records are suppressed even on the validated forwarding path. Do not bypass the launcher for deployed Next runtime logging.

API/Worker startup and shutdown events carry operation correlation and null identity fields. Handled fatal exceptions/rejections emit a fixed `INTERNAL_ERROR`, trigger bounded cleanup and exit nonzero. Shutdown stops readiness before draining HTTP and closing the existing DB/Redis owner. The Worker HTTP listener exists solely for IN-004 probes; no queue is registered. Native Node rejects transport-invalid requests before the application boundary; application-level malformed input receives the standardized envelope.

## Contracts, tests and incident handling

[OpenAPI](../api/operations.openapi.json) is generated from shared Zod contracts (API-070), not a second schema. Regenerate with `pnpm --filter @website-builder/schemas build`, then `node scripts/operations-openapi.ts` and `pnpm exec prettier --write docs/api/operations.openapi.json`; root tests detect drift. Response schemas reject additional fields. No HTTP documentation endpoint is introduced.

`pnpm test` runs real disposable Redis/PostgreSQL tests, app/root tests and browser regressions. `pnpm test:database` covers real API readiness during PostgreSQL pause; `pnpm test:redis` covers Worker probes during Redis pause and terminal lifecycle. Neither uses mocked readiness as integration evidence. See [outage runbook](../runbooks/foundation-dependency-outage.md) for verification and escalation.

No external error tracking, metrics backend, alert destination, full tracing, production SLO dashboard, or domain job correlation is claimed. Sentry remains gated by the approved ADR requirement. These Stage 00/provider constraints do not waive future observability obligations. Cross-tenant runtime tests remain N/A under ADR-001.
