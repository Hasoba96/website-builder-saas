# CHECKPOINT 00-D CLOSURE REPORT

Date: 2026-10-01. Scope: PostgreSQL and migration foundation only.

## STATUS

**PASS**. Applicable gates passed against a real isolated Linux PostgreSQL container. No native substitution or mocked integration evidence. Checkpoint 00-E was not started.

## POSTGRESQL VERSION

PostgreSQL **18.6**, supported major, official image pinned to `postgres@sha256:77f585114c32fbca283dc835b0596f4e52b51b4c6662d7810b2f4084f60a1873`. Verified executable version; Alpine base 3.24.2. No binding major pin was found. This is the tested foundation version, not a permanent hosting selection.

## DB ARCHITECTURE

One shared schema contract, server-only configuration selectors, and a small infrastructure-only `packages/database` package. API main owns one pool and validates connectivity before starting HTTP. Worker and Next apps have no DB consumers. No ORM, generic repository, tenant context or product schema. Existing architecture and ADRs remain unchanged.

## FILES CREATED

- `.env.migration.example`
- `packages/database/package.json`, `packages/database/tsconfig.json`, `packages/database/src/index.ts`
- `packages/schemas/src/database.ts`
- `packages/config/src/migration.ts`, `packages/config/tests/database.spec.ts`
- `migrations/1790812800000_application-schema.cjs`
- `scripts/migrate.ts`, `scripts/test-database.ts`
- `tests/database/foundation.spec.ts`, `vitest.database.config.ts`
- `docs/checkpoints/00-d-dependency-review.md`, `docs/checkpoints/00-d-postgresql.md`, this report
- `docs/checkpoints/evidence/00-d-candidate-inventory.json`, clean-install/check output files with the `00-d-` prefix

## FILES MODIFIED

- `package.json`, `pnpm-lock.yaml`, `tsconfig.json`, `turbo.json`, `README.md`
- `apps/api/package.json`, `apps/api/.env.example`, `apps/api/src/bootstrap.ts`, `apps/api/src/main.ts`
- `packages/schemas/package.json`
- `packages/config/package.json`, `packages/config/src/api.ts`, `packages/config/src/server.ts`
- `scripts/check-boundaries.ts`, `scripts/configuration.spec.ts`

## PACKAGES CREATED/MODIFIED

Created `@website-builder/database`; extended existing config/schemas; API consumes the database public export. The new package has current API/operator/test consumers, not speculative domain abstractions. Root tooling adds explicit migration and real-container test commands.

## DEPENDENCIES ADDED

- `pg@8.23.0`: database runtime and root operator/test client.
- `node-pg-migrate@9.0.0`: root operator/test tooling only.
- `@types/pg@8.23.1`: build-time declarations.

Exact versions, compatibility, integrity, licenses and transitive tracking are recorded in the [dependency review](00-d-dependency-review.md). No new direct-age exception, override, fork, patch, force flag or security suppression.

## DB CONFIG

Single Zod contract in schemas. Structured host/port/name/identity/TLS/pool/timeouts, no DATABASE_URL fallback. All actual DB inputs required except optional CA; placeholder passwords rejected. Credentials never enter public configuration. Existing environment names and precedence retained. API-only Turbo dev allowlist verified; no DB allowlist for sibling tasks and no migration credentials passed through.

## RUNTIME ROLE

Disposable `wb_runtime`: LOGIN and CONNECT only, no superuser, CREATEDB, CREATEROLE, replication, schema ownership or migration-role membership. No DDL or metadata access. Later domain privileges must be explicitly granted per migration.

## MIGRATION ROLE

Disposable `wb_migrator`: separate generated credential, metadata-schema owner, database CREATE for the first application-schema migration. Not a superuser or database owner. Credentials selected only by the operator config export; application boundary checks reject that export.

## PRIVILEGE SEPARATION

PASS: runtime schema/table/temp creation and SET ROLE denied with SQLSTATE 42501; application-schema DDL and metadata reads denied after migration. Runtime credentials cannot execute migrations. Migrator up/down succeeds.

## POOL

Bounded maximum 1..20, explicit connection/acquisition, idle, query, statement, lock and idle-transaction timeouts. UTC sessions, pg_catalog search_path, schema-qualified future queries. No borrowed clients exposed and no startup retries. Idempotent close drains active queries; API shutdown deadline remains enforced. Verified fixture connection budget: maximum 6 allocated/possible test connections against server limit 100.

## MIGRATION TOOLING

`pnpm db:migrate up|down|status|check`. Explicit operator execution, unique ordered timestamp filenames, advisory locking, single transaction, non-zero failure, 60-second CLI budget, safe output. Status/check do not create metadata. Deployed down is refused; roll-forward and destructive-change review documented.

## MIGRATIONS

One reversible empty `application` schema. No application tables or columns. Down uses RESTRICT. Tool-owned `migration_meta.pgmigrations` is not modified to imitate domain timestamp semantics (DM-003).

## REAL POSTGRESQL TESTS

PASS: **10 integration cases**, exercising all required connection, lifecycle, privilege, parameter, migration, startup and failure surfaces. Container uses random credentials, unique name, loopback ephemeral port, tmpfs, resource limits and cleanup in finally. Cleanup was observed after both failed development runs and passing runs. Final labelled-container inventory is empty.

## PARAMETERIZED QUERY TEST

PASS: hostile SQL-shaped text round-trips as a bound value without executing DDL. Test role provisioning binds role/password values to PostgreSQL format(%I/%L) because role DDL does not accept protocol parameters; generated SQL is neither concatenated with user input nor logged.

## MIGRATION UP

PASS: clean-state migration creates the schema and metadata. Repeat up executes zero migrations. Down followed by up succeeds again.

## MIGRATION DOWN

PASS: disposable schema removed, applied history empty, repeat up restores state. Production-mode down rejected. No destructive production rollback promise.

## MIGRATION STATUS

PASS: pending before up, no pending after up, pending after down; check exits non-zero when pending. Clean status/check leave metadata absent.

## APP STARTUP MIGRATION CHECK

PASS: real built API boots and closes with only runtime credentials; applied migration list remains empty before and after startup. No migration import exists in the application runtime graph.

## FAILURE / TIMEOUT TESTS

PASS: wrong password (28P01), missing/malformed configuration, non-responsive server bounded by connection timeout, long query cancelled by statement timeout (57014), pool remains usable and subsequently closes. Startup errors are non-zero and never announced as successful startup.

## SECRET REDACTION

PASS: validation exposes keys only; driver errors retain only fixed messages and validated SQLSTATE, no raw cause/SQL/parameters. Generated wrong credentials and query canaries do not appear in errors. Runtime/operator credentials are stripped from unrelated application processes. Browser resolution rejects database and operator exports; public configuration remains empty.

## FORMAT

PASS: root `pnpm format:check`.

## LINT

PASS: root ESLint plus automated import/config ownership and cycle checks.

## TYPECHECK

PASS: root tsc and **10/10 Turbo tasks**, strict checks retained.

## BUILD

PASS: **7/7 real build tasks**: API, dashboard-web, public-renderer, worker, config, schemas, database. No zero-task evidence.

## TESTS

PASS: **97 total**: 10 PostgreSQL cases, 50 workspace tests, 20 root process/config/boundary/security checks, 17 browser regressions. Turbo test run: **13/13 tasks**, including prerequisite builds. AR/EN, RTL/LTR, responsive/accessibility shell checks and zero-hydration-diagnostic tests remain passing. Only harmless pre-existing terminal color warnings occurred.

## DEPENDENCY SCAN

PASS: complete workspace `pnpm audit --audit-level high` reports no known vulnerabilities. All 32 new lockfile versions belong to the reviewed 39-package candidate graph; no existing version replacements. Transitive age-only findings have an owner and 180-day maximum review deadline, plus immediate event-driven triggers.

## SECRET SCAN

PASS: Gitleaks over tracked and untracked Git-eligible source, including new reports and evidence; no suppression changes. Local environment files remain ignored.

## CLEAN INSTALL

PASS: fresh source directory with no node_modules, frozen lockfile and ignored lifecycle scripts; 356 installed packages. Root frozen install also passed. Clean-install scratch remains ignored under `.local/`; host tool policy blocked its recursive removal. It contains source and dependency files, not test database data or generated database credentials.

## LOCKFILE

PASS: SHA-256 `3b80e974cca3c55bca9e090488b163d7f4984aa1ba4f9c34c240324747b6ce20`, unchanged by both frozen installs. Strict peers, exact versions, registry source, minimum release age and lifecycle policy retained.

## RULE IDS APPLIED

CORE-002, CORE-013, CORE-016, CORE-022, CORE-023, CORE-064, CORE-070, CORE-071, CORE-131; DM-003, DM-030, DM-053; BM-052; SE-014, SE-040; IN-011, IN-053; TS-024; ADR-001 applicability. No governance edits or new ADR.

## KNOWN LIMITATIONS

- No real staging/production DB, provider credentials, full TLS deployment validation or production sizing claim. Verified TLS is enforced by configuration and driver options; real integration transport is isolated loopback.
- No OS-wide image vulnerability scan claim: Docker Scout required login. PostgreSQL published security status was reviewed; npm graph scans passed.
- Production artifact pruning, orchestration, CI workflows, backup/PITR/restore and probes belong to later checkpoints. API production dependency graph excludes migration/test tooling, but no deployment artifact exclusion claim is made.
- Abrupt host termination can bypass cleanup; exact labelled-container recovery is documented. Normal success/failure cleanup passed.

## N/A CHECKS

Cross-tenant runtime tests: N/A under ADR-001, no tenant-capable domain surface. Domain migrations and production-size migration rehearsals: N/A, no domain schema/deployment. Redis, BullMQ, R2, Sentry, Auth and product features: outside 00-D.

## MANUAL REVIEW

Reviewed every listed implementation/configuration/migration/test file, package manifests, lockfile delta, runbook and evidence. Checked ownership, necessity, strict types, secrets, parameter binding, role privileges, timeouts, retries, disposal, failure paths, rollback limitations, boundaries and scope. Fixed TCP-readiness race, Next test/build environment handoff, bootstrap cleanup, operator-output handling, and a fail-open redaction assertion. API process smoke deadline matches the existing 25-second process-test budget; DB timeouts were not loosened. No new binding conflict found.

## GIT STATUS

Existing repository was already dirty with staged/intent-to-add and untracked 00-A/B/C files. That state was preserved. No commit, staging, reset, remote change or push. Git diff/whitespace and untracked new files reviewed explicitly; historical reports and binding rules were not rewritten.

## EVIDENCE

- [Runbook](00-d-postgresql.md), [dependency review](00-d-dependency-review.md), [candidate inventory](evidence/00-d-candidate-inventory.json)
- [Fresh install](evidence/00-d-clean-install.txt)
- [Format](evidence/00-d-final-format-check.txt), [lint](evidence/00-d-final-lint.txt), [typecheck](evidence/00-d-final-typecheck.txt), [workspace](evidence/00-d-final-workspace-check.txt)
- [Build](evidence/00-d-final-build.txt), [tests and cleanup](evidence/00-d-final-test.txt)
- [Dependency scan](evidence/00-d-final-security-dependencies.txt), [secret scan](evidence/00-d-final-security-secrets.txt)

## NEXT CHECKPOINT

00-E: Redis & BullMQ Foundation. **Not started. Await explicit approval.**
