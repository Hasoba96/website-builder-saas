# Foundation dependency outage

Scope: Stage 00 API PostgreSQL and Worker Redis owners. Incident contact: project owner; engineering operator gathers sanitized evidence and escalates to the owner. A production on-call destination must be configured before deployment; none is invented here.

## Recognize and contain

- `/health` 200 with `/ready` 503 means the process is alive but its required role is unavailable. A missing Worker listener after terminal Redis outage can mean the existing recovery budget closed the process.
- Stop sending new workload to the unready process. Do not make liveness depend on the database/cache, disable timeouts, expand privileges, or restart in an unbounded loop.
- Never expose dependency topology in probe responses or paste environment/connection strings into tickets. Record service, UTC window, requestId and safe event/code only.

## Verify and recover

1. Check `/health`, then `/ready` on the configured loopback/operational listener. API owns PostgreSQL only; Worker owns Redis only. Next shells own neither.
2. Inspect structured `dependency_unavailable`, `infrastructure_failure`, `startup_failed`, `stopping` and `stopped` records. `CONFIGURATION_INVALID` may identify keys, never secret values. Check the configured bounded timeout and least-privilege account privately.
3. Verify the required service through the approved local/container/operator interface. Do not run migrations as a connectivity repair. Do not flush Redis, change BullMQ internal keys or delete unrelated resources.
4. Restore the dependency. API readiness can recover automatically after its bounded check/cache interval. Restart a Worker that exited after recovery-budget exhaustion, then verify both probes and `started`/`ready`. Stop and escalate if safe restart fails or compromise/data loss is suspected.
5. Record sanitized cause and corrective action; customer-impacting incidents require the later production incident process. Never infer durable business recovery from Redis availability alone.

## Rehearsal evidence

`pnpm test:database` pauses only the harness-owned PostgreSQL container, proves liveness 200/readiness 503 within deadline, and unpauses/cleans it. `pnpm test:redis` pauses only its own Redis fixture, proves Worker liveness/readiness separation, terminal bounded shutdown, new-owner recovery and cleanup. Both suites use real Linux containers and verify redaction. Abrupt-host cleanup follows the exact names/labels in the [database](../checkpoints/00-d-postgresql.md) and [Redis](../checkpoints/00-e-redis-bullmq.md) runbooks. No wildcard deletion.

This is a tested local foundation procedure, not a claim that production paging, failover, backup recovery or an external monitoring provider is active.
