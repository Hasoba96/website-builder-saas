# 22 — Testing Strategy

> **Rule prefix:** `TS-` · **Status:** Binding · **Owner:** QA / everyone
> **Governing document:** [`../00-PROJECT-RULES.md`](../00-PROJECT-RULES.md) · **العربية:** [`../../ar/systems/22-testing.md`](../../ar/systems/22-testing.md)

---

## 0. Philosophy

Tests are not a bureaucratic obligation. They are **the only thing** that lets you change a multi-tenant system confidently a year after building it — when nobody remembers why that line was written.

**The priority is not a high coverage percentage, but high coverage of what kills.** A test covering a date formatting helper is worth nothing next to a test that stops one tenant reading another tenant's data.

---

## 1. The pyramid

```
        ┌──────────┐
        │   E2E    │  Few · slow · critical journeys only
        ├──────────┤
        │Integration│ Moderate · real database · module boundaries
        ├──────────┤
        │   Unit    │ Many · fast · pure business logic
        └──────────┘
    ──────────────────────
     Security · isolation · contracts  ← cut across the whole pyramid
```

---

## 2. Test types

**`TS-001` (MUST):** Required coverage per type:

| Type | What it covers |
|---|---|
| **Unit** | Domain rules · entitlement logic · schema transforms · financial calculations |
| **Integration** | Repositories · auth guards · publish flow · billing webhooks · queues |
| **Contract** | AI output schemas · webhooks · provider adapters · API contracts |
| **E2E** | Signup → generate → edit → publish → visit the public site |
| **Security** | Cross-tenant access · XSS · upload validation · authorization · SSRF · prompt injection |
| **Performance** | Hot render path · publish bursts · analytics ingestion |
| **Visual regression** | Section variants across breakpoints and RTL/LTR |
| **Accessibility** | Main screens and every variant |

---

## 3. The one mandatory test

> ### `TS-010` (MUST) — the most important test in the entire system
> **An automated test must exist that attempts to access another tenant's Site/Lead/Asset and asserts the rejection.**
> This test is **never skipped, never disabled, never deferred** under any delivery pressure.

**`TS-011` (MUST):** The `cross-tenant.spec.ts` suite runs in CI and fails the build on any regression (`MT-060`).

> **Stage 00 applicability of `TS-010` / `TS-011`:** Cross-tenant runtime tests are N/A while there is no tenant-capable domain surface, under [ADR-001](../../adr/ADR-001-stage-00-cross-tenant-test-applicability.md). Tenant isolation remains binding from day one. No fake tenants, premature authentication, fake passing tests, or silent skips are allowed. The first tenant-capable code in Stage 01 must include the suite; no tenant-scoped resource in Stage 01 or later may merge without negative cross-tenant tests. This is not a permanent exemption and does not exempt any other test category.

**`TS-012` (MUST):** Coverage across every verb: read · list · create · update · delete · upload (`MT-062`).

**`TS-013` (MUST):** Any new tenant-owned table **is not merged** before its tests are added (`MT-064`).

---

## 4. How to write tests

**`TS-020` (MUST):** Tests are **independent**: not dependent on execution order or on state left by another test.

**`TS-021` (MUST):** Tests are **deterministic**. Flaky ones are fixed or quarantined immediately (`IN-032`).

> **Why:** One flaky test teaches the team to ignore red. After that, nobody notices the real failure.

**`TS-022` (MUST):** Tests describe **behaviour, not implementation**:

```ts
// ❌ Breaks on every refactor
it('calls websitesRepository.findById once')

// ✅ Stays correct as long as the behaviour is correct
it('returns 404 when the website belongs to another tenant')
```

**`TS-023` (MUST):** Naming states **the expectation**, so a developer reads the failure and understands the problem without opening the code.

**`TS-024` (MUST):** Integration tests run against a **real database** (a test container), never a mocked database.

> **Why:** Mocking the database hides exactly what we want to test: constraints, indexes, transaction behaviour, and race conditions.

**`TS-025` (MUST):** For every bug found in production: **a test reproducing it first**, then the fix.

> **Why:** Without one there is no proof the fix is correct, and no protection against the bug returning in six months.

**`TS-026` (MUST NOT):** Never `skip` a test without a linked ticket and a date. Skipped tests accumulate, then are forgotten.

**`TS-027` (MUST):** Fixtures create **realistic** data: Arabic and English · long and short text · absent optional fields · special characters.

---

## 5. What must always be tested

**`TS-030` (MUST):** No PR merges without tests when it touches any of:

- Tenant-dependent logic (any of it)
- Authorization or roles
- Entitlements or limits
- Billing or any financial calculation
- The publish flow
- Schema validation
- File validation
- Domain verification
- Authentication flows

**`TS-031` (MUST):** Edge cases are mandatory, not optional:

| Category | Examples |
|---|---|
| **Empty** | Empty list · site with no pages · section with minimal data |
| **Boundaries** | At the limit · one below · one above |
| **Concurrency** | Two simultaneous requests on the same resource |
| **Failure** | Network · third party · database · cache |
| **Malicious** | XSS · SQL · SSRF · path traversal · prompt injection |
| **Internationalisation** | Arabic · English · RTL · LTR · mixed characters |

---

## 6. E2E tests

**`TS-040` (MUST):** The full journey covered by **at least one test**:

```
Signup → create site → AI generation → edit text → upload image
       → change variant → reorder → publish → visit the public site
       → confirm the edits appear
```

**`TS-041` (MUST):** A **non-leakage** journey: edit without publishing → the public site **does not** reflect it (`RP-060`).

**`TS-042` (MUST):** The custom domain journey from addition to activation (with mocked DNS).

**`TS-043` (MUST):** The lead journey: a visitor submits a form → it appears in the dashboard → the notification is sent.

**`TS-044` (MUST):** E2E tests stay **few and focused**. Covering every edge case through E2E produces a slow, brittle suite the team ignores.

---

## 7. Performance and visual regression

**`TS-050` (MUST):** A query count test for page rendering (`PF-070`).

**`TS-051` (MUST):** Load testing on critical paths before launch (`PF-062`).

**`TS-052` (MUST):** Visual regression per variant across RTL/LTR × mobile/desktop (`CE-072`).

**`TS-053` (MUST):** Automated accessibility testing on every main screen (`FE-091`).

---

## 8. Anti-patterns

| # | Pattern | Why it is dangerous |
|---|---|---|
| 1 | No cross-tenant tests | The most dangerous hole passes undetected |
| 2 | Tolerating flaky tests | The team ignores all red signals |
| 3 | Testing implementation details | Breaks on every refactor |
| 4 | Mocking the database in integration tests | Hides constraints and races |
| 5 | Order-dependent tests | Obscure failures and brittle ordering |
| 6 | `skip` without a ticket | Silent accumulation, then oblivion |
| 7 | Fixing a bug without a reproducing test | It returns in six months |
| 8 | Covering only the happy path | Production is all edge cases |
| 9 | English-only fixtures | RTL breakage discovered by the customer |
| 10 | E2E for everything | A slow, brittle, neglected suite |
| 11 | Chasing a coverage percentage | Tests with no value |
| 12 | Disabling security tests to ship | Precisely what must never be disabled |

---

## 9. CI requirements

**`TS-060` (MUST):** All tests run on every PR, and all are mandatory for merge (`IN-030`).

**`TS-061` (MUST):** The security suite (cross-tenant included) is **never skipped** — not even for an urgent fix.

> The only Stage 00 cross-tenant runtime N/A is recorded under [ADR-001](../../adr/ADR-001-stage-00-cross-tenant-test-applicability.md) and the applicability note for `TS-010` / `TS-011` above. It is not permission to skip the security suite.

**`TS-062` (MUST):** Slow tests are parallelised to keep CI under 15 minutes (`IN-033`).

**`TS-063` (MUST):** Coverage reports are published, and **significant regressions are discussed** — without chasing the number for its own sake.

---

## 10. Definition of Done — testing

- [ ] Unit tests for new logic.
- [ ] Integration tests for new paths against a real database.
- [ ] **Cross-tenant tests across every verb** if the change touches tenant data.
- [ ] Contract tests for any new schema or webhook.
- [ ] Edge cases: empty · boundaries · concurrency · failure · malicious · i18n.
- [ ] Every bug fix preceded by a reproducing test.
- [ ] Tests are independent and deterministic.
- [ ] Names describe behaviour, not implementation.
- [ ] Fixtures include Arabic and English.
- [ ] Visual regression in RTL and LTR if the UI was touched.
- [ ] Accessibility test if the UI was touched.
- [ ] Performance test if a hot path was touched.
- [ ] No `skip` without a ticket and a date.
- [ ] All CI green.

---

## 11. What requires an ADR

- Changing the core testing framework.
- Skipping any test category in CI.
- Relaxing testing requirements for any system.
- Adopting testing in production.

---

## 12. Cross-references

Every system file carries a "required tests" section. The most important by far: [`01-multi-tenancy.md`](01-multi-tenancy.md) §8 and [`14-security.md`](14-security.md) §10.
