# 17 — Backend Module Boundaries

> **Rule prefix:** `BM-` · **Status:** Binding · **Owner:** Backend
> **Governing document:** [`../00-PROJECT-RULES.md`](../00-PROJECT-RULES.md) · **العربية:** [`../../ar/systems/17-backend-modules.md`](../../ar/systems/17-backend-modules.md)
> **Implements principle:** `CORE-013` (Modular monolith first)

---

## 0. The governing idea

**Modular monolith = the deployment simplicity of a monolith + the boundary discipline of microservices.**

We start with one backend application organised into modules with strict boundaries. The goal is that extracting any module later becomes a **mechanical operation**, not a rewrite.

> **Why not microservices from the start:** a small team and an unproven product plus microservices equals enormous operational complexity (networking, distributed consistency, tracing, multi-deploy) for zero benefit at this stage. The cost is paid immediately and the return may never arrive.

> **Why boundaries from the start:** because a monolith without boundaries becomes a "ball of mud" within a year — everything imports everything, and no part can be extracted, tested, or understood in isolation. **Boundaries are the cheapest thing you can do today and the most expensive thing to add later.**

---

## 1. The modules

```
/apps/api/src/modules
  /auth              Authentication and sessions
  /users             User identity
  /organizations     Tenants, memberships, roles
  /websites          Site lifecycle
  /pages             Pages
  /sections          Content blocks
  /templates         Templates and blueprints
  /themes            Design values
  /revisions         Draft/published revisions and publishing
  /assets            Files and media
  /domains           Domains and TLS
  /forms             Form definitions
  /leads             Form submissions
  /billing           Subscriptions and payments
  /entitlements      Features and limits
  /analytics         Events and aggregations
  /ai                Generation and provider abstraction
  /notifications     Email and webhooks
  /audit             Audit log
```

**`BM-001` (MUST):** Every module has a **clear owner and a single responsibility**. A module whose responsibility cannot be described in one sentence needs splitting.

---

## 2. Module structure

**`BM-010` (MUST):** The uniform internal structure:

```
/modules/websites
  index.ts                   ← the public interface — the only importable thing
  websites.service.ts        ← business logic
  websites.controller.ts     ← HTTP layer
  websites.repository.ts     ← data access
  websites.events.ts         ← published events
  /dto                       ← input and output contracts
  /internal                  ← private details — never imported from outside
```

**`BM-011` (MUST):** `index.ts` exports **only**: the public service interface, public types, and event definitions. **No repositories, no internal entities, no helper functions.**

```ts
// modules/websites/index.ts
export type { WebsiteSummary, WebsiteDetail } from './dto';
export { WebsitesService } from './websites.service';
export type { WebsitePublished, WebsiteDeleted } from './websites.events';
// Forbidden: export { WebsitesRepository }
```

---

## 3. Boundary rules

**`BM-020` (MUST NOT):** **Never** import another module's internal paths (`CORE-023`):

```ts
// ❌ Forbidden
import { WebsitesRepository } from '../websites/websites.repository';
import { normalizeSlug } from '../websites/internal/slug-utils';

// ✅ Correct
import { WebsitesService } from '../websites';
```

**`BM-021` (MUST):** This rule is **enforced automatically** by a lint rule or boundary tool — never by human discipline alone.

> **Why:** An unenforced rule is broken on the first late night under delivery pressure. Automated enforcement makes the violation impossible, not merely forbidden.

**`BM-022` (MUST NOT):** **Never** query another module's tables directly.

> **Why:** This is the most dangerous form of coupling and the hardest to detect. It makes any schema change break modules with no visible relationship to it, and makes extracting the module later impossible.

**`BM-023` (MUST):** Each module owns its tables. Every table has exactly one owner.

**`BM-024` (MUST):** Access to another module's data goes through **its public interface only**.

---

## 4. Inter-module communication

**`BM-030` (MUST):** Only two permitted styles:

| Style | When | Example |
|---|---|---|
| **Public interface call** | You need an answer now to proceed | `entitlements.can(ctx, 'custom_domain')` |
| **Domain event** | You inform others of what happened and do not wait | `WebsitePublished` |

**`BM-031` (MUST):** Events are `PascalCase` in past tense and carry identifiers, not full objects:

```ts
type WebsitePublished = {
  websiteId: string;
  organizationId: string;
  revisionId: string;
  publishedAt: string;
};
```

**`BM-032` (MUST):** The publisher **does not know its subscribers**. Adding a new subscriber must not require changing the publisher.

**`BM-033` (MUST):** A subscriber's failure **does not fail** the original operation or the other subscribers.

> **Why:** Failing to send a congratulation email must never fail a successful publish.

**`BM-034` (MUST NOT):** **No circular dependencies between modules.** A cycle means the two are really one module, or that a third module is missing.

**`BM-035` (MUST):** A cycle is resolved one of three ways: invert the direction with an event · extract the shared part into a third module · reconsider the boundaries.

**`BM-036` (MUST):** Cycle detection is **automated in CI**.

---

## 5. Consistency and transactions

**`BM-040` (MUST):** Transactions stay **within one module**. A transaction spanning modules is forbidden.

> **Why:** A cross-module transaction couples modules inseparably and makes extracting any of them later impossible.

**`BM-041` (MUST):** Anything requiring immediate consistency **must live in one module**. If it does not, the boundaries are drawn wrongly.

**`BM-042` (MUST):** Consistency between modules is **eventual**, via events, with compensation on failure.

**`BM-043` (MUST):** Event handling is idempotent (`QJ-030`).

---

## 6. Shared modules

**`BM-050` (MUST):** `entitlements`, `audit`, and `notifications` are **horizontal** modules called by many others — this is accepted and intended.

**`BM-051` (MUST):** A horizontal module **never calls** vertical modules. `entitlements` does not know `websites`.

> **Why:** Without this rule, cycles appear immediately and the horizontal module becomes a chokepoint everything passes through.

**`BM-052` (MUST):** Generic shared code (utilities, types, helpers) lives in `packages/`, never in a module everyone imports.

---

## 7. When to extract a module into a service

**`BM-060` (MUST NOT):** **Never** extract without an approved ADR carrying **actual measurements** (`CORE-013`).

**`BM-061` (MUST):** Acceptable justifications — measured, not anticipated:

| Justification | Required measurement |
|---|---|
| Radically different resource pressure | Measured CPU/memory consumption starving the rest |
| Different reliability profile | Its failure takes down what it shouldn't (blast radius) |
| Deploy coupling | Its frequent deploys measurably block other teams |
| Separate team ownership | A genuinely independent team on a different release cycle |
| A different technology is necessary | A real need, not a preference |

**`BM-062` (MUST NOT):** **Rejected** justifications: "monoliths are bad" · "microservices are more modern" · "we might need to scale one day" · "that's what big companies do".

**`BM-063` (MUST):** A module considered for extraction must already have **clean boundaries**. If it does not, clean the boundaries first — and the reason for extracting usually disappears afterwards.

---

## 8. Anti-patterns

| # | Pattern | Why it is dangerous |
|---|---|---|
| 1 | Importing internal paths | Coupling that blocks extraction and testing |
| 2 | Querying another module's tables | The worst coupling, and the hardest to detect |
| 3 | Circular dependency | Boundaries drawn wrongly |
| 4 | Cross-module transaction | Inseparable coupling |
| 5 | An event carrying full objects | Stale data plus a huge payload |
| 6 | A subscriber failure failing the operation | An outage from a side effect |
| 7 | A horizontal module calling a vertical one | Immediate cycles |
| 8 | A "utils" module everyone imports | A ball of mud in disguise |
| 9 | A module with no owner | Nobody guards its boundaries |
| 10 | Extracting a service without measurement | Enormous complexity for no return |
| 11 | Boundaries without automated enforcement | Broken on the first pressured night |

---

## 9. Required tests

**`BM-070` (MUST):** An automated CI check preventing imports from internal paths.

**`BM-071` (MUST):** An automated circular dependency check.

**`BM-072` (MUST):** Unit tests per module **with other modules mocked** through their public interfaces — practical proof that boundaries hold.

**`BM-073` (MUST):** Event tests: the publisher emits the correct event; the subscriber handles it idempotently; a subscriber failure does not affect the publisher.

**`BM-074` (MUST):** Table ownership check: every table is read and written by exactly one module.

---

## 10. Definition of Done — module boundaries

- [ ] New code sits in the correct owning module.
- [ ] No imports from another module's internal paths.
- [ ] No direct queries against another module's tables.
- [ ] `index.ts` exports only the public interface.
- [ ] No circular dependencies (the automated check is green).
- [ ] Transactions stay within one module.
- [ ] Events are past-tense `PascalCase` carrying identifiers.
- [ ] Event handling is idempotent, and failures do not affect the publisher.
- [ ] Horizontal modules do not call vertical ones.
- [ ] Unit tests mock other modules through their interfaces.
- [ ] Table ownership is clear and preserved.

---

## 11. What requires an ADR

- Extracting any module into an independent service.
- Adding a large new module (and redrawing boundaries).
- Allowing a cross-module query.
- Adding an external event bus.
- Merging two modules or splitting an existing one.

---

## 12. Cross-references

[`01-multi-tenancy.md`](01-multi-tenancy.md) · [`02-data-model.md`](02-data-model.md) table ownership · [`11-billing-entitlements.md`](11-billing-entitlements.md) a horizontal module · [`13-queues-jobs-cache.md`](13-queues-jobs-cache.md) events · [`18-infrastructure-cicd.md`](18-infrastructure-cicd.md) · [`22-testing.md`](22-testing.md)
