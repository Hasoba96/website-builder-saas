# 21 — Backup / Disaster Recovery / Data Retention

> **Rule prefix:** `BR-` · **Status:** Binding · **Owner:** DevOps
> **Governing document:** [`../00-PROJECT-RULES.md`](../00-PROJECT-RULES.md) · **العربية:** [`../../ar/systems/21-backup-dr-retention.md`](../../ar/systems/21-backup-dr-retention.md)

---

## 0. The governing rule

> ### `BR-001` (MUST)
> **A backup whose restore has never been tested is not a backup.**
> "Backups are enabled" is not a recovery plan. **A rehearsed restore** is the plan.

**Why:** Many companies have discovered — only on the day of the disaster — that their backups were empty, encrypted with a lost key, missing a table, or would take 30 hours to restore. Periodic testing is the difference between a real plan and a comfortable illusion.

---

## 1. Backups

**`BR-010` (MUST):** Automated PostgreSQL backups plus **point-in-time recovery (PITR)** where the provider supports it.

**`BR-011` (MUST):** A documented retention schedule: daily · weekly · monthly, with explicitly defined durations.

**`BR-012` (MUST):** Backups are **encrypted in transit and at rest**, with encryption keys managed separately from the backups themselves.

**`BR-013` (MUST):** Backups are stored in a **location separate** from the primary database.

> **Why:** A backup on the same host or in the same region does not protect you from the event that destroys the original.

**`BR-014` (MUST):** **A periodic restore test (at least quarterly)** in a separate environment, with the **actual elapsed time documented**.

**`BR-015` (MUST):** Backup access is least-privilege, and every access is logged.

**`BR-016` (MUST):** Object storage (R2): a versioning or retention policy set by cost and need, explicitly documented.

---

## 2. Recovery objectives

**`BR-020` (MUST):** RPO and RTO are **formally defined and written down** before major commercial launch.

| Term | Meaning | The question it answers |
|---|---|---|
| **RPO** | Recovery Point Objective | How much data are we willing to lose? |
| **RTO** | Recovery Time Objective | How long are we willing to be down? |

**`BR-021` (MUST):** Both are **measured by testing**, never estimated by intuition.

**`BR-022` (MUST):** If a test exceeds the objective, either the mechanism improves or **the objective is honestly revised**. An unrealistic number in a document is worse than no number.

**`BR-023` (MUST):** A recovery plan documented in `docs/runbooks/` answering: who decides to restore · the steps in order · how we verify integrity afterwards · how we communicate with customers.

---

## 3. Retention policies

**`BR-030` (MUST):** Every data type has an explicit retention policy:

| Type | Initial retention | Note |
|---|---|---|
| Application logs | 30–90 days | Contains no PII to begin with (`OB-003`) |
| `audit_logs` | ≥ 1 year | Legal and security obligation |
| Raw analytics events | 30–90 days | Cleaned after aggregation (`AN-045`) |
| Analytics aggregates | Per plan (`analytics_history_days`) | — |
| Leads | Per plan (`leads_retention_days`) | Personal data |
| Published revisions | Last N (≥ 10) (`RP-022`) | For rollback |
| Draft checkpoints | A short window | — |
| Deleted assets | Grace period then hard delete (`AS-052`) | — |
| Backups | Per `BR-011` | — |

**`BR-031` (MUST):** Retention deletion is **automated in a maintenance job**, never manual and never left to memory.

**`BR-032` (MUST):** The retention policy is **implemented in code**, not merely described on a privacy policy page.

> **Why:** A written, unimplemented policy is a legal commitment we breach daily — worse than having no policy at all.

**`BR-033` (MUST):** Data minimisation is a general principle: what we do not need, we do not collect (`CORE-080`).

---

## 4. Deletion

**`BR-040` (MUST):** The mandatory deletion path:

```
Deletion request
    ↓
Soft delete (deleted_at) + immediate hiding from the user
    ↓
Documented grace period (recovery possible)
    ↓
Scheduled hard delete across all systems
    ↓
Deletion completion recorded
```

**`BR-041` (MUST):** Hard deletion covers **every** system: database · object storage · cache · analytics store · any derived copy.

> **Why:** Deleting only from the database leaves the customer's images on the CDN and their data in analytics — so neither the deletion nor the obligation is fulfilled.

**`BR-042` (MUST):** Account deletion clearly distinguishes **soft delete with a grace period** from **scheduled hard deletion** (`CORE-083`).

**`BR-043` (MUST):** The user is clearly informed: what will be deleted · when · and how to recover within the grace period.

**`BR-044` (MUST):** Data export is available **before** deletion (sites, leads, assets).

**`BR-045` (MUST NOT):** **Never** delete data on plan downgrade or cancellation (`BE-033`).

**`BR-046` (MUST):** Hard deletion is recorded in `audit_logs` with its scope and timestamp.

---

## 5. Operational continuity

**`BR-050` (MUST):** Critical dependencies are identified, each with a **defined degradation behaviour**:

| Dependency | On failure |
|---|---|
| PostgreSQL | Cached sites keep serving; writes fail gracefully; critical alert |
| Redis | Fall back to the database with rate limiting; alert (`DN-053`) |
| Object storage | Existing images from the CDN; uploads disabled with a clear message |
| AI provider | Circuit breaker + clear message (`AI-024`) |
| Payment provider | Grace period protects customers (`BE-031`) |
| Email provider | Queue + retry + DLQ (`FL-032`) |

**`BR-051` (MUST):** **No single point of failure takes down published sites** where it can be avoided — this is the highest availability priority (`OB-031`).

**`BR-052` (MUST):** Degradation behaviour is **actually tested**, not assumed (`DN-066`, `QJ-085`).

---

## 6. Anti-patterns

| # | Pattern | Why it is dangerous |
|---|---|---|
| 1 | Backups with no restore test | Discovering the failure on disaster day |
| 2 | Backups colocated with the original | No protection from the event that destroys it |
| 3 | Unencrypted backups | Total leakage on unauthorised access |
| 4 | Encryption key stored with the backup | Encryption without meaning |
| 5 | RPO/RTO by intuition | Promises that cannot be kept |
| 6 | An unimplemented retention policy | A daily legal breach |
| 7 | Deleting from the database only | Data persists in storage and analytics |
| 8 | Immediate deletion with no grace | Irreversible loss from a misclick |
| 9 | Deleting data on downgrade | Loss plus legal exposure |
| 10 | No export before deletion | Holding the customer's data hostage |
| 11 | No defined degradation behaviour | Panic during an outage |
| 12 | Untested degradation behaviour | Fails exactly when needed |
| 13 | Unbounded backup growth | Cost creeping unnoticed |

---

## 7. Tests and exercises

**`BR-060` (MUST):** A documented quarterly restore exercise: actual elapsed time · what worked · what failed · what changed afterwards.

**`BR-061` (MUST):** Retention job test: data past its window is actually deleted, and data within its window **is not**.

**`BR-062` (MUST):** Full deletion test: deleting an account → no residue in the database, storage, cache, or analytics.

**`BR-063` (MUST):** Grace-period recovery test: a soft-deleted account can be fully restored.

**`BR-064` (MUST):** Degradation test per critical dependency.

---

## 8. Definition of Done — backup & retention

- [ ] Automated backups enabled with PITR where supported.
- [ ] Backups encrypted, keys held separately.
- [ ] Backups in a separate location.
- [ ] Restore test rehearsed with its duration documented.
- [ ] RPO and RTO written down and measured by testing.
- [ ] Recovery plan in `docs/runbooks/`.
- [ ] Every data type has a retention policy implemented in code.
- [ ] Retention jobs automated and tested.
- [ ] Deletion: soft → grace → hard across all systems.
- [ ] Recovery within the grace period is possible and tested.
- [ ] Export available before deletion.
- [ ] No deletion on plan downgrade.
- [ ] Degradation behaviour defined and tested per dependency.
- [ ] Hard deletion recorded in `audit_logs`.

---

## 9. What requires an ADR

- Changing the backup strategy or its provider.
- Formally changing RPO or RTO.
- Changing any retention duration (especially for personal data).
- Moving backups to another geography.
- Adding a second recovery region.

---

## 10. Cross-references

[`02-data-model.md`](02-data-model.md) soft delete · [`06-renderer-publishing.md`](06-renderer-publishing.md) revision retention · [`08-assets-media.md`](08-assets-media.md) garbage collection · [`09-forms-leads.md`](09-forms-leads.md) lead retention · [`10-analytics.md`](10-analytics.md) · [`11-billing-entitlements.md`](11-billing-entitlements.md) · [`18-infrastructure-cicd.md`](18-infrastructure-cicd.md) · [`19-observability.md`](19-observability.md)
