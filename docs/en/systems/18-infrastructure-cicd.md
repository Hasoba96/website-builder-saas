# 18 — Infrastructure, Deployment & CI/CD

> **Rule prefix:** `IN-` · **Status:** Binding · **Owner:** DevOps
> **Governing document:** [`../00-PROJECT-RULES.md`](../00-PROJECT-RULES.md) · **العربية:** [`../../ar/systems/18-infrastructure-cicd.md`](../../ar/systems/18-infrastructure-cicd.md)

---

## 1. MVP topology

```
Cloudflare  (DNS · CDN · WAF · TLS · Cloudflare for SaaS)
        │
        ├── Dashboard (Next.js)
        ├── Public Renderer (Next.js)
        └── API (NestJS)
                │
      ┌─────────┼───────────┐
      │         │           │
 PostgreSQL   Redis    Object Storage (R2)
      │         │
      │      Workers (BullMQ)
      │
 Managed backups
```

**`IN-001` (MUST NOT):** **No container and no VM per tenant** (`CORE-012`). Resources are shared with fair limits.

**`IN-002` (MUST):** Every service builds as a deployable container with no persistent local state (stateless).

> **Why:** A stateless service can be restarted, cloned, or relocated without losing anything — a precondition for horizontal scaling later.

**`IN-003` (MUST):** API processes are separate from workers. Running background jobs inside the API process is **forbidden**.

> **Why:** A heavy job consuming memory takes down API responsiveness for every user. Separation contains the damage.

**`IN-004` (MUST):** Every service exposes `/health` (alive) and `/ready` (ready to receive traffic), with genuinely different meanings. These are operational infrastructure probes, not product/business APIs; they remain unversioned and are explicitly exempt from the `/api/v1/` prefix under `API-010`. No other endpoint is introduced by this exception.

**`IN-005` (MUST):** Graceful shutdown: finish in-flight requests and current jobs before exiting, within a defined timeout.

---

## 2. Configuration and secrets

**`IN-010` (MUST):** **12-factor** configuration: everything from environment variables.

**`IN-011` (MUST):** Configuration validated against a schema **at startup**, failing loudly and immediately on a missing requirement (`CORE-071`).

> **Why:** A service that starts with incomplete configuration crashes later, in the middle of a user operation — where diagnosis is far harder than a clear startup failure.

**`IN-012` (MUST):** Complete secret separation between `local` / `staging` / `production`. Sharing is **forbidden**.

**`IN-013` (MUST):** `.env.example` always current (`CORE-072`).

**`IN-014` (MUST NOT):** No production credentials on developer machines (`SE-044`).

**`IN-015` (MUST):** Secret rotation is possible **without downtime** (supporting two valid keys during transition).

---

## 3. Environments

```
Local → CI → Preview → Staging → Production
```

**`IN-020` (MUST):** `staging` is **structurally identical** to production (same services and versions), even at a different scale.

**`IN-021` (MUST NOT):** **No real production data** in any non-production environment.

> **Why:** Customer data in staging is an additional leak surface in a less-protected environment — and a legal obligation we do not want.

**`IN-022` (MUST):** Test data is generated or irreversibly anonymized.

**`IN-023` (MUST):** Per-PR preview environments are **isolated** and never touch production data.

---

## 4. The CI pipeline

**`IN-030` (MUST):** Runs on every PR, and all of it is **mandatory** before merge:

```
1. Install with --frozen-lockfile
2. Lint
3. tsc --noEmit  (type check)
4. Unit tests
5. Integration tests
6. Security test suite (including cross-tenant)   ← critical
7. Secret scanning
8. Dependency vulnerability scanning
9. Module boundary + circular dependency checks
10. Build
11. Bundle size budget
12. Accessibility tests
13. Visual regression (RTL + LTR)
```

> **Stage 00 applicability of `IN-030`:** Only cross-tenant runtime tests are N/A while no tenant-capable domain surface exists, under [ADR-001](../../adr/ADR-001-stage-00-cross-tenant-test-applicability.md). All other applicable checks remain required. N/A is recorded explicitly, never as a passing or skipped fake test. Stage 01's first tenant-capable code must include the suite.

> **Dependency evidence for `IN-030`:** Retain the complete direct/transitive inventory and graph diff, execution/shipping classification, dated vulnerability/license/integrity/source review results, direct-age exceptions where required, and finding dispositions with owner, approval, and current tracking deadlines/event-driven re-evaluation under [CORE-002](../00-PROJECT-RULES.md). Include dev/test and optional/platform paths; missing required evidence or expired/inapplicable acceptance prevents merge. All hard blockers and the High/Critical gate remain unchanged. This evidence requirement does not remove any CI check.

**`IN-031` (MUST NOT):** **Never merge with red CI** (`CORE-046`).

**`IN-032` (MUST):** Flaky tests are fixed or quarantined **immediately**.

> **Why:** One flaky test teaches the team to ignore red — and after that nobody notices the real failure.

**`IN-033` (MUST):** CI time stays reasonable (**< 15 minutes** for the full path). Slower than that gets parallelised or split.

**`IN-034` (MUST):** CI builds **once** and promotes the same artifact across environments. Rebuilding per environment is forbidden.

> **Why:** Rebuilding means what was tested in staging is not exactly what was deployed to production.

---

## 5. Deployment

**`IN-040` (MUST):** Deployment is **automated** from `main` after all checks pass.

**`IN-041` (MUST):** Deployment is **rollback-able** with a single fast command.

**`IN-042` (MUST):** Rolling deployment with no downtime, gated by readiness checks.

**`IN-043` (MUST):** Migrations are applied **before** deploying the code that needs them, and are backward-compatible with the previous version (`DM-033`).

> **Why:** During a rolling deploy both versions run together for minutes. A backward-incompatible migration breaks the old instances still serving users.

**`IN-044` (MUST):** High-risk features sit behind feature flags (`CORE-050`).

**`IN-045` (MUST):** After every deploy: a **real observability check** (error rate, latency, queue depth) before declaring it successful.

**`IN-046` (MUST):** A rollback plan is written in every PR (`CORE-043`).

**`IN-047` (MUST NOT):** **No** manual, unrecorded deployment to production. Every deploy is automated and logged.

---

## 6. Infrastructure as code

**`IN-050` (MUST):** Once the MVP stabilises, infrastructure configuration lives **as code** in `/infra` under Git review.

**`IN-051` (MUST NOT):** No unrecorded manual production changes. An unrecorded manual change makes rebuilding the environment impossible in a disaster.

**`IN-052` (MUST):** Explicit resource limits (CPU/memory) per service, especially workers.

**`IN-053` (MUST):** Database connection pool sizes are calculated and capped per service, so the services combined cannot exhaust the connection limit.

> **Why:** Connection exhaustion means everything stops at once — one of the most common causes of total outage in this architecture.

---

## 7. Anti-patterns

| # | Pattern | Why it is dangerous |
|---|---|---|
| 1 | A container per tenant | Cost grows linearly — does not scale |
| 2 | Workers inside the API process | A heavy job takes down the API for everyone |
| 3 | Local state in a service | Blocks horizontal scaling |
| 4 | Configuration unvalidated at startup | A later crash that is harder to diagnose |
| 5 | Production data in staging | Leak surface plus legal exposure |
| 6 | Merging with red CI | Accumulated breakage in `main` |
| 7 | Tolerating flaky tests | The team ignores all red signals |
| 8 | Rebuilding per environment | What ships is not what was tested |
| 9 | Backward-incompatible migration | Breakage during rolling deploy |
| 10 | Unrecorded manual deploy | Nobody knows what runs in production |
| 11 | No resource limits | One service starves the rest |
| 12 | Unbounded connection pools | Connection exhaustion means total outage |
| 13 | Manual production changes | Impossible to rebuild in a disaster |
| 14 | Shared secrets across environments | Breaching staging breaches production |

---

## 8. Definition of Done — infrastructure & CI/CD

- [ ] The service is stateless and deployable as a container.
- [ ] `/health` and `/ready` implemented with distinct meanings.
- [ ] Graceful shutdown within a defined timeout.
- [ ] Configuration validated at startup with an explicit failure.
- [ ] `.env.example` current.
- [ ] Secrets separated per environment and rotatable without downtime.
- [ ] All thirteen CI checks green.
- [ ] No flaky tests.
- [ ] One build promoted across environments.
- [ ] Migration backward-compatible and applied before the code.
- [ ] High-risk features behind a flag.
- [ ] Deployment is rollback-able, with the plan written in the PR.
- [ ] Post-deploy observability check performed.
- [ ] Resource limits and pool sizes calculated.
- [ ] No production data outside production.

---

## 9. What requires an ADR

- Changing the hosting or CDN provider.
- Moving to Kubernetes or an orchestration platform.
- Adding a second geographic region.
- Changing the deployment strategy.
- Adding a new permanent environment.

---

## 10. Cross-references

[`02-data-model.md`](02-data-model.md) migrations · [`07-domains-ssl.md`](07-domains-ssl.md) · [`13-queues-jobs-cache.md`](13-queues-jobs-cache.md) workers · [`14-security.md`](14-security.md) · [`19-observability.md`](19-observability.md) · [`21-backup-dr-retention.md`](21-backup-dr-retention.md) · [`22-testing.md`](22-testing.md)
