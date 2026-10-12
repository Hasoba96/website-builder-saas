# CHECKPOINT 00-I CLOSURE REPORT

Verified 2026-10-08 (Africa/Cairo), with final checks spanning October 7 UTC.
Scope: Containers & Local Infrastructure only. 00-J has not started.

## STATUS

**PASS** for the implemented and tested local baseline. This is not production,
staging, global security, or owner acceptance of any later checkpoint.

## LOCAL INFRASTRUCTURE ARCHITECTURE

Canonical Docker Compose contains PostgreSQL and Redis only. Applications remain
developer-run by default. Four independently deployable application image targets
satisfy IN-002 without adding an application orchestration topology. Existing D/E
ephemeral integration harnesses remain separate and unchanged.

## SERVICES

Two infrastructure services, four independently verified application images, zero
Product Jobs, zero Auth/Tenant implementation, no CI workflow or backup workflow.

## POSTGRESQL

18.6, existing D image pin. Dedicated `foundation` database; SCRAM host authentication.
`wb_runtime` cannot perform DDL or read migration metadata. `wb_migrator` owns the
migration schema and can perform explicit migrations. Neither is superuser or database
owner. Admin provisioning credentials never enter ordinary application configuration.

## REDIS

7.2.16, existing E image pin. Default user disabled. Worker ACL restricts keys/channels
to `website-builder:local:*`; separate PING-only health identity. No persistent Redis
storage, product queue, anonymous fallback, or system-of-record responsibility.

## IMAGES

- PostgreSQL: `postgres@sha256:77f585114c32fbca283dc835b0596f4e52b51b4c6662d7810b2f4084f60a1873`.
- Redis: `redis@sha256:29e8589c3f9ba699b5f7aa4b3c7733c58852a3626439e619aa0ee78de08c6ca0`.
- Node: `node:24.21.0-alpine@sha256:ebfe2f90462722a7a4de65e91990e97fe0d401c70e0e762c5b53302f905ec1c1`.
- All four application image builds and smoke checks passed on Linux amd64.
  Build durations: API 272.52s, Worker 130.71s, Dashboard 61.48s, Renderer 62.17s.
- Runtime UID 1000, read-only root, dropped capabilities, bounded resources, readiness,
  exact minimal health shape, AR/EN where applicable, structured logs and shutdown exit 0.
- Installed package identities checked against locked inventory: API 115, Worker 131,
  Dashboard 17, Renderer 17. No installed Vitest/Playwright/TypeScript/Nest testing
  packages or project test fixtures. Framework-vendored internals are not separate
  installed package identities. No OS-wide image CVE certification is claimed.

## NETWORK

Dedicated labelled Compose bridge per checkout. No host networking or Docker socket.
Not a hostile-container isolation boundary. No production ingress design introduced.

## PORTS

Actual developer bindings verified: PostgreSQL `127.0.0.1:15432`, Redis
`127.0.0.1:16379`. Tests use their own ephemeral loopback ports. Occupied ports fail
without killing the existing owner. Alternate explicit ports are validated at init.

## CREDENTIALS

Random non-production credentials generated into ignored `.local/infrastructure`.
Private POSIX directory/file permissions; Windows inherits checkout ACLs. Tracked
Compose contains file references, not credentials. API, Worker and migration helpers
project only their own validated configuration keys. Local Docker administrators are
trusted and can inspect mounted secrets; this is not a production secret manager.

## PERSISTENCE

PostgreSQL survives restart/stop/down. Redis restart discards state. Neither normal
startup nor application boot runs migrations or destroys local data.

## VOLUMES

One exact project-labelled PostgreSQL named volume. Redis uses bounded tmpfs. Reset
checks ownership before deleting that exact volume; a foreign-label sentinel was
preserved during the negative ownership test.

## HEALTHCHECKS

PostgreSQL pg_isready and authenticated Redis PING with bounded checks. Compose waits
for actual health, not a fixed sleep. These are distinct from application probes.

## APPLICATION CONFIGURATION

Existing 00-C selectors and structured variables remain authoritative. API needs
PostgreSQL, not Redis. Worker needs Redis. Public allowlist remains empty. Plaintext
is restricted to existing local/CI literal-loopback rules; non-loopback deployment
still requires verified TLS. No DATABASE_URL/REDIS_URL shortcut or new schema system.

## STARTUP WORKFLOW

Use the [runbook](../runbooks/local-infrastructure.md): frozen install, build with
APP_ENV=local, `pnpm infra init`, `pnpm infra up`, `pnpm infra status`, explicit
migrations, then `pnpm infra run api` / `pnpm infra run worker`. Existing web commands
remain available. Local file configuration is authoritative only for the explicit
local helper; ordinary application precedence is unchanged.

## MIGRATION WORKFLOW

`pnpm infra migrate status`, `up`, and `check` passed on developer infrastructure.
The existing `1790812800000_application-schema` migration was applied, pending was
empty, and repeated up executed zero migrations. Disposable tests also prove fresh
state, restart persistence and reset. No new migration or domain table was created.

## STOP WORKFLOW

Stop apps using Ctrl+C, then `pnpm infra stop`; `pnpm infra down` also removes owned
containers/network while retaining data. Local process helper forwards shutdown.
Next standalone signal exits are normalized only after the requested signal and
framework cleanup; a 10-second deadline preserves bounded failure behavior.

## RESET WORKFLOW

`pnpm infra reset --delete-local-data` deliberately destroys only the exact owned
local PostgreSQL volume and project containers/network. It retains configuration.
Missing confirmation and foreign volume ownership are rejected. No global prune,
wildcard deletion, test-fixture deletion or automatic reset.

## WINDOWS / WSL2

Verified on Windows 11 PowerShell, Docker Desktop 4.93.0, Engine 29.8.1,
Compose 5.5.1, Linux amd64 containers. No native PostgreSQL/Redis, Docker-in-Docker,
or WSL-shell-only workflow required.

## CONTAINER SECURITY

Official digest-pinned images; no privileged mode, host networking, arbitrary device,
Docker socket or unrelated filesystem mount. Redis is non-root, read-only and drops
capabilities. PostgreSQL retains official image initialization privileges. Both use
no-new-privileges. Runtime app images are non-root; build context excludes env files,
local state, test fixtures and host build output.

## RESOURCE BOUNDS

PostgreSQL 512 MiB / 1 CPU / 128 PIDs; Redis 256 MiB / 1 CPU / 64 PIDs,
96 MiB data, 64 clients, noeviction. Current API pool max is 2; no other app DB pool.
One operator and one provisioning connection leave ample local headroom. Not
production sizing. Turbo tasks default to concurrency 1 after measured memory
exhaustion; every required task and assertion still executes.

## TEST HARNESS ISOLATION

Full guarded tests ran with both developer services healthy. Captured inventory
showed distinct D/E UUID containers and ephemeral ports alongside the developer
services. D/E fixtures cleaned up without disturbing those services. Local suite
uses a separate UUID Compose project. Image smoke uses another owned fixture, not
developer data. No persistent service substituted for a required test container.

## FAILURE BEHAVIOR

Verified missing/invalid configuration, role-only projection, safe Docker command
failure, port collision, rejected reset/foreign ownership, PostgreSQL and Redis
outages, API independence from Redis, dependency-independent health, bounded readiness,
credential redaction, restart semantics and clean shutdown. No native/mock fallback.
Abrupt host termination still requires exact-labelled recovery documented in runbook.

## FILES CREATED

- `.dockerignore`
- `infra/compose.yaml`
- `infra/Dockerfile`
- `scripts/infra.ts`
- `scripts/local-infrastructure.ts`
- `scripts/local-infrastructure.spec.ts`
- `scripts/test-local.ts`
- `scripts/test-images.ts`
- `tests/local/foundation.spec.ts`
- `vitest.local.config.ts`
- `docs/runbooks/local-infrastructure.md`
- `docs/checkpoints/00-i-image-review.md`
- `docs/checkpoints/00-i-closure-report.md`
- `docs/checkpoints/evidence/00-i-verification.json`

## FILES MODIFIED

- `README.md`, `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `tsconfig.json`.
- `apps/api/package.json`, `apps/worker/package.json`.
- `apps/dashboard-web/package.json`, `apps/public-renderer/package.json`.
- `apps/dashboard-web/next.config.ts`, `apps/public-renderer/next.config.ts`.
- `packages/config/package.json`, `packages/schemas/package.json`.
- `packages/database/package.json`, `packages/queues/package.json`, `packages/observability/package.json`.
- `scripts/next.ts`, `scripts/turbo.ts`, `scripts/test-all.ts`.
- `scripts/test-evidence.ts`, `scripts/test-evidence.spec.ts`, `scripts/test-policy.ts`.

## PACKAGES CREATED/MODIFIED

No package created. Existing nine workspace package manifests gain production file
boundaries; existing runtime package logic is unchanged. Next gains standalone output.

## DEPENDENCIES ADDED

Zero direct dependencies added. Only transitive `source-map-js` changed from 1.2.1
to 1.2.2 to resolve High GHSA-68fv-2mgg-jv7q, after recorded review. No override,
suppression, force, framework change or unrelated update. See [review](00-i-image-review.md).

## LOCAL INFRASTRUCTURE TESTS

PASS: 6 real local integration tests, plus 2 root helper/configuration tests.
Local suite 53.18s in the final full run. Ordinary cold-start contention was fixed by
starting API/Worker sequentially with the same 15-second per-app readiness deadline;
both remain live during isolation checks. Assertions were not weakened.

## POSTGRESQL REGRESSION

PASS: 11 real-container tests, 13.66s; privileges, parameter binding, migrations,
pool/failure/shutdown behavior and operational readiness preserved.

## REDIS/BULLMQ REGRESSION

PASS: 15 real-container tests, 23.08s; ACLs, namespaces, bounded retry/retention,
idempotency, outages, shutdown, payload/credential safety preserved.

## OBSERVABILITY REGRESSION

PASS within guarded root/API/database/browser suites: structured schema, correlation,
sanitized errors, minimal probes, bounded dependency checks and lifecycle behavior.

## SECURITY REGRESSION

PASS within unchanged guarded suites: headers/CSP, CORS/Host, input bounds, abuse
controls, negative canaries, no browser secret exposure, DB/Redis boundaries.

## TESTING BASELINE REGRESSION

PASS: 11 expected report groups, per-suite minima, inventory/coverage evidence,
no zero-test success, no skipped/todo tests, no focused-test or test-only import bypass.
The new local suite is mandatory in `pnpm test`; image smoke is an additional explicit gate.

## BROWSER REGRESSION

PASS: 25 tests, 35.6s, zero skipped/flaky/retried tests. AR/EN, RTL/LTR, hydration,
desktop/mobile shell, accessibility smoke, CSP/headers and secret boundaries.
Container web smoke additionally checks AR/EN HTML; it does not claim a second
full browser run against image-hosted applications.

## FORMAT

PASS: `pnpm format:check`; final documentation formatting checked after closure edits.

## LINT

PASS: `pnpm lint`, including boundary/cycle checks, 17.39s.

## TYPECHECK

PASS: root plus 14/14 uncached Turbo tasks, 98.94s overall.

## BUILD

PASS: `pnpm build`, 9/9 uncached tasks, 125.55s; all four real apps plus five packages.
Four Docker builds and four image runtime smoke checks also passed.

## TESTS

PASS: `pnpm test`, 158 tests across 11 groups in 302.804s. Counts: root 46, API 4,
Worker 2, config 29, schemas 12, Dashboard 4, Renderer 4, PostgreSQL 11, Redis 15,
local infrastructure 6, browser 25. Turbo application test path executed 15/15 tasks;
fixture preparation builds executed 7/7, 5/5 and 5/5. No 0-task acceptance.

## DEPENDENCY SCAN

PASS: final `pnpm security:dependencies`, no known vulnerabilities. Strict peers,
engines, exact direct versions, maturity floor, trusted registry and disabled install
hooks retained. Existing tracked findings retain owner/deadline/event triggers.

## SECRET SCAN

PASS: existing Git-eligible tracked/untracked scanner, no new suppression or allowlist.
Final post-document scan count is recorded in machine-readable evidence.

## CLEAN INSTALL

PASS: fresh isolated workspace with no existing node_modules, frozen lockfile and
disabled lifecycle scripts, 382 packages, 290.2s. Reused download cache does not
replace dependency resolution/integrity checks. Lock hash unchanged by frozen install.

## LOCAL CONTAINERS FINAL STATE

Both developer services were healthy during regression; deliberately brought down
after verification. Zero remaining containers. Generated local configuration and
one developer PostgreSQL volume retained. Four application images retained locally.

## TEST CONTAINERS REMAINING

**0** PostgreSQL, **0** Redis, **0** application smoke containers; no test network or
test volume remained. No unrelated Docker resource deleted.

## LOCKFILE

PASS: workspace injection setting supports pnpm's locked production deployment.
Only package version delta is the reviewed source-map-js security patch. SHA-256:
`98e2996baf017a1ee2efbf2c22690c0c50e712228763cc9dd2f8f30893320f58`.
Lockfile remains uncommitted with the pre-existing working tree; commit in the later
reviewed Git change, not omitted from version control.

## RULE IDS APPLIED

CORE-002, CORE-016, CORE-023, CORE-064, CORE-070, CORE-071;
IN-002, IN-003, IN-004, IN-005, IN-010, IN-011, IN-012, IN-014, IN-030,
IN-052, IN-053; SE-060 through SE-064; TS-020, TS-021, TS-024, TS-026;
QJ-010 through QJ-012; ADR-001. No governing rule or ADR changed.

## KNOWN LIMITATIONS

Linux amd64 verified, not arm64. Windows host file ACLs must remain private. No
hostile Docker-administrator isolation, production TLS/HSTS/ingress, real staging,
production sizing, OS-wide image vulnerability certification, backup/restore or DR
claim. Source advisories and audit are bounded evidence, not proof of no malware.
Initial memory/cold-start/image-packaging failures were corrected and gates rerun;
failed attempts are not presented as passing evidence.

## N/A CHECKS

Cross-tenant runtime tests: ADR-001, no tenant-capable surface. Product jobs, Auth,
domain schema and product UI: absent by scope. CI provider workflow: 00-J.
Backup/restore smoke: 00-K. No native database or mocked infrastructure substitution.

## MANUAL REVIEW

Reviewed every listed implementation/configuration file and new documentation:
Compose pins, actual bindings, labels, volumes, ACL/role ownership, redaction,
health/startup/reset/failure behavior, package boundaries, Docker packaging and context,
Next shutdown, lock graph, test wiring/cleanup and evidence. Local Markdown links and
whitespace checked. No architecture change, synthetic domain, or new external service.

## GIT STATUS

Repository already contains staged/intent-to-add/untracked A-H work and no normal
committed baseline. `git status`, `git diff` and `git diff --check` reviewed; new files
also reviewed directly because untracked files are absent from ordinary diff. No
staging, commit, remote, push, revert or historical report rewrite performed. The file
lists above are checkpoint-specific, not an assertion that all Git additions are new
in 00-I. Split later review/PRs according to CORE-044; no merge acceptance claimed.

## EVIDENCE

[Sanitized verification record](evidence/00-i-verification.json),
[local runbook](../runbooks/local-infrastructure.md), and
[image/security review](00-i-image-review.md). Local raw command logs are under
`.local/evidence/00i-*`; runner reports under `.local/test-evidence`. Credentials and
raw environment are excluded from published evidence. Earlier checkpoint reports
remain historical evidence and were not rewritten.

## NEXT CHECKPOINT

**00-J — CI Pipeline. Not started. Stop pending explicit owner instruction.**
