# CHECKPOINT 00-E CLOSURE REPORT

Date: 2026-10-01. Scope: Redis and BullMQ foundation only.

## STATUS

**PASS**. Real disposable Linux Redis integration, PostgreSQL regressions, application builds, browser checks and applicable security gates passed. No native Redis substitution or mocked integration evidence. Checkpoint 00-F was not started.

## REDIS VERSION

Redis **7.2.16**, supported 7.2 branch, official Alpine image pinned to `redis@sha256:29e8589c3f9ba699b5f7aa4b3c7733c58852a3626439e619aa0ee78de08c6ca0`. Executable version verified. BSD-3-Clause; release/security evidence in [dependency review](00-e-dependency-review.md). Test version only, not a hosting decision.

## BULLMQ VERSION

**6.3.10**, with **ioredis 6.0.0**, explicit RESP2. Exact versions satisfy Node 24.21.0, peers and the 1,440-minute release maturity floor. No force, overrides, patches, forks or peer/security suppression.

## ARCHITECTURE

One shared configuration contract in `packages/schemas/queues`, server-only selectors in existing `packages/config`, and infrastructure lifecycle in `packages/queues`. Worker owns connectivity only; no production Queue or processor registration. Real Queue/Worker consumers are test-only. API remains independent of Redis. PostgreSQL is the only system of record. No domain repository, cache framework, distributed-lock abstraction or new architectural decision.

## FILES CREATED

- `packages/queues/package.json`, `packages/queues/tsconfig.json`, `packages/queues/src/index.ts`
- `packages/schemas/src/queues.ts`
- `packages/config/tests/queues.spec.ts`
- `scripts/test-redis.ts`, `vitest.redis.config.ts`
- `tests/redis/foundation.spec.ts`
- `docs/checkpoints/00-e-dependency-review.md`
- `docs/checkpoints/00-e-dependency-inventory.json`
- `docs/checkpoints/00-e-redis-bullmq.md`
- `docs/checkpoints/00-e-closure-report.md`

## FILES MODIFIED

- `package.json`, `pnpm-lock.yaml`, `tsconfig.json`, `turbo.json`, `README.md`
- `packages/schemas/package.json`
- `packages/config/src/server.ts`, `packages/config/src/worker.ts`
- `apps/worker/package.json`, `apps/worker/src/main.ts`, `apps/worker/.env.example`
- `scripts/check-boundaries.ts`, `scripts/configuration.spec.ts`
- `scripts/process-lifecycle.spec.ts`, `scripts/test-database.ts`
- `playwright.config.ts`, `tests/browser/configuration.spec.ts`

The PostgreSQL harness change only strips Redis/queue credentials before browser execution. No PostgreSQL assertion or timeout was weakened. Historical 00-A/B/C/D reports remained unchanged against the checkpoint snapshot.

## PACKAGES CREATED/MODIFIED

Created `@website-builder/queues`. Extended schemas/config and Worker. No separate cache or queue-adapter package; both would duplicate current ownership.

## DEPENDENCIES ADDED

`bullmq@6.3.10`: approved queue lifecycle, used by queues package. `ioredis@6.0.0`: explicitly owned Redis connections, used by queues and root real ACL tests. Existing dependencies reused otherwise. Candidate graph: 24 exact versions, all tarball integrity checks passed; actual lockfile delta from 00-D: 19 added versions, zero removed. Licenses reviewed; optional native install hook remains disabled. Eight age-only transitive findings accepted with tracking, Engineering Platform owner, review by 2027-03-30 plus immediate CORE-002 event triggers. No new direct-age exception.

## REDIS CONFIG

Required host, port, username/password, TLS mode, connection/command/outage deadlines, reconnect count/delay and shutdown deadline. Explicit bounds; no unbounded or silently unsafe defaults. Remote/deployed connections require verified TLS; plaintext allowed only local/CI loopback. Optional CA is server-only. Queue settings are required only for actual queue consumers, currently tests. Full key/range contract and local examples: [runbook](00-e-redis-bullmq.md). No Redis URL or parallel config system.

## REDIS CLIENT

Owned ioredis client, offline queue and automatic command replay disabled, bounded startup/PING/socket behavior, finite reconnect budget, safe repeated close. Fixed sanitized boundary errors. No `ioredis.keyPrefix`.

## BULLMQ FOUNDATION

Producer owns Queue and command client. Consumer owns command client; BullMQ owns its duplicated blocking connection. QueueEvents not needed. Processor errors are sanitized while preserving permanent/transient classification. Test-only cooperative processors have execution deadlines and cancellation. No product types or processors exist.

## QUEUE PREFIX / NAMESPACE

`website-builder:<APP_ENV>:<QUEUE_NAMESPACE>` through BullMQ's supported `prefix`. Validated queue names, bounded job names/IDs. Two isolated namespaces with identical job IDs tested independently. Namespace is not future tenant authorization.

## CONNECTION OWNERSHIP

No scattered app clients: Worker uses `RedisConnection`; QueueProducer/QueueConsumer own their clients explicitly. Boundary checks prevent other applications from importing queues or raw Redis/BullMQ clients. Browser export resolution is rejected. All test owners close in `afterEach`; container cleanup runs in harness `finally` and handled termination paths.

## RETRY / RECONNECT

Finite owner-lifetime reconnect count shared with duplicated connections, exponential delay capped at two seconds with jitter, finite wall-clock outage budget. Producer command retries are zero; worker's BullMQ-required `maxRetriesPerRequest=null` is enclosed by socket/reconnect/outage/shutdown limits. Exhaustion closes ownership and makes the Worker process exit nonzero. No automatic process restart loop. Enqueue timeout is explicitly ambiguous and never automatically replayed with a new ID.

## JOB RETRY POLICY

Explicit configurable 1-5 total attempts, exponential backoff with 0.5 jitter; fixture uses three attempts. Permanent `UnrecoverableError` fails once. Stalled-job retries and total starts are bounded. These are infrastructure values, not product-specific policies.

## RETENTION

BullMQ-supported completed/failed retention uses both count and age; fixture count two, age 60 seconds. Count and lazy age removal verified. Event stream approximate max length 1000. No manual TTL/internal key mutation, flush operation or wildcard deletion. Failed set is only a technical inspection surface; no claim of product DLQ routing/monitoring completion.

## IDEMPOTENCY

Required job ID demonstrates BullMQ retained-ID deduplication: two submissions produce one effect. Protection expires when history is removed. At-least-once delivery, not exactly once. Future business status/idempotency belongs in PostgreSQL with real tenant ownership checks.

## API LIFECYCLE

Existing PostgreSQL bootstrap/shutdown unchanged. Root process regression boots API with an unreachable Redis port, proving Redis is not an API startup dependency. No enqueue/debug/health HTTP endpoints added.

## WORKER LIFECYCLE

Configuration validates before connectivity; Redis must connect and answer PING before successful application startup. Graceful shutdown closes Redis and Nest context, with existing process deadline. Startup/auth/config failures exit nonzero with sanitized messages. Terminal outage logs a fixed reason, closes and exits nonzero. No production queues/jobs created.

## REAL REDIS TESTS

**PASS: 15 integration tests**, covering Redis and BullMQ together. Real Redis 7.2.16 Linux container; no mocked substitute. Final suite duration 30.57 seconds. Successful PING; repeated close; invalid auth; unreachable port; TCP blackhole; ACL denial; malformed Worker config; Worker startup/outage behavior.

## REAL BULLMQ TESTS

**PASS** within the 15 integration tests: Queue/Worker creation/closure, produced/processed technical job with correct result, retained-ID deduplication, completed/failed count retention, lazy age removal, bounded transient retry, permanent failure classification, namespace isolation, execution deadline/cancellation and outage recovery exhaustion.

## FAILURE TESTS

**PASS**: bad credentials, absent endpoint, non-speaking TCP peer, paused Redis during producer/consumer use, exhausted recovery budget, invalid config and nonzero Worker startup/terminal failure. New owners recover after unpause. Assertions prove bounded completion and no continuing reconnect error stream after closure.

## SHUTDOWN TESTS

**PASS**: connectivity repeated close, active cooperative processor cancellation, Queue/Worker close within configured limit, Worker IPC shutdown and terminal outage shutdown. No leftover test process or fixture container needed after verification.

## SECRET REDACTION

**PASS**: random credentials and processor error secrets absent from boundary errors; Worker output excludes credentials; public configuration excludes Redis settings; browser-condition import of queues fails. Synthetic Redis canary absent from AR/EN HTML and loaded scripts in both Next apps. Static browser artifacts contain no Redis/BullMQ/canary matches. No broader production SBOM exclusion claim.

## PRODUCT JOB TYPES

**ZERO**. Technical `foundation.*` job names occur in integration tests only. Worker production source creates no Queue/processor and has no domain imports.

## DISPOSABLE CONTAINERS REMAINING

**ZERO Redis; ZERO PostgreSQL**, verified with separate exact checkpoint-label inventories after final run. Redis fixture: unique UUID name, ephemeral loopback port, read-only/non-root/capability-dropped container, bounded memory/CPU/PIDs, tmpfs, persistence off, generated ACL credential. Temporary ACL file removed. Abrupt-host-termination recovery is documented by exact name/label; no unrelated container or volume deletion.

## POSTGRESQL REGRESSION

**PASS: 10/10** against real PostgreSQL 18.6 container, final duration 14.98 seconds. Existing connection, privilege, migration up/down/status, failure/redaction and pool lifecycle checks retained. No domain schema introduced.

## FORMAT

**PASS**: root `pnpm format:check`; final documentation formatting rechecked after closure creation.

## LINT

**PASS**: `pnpm lint`, zero warnings; architecture boundaries and local import cycles passed.

## TYPECHECK

**PASS**: root TypeScript plus **12/12 Turbo tasks**, zero cache hits. Strict settings unchanged; no `any` escape or `@ts-ignore` added. `AbortSignal.any` is the standard API, not the TypeScript `any` type.

## BUILD

**PASS**: root `pnpm build`, **8/8 actual tasks**, zero cache hits. API, Worker, dashboard-web, public-renderer and four shared packages all built. Both Next production builds passed. No zero-task claim.

## TESTS

**PASS: 116 total** in final `pnpm test` (exit 0): 15 Redis/BullMQ + 10 PostgreSQL + 53 workspace tests + 21 root tests + 17 browser tests. Workspace test graph: **14/14 tasks**, zero cache hits. Schemas 12, config 29, API 2, Worker 2, dashboard 4, renderer 4. Redis and database packages are tested through real root integration suites, not fake package tests.

## BROWSER TESTS

**PASS: 17/17**, final duration 39.8 seconds. AR/EN, RTL/LTR, responsive shells, applicable accessibility/visual checks, independent locale state, four hydration regressions and server-secret exposure checks. Existing harmless Node terminal-color warnings are not browser hydration errors.

## DEPENDENCY SCAN

**PASS**: `pnpm security:dependencies`, no known vulnerabilities. Full-workspace audit retains Critical/High gate. Runtime graph licenses/source/integrity/hooks reviewed; existing historical findings retain their tracking obligations.

## SECRET SCAN

**PASS**: root Gitleaks scan of Git-eligible tracked/untracked paths; no leaks, no allowlist or baseline suppression added. Repeated after final documents.

## CLEAN INSTALL

**PASS**: isolated fresh manifest-only workspace, frozen lockfile and disabled install scripts; 370 packages, exit 0. Final clean run completed in 2m36.4s. Real workspace install and builds also passed. Ignored install-review scratch directories are not live services or databases.

## LOCKFILE

Consistent with exact manifests. Frozen installation did not modify SHA-256 `89e5586fd212f3d16941079c9ff28cb693d9f4ebcccd268714ff6784bcef739e`. Strict peer/engine checks, official registry, disabled lifecycle scripts and maturity floor preserved. No unrelated dependency upgrades.

## RULE IDS APPLIED

CORE-001/002, CORE-022/023; QJ-001/010/011/012/013/022/030/034/040/041/045/052/080/082/085 as applicable to the current foundation; SE-060 through SE-064; TS-021/024; ADR-001 for currently inapplicable cross-tenant runtime tests. Product job, tenant/cache and operational monitoring obligations remain mandatory when their surfaces are introduced; they are not claimed completed here.

## KNOWN LIMITATIONS

No deployed TLS handshake or OS-wide container CVE scan performed; configuration enforcement and Redis release security fixes reviewed. Deployment TLS/ACL validation remains required for the eventual environment. In-process processors must cooperate with cancellation; CPU-bound/noncooperative product work requires bounded isolated execution later under QJ-034. Job-ID deduplication is retention-limited. Failed history inspection is not a production monitoring/DLQ platform. No provider or production sizing selected.

## N/A CHECKS

Cross-tenant runtime isolation (ADR-001); product state reconciliation/DLQ workflows; application cache TTL/invalidation; scheduled-job locking; product payload permissions; production deployment/TLS integration. No corresponding domain surface exists. HTTP probes/full observability belong to 00-F; Compose belongs to 00-I. No early implementation of either.

## MANUAL REVIEW

Reviewed all added/modified source, tests, manifests, config, lockfile and documentation for architecture/ownership, dependency necessity, least privilege, secret exposure, failures/recovery, finite resources, lifecycle leaks, test validity, naming and scope. Browser boundary and import negatives passed. No raw error cause or job payload logging; no BullMQ internal mutation or Redis domain storage. Existing rules/ADRs and historical reports were not rewritten.

Ordinary issues fixed during implementation: producer shutdown needed explicit ownership of its supplied client; permanent errors needed preserved classification after redaction; reconnect behavior gained explicit jitter and terminal closure. Earlier PostgreSQL subprocess timing failures during concurrent fresh-install disk pressure were rerun serially and passed without weakening assertions/timeouts. Final complete run passed after the fixes.

## GIT STATUS

Repository retains its pre-existing unborn/dirty state, intent-to-add files, staged hook and untracked earlier checkpoint files. No commit, staging, reset, remote or push performed. `git status`, diff/stat and file-level review completed; `git diff --check` passed. Git's full diff includes earlier checkpoints, so this report lists only 00-E changes.

## EVIDENCE

- [Dependency review and tracking](00-e-dependency-review.md), [resolved candidate inventory](00-e-dependency-inventory.json)
- [Configuration, lifecycle and cleanup runbook](00-e-redis-bullmq.md)
- [Real Redis/BullMQ assertions](../../tests/redis/foundation.spec.ts), [container harness](../../scripts/test-redis.ts)
- [Configuration/security assertions](../../packages/config/tests/queues.spec.ts), [browser exposure checks](../../tests/browser/configuration.spec.ts)
- Root verification: frozen clean install; `pnpm format:check`; `pnpm lint`; `pnpm typecheck`; `pnpm workspace:check` (8 packages); `pnpm build`; `pnpm test`; `pnpm security:dependencies`; `pnpm security:secrets`; lockfile hash, Git whitespace and exact-label container inventory checks.

## NEXT CHECKPOINT

**00-F - Logging / RequestId / Error Handling / Probes**. Not started. Await explicit owner approval.
