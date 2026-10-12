# 00-E Redis and BullMQ foundation

## Scope and ownership

PostgreSQL remains the only system of record. Redis contains disposable infrastructure state, not authoritative business records. No domain jobs, product queues, queue UI, HTTP probes, cache repository, or new provider exist. `packages/queues` owns Redis/BullMQ lifecycle. Worker consumes connectivity only; test processors exist exclusively in `tests/redis`. API still depends on PostgreSQL, not Redis; its boot regression deliberately supplies an unreachable Redis port.

`packages/schemas/queues` defines the configuration contracts once. `packages/config/worker` exposes `readRedisConfig` and `readQueueConfig`; web/API config APIs do not expose them. The public allowlist remains empty. Package exports reject browser resolution and import-boundary tests block queue/client internals in other applications. Worker gets only explicitly named Redis variables through Turbo's dev task. Browser verification strips actual Redis/queue credentials from its environment.

## Versions and commands

- Redis 7.2.16, official Linux Alpine image pinned by digest in `scripts/test-redis.ts`. Supported BSD-licensed branch; not a permanent hosting decision.
- BullMQ 6.3.10 with ioredis 6.0.0, RESP2 explicitly selected for established BullMQ wire semantics. No alternate backend/client selected.
- `pnpm test:redis`: builds Worker dependencies, creates an isolated Redis container, runs actual queue/failure tests, removes fixture.
- `pnpm test:database`: unchanged PostgreSQL-only suite.
- `pnpm test`: Redis suite, PostgreSQL suite, workspace/root tests and browser regressions. Docker Desktop Linux engine required; credentials generated in memory.
- `pnpm --filter @website-builder/worker dev`: uses ignored `apps/worker/.env` and an operator-provided Redis endpoint. `.env.example` lists required connectivity settings; replace its rejected password placeholder locally. No native installation or Compose setup is introduced. The test harness is the reproducible 00-E local verification path and does not leave a development service running.

## Configuration

Process environment overrides native Node `.env` loading as in 00-C. Config parsing precedes successful Worker startup. Missing required values, unknown enums, malformed numbers and unsafe plaintext connections fail with key names only, never supplied values. No Redis URL or second configuration path.

| Key                           | Accepted range/meaning                                                               | Explicit local test value             |
| ----------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------- |
| `NODE_ENV`, `APP_ENV`         | Existing 00-C environment model                                                      | `test`, `ci`                          |
| `REDIS_HOST`, `REDIS_PORT`    | IP/hostname; integer 1-65535                                                         | Loopback; Docker ephemeral port       |
| `REDIS_USERNAME`              | Lowercase identifier, <=64 characters                                                | `worker`                              |
| `REDIS_PASSWORD`              | Required, <=4096 chars; no NUL or `REPLACE_ME`                                       | Generated, never persisted in reports |
| `REDIS_TLS`, `REDIS_CA`       | `disable` only local/CI loopback; otherwise `verify-full`; optional CA only with TLS | `disable`, CA absent                  |
| `REDIS_CONNECT_TIMEOUT_MS`    | 100-10000                                                                            | 1000                                  |
| `REDIS_COMMAND_TIMEOUT_MS`    | 100-10000                                                                            | 1000                                  |
| `REDIS_OUTAGE_TIMEOUT_MS`     | 500-30000                                                                            | 2500                                  |
| `REDIS_RECONNECT_LIMIT`       | 0-10 total retries per owner, shared by its duplicated connections                   | 3                                     |
| `REDIS_RECONNECT_DELAY_MS`    | 50-2000 seed, exponential ceiling capped at 2000; jitter samples 50-100% of ceiling  | 100                                   |
| `SHUTDOWN_TIMEOUT_MS`         | Existing 100-30000 contract; production requires explicit value                      | 3000                                  |
| `QUEUE_NAMESPACE`             | Lowercase kebab identifier, <=48 chars                                               | Unique per test                       |
| `QUEUE_ATTEMPTS`              | 1-5 total attempts                                                                   | 3                                     |
| `QUEUE_BACKOFF_MS`            | 100-10000, exponential with 0.5 jitter                                               | 100                                   |
| `QUEUE_RETENTION_COUNT`       | 1-1000 each for completed and failed history                                         | 2                                     |
| `QUEUE_RETENTION_AGE_SECONDS` | 1-86400                                                                              | 60                                    |
| `QUEUE_CONCURRENCY`           | 1-10 per consumer                                                                    | 1                                     |
| `QUEUE_JOB_TIMEOUT_MS`        | 100-30000                                                                            | 1000                                  |

Redis fields are required except CA. Queue fields are required only by the actual queue consumer (currently tests), not connectivity-only Worker. These are bounded foundation settings, not production sizing. Future additions follow the existing schema/config boundary and require validation, failure, redaction and exposure tests.

## Connections, failures and shutdown

Connectivity owner uses one ioredis connection and a bounded PING heartbeat. Producer owns one command connection plus its BullMQ Queue. Consumer owns one command connection and BullMQ owns the additional blocking connection. No QueueEvents connection is needed. Every owner must be closed; repeated close shares the same result. Startup failure closes resources and produces a nonzero application exit.

Producer: offline queuing disabled, no automatic command replay, `maxRetriesPerRequest=0`, explicit command deadline. An enqueue timeout can be ambiguous: Redis might have accepted it. Never blindly repeat with a new ID. Worker connections use BullMQ-required `maxRetriesPerRequest=null`, **not an unlimited recovery policy**: finite reconnect count, finite socket silence, and a wall-clock recovery deadline close the owner. This conservative owner-lifetime budget starts at its first connection/heartbeat failure and is not reset by intermittent recovery; after exhaustion create a new owner only through explicit bounded process supervision. No automatic process restart loop exists here.

Socket silence limit is `max(2000, REDIS_COMMAND_TIMEOUT_MS)`; blocking drain interval is 0.5 seconds. Detection time plus outage timeout plus shutdown deadline bounds total failure handling. Heartbeat interval equals command timeout. Normal shutdown requests cancellation of cooperative test work, closes BullMQ's blocking connection, and disconnects the explicitly owned command client. Worker process adds its existing hard exit deadline. Errors crossing the boundary have fixed messages with no driver cause, connection string, parameters or payload. Permanent processor failures retain their class but not their original message.

Queue processors must observe the supplied `AbortSignal`. The current asynchronous test processors prove cancellation and deadline behavior. In-process JavaScript cannot preempt a CPU-bound or noncooperative processor: such product processors are **not supported by this foundation contract** and must use bounded isolated execution when introduced under QJ-034. No claim of arbitrary-code termination or product processor readiness is made.

## Queue lifecycle

Prefix: `website-builder:<APP_ENV>:<QUEUE_NAMESPACE>` through BullMQ's supported `prefix`, never ioredis `keyPrefix`. Queue names use kebab-case singular; technical test queue is `technical`. Job names follow `<domain>.<action>` and all current names begin `foundation.` inside tests. IDs are required, lowercase, bounded and contain no colon. Namespace is infrastructure ownership, not a substitute for future tenant authorization.

Completed and failed history use BullMQ `removeOnComplete/removeOnFail` age **and** count. Cleanup is lazy on subsequent job completion/failure, not TTL on internal keys. Events stream has an approximate max length of 1000. Redis test instance uses `noeviction`, 96 MiB Redis memory, 64 clients, 256 MiB container memory, one CPU and 64 PIDs. No unbounded history, manual internal mutation, broad key deletion or flush command.

Retry attempts are separate from connection retries. Transient errors retry with bounded exponential jitter; `UnrecoverableError` fails immediately. Failed jobs remain in the bounded BullMQ failed set, the technical dead-letter inspection surface; no product DLQ routing, alerting or re-execution endpoint exists yet. `inspect` and `counts` are internal non-HTTP diagnostic methods, not product contracts. Never log their result payloads.

BullMQ's retained `jobId` suppresses duplicates in one queue namespace. Removal/expiry removes that deduplication protection. Delivery is at least once, **not exactly once**. Future sensitive jobs must persist authoritative status/idempotency in PostgreSQL, carry minimal IDs, revalidate tenant/resource authorization at execution, enforce timeouts, classify failures, provide controlled recovery and add real negative tests. No business correctness may rely on Redis durability.

## Disposable fixtures and recovery

Unique name `wbp-00e-<UUID>`, label `website-builder.test=00-e`, loopback ephemeral published port. Read-only filesystem, UID/GID 999, all capabilities dropped, no-new-privileges, tmpfs data, persistence disabled. Random password is only in child process memory/environment; mounted temporary config contains its SHA-256 ACL hash, not plaintext. Default user disabled. Runtime ACL scopes keys/channels to the owned CI namespace, permits required BullMQ data/Lua/INFO operations, and denies administration, arbitrary CLIENT operations and unrelated keys. These ACL checks are integration tested. No production credentials or account provisioning.

Tests pause/unpause only the exact validated fixture name to simulate blackholes. Normal success/failure and handled signals remove the exact container and generated file. Host termination can bypass cleanup: inspect `docker ps -a --filter label=website-builder.test=00-e`, confirm name/label/mount ownership, then remove only that exact fixture and temporary ACL file. Never delete unrelated containers, volumes, or wildcard keys. PostgreSQL fixtures retain their separate 00-D label and cleanup behavior.

## Limits and deferred work

No deployed TLS endpoint or OS-wide container CVE scan is claimed. Verified TLS options and unsafe-config rejection are tested; deployment certificate/ACL policy must be verified against its chosen environment later. No shared Redis cache exists, so application-owned cache TTL/invalidation, tenant-cache isolation and domain recovery tests are N/A, not PASS. Cross-tenant runtime tests remain N/A under ADR-001. No Product Jobs, auth, DB model changes, queues HTTP API, 00-F probes/metrics, 00-I infrastructure or new external service.
