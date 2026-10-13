# 19 — Observability & Operations

> **Rule prefix:** `OB-` · **Status:** Binding · **Owner:** DevOps / SRE
> **Governing document:** [`../00-PROJECT-RULES.md`](../00-PROJECT-RULES.md) · **العربية:** [`../../ar/systems/19-observability.md`](../../ar/systems/19-observability.md)

---

## 0. The governing rule

> **What you cannot see, you cannot fix.**
> And in a multi-tenant product the question is not "is the system up?" but **"is it up for this particular customer?"** — which requires everything to carry tenant context.

---

## 1. Logs

**`OB-001` (MUST):** **Structured JSON** logs only. Unparseable free text is forbidden.

**`OB-002` (MUST):** Mandatory fields on every line, subject to the identity-context applicability below:

When tenant/site/user context naturally does not exist (startup, shutdown, `/health`, `/ready`, or infrastructure lifecycle), identity fields (`organizationId`, `siteId`, `userId`) are `null` or absent according to the approved logging schema. Never fabricate synthetic tenant/user identifiers. Real identity fields are mandatory when that context exists; `requestId` and privacy requirements remain unchanged.

```json
{
  "timestamp": "2026-09-15T10:12:00.123Z",
  "level": "info",
  "service": "api",
  "environment": "production",
  "requestId": "req_01J...",
  "organizationId": "org_01J...",
  "siteId": "site_01J...",
  "userId": "usr_01J...",
  "message": "publish completed",
  "durationMs": 412
}
```

**`OB-003` (MUST NOT):** **Forbidden** in logs: passwords · tokens · keys · card data · lead content · section content · any PII (`CORE-081`, `AU-060`).

**`OB-004` (MUST):** Automatic redaction in the logger for anything resembling a secret (`SE-045`). Redaction is **the default**, not opt-in.

> **Why automatic:** relying on every developer remembering on every log line is guaranteed to fail. Redaction at the layer works despite human error.

**`OB-005` (MUST):** `requestId` is generated at the request edge and propagated through **every** layer — queue jobs included (`QJ-072`).

**`OB-006` (MUST):** Log levels used with discipline:

| Level | When |
|---|---|
| `error` | A failure requiring human intervention |
| `warn` | A noteworthy anomaly from which the system recovered |
| `info` | Significant business events (publish, domain activated, subscription changed) |
| `debug` | Diagnostic detail — **off in production** |

**`OB-007` (MUST NOT):** Never log `error` for an expected condition (validation failure, resource not found). It floods the logs and hides real failures.

---

## 2. Metrics

**`OB-010` (MUST):** Mandatory metrics:

**System level**
Request rate · error rate (4xx and 5xx separately) · latency (p50/p95/p99) · database connections in use vs limit · memory and CPU consumption

**Queue level** (`QJ-070`)
Queue depth · wait time · execution time · failure rate · DLQ depth

**Business level**
Publish duration · publish success rate · AI generation success/failure · AI cost · domain verification rate · cache hit ratio · lead intake rate

**`OB-011` (MUST):** Latency is measured at **p95 and p99**, never as an average.

> **Why:** Averages hide suffering. A 200ms average with a p99 of 8 seconds means 1% of every user's requests are painfully slow — and that is what the customer remembers and complains about.

**`OB-012` (MUST):** Metrics carry useful dimensions (service, route, outcome) **without cardinality explosion**.

**`OB-013` (MUST NOT):** **Never** use `organizationId` or `siteId` as a metric label.

> **Why:** Hundreds of thousands of unique values will take down any metrics system. Tenant context belongs in logs and traces, not in metrics.

---

## 3. Tracing and error tracking

**`OB-020` (SHOULD):** Distributed tracing (OpenTelemetry) for complex journeys: publishing · AI generation · media processing.

**`OB-021` (MUST):** Error tracking (Sentry or equivalent) enabled on frontend and backend.

**`OB-022` (MUST):** Frontend errors are linked to the session's `requestId` where possible.

**`OB-023` (MUST):** Error grouping is tuned so one repetitive type does not drown out the rest.

---

## 4. Service level objectives

**`OB-030` (MUST):** The initial objectives:

| Indicator | Target |
|---|---|
| Published site availability | **≥ 99.9%** after stabilisation |
| API latency (p95) | **< 500ms** for normal operations (excluding async starts) |
| Publish request acceptance | Fast response; completion monitored |
| Queue failure | **< 1%** for normal jobs after retries |
| Cache hit ratio | Rising for published sites with repeat traffic |

**`OB-031` (MUST):** **Published site** availability takes priority over dashboard availability.

> **Why:** A broken dashboard inconveniences our customers for an hour. A broken published site harms **our customers' customers** — and that is what destroys trust permanently.

**`OB-032` (MUST):** SLOs are actually measured and displayed, not numbers in a document.

---

## 5. Alerting

**`OB-040` (MUST):** Alert on **user impact**, never on a raw metric.

```
❌ Bad alert: "CPU usage exceeded 80%"
     May be entirely normal. Says nothing about anyone being harmed.

✅ Good alert: "5xx error rate on published sites > 1% for five minutes"
     Means real visitors are seeing broken pages right now.
```

**`OB-041` (MUST):** Critical alerts (waking a human):

- Published sites not being served (direct impact on our customers' customers)
- 5xx error rate above threshold
- Database unavailable or connections exhausted
- Publish queue stalled or growing without bound
- Payment webhooks failing (this is **money**)
- TLS certificate approaching expiry (`DN-041`)
- AI spend cap exceeded (`AI-053`)
- **Any indication of cross-tenant access** ← the highest priority of all

**`OB-042` (MUST):** Non-critical alerts go to a reviewed channel and wake nobody.

**`OB-043` (MUST NOT):** **No** recurring alert that nobody acts on.

> **Why:** Alert fatigue kills response. A team habitually ignoring alerts will not notice the real one when it arrives. **An alert that prompts no action is an alert to delete.**

**`OB-044` (MUST):** Every critical alert links to a **runbook** explaining: what it means · how to verify · first steps · when to escalate.

---

## 6. Dashboards and runbooks

**`OB-050` (MUST):** A "platform health" dashboard answering in 10 seconds: are we OK? Covering site availability, error rate, latency, queue depth, database health.

**`OB-051` (MUST):** A diagnostic dashboard per subsystem (publishing, AI, domains, media).

**`OB-052` (MUST):** Runbooks in `docs/runbooks/` for every anticipated scenario: database down · Redis down · AI provider down · queue backlog · publish failure · expired certificate · suspected cross-tenant access.

**`OB-053` (MUST):** Runbooks are **actually rehearsed**, not written theoretically. A runbook never once tested is probably wrong.

---

## 7. Incident response

**`OB-060` (MUST):** A defined incident contact and a clear escalation path.

**`OB-061` (MUST):** The mandatory order: **contain first, diagnose second.** Stop the bleeding before understanding its cause.

**`OB-062` (MUST):** Every customer-affecting incident gets a **written root cause analysis** within a defined window.

**`OB-063` (MUST):** The analysis is **blameless** and focuses on what prevents recurrence: a new rule, a test, an alert, or a process change.

> **Why blameless:** a blame culture means hidden mistakes, and a hidden mistake recurs. The goal is a system that does not permit the error, not a person to punish.

**`OB-064` (MUST):** Every incident produces an **actionable item** tracked to closure. An incident with no change is an incident that will recur.

---

## 8. Anti-patterns

| # | Pattern | Why it is dangerous |
|---|---|---|
| 1 | Unstructured text logs | Unsearchable and unanalysable |
| 2 | PII or secrets in logs | Data leakage and a compliance breach |
| 3 | Manual redaction relying on memory | Guaranteed to fail |
| 4 | No `requestId` | Diagnosis becomes near-impossible |
| 5 | `error` for an expected condition | Flooding that hides real failures |
| 6 | `debug` enabled in production | Cost plus leakage risk |
| 7 | Measuring averages instead of p95/p99 | Hides real suffering |
| 8 | `organizationId` as a metric label | Cardinality explosion takes down the system |
| 9 | Alerting on CPU rather than user impact | Meaningless noise |
| 10 | Alerts nobody acts on | Fatigue, then ignoring the real one |
| 11 | A critical alert with no runbook | Panic during an incident |
| 12 | An untested runbook | Probably wrong when needed |
| 13 | An incident with no root cause analysis | Certain to recur |
| 14 | Blameful analysis | Hidden mistakes that recur |

---

## 9. Definition of Done — observability

- [ ] Structured JSON logs with all mandatory fields.
- [ ] No PII and no secrets; redaction is automatic.
- [ ] `requestId` propagated through every layer and queue.
- [ ] Log levels used with discipline; `debug` off in production.
- [ ] System, queue, and business metrics configured.
- [ ] Latency at p95/p99, not average.
- [ ] No high-cardinality metric dimensions.
- [ ] Error tracking enabled on both sides.
- [ ] Alerts on user impact; only critical ones wake anyone.
- [ ] Every critical alert has a rehearsed runbook.
- [ ] The platform health dashboard works.
- [ ] Post-deploy observability check performed (`IN-045`).
- [ ] The escalation path is defined.

---

## 10. What requires an ADR

- Changing the monitoring or error tracking provider.
- Adopting full distributed tracing.
- Formally changing SLO targets.
- Sending any diagnostic data to a new third party.

---

## 11. Cross-references

Every system. Most closely related: [`06`](06-renderer-publishing.md) · [`07`](07-domains-ssl.md) · [`11`](11-billing-entitlements.md) · [`13`](13-queues-jobs-cache.md) · [`14`](14-security.md) · [`18`](18-infrastructure-cicd.md) · [`20`](20-performance-caching.md) · [`21`](21-backup-dr-retention.md)
