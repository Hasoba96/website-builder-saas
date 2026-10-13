# Testing baseline

Canonical execution runbook for the existing foundation. Authority remains
[Project Rules](../en/00-PROJECT-RULES.md), [testing rules](../en/systems/22-testing.md)
and [ADR-001](../adr/ADR-001-stage-00-cross-tenant-test-applicability.md).
This document adds no product surface, provider, framework, or CI workflow.

## Taxonomy and ownership

| Category             | Purpose and location                                                                        | Dependencies and mocks                                                                                                                                        | Command and mandatory point                                                                                                                                            |
| -------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit                 | Deterministic logic in package/app `tests/`; config, schemas, translations, security policy | No network, DB or Redis. Public-interface mocks allowed for isolated module behavior (BM-072); clocks may be injected/faked                                   | `pnpm --filter @website-builder/config test`, `pnpm --filter @website-builder/schemas test`; after dependency builds. New nontrivial logic requires focused assertions |
| Integration          | Real module/HTTP boundaries, API/worker `tests/`, root `scripts/*.spec.ts`                  | Real Nest modules through `@nestjs/testing`; loopback HTTP where relevant. Injected readiness callback tests mapping only, never proves DB/Redis availability | `node scripts/turbo.ts run test`; root `pnpm exec vitest run`. Built apps required; process tests require harness-owned DB/Redis                                       |
| Real infrastructure  | `tests/database/`, `tests/redis/`                                                           | TS-024 requires real pinned PostgreSQL/Redis Linux containers. No SQLite, in-memory DB, fake Redis or mocked BullMQ substitutes                               | `pnpm test:database`, `pnpm test:redis`; mandatory whenever database/queue semantics, migrations, ACLs, outages or lifecycle change                                    |
| Contract             | Shared schema/config and operational response assertions alongside their owning tests       | Use actual schemas, strict field projection, valid and invalid cases                                                                                          | Included in workspace/root/container/browser suites; mandatory when a contract changes                                                                                 |
| Application/process  | Root lifecycle/configuration tests and infrastructure suites                                | Built Node processes, real bootstrap/nonzero failure/shutdown; no mocked process success                                                                      | `pnpm test` supplies both isolated dependencies; mandatory for startup/config/lifecycle changes                                                                        |
| Browser/E2E          | `tests/browser/`, actual production Next builds                                             | Clean Chromium, no developer profile/extensions; limited Playwright. No browser unit-test platform                                                            | `pnpm test:browser` after `pnpm build`; full path includes it. Actual shell, hydration and critical journeys only                                                      |
| Security-negative    | Root/API/container/browser tests                                                            | Hostile synthetic inputs, real trust boundaries, actual privilege/ACL failures                                                                                | `pnpm test` plus dependency/secret scans. Mandatory applicable security regressions; never silently skipped                                                            |
| Visual/accessibility | Existing browser shell tests and reviewed PNG baselines                                     | Actual AR/EN browser rendering, axe smoke, keyboard/focus, overflow/mixed/long text                                                                           | Included in browser suite. Future visible UI adds relevant interactions and owner acceptance                                                                           |
| Performance          | Existing bounded pool/retry/readiness/rate tests; future hot-path/load tests                | Real resource semantics for performance claims, measured workloads                                                                                            | Included current bounds; TS-050/051 and PF-070+ become mandatory with corresponding product paths/before launch                                                        |
| Cross-tenant         | No current runtime suite                                                                    | N/A only under ADR-001, not mocked proof or a skipped test                                                                                                    | First tenant-capable Stage 01 change must include real negative integration/E2E tests                                                                                  |

Suites can cover more than one category; do not duplicate the same test merely to
claim a category. Root Vitest is a mixed integration/process/security suite, not
mislabelled as isolated unit coverage. Owners: module developer for behavior;
foundation maintainer for harness/evidence; security reviewer for negative gates.

## Canonical acceptance path

Use pinned Node/pnpm, Docker Linux, installed Playwright Chromium and pinned
Gitleaks from the existing toolchain runbooks. No native PostgreSQL/Redis or
developer browser state is required. From root:

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm format:check
pnpm lint
pnpm typecheck
pnpm workspace:check
pnpm build
pnpm test
pnpm security:dependencies
pnpm security:secrets
```

`pnpm test` owns the complete current acceptance path. Its fixture harnesses run
PostgreSQL/Redis, six workspace test tasks, root tests, and Playwright. It is
noninteractive and fails on any child failure; a missing Docker/browser capability
is a failure, never a mock fallback or skip. Narrow commands aid diagnosis but do
not by themselves close a checkpoint. Build/runner/container operations retain
bounded deadlines. Do not run concurrent full paths in the same checkout: built
output, report paths and fixed process/browser ports are shared resources.

## False-pass protection

- `scripts/test-evidence.ts` records current suite ownership and minimum executed
  counts. Newly added/removed/moved files require deliberate inventory review.
  Counts are regression floors, not a substitute for meaningful assertions.
- Full verification removes only its named previous JSON and coverage summaries before starting;
  stale reports cannot satisfy a missing task. Native Vitest/Playwright JSON
  reports must contain every expected file and successful executed tests.
- Zero discovery, empty files, lost tasks, missing reports, skipped/todo tests,
  failed/retried browser tests and regressed minimum counts cannot close PASS.
- Vitest requires assertions and forbids `.only`; Playwright forbids `.only`.
  Lint rejects skip/todo/conditional skip/expected-failure/focused members in
  acceptance specs. Runtime report checks also catch conditional/dynamic skips.
- Meta-tests attack empty/missing/skipped/failed reports and run the real Vitest
  CLI against disposable zero-test, zero-assertion and focused-test fixtures.
  Intentionally invalid fixture strings are test data, not disabled acceptance tests.
- Native reports show what executed; source-wiring meta-tests are supplementary,
  not evidence that Docker or browsers actually worked.

No tool proves assertion relevance. Manual review must reject tautologies,
success-only infrastructure tests, mocks replacing real semantics and misleading
N/A claims. Changing inventory/counts to conceal removed coverage is prohibited.

## Isolation, data and cleanup

Retain [PostgreSQL](00-d-postgresql.md) and [Redis/BullMQ](00-e-redis-bullmq.md)
fixture contracts: digest pins, UUID names, exact labels, ephemeral loopback ports,
CPU/memory/PID caps, generated credentials, separated DB roles and restricted Redis
ACL namespaces. Credentials are synthetic, never production data or committed
values. Random resource IDs protect ownership; tests assert behavior, not the
literal generated value. Deterministic content includes Arabic/English, long,
short, missing, mixed and hostile values where applicable (TS-027).

Infrastructure files run serially because outage tests deliberately pause their
single owned container. Files/tests must restore altered state in `finally` or
hooks, not rely on execution order. Migration verification returns the database
to no-applied-migration state. Namespaced queue tests close their own connections;
container disposal removes remaining technical state. No Product Jobs exist.
Use condition polling with bounded deadlines rather than tight timing assertions;
real timeout assertions allow scheduling tolerance without changing production limits.

Harness cleanup runs on success/failure and ordinary handled interruption. Abrupt
host termination cannot guarantee teardown. Recover only exact labelled/name
resources after inspecting ownership, following the D/E runbooks. Never prune
unrelated containers/volumes or use wildcard deletion. Record final inventory.

## Failure paths and future tenant contract

Success-only tests are insufficient for infrastructure/security/domain changes.
Add applicable invalid-input, unavailable-dependency, timeout, duplicate/replay,
partial-failure, shutdown and redaction cases. Auth failures become mandatory with
Auth. The first tenant-capable Stage 01 code must prove Tenant A cannot read,
mutate, enumerate or access Tenant B through alternate identifiers/routes, across
implemented operations under TS-012. Unit mocks alone cannot establish isolation.
No tenant-scoped merge without real negative coverage; ADR-001 is not permanent.

## Browser, visual and accessibility acceptance

Keep browser tests focused: shell, AR/EN, RTL/LTR, hydration diagnostics, keyboard,
axe, CSP execution, secret exposure and later critical user flows. Use lower-level
tests for deterministic logic. Existing viewports: 390x844 and 1440x900. Current
visual baselines are Windows/Chromium-specific; a different CI image needs
deliberately reviewed platform snapshots, not relaxed thresholds or blanket updates.

For actual user-visible product milestones, automated green tests alone are
insufficient. Require real browser desktop/mobile checks in Arabic RTL and English
LTR, no obvious overflow/overlap, screenshots, and owner/manual visual acceptance.
Inspect changed snapshots before approval. No product UI is introduced here.

Axe and keyboard smoke do not certify WCAG compliance. Future interactive UI adds
focus order, visible focus, labels/semantics, error announcements, modal trapping,
Escape/return-focus and other FE-050+ behaviors as those surfaces arrive.

## Skips, coverage and test-only safety

Current acceptance inventory permits no skip/todo/focused/expected-failure tests.
TS-026 requires linked ticket/date for any temporary skip; quarantine also needs
owner, reason, expiry and an explicit missing-evidence disposition. It must not be
reported as PASS. Skipping an entire required CI category requires the existing
testing section 11 ADR process. Fix/quarantine flakes immediately (IN-032), never
weaken a security assertion or hide instability behind retries.

TS-063 coverage reports are emitted with the official matching V8 provider to
`coverage/<runner>/index.html` and `coverage-summary.json`. No arbitrary global
percentage target. Workspace reports include unexecuted `src` files; root/infra
reports include compiled package JS and tooling because those tests use actual
built exports. These overlapping reports are not summed into a misleading global
percentage. Child-process and browser execution are **not** included in Vitest
coverage; their native test evidence remains mandatory. Review significant
coverage regressions against behavior/risk, not a vanity number. No mutation or
fuzz framework is needed for the current targeted hostile-input suite.

The existing boundary checker rejects production imports of `tests`, `fixtures`,
`__tests__`, `__mocks__`, spec/test files, the testing package and test frameworks.
Only Vitest config may import runner configuration. Test-only Nest controllers and
BullMQ processors remain outside production module imports. No NODE_ENV-based
production security bypass is allowed.

## CI handoff and closure evidence

00-J must invoke the canonical commands, publish native test JSON, coverage HTML/
JSON, Playwright failure traces/screenshots and a sanitized command summary with
duration/exit codes even on failures. No workflow or external reporting service
is created in 00-H. `.local/test-evidence/summary.json` exists only after the full
guard succeeds. Reports live outside Git; review before artifact publication and
apply restricted retention/access. Never upload environment dumps or credentials.

Closure records exact suite/task counts, execution times, all failures and fixes,
zero unexplained skips, real-container evidence and final inventory, security
scans, artifact exposure checks, lockfile/frozen install, manual review, N/A reasons
and deployment/platform limitations. Provider CI, production load, full WCAG and
tenant isolation must not be claimed from this local foundation run.
