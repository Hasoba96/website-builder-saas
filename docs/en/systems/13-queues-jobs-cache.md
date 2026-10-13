# 13 — Cache, Queues & Background Jobs

> **Rule prefix:** `QJ-` · **Status:** Binding · **Owner:** Backend
> **Governing document:** [`../00-PROJECT-RULES.md`](../00-PROJECT-RULES.md) · **العربية:** [`../../ar/systems/13-queues-jobs-cache.md`](../../ar/systems/13-queues-jobs-cache.md)
> **Implements principle:** `CORE-015` (Async for slow work)

---

## 0. The governing rule

> ### `QJ-001` (MUST NOT)
> **Redis is not a source of truth.** Any data that cannot be rebuilt from PostgreSQL **must never** live in Redis alone.
> Always assume Redis may be wiped entirely at any moment. If that would mean losing customer data, the design is wrong.

---

## 1. Redis uses

**`QJ-010` (MUST):** The exclusively permitted uses:

| Use | Note |
|---|---|
| `domain → site_id` map | The hottest read in the product |
| Hot site config cache | Derived from the DB |
| Rate limiting | Losing it means limits briefly open, not data lost |
| Sessions (if chosen) | Losing it means logout, not data lost |
| BullMQ queues | Critical jobs also have a DB record |
| Short-lived locks and idempotency helpers | — |

**`QJ-011` (MUST):** Every application-owned Redis/cache key has an **explicit TTL**. BullMQ internal keys follow the library's lifecycle instead: configure job retention and resource limits; never impose manual TTLs or manually modify internal keys. Retention is not a claim that every internal key expires by TTL.

**`QJ-012` (MUST):** Application-owned Redis/cache keys carry explicit tenant/site scope for tenant data (`MT-042`), or explicit application ownership for non-tenant data. BullMQ internal keys use an environment/queue namespace through BullMQ's supported prefix mechanism, not a forced literal tenant prefix or incompatible `ioredis.keyPrefix`. Namespacing never replaces tenant ownership checks in real job payloads/workers (`QJ-033`).

BullMQ connections require explicit producer failure and worker reconnect policies, graceful shutdown, and bounded total outage/recovery behavior. Infinite producer retries and `FLUSHALL` are forbidden. Redis remains non-authoritative (`QJ-001`); critical business state must not live in BullMQ alone (`QJ-045`). Stage 00 has no product jobs; a test-only technical queue lifecycle test is permitted when needed to prove the foundation, without fabricated tenant/domain data.

**`QJ-013` (MUST):** A Redis outage **must not take down the product**: reads fall back to the database with rate limiting, critical writes continue, and an alert fires (`DN-053`).

---

## 2. Queues

**`QJ-020` (MUST):** The defined queues:

| Queue | Jobs | Priority |
|---|---|---|
| `ai` | Blueprint, content, image generation | High (a user is waiting) |
| `media` | Optimisation, variants, cleanup | Medium |
| `domains` | Verification, TLS status sync | High |
| `publish` | Snapshot build and publish | **Critical** |
| `notifications` | Email, webhooks, messaging | High |
| `analytics` | Aggregation, rollups | Low |
| `maintenance` | Cleanup, retention, orphan assets | Low |

**`QJ-021` (MUST):** Queue separation is **mandatory**. One queue for everything is forbidden.

> **Why:** A backlog of thousands of analytics jobs must never delay the publish a customer is waiting on right now. Separation protects critical paths from low-priority load.

**`QJ-022` (MUST):** Each queue has a **bounded, tuned worker count**, so no single queue can consume all database connections or memory.

**`QJ-023` (MUST):** Low-priority queues are automatically throttled when shared systems are under load.

---

## 3. Job design

**`QJ-030` (MUST):** Every job is **idempotent** or carries an **idempotency key**.

> **Why:** Re-execution is not an exception — it is normal behaviour. A worker may die after completing the work but before recording success, so the job is retried. Without idempotency: duplicate emails, double billing, a duplicated publish revision.

**`QJ-031` (MUST):** Payloads are **small and referential**: identifiers, not full data.

```ts
// ✅ Correct
{ jobId, organizationId, websiteId, assetId, requestedBy }

// ❌ Wrong: huge payload, stale by execution time, sensitive content in Redis
{ asset: { ...fullBinaryMetadata }, site: { ...entireSnapshot } }
```

**`QJ-032` (MUST):** The worker **reads current state** from the database at execution time and does not treat the payload as present truth.

**`QJ-033` (MUST):** The payload carries tenant scope, and the worker **re-verifies ownership and permission** (`MT-044`).

**`QJ-034` (MUST):** Every job has an **explicit maximum execution time** and is terminated on exceeding it.

**`QJ-035` (MUST NOT):** A job must never spawn an unbounded number of sub-jobs. Fan-out is bounded and measured.

**`QJ-036` (MUST):** Long jobs are split into **resumable batches**, never executed as one block that may fail at the end.

---

## 4. Failure and retry

**`QJ-040` (MUST):** Retries use **exponential backoff** with **jitter** and a maximum attempt count.

> **Why jitter:** without it, every job that failed at the same moment retries at the same moment — hitting the recovering service all at once and taking it down again (thundering herd).

**`QJ-041` (MUST):** Distinguish the two failure kinds:

| Kind | Example | Behaviour |
|---|---|---|
| **Transient** | Network timeout, `503`, rate limit | Retry |
| **Permanent** | Invalid data, deleted resource, denied permission | **No retry** → immediate failure |

> **Why:** Retrying a permanent error ten times wastes resources and delays discovery of the real problem.

**`QJ-042` (MUST):** Final failures go to a **dead-letter queue** with full context.

**`QJ-043` (MUST):** The DLQ is **monitored** and raises alerts. A dead-letter queue nobody looks at means silent failures accumulating.

**`QJ-044` (MUST):** Re-running a job from the DLQ is possible once the cause is fixed.

**`QJ-045` (MUST):** Critical jobs (publish, billing, notifications) have a **status record in the database**, not in Redis alone.

> **Why:** If Redis is wiped, we must still know which publishes were in flight and what became of them. Without a durable record, they vanish without a trace.

---

## 5. Cache

**`QJ-050` (MUST):** The unified key structure (`CORE-6.4`):

```
<scope>:<entity>:<id>[:<qualifier>]

site:config:site_01J:v42
domain:map:example.com
org:usage:org_01J:storage
ratelimit:form:site_01J:1.2.3.4
```

**`QJ-051` (MUST):** Invalidation is **explicit and targeted** when the source changes. Relying on TTL expiry alone means the user sees stale data after editing.

**`QJ-052` (MUST NOT):** Global invalidation (`FLUSHALL` or a broad pattern delete) is forbidden in production.

**`QJ-053` (MUST):** Protect against **cache stampede**: when a hot key expires, only one request rebuilds it while the rest wait or briefly serve the stale value.

> **Why:** Without protection, the expiry of a popular domain key means thousands of concurrent requests hit the database in the same fraction of a second.

**`QJ-054` (MUST NOT):** Never cache sensitive dashboard data under a key that could be shared between tenants (`MT-043`).

**`QJ-055` (MUST):** A cache read failure is treated as a **miss**, never as an error that fails the request.

---

## 6. Locks and concurrency

**`QJ-060` (MUST):** Distributed locks are **short-lived** with a mandatory TTL. A lock without expiry means a resource blocked forever when a worker dies.

**`QJ-061` (MUST):** Only the lock holder releases it (via an ownership token), never another process.

**`QJ-062` (MUST):** Scheduled periodic jobs are protected against **concurrent execution** (a lock or an overlap-skip mechanism).

> **Why:** An aggregation job running twice simultaneously may double the numbers or contend on the same rows.

**`QJ-063` (MUST):** Never rely on a lock as a substitute for idempotent design. Locks reduce collisions; idempotency is the real guarantee.

---

## 7. Anti-patterns

| # | Pattern | Why it is dangerous |
|---|---|---|
| 1 | Redis as a source of truth | Data loss on the first wipe |
| 2 | Application-owned key without TTL | Memory leak until full |
| 3 | One queue for everything | Aggregation delays a customer's publish |
| 4 | Non-idempotent job | Duplicate emails / double billing |
| 5 | Huge payload | Stale data plus Redis pressure |
| 6 | Treating the payload as present truth | Acting on state that has changed |
| 7 | Retry without exponential backoff | Takes down the recovering service |
| 8 | Retry without jitter | Thundering herd |
| 9 | Retrying a permanent error | Wasted resources, delayed discovery |
| 10 | Unmonitored DLQ | Silent failures accumulate |
| 11 | Publish state in Redis only | All trace lost on a wipe |
| 12 | `FLUSHALL` in production | Total performance collapse |
| 13 | No stampede protection | The database is hit all at once |
| 14 | Lock without TTL | A resource blocked forever |
| 15 | Unbounded fan-out | Queue explosion |

---

## 8. Required monitoring

**`QJ-070` (MUST):** Mandatory metrics per queue: queue depth · processing rate · wait time · execution time · failure rate · DLQ depth.

**`QJ-071` (MUST):** Alerts on: queue depth above threshold · a job stuck beyond its timeout · any item in a critical DLQ · failure rate above threshold.

**`QJ-072` (MUST):** Every job execution is logged with `jobId`, `requestId`, and tenant scope (`MT-046`).

---

## 9. Required tests

**`QJ-080` (MUST):** Idempotency test per job: executing twice produces one effect.

**`QJ-081` (MUST):** State-change test: deleting the resource after scheduling but before execution → the job fails gracefully rather than crashing.

**`QJ-082` (MUST):** Failure classification test: a permanent error is not retried; a transient one is retried within the limit.

**`QJ-083` (MUST):** DLQ test: exceeding the attempt limit → the job lands in the DLQ with its context.

**`QJ-084` (MUST):** Invalidation test: after a source edit, the next read **does not** come from stale cache.

**`QJ-085` (MUST):** Redis outage test: critical services keep working.

**`QJ-086` (MUST):** Isolation test: a tenant's job cannot reach another tenant's data (`MT-061`).

---

## 10. Definition of Done — queues & cache

- [ ] No unreconstructable data lives in Redis alone.
- [ ] Application-owned keys have TTLs and ownership scope; BullMQ internals use supported namespaces, lifecycle retention, and resource limits (`QJ-011`, `QJ-012`).
- [ ] The job is on the correct queue for its priority.
- [ ] The job is idempotent or carries an idempotency key.
- [ ] Payload is small and referential; the worker reads current state.
- [ ] The worker re-verifies ownership and permission.
- [ ] Explicit maximum execution time.
- [ ] Exponential backoff + jitter + maximum attempts.
- [ ] Transient and permanent failures distinguished.
- [ ] DLQ configured, monitored, and alerting.
- [ ] Critical jobs have a database status record.
- [ ] Invalidation is explicit and targeted; no global purges.
- [ ] Stampede protection on hot keys.
- [ ] Locks have TTLs and ownership tokens.
- [ ] Fan-out is bounded.
- [ ] Metrics and alerts configured.

---

## 11. What requires an ADR

- Changing the queue system (BullMQ → something else).
- Adding a second message broker (Kafka or similar).
- Using Redis as a source of truth for any data.
- Fundamentally changing the caching strategy.
- Running workers as a fully separate service.

---

## 12. Cross-references

[`05-ai-generation.md`](05-ai-generation.md) · [`06-renderer-publishing.md`](06-renderer-publishing.md) publish queue · [`07-domains-ssl.md`](07-domains-ssl.md) · [`08-assets-media.md`](08-assets-media.md) · [`09-forms-leads.md`](09-forms-leads.md) · [`10-analytics.md`](10-analytics.md) · [`19-observability.md`](19-observability.md) · [`20-performance-caching.md`](20-performance-caching.md)
