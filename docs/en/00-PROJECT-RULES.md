# 00 — Project Engineering Rules

> **AI Website Builder SaaS** — a multi-tenant platform for creating and publishing websites
> **Version:** 1.0 · **Status:** Binding · **Last updated:** 2026-09-15
> **Derived from:** `docs/reference/architecture-reference-v1.0.md`
> **Arabic version:** [`../ar/00-PROJECT-RULES.md`](../ar/00-PROJECT-RULES.md)

---

## 0. How to use this file

`docs/en/00-PROJECT-RULES.md` is the **highest binding engineering authority** for anyone writing code in this project. The final order of authority is:

1. `docs/en/00-PROJECT-RULES.md`.
2. Approved ADRs applicable to the decision.
3. Relevant `docs/en/systems/*` files.
4. `docs/reference/architecture-reference-v1.0.md`.
5. Stage/task instructions, including execution playbooks and acceptance criteria.

Arabic documents are synchronized translations, not a separate authority. An ADR does not silently override this file: any approved change affecting these rules must also update the governing rule. If references conflict, stop and report the conflict before implementation; do not invent a reconciliation.

| You are | Read |
|---|---|
| New developer (any role) | This file in full + `01` + `02` + `17` before your first line of code |
| Backend | + `02`, `05`, `06`, `11`, `12`, `13`, `15`, `17` |
| Frontend / Editor | + `03`, `04`, `16`, `23` |
| DevOps / SRE | + `18`, `19`, `20`, `21` |
| QA | + `22` + the testing section of every system file |
| Security review | + `14` + the mandatory-rules section of every file |
| AI agent writing code | This file + the relevant system file + section 16 below |

### Normative levels (used across all files)

| Word | Meaning |
|---|---|
| **MUST** | Mandatory. Violating it is rejected in code review, no discussion. |
| **MUST NOT** | Forbidden. Code violating it does not reach `main`. |
| **SHOULD** | The correct default. Deviating requires written justification in the PR description. |
| **MAY** | Allowed; the implementing team decides. |

### Rule numbering

Every rule has a stable ID of the form `PREFIX-NNN` (e.g. `CORE-012`, `MT-003`). **A number is never reused after removal** — it is replaced by `(retired — see ADR-00X)`. Use the ID in PRs and reviews: "this violates `MT-004`" is clearer and faster than a paragraph.

---

## 1. Project identity and approved stack

### 1.1 The goal in one sentence

The user picks or describes their business → the system generates a **Website Blueprint + content + Theme** → they edit it in the **Visual Editor** → **Publish** → the site is live immediately on a subdomain or custom domain, with CDN and SSL.

### 1.2 The stack (approved — changing it requires an ADR)

| Layer | Technology | Mandatory note |
|---|---|---|
| Backend API | **NestJS** / Node.js / TypeScript | Modular monolith — modules inside one app |
| Dashboard + Renderer | **Next.js** / React / TypeScript | `strict: true` is mandatory |
| Database | **PostgreSQL** | The only system of record |
| Cache / Queue | **Redis + BullMQ** | Never used as a system of record |
| Object storage | **Cloudflare R2** (S3-compatible) | All files and images |
| CDN / Edge / WAF / TLS | **Cloudflare** (+ Cloudflare for SaaS) | For custom domains |
| Language | **TypeScript** everywhere | `any` is forbidden (see `CORE-031`) |
| Monorepo | pnpm + Turborepo (or Nx) | Shared schemas and components |

**`CORE-001` (MUST NOT):** Do not introduce a second primary database, a second backend language, or a second frontend framework **without an approved ADR**.

**`CORE-002` (MUST NOT):** Do not add or update a third-party dependency without a recorded, risk-based Dependency Review. Every direct and transitive dependency remains in inventory, security scanning, license review, integrity/source review, and graph review, including runtime, build, CI, test, and optional/platform-specific dependencies. Automated inventory and checks may cover routine transitive review; findings require an explicit disposition. No dependency class is exempt from the security gates below.

**Classification and direct review.** A dependency explicitly declared, directly imported, or directly invoked by project code/tooling is direct, including a mandatory peer explicitly supplied by the project. A transitive dependency arrives only through a dependency path and is not used directly by the project. Undeclared direct use is not a transitive exemption. Record necessity, exact stable version, source, license obligations, maintenance/support status, latest stable and selected-version release dates, compatibility, advisories, and package/bundle impact where applicable. For a runtime dependency, state its reason in the PR description and check its license, last-update date, and bundle size before addition. Review alternatives when a risk signal exists. Exposure classification is independent: production runtime, build, CI, test-only, or optional/platform. Classify actual execution, privileges, and artifact shipping across all supported targets, not solely manifest placement; apply the highest actual exposure. A devDependency is not automatically low-risk.

**Direct age rule.** A new direct dependency whose latest stable release is older than 18 months is rejected by default. Age is a maintenance-risk signal, not proof of abandonment. A dependency-specific direct-age exception is permitted **only when all of the following hold**:

1. It is required directly or as a mandatory peer/runtime requirement by a component in the approved stack.
2. No practical supported, compatible replacement meets the need without changing that stack or introducing greater risk.
3. The dependency is not established as deprecated, abandoned, or EOL.
4. The selected version is supported/compatible with the approved framework requirement.
5. Its license and applicable obligations are acceptable.
6. Neither the selected version nor the resulting graph has an unresolved known Critical/High vulnerability or another hard blocker below.
7. Maintenance, repository activity where applicable, framework compatibility, release/support notes, advisories, and transitive impact are reviewed.
8. The reason, evidence, owner approval, and reassessment date are recorded in the Dependency Review.
9. Acceptance is dependency-specific; popularity or blanket age exemptions are insufficient.
10. EOL, abandonment, unresolved Critical/High, changed exposure, or a supported replacement required by the framework triggers re-evaluation.

Deprecated, abandoned, or EOL direct dependencies are rejected by default and cannot use this age-exception procedure. No new exception for them is granted by this rule.

**Transitive signals.** Release age over 18 months and upstream deprecation/EOL are recorded risk signals, not automatic rejection on their own. Disposition considers actual exposure, execution context, consumer maintenance, compatibility, security findings, shipping, privileges, available supported remediation, and residual risk. Acceptance with tracking requires a known path from an approved-stack direct component whose own necessity, maintenance, support, and compatibility have been reviewed; a compatible consumer/target runtime; no hard blocker; documented reasons for the signal and actual exposure; and acceptable residual risk. Check for supported, compatible upstream upgrades or removal first. If no proportionate supported action is available under project control, do not require a fork, patch, unsupported override/substitution, or an unjustified framework change merely to remove the signal. A maintained consumer does not prove that its leaf dependencies are maintained. This route is not available to a dependency directly used by the project.

**Hard blockers, all dependency classes.** Reject known malicious packages, known compromised releases, unresolved Critical/High vulnerabilities, known exploitable conditions in our usage regardless of severity, incompatible licenses, integrity/provenance verification failures, dependency confusion or unresolved suspicious sources, unsupported runtime/peer/platform incompatibility, unsupported direct frameworks, unacceptable security/runtime impact from abandonment, and unacceptable privileged lifecycle/build behavior. Dev-only, optional, or claimed non-reachability does not waive these blockers. Missing optional provenance is an evidence gap, not automatically a verification failure; missing required evidence prevents acceptance. This rule creates no implicit waiver or High/Critical risk-acceptance mechanism.

**Evidence and follow-up.** Record package/version and relevant paths, consumer, context/targets, findings and sources, scan dates/results, alternatives, residual risk and controls, owner, reviewer/approval, next review date, and exit/re-evaluation triggers. Dispositions are ACCEPT, ACCEPT WITH TRACKING, or BLOCK. Unresolved required review is not PASS. Age monitoring remains mandatory for transitive dependencies without requiring a separate age exception for each leaf. A tracked acceptance must not suppress future findings or authorize unrelated versions/paths.

**Tracking deadlines.** A deprecated/EOL transitive finding has a maximum review interval of **90 days**. An age-only transitive finding with no other material risk signal has a maximum review interval of **180 days**. Record the next review date from the completed review; these are maximum intervals, not grace periods for hard blockers. Re-evaluation is immediate, before the periodic deadline, on any of:

- A new security advisory or High/Critical finding.
- Malware/compromise evidence.
- A consumer/framework update affecting the dependency path, or a dependency graph/path change.
- A direct-use or production shipping change.
- A privilege/execution-context change.
- A support/EOL/deprecation status change.
- An integrity/provenance concern.
- An available supported upstream replacement.

Periodic review does not replace event-driven re-evaluation. An expired or no-longer-applicable tracking record prevents new graph acceptance/merge until re-evaluated; it does not by itself require an automatic production shutdown.

**Existing controls and approvals.** Preserve committed/frozen lockfiles, exact direct version pins, strict peer/engine validation, the configured new-release maturity floor, full dependency scanning, and reviewed or disabled lifecycle scripts under SE-060 through SE-064. For checkpoint 00-B, `reflect-metadata@0.2.2` and `rxjs@7.8.2` remain direct mandatory peers; the owner's conditional direct-age approvals remain subject to their recorded conditions and the complete graph gate. Neither becomes a transitive dependency or a blanket approval. This policy change does not itself approve any package installation or resume a checkpoint.

---

## 2. The seven architectural principles — non-negotiable

These are the backbone. **Code that violates any of them does not reach `main`, whatever the practical justification.** Change happens only through an ADR.

### `CORE-010` — Multi-tenant by design
Every website, every query, every asset, every event **MUST** carry an explicit tenant/site scope.
Relying on an ID alone without an ownership check is **forbidden**.
→ Details: [`systems/01-multi-tenancy.md`](systems/01-multi-tenancy.md)

### `CORE-011` — Content ≠ Presentation
Content is stored as **structured data**; design is a separate **variant/theme**.
Storing a page as raw HTML is **forbidden** — neither from the AI nor from the user.
→ Details: [`systems/03-content-engine.md`](systems/03-content-engine.md)

### `CORE-012` — One platform, many sites
No database per customer. No VM per site. No WordPress per customer. No container per tenant.
Any solution that makes infrastructure cost grow linearly with customer count is **forbidden**.

### `CORE-013` — Modular monolith first
One backend, organised into modules with clear boundaries.
Splitting a module into a microservice **without** measured evidence (load / independence / blast radius) documented in an ADR is **forbidden**. Fashion is not a reason.
→ Details: [`systems/17-backend-modules.md`](systems/17-backend-modules.md)

### `CORE-014` — Edge/cache first for published traffic
Public traffic to published sites **MUST NOT** hit PostgreSQL on every request.
→ Details: [`systems/20-performance-caching.md`](systems/20-performance-caching.md)

### `CORE-015` — Async for slow work
AI, image processing, email, domain verification, analytics aggregation — all **MUST** go through queues and workers.
Running slow or third-party-dependent work inside the request/response cycle is **forbidden**.
→ Details: [`systems/13-queues-jobs-cache.md`](systems/13-queues-jobs-cache.md)

### `CORE-016` — Least privilege
Every service, user, and token holds **only** the minimum permissions required.
→ Details: [`systems/12-auth.md`](systems/12-auth.md) and [`systems/14-security.md`](systems/14-security.md)

---

## 3. The ten golden rules (print and pin them)

| # | Rule | File |
|---|---|---|
| 1 | Any query on tenant data **without** scope is a critical security bug | `01` |
| 2 | The AI returns **validated JSON**, never HTML and never code | `05` |
| 3 | Publishing creates an **immutable revision**; drafts are never visible to visitors | `06` |
| 4 | Hiding a button in the UI is **not** authorization | `12` |
| 5 | Every client input is validated **server-side**, however well the frontend validated it | `15` |
| 6 | No secrets and no PII in logs. Ever. | `14`, `19` |
| 7 | Treating Redis as a source of truth means losing data | `13` |
| 8 | Every job must be **idempotent** or carry an idempotency key | `13` |
| 9 | A backup whose restore was never tested is **not** a backup | `21` |
| 10 | Any deviation from section 2 needs an **approved ADR** before the code, not after | `32` |

---

## 4. System map — where to find the rule you need

| # | System | File | Rule prefix | Owner |
|---|---|---|---|---|
| 01 | Multi-tenancy & isolation | [`01-multi-tenancy.md`](systems/01-multi-tenancy.md) | `MT-` | Backend |
| 02 | Domain model & database | [`02-data-model.md`](systems/02-data-model.md) | `DM-` | Backend |
| 03 | Section / Template / Theme engine | [`03-content-engine.md`](systems/03-content-engine.md) | `CE-` | Full-stack |
| 04 | Visual Editor | [`04-visual-editor.md`](systems/04-visual-editor.md) | `VE-` | Frontend |
| 05 | AI generation | [`05-ai-generation.md`](systems/05-ai-generation.md) | `AI-` | Backend |
| 06 | Renderer & publishing | [`06-renderer-publishing.md`](systems/06-renderer-publishing.md) | `RP-` | Full-stack |
| 07 | Domains & SSL | [`07-domains-ssl.md`](systems/07-domains-ssl.md) | `DN-` | Backend/DevOps |
| 08 | Assets & media pipeline | [`08-assets-media.md`](systems/08-assets-media.md) | `AS-` | Backend |
| 09 | Forms, leads & notifications | [`09-forms-leads.md`](systems/09-forms-leads.md) | `FL-` | Backend |
| 10 | Analytics | [`10-analytics.md`](systems/10-analytics.md) | `AN-` | Backend/Data |
| 11 | Billing & entitlements | [`11-billing-entitlements.md`](systems/11-billing-entitlements.md) | `BE-` | Backend |
| 12 | Authentication & authorization | [`12-auth.md`](systems/12-auth.md) | `AU-` | Backend/Security |
| 13 | Cache, queues & jobs | [`13-queues-jobs-cache.md`](systems/13-queues-jobs-cache.md) | `QJ-` | Backend |
| 14 | Security engineering | [`14-security.md`](systems/14-security.md) | `SE-` | Security |
| 15 | API standards | [`15-api-standards.md`](systems/15-api-standards.md) | `API-` | Backend |
| 16 | Frontend standards | [`16-frontend-standards.md`](systems/16-frontend-standards.md) | `FE-` | Frontend |
| 17 | Backend module boundaries | [`17-backend-modules.md`](systems/17-backend-modules.md) | `BM-` | Backend |
| 18 | Infrastructure & CI/CD | [`18-infrastructure-cicd.md`](systems/18-infrastructure-cicd.md) | `IN-` | DevOps |
| 19 | Observability & operations | [`19-observability.md`](systems/19-observability.md) | `OB-` | DevOps/SRE |
| 20 | Performance & caching | [`20-performance-caching.md`](systems/20-performance-caching.md) | `PF-` | Full-stack |
| 21 | Backup / DR / retention | [`21-backup-dr-retention.md`](systems/21-backup-dr-retention.md) | `BR-` | DevOps |
| 22 | Testing strategy | [`22-testing.md`](systems/22-testing.md) | `TS-` | QA/All |
| 23 | i18n / RTL / localization | [`23-i18n-rtl.md`](systems/23-i18n-rtl.md) | `IL-` | Frontend |

---

## 5. Repository structure and code ownership

```
/apps
  /api                 → NestJS — all business logic
  /dashboard-web       → Next.js — dashboard + Visual Editor
  /public-renderer     → Next.js — serves published sites to visitors
  /worker              → BullMQ workers
/packages
  /schemas             → Shared Zod/JSON schemas (source of truth for contracts)
  /types               → Shared TypeScript types
  /site-sections       → Section components (used by renderer + editor preview)
  /ui-dashboard        → Design system for the dashboard only
  /config              → Shared config (eslint, tsconfig, tailwind)
  /testing             → Test utilities and fixtures
  /observability       → Logger, metrics, tracing helpers
/infra                 → IaC, deployment configuration
/docs
  /ar, /en             → These documents
  /adr                 → Architecture Decision Records
  /api                 → OpenAPI specs
  /runbooks            → Operational and incident procedures
```

**`CORE-020` (MUST):** `packages/site-sections` **MUST** remain usable from both `public-renderer` and `dashboard-web`. It must not depend on dashboard-specific code.

**`CORE-021` (MUST NOT):** `packages/ui-dashboard` must never import from `site-sections`, or vice versa. They are two entirely separate visual systems.

**`CORE-022` (MUST):** Every data contract (section schema, API DTO, event payload) **MUST** be defined once in `packages/schemas` and imported from there. Duplicating the same shape in more than one place is forbidden.

**`CORE-023` (MUST NOT):** Never import another module's internal paths (`modules/billing/repositories/...`). Communicate through the public service interface or domain events only.

---

## 6. Naming conventions

### 6.1 Database

| Element | Rule | Example |
|---|---|---|
| Table name | `snake_case`, **plural** | `site_revisions` |
| Column | `snake_case`, **singular** | `published_at` |
| Primary key | `id` | — |
| Foreign key | `<singular_table>_id` | `website_id` |
| Timestamp | ends in `_at`, type `timestamptz` | `created_at` |
| Boolean | starts with `is_` or `has_` | `is_active` |
| JSONB | ends in `_json` | `data_json` |
| Index | `idx_<table>_<cols>` | `idx_sections_page_id_sort_order` |
| Unique | `uq_<table>_<cols>` | `uq_domains_hostname` |
| Foreign key constraint | `fk_<table>_<ref_table>` | `fk_pages_websites` |

**`CORE-030` (MUST):** Every time column is `timestamptz` and stored in **UTC**. `timestamp` without timezone is forbidden.

### 6.2 TypeScript

| Element | Rule |
|---|---|
| File | `kebab-case.ts` — `website-publish.service.ts` |
| Class / Interface / Type | `PascalCase` |
| Function / variable | `camelCase` |
| True constant | `SCREAMING_SNAKE_CASE` |
| Folder | `kebab-case` |
| React component | `PascalCase.tsx` |
| Hook | `use-<name>.ts` exporting `useName` |
| Props type | `<ComponentName>Props` |

**`CORE-031` (MUST NOT):** `any` is forbidden in production code. Use `unknown` + narrowing, or define the type. The only exception: typing an untyped third-party library, with an `// eslint-disable-next-line` and a comment explaining why.

**`CORE-032` (MUST NOT):** `@ts-ignore` is forbidden. `@ts-expect-error` is allowed **only** with a comment explaining why and a ticket reference for the fix.

**`CORE-033` (MUST):** Conversions between layers are explicit: `DbRow → DomainEntity → ApiDto`. Never pass a database row straight into an API response — this is the most common cause of internal-field leakage.

### 6.3 API

| Element | Rule | Example |
|---|---|---|
| Path | `kebab-case`, **plural** | `/api/v1/websites/{websiteId}/site-revisions` |
| JSON fields | `camelCase` | `publishedAt` |
| Error code | `SCREAMING_SNAKE_CASE` | `DOMAIN_NOT_VERIFIED` |
| Public identifier | prefixed with its type | `site_01J...`, `lead_01J...` |

### 6.4 Queues and events

| Element | Rule | Example |
|---|---|---|
| Queue name | `kebab-case`, singular | `media`, `domains` |
| Job name | `<domain>.<action>` | `media.generate-variants` |
| Domain event | `PascalCase`, past tense | `WebsitePublished` |
| Cache key | `<scope>:<entity>:<id>[:<qualifier>]` | `site:config:site_01J:v42` |

---

## 7. Git — branches, commits, pull requests

### 7.1 Branches

```
main                    ← protected. Production. No direct push except CORE-040 empty genesis.
feat/<scope>-<short>    ← new feature
fix/<scope>-<short>     ← bug fix
chore/<scope>-<short>   ← maintenance/tooling
docs/<scope>-<short>    ← documentation
```

**`CORE-040` (MUST NOT):** Never push directly to `main`. Every change goes through a PR and review. The sole bootstrap exception is one owner-authorized root commit with an empty tree, creating `main` in the empty `Hasoba96/website-builder-saas` repository. It contains no files, source, workflow, configuration or credentials and is not a verified application baseline. Record the approved operation and resulting commit/tree identity. The exception expires immediately when that ref is created and cannot authorize any later direct push. Activate the approved main protections before publishing the source candidate. All subsequent main changes require a reviewed PR and every applicable successful CI gate.

**`CORE-041` (MUST):** Branches are short-lived — **under 5 working days**. Anything longer is split or merged behind a feature flag.

### 7.2 Commit format (Conventional Commits — mandatory)

```
<type>(<scope>): <short imperative description>

[optional body — the why, not the what]

Refs: WBP-123
```

Allowed types: `feat` · `fix` · `refactor` · `perf` · `test` · `docs` · `chore` · `build` · `ci` · `revert`

Approved scopes match module names: `auth`, `websites`, `sections`, `revisions`, `domains`, `assets`, `forms`, `leads`, `billing`, `entitlements`, `analytics`, `ai`, `notifications`, `audit`, `renderer`, `editor`, `infra`, `docs`.

```
feat(domains): add background DNS verification job
fix(revisions): prevent draft leakage when publish job fails midway
```

**`CORE-042` (MUST):** Any breaking change carries `BREAKING CHANGE:` in the commit body, with a migration plan.

### 7.3 Pull requests

**`CORE-043` (MUST):** The PR description contains:
1. **What and why** — not just a list of files.
2. **The owning module** for this change.
3. **Multi-tenancy impact** — did you touch a query on tenant data? How did you verify the scope?
4. **Database impact** — any migration? Is it safe to run while serving traffic?
5. **How to test manually** — numbered steps.
6. **Rollback plan** — how do we undo this if production goes wrong?
7. **Screenshots** for any UI change (desktop + mobile + RTL + LTR).

**`CORE-044` (MUST):** PR size **≤ 400 changed lines** of real code (excluding generated files and lockfiles). Larger PRs get split. One owner-authorized initial foundation-import PR into the empty-tree `main` base of `Hasoba96/website-builder-saas` may exceed the aggregate limit only after its entire diff is partitioned into dependency-ordered, individually reviewed packets of at most 400 changed real-code lines. The manifest must identify every file/hunk, packet and commit, code-line count, exclusions, review result and approved final tree. Security configuration, scripts and tests are not excluded merely because they are infrastructure. Non-code and excluded generated/binary changes remain inventoried and reviewed. No application source is imported through a direct main push. No incomplete packet is merged with reduced CI. The complete PR must pass all mandatory hosted gates on its current merge candidate and receive explicit owner merge approval. The authorization is limited to the current approved A-I/J foundation, its approved governance reconciliation and necessary reviewed J fixes/baselines; it cannot include 00-K or product work. It expires on the first import merge or the recorded bootstrap deadline, whichever occurs first. Any changed candidate requires updated review and approval. After that import, the ordinary limit applies without exception.

**`CORE-045` (MUST):** In team mode, require at least one human reviewer other than the implementer; changes touching **multi-tenancy, auth, billing, publishing, or migrations** require **two human reviewers**, including the module owner. In explicitly adopted solo-owner mode, eligible changes may instead receive a documented AI-assisted technical review followed by explicit owner acceptance under the solo procedure below. This is an alternative governance path, not independent human review and not fulfillment of a two-person requirement. Never fabricate approvals or count multiple owner-controlled or AI identities as different human reviewers.

**Solo adoption and evidence.** Adoption identifies the accountable owner, repository, effective date and reassessment date, no more than 90 days later. Reassess at every checkpoint and immediately on another maintainer joining, first real customer data, a material incident or a new production trust boundary. Expired adoption prevents new merges until renewed. Every change records actual risk/exposure, module ownership, reviewed source identity, a separate AI-assisted review pass and its limitations, findings and resolution, negative/failure tests, rollback plan and required CI evidence. Obtain explicit owner authorization for publication and separately for merge, tied to the exact reviewed content and operation; changed head/base invalidates affected acceptance. All CORE-043/046 and applicable system requirements remain mandatory. The [dated adoption record](../checkpoints/00-j-solo-governance-adoption.md) records the current owner and single-use deadlines, not a general waiver power.

**Risk classification.** Routine changes and reversible, isolated non-production sensitive changes may use solo review. Sensitive changes require an explicit threat/failure review and owner residual-risk decision. Governance, CI, security controls, supply chain, credentials, infrastructure privileges and the five sensitive categories above must not be classified as routine merely because they are tooling or documentation. Pre-production changes in those five categories are eligible only without real users, customer data, production credentials or real payments, with tested boundaries and prevention of premature deployment/activation.

**Independent-human-required cases.** Independent human review is mandatory before the first pilot/production activation of those sensitive surfaces and for changes to active production security-sensitive boundaries thereafter. Irreversible migrations under DM-034, irreversible production data operations, bespoke cryptography/untrusted-code security designs and proposals to weaken mandatory controls require a qualified independent human in addition to the owner/module-owner decision. Other binding prohibitions and ADR requirements still apply; review cannot waive them. If required independent review is unavailable or classification/exposure is unresolved, block the change. No owner-only exception to these cases is created. This procedure does not authorize any future stage or deployment.

**`CORE-046` (MUST NOT):** Never merge a PR with red CI or an unanswered review thread.

---

## 8. Definition of Ready / Definition of Done

### 8.1 Definition of Ready (before implementation starts)

Work **does not start** until all of the following hold:

- [ ] Acceptance criteria are written and testable.
- [ ] The **owning module** is identified and its boundary is clear.
- [ ] The data contract (schema / API / event) is agreed and written in `packages/schemas`.
- [ ] Multi-tenancy impact is understood: which scopes are required?
- [ ] Entitlement impact is understood: is the feature plan-limited? What is the `feature_key`?
- [ ] Does it need an ADR? (see section 12)
- [ ] Does it need a feature flag? (high-risk = yes)

### 8.2 Definition of Done (before merging) — mandatory in full

- [ ] Acceptance criteria actually met.
- [ ] **Authorization and tenant scope** explicitly reviewed.
- [ ] **Server-side validation** present for every input.
- [ ] Unit / integration tests added for the new paths.
- [ ] A **cross-tenant test** added if the change touches tenant data.
- [ ] No critical lint/type errors. `tsc --noEmit` is clean.
- [ ] Logs and metrics for operationally important parts.
- [ ] Error / loading / empty states handled in the UI.
- [ ] Migrations safe and reviewed, with a forward/rollback plan.
- [ ] OpenAPI / schema docs updated.
- [ ] **No secrets and no unnecessary PII in logs.**
- [ ] The feature is rollback-able or flag-disable-able if high-risk.
- [ ] UI tested in **both RTL and LTR** if the UI was touched.
- [ ] **The relevant file in `docs/` is updated** if a rule or contract changed.

---

## 9. Feature lifecycle

```
Product requirement
    ↓
Short technical design (one page is enough)
    ↓
API / schema decision  ←── needs ADR? ── yes ──→ write and approve the ADR first
    ↓
Implementation behind a feature flag (if high-risk)
    ↓
Tests (unit + integration + cross-tenant)
    ↓
Code review
    ↓
Staging + real observability check (logs/metrics/traces)
    ↓
Gradual rollout + monitoring
    ↓
Remove the flag once stable
```

**`CORE-050` (MUST):** Any high-risk feature (touching publishing, domains, billing, auth, or data migration) **ships behind a feature flag** and is monitored before general rollout.

**`CORE-051` (MUST):** Feature flags are not permanent. Every flag has a **removal date** and a linked ticket. Dead flags are technical debt, cleaned up every sprint.

---

## 10. General code rules

### 10.1 Error handling

**`CORE-060` (MUST NOT):** No empty `catch`, and no `catch` that swallows an error without logging or rethrowing.

**`CORE-061` (MUST):** Expected errors (validation failure, resource not found, missing permission) are represented as domain error types, not as a generic `Error`.

**`CORE-062` (MUST NOT):** Never leak internal exception messages or stack traces into an API response. The unified error shape lives in [`systems/15-api-standards.md`](systems/15-api-standards.md).

**`CORE-063` (MUST):** Every third-party call (AI, payments, DNS, email) carries an **explicit timeout** and a **bounded retry policy**. No network call without a timeout.

### 10.2 Database

**`CORE-064` (MUST NOT):** Never build raw SQL by string concatenation from user input. Use parameterized queries or the ORM.

**`CORE-065` (MUST):** Any operation writing to more than one table that requires consistency runs inside a single **transaction**.

**`CORE-066` (MUST NOT):** No N+1 queries on any hot path — the renderer above all. See `PF-`.

### 10.3 Time, numbers, text

**`CORE-067` (MUST):** All times are **UTC** internally. Conversion to local time happens in the presentation layer only.

**`CORE-068` (MUST):** Money is stored as an **integer in the smallest unit** (piastres/cents) with a currency code. `float` for money is **forbidden**.

**`CORE-069` (MUST):** All user-facing text goes through the translation layer. Hardcoded strings in components are **forbidden**. See [`systems/23-i18n-rtl.md`](systems/23-i18n-rtl.md).

### 10.4 Secrets and configuration

**`CORE-070` (MUST NOT):** **Never** write a secret, key, or password into code or into any file that enters Git — including test files and examples.

**`CORE-071` (MUST):** All configuration comes from environment variables and is validated **at application startup** against a schema. The app **fails loudly at startup** if a required setting is missing — it does not start and crash later.

**`CORE-072` (MUST):** `.env.example` is always up to date with every required key (with dummy values). A missing key there means an incomplete PR.

---

## 11. Handling user data and PII

**`CORE-080` (MUST):** Collect the minimum. Do not request or store personal data without a clear product need.

**`CORE-081` (MUST NOT):** Never log PII (email, phone, name, address, lead content). Log identifiers only: `leadId`, `siteId`, `tenantId`.

**`CORE-082` (MUST):** Every data type has a documented **retention policy** in [`systems/21-backup-dr-retention.md`](systems/21-backup-dr-retention.md).

**`CORE-083` (MUST):** Account deletion distinguishes **soft-delete + grace period** from **scheduled hard deletion**, and is applied across all systems (DB, storage, analytics, cache).

---

## 12. ADR — architecture decisions

An architecture decision is recorded as a single Markdown file in `docs/adr/`, named `ADR-NNN-<slug>.md`. The template is in [`../adr/ADR-TEMPLATE.md`](adr/ADR-TEMPLATE.md).

**`CORE-090` (MUST):** An ADR is required **before** writing code for:
- Changing the primary database or adding a new data store.
- Splitting a module into a microservice.
- Changing the multi-tenancy model.
- Changing the core rendering or publishing mechanism.
- Allowing user-supplied custom code execution.
- Changing a core provider (domains/TLS/payments/AI) with architectural impact.
- Any deviation from the principles in section 2.

**`CORE-091` (MUST NOT):** Never edit an approved ADR. A new decision gets a new ADR, and the old one is marked `Superseded by ADR-NNN`.

---

## 13. MVP scope guard

### Inside the MVP
10 business categories · 5 themes · 10–15 section types (~80–100 variants) · AI blueprint and content generation · visual editor (text/images/reorder/variant/theme) · draft + publish + basic rollback · platform subdomain · custom domain + SSL · contact forms + leads · WhatsApp CTA · basic analytics · Arabic/English + RTL/LTR · plans, billing, entitlements.

### Outside the MVP (do not start)
Full ecommerce engine · complex booking marketplace · email marketing suite · arbitrary user JavaScript · multi-region active-active · microservices fleet · plugin marketplace · advanced CRM automation.

**`CORE-100` (MUST NOT):** No feature outside that list enters the MVP unless it is required to prove product-market fit or drive direct revenue — and then only by a written decision.

**`CORE-101` (MUST):** When a new feature is proposed, ask first: "can this be solved with a new section variant or setting instead of new code?" In this product, **most requests should be solved in the content layer, not the code layer**.

---

## 14. When to change the architecture (scaling roadmap)

| Stage | Approximate size | Likely changes |
|---|---|---|
| **A** | 0–5K paid | Modular monolith · managed Postgres/Redis · CDN caching |
| **B** | 5K–50K | Horizontal API/renderer · read replicas · stronger queues · separate analytics store |
| **C** | 50K–200K | DB partitioning where measured · dedicated ingestion · specialised workers |
| **D** | 200K+ | Multi-region reads · service extraction for hot domains · advanced routing |

**`CORE-110` (MUST NOT):** The numbers above are **indicative, not triggers**. Do not jump to a later stage on the basis of anticipation.
The real triggers are **measurements**: CPU/DB contention · queue lag · blast radius · deploy coupling · team ownership · cost.

---

## 15. Shared glossary

Use these words with exactly these meanings — in code, in the database, in discussion, and in the UI.

| Term | Precise meaning |
|---|---|
| **Tenant / Organization** | The unit of isolation, ownership, and billing. Everything belongs to a tenant. |
| **Website / Site** | One site owned by a tenant. Has a slug, a theme, and domains. |
| **Page** | A page within a site, with its own slug. |
| **Section** | A content block within a page. Has a `type`, a `variant`, and `data`. |
| **Section Type** | The functional kind of block (`hero`, `services`, `contact`). |
| **Variant** | A visual form of the same type (`hero-07`). **It does not change the data shape.** |
| **Theme Tokens** | Global design values (colors, fonts, radii, spacing). |
| **Template / Blueprint** | A ready-made section composition for a business category. |
| **Draft Revision** | The version being edited. **Never visible to a visitor.** |
| **Published Revision** | An immutable snapshot the renderer reads from. |
| **Publish** | The operation that creates a published revision from the draft. |
| **Renderer** | The layer that turns a published revision into HTML for visitors. |
| **Entitlement** | The central answer to "does this tenant have this feature/limit?" |
| **Lead** | A form submission from a visitor to a published site. |
| **Asset** | A user-uploaded file plus its metadata and optimised variants. |
| **Idempotency Key** | A key ensuring that repeating the same operation produces no duplicate effect. |

**`CORE-120` (MUST NOT):** Do not invent synonyms. Do not write `tenant` in one place and `account` or `workspace` elsewhere for the same concept. Linguistic consistency is architectural consistency.

---

## 16. Rules for AI agents writing code in this project

This project is partly built with AI assistance. The following rules are **mandatory** for any AI session writing or modifying code here.

**`CORE-130` (MUST):** Before writing any code, read this file plus the relevant file in `systems/`. Do not infer behaviour from file names.

**`CORE-131` (MUST NOT):** Never invent a database column, an API field, or a section type that does not exist in the docs. If you need a new one: propose it explicitly, wait for approval, then **update the docs file in the same PR**.

**`CORE-132` (MUST):** Any produced code cites the **rule IDs** it complied with in the PR description (e.g. "applied `MT-003`, `API-011`").

**`CORE-133` (MUST NOT):** Never skip validation or tenant scoping "temporarily, to test". Temporary code becomes permanent.

**`CORE-134` (MUST):** If a user instruction conflicts with a binding rule here — **stop and state the conflict**. Do not silently comply, and do not silently refuse.

**`CORE-135` (MUST):** Any AI-produced content (text, blueprint, image) is treated as **untrusted input**: full validation + moderation + limits, before storage. See [`systems/05-ai-generation.md`](systems/05-ai-generation.md).

---

## 17. Pre-production launch checklist

The product does not launch commercially until every box is ticked and evidenced (screenshot, test run, runbook).

- [ ] Production secrets fully isolated from other environments
- [ ] Backups enabled **and restore actually tested**
- [ ] Custom domain verification tested end to end
- [ ] TLS automation tested
- [ ] Cross-tenant test suite **fully green**
- [ ] Rate limits enabled on every public path
- [ ] WAF and basic abuse controls configured
- [ ] Payment webhook signature validation working
- [ ] Error tracking (Sentry or equivalent) enabled
- [ ] `requestId` present in every log line
- [ ] Queue failure monitoring enabled with alerts
- [ ] Asset upload limits configured and tested
- [ ] Privacy and retention policy implemented in code, not only on paper
- [ ] Rollback procedure documented and rehearsed
- [ ] Incident contact + runbook defined

---

## 18. Summary

> **The architectural equation**
> Multi-tenant data model + structured section engine + immutable publish revisions + edge-cached renderer + automated domain/TLS + async workers
> **=** a Website Builder platform that scales at a sane operating cost.

This document is Baseline v1.0. **When a core assumption changes, we do not just change the code** — we update the reference and/or add an ADR, so the whole team stays aligned on how we build.

---

### Changelog

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-09-15 | Initial release — derived from Architecture Engineering Reference v1.0 |
