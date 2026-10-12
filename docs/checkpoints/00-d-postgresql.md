# PostgreSQL and migrations foundation

Checkpoint 00-D adds infrastructure, not domain storage. PostgreSQL is the system of record; no ORM, tenant context, repositories, queues, probes or domain tables exist yet. The worker and both Next applications have no database consumer or credentials.

## Ownership and configuration

`packages/schemas/database` defines the one Zod contract. `packages/config/api` selects runtime credentials; `packages/config/migration` selects operator credentials. Both are server-only exports. Public configuration remains empty. `packages/database` owns the driver/pool and safe error boundary; this concrete infrastructure package is shared by the API, migration operator and real integration tests, as authorized by 00-D. No cross-app internals are imported.

API main owns one pool, verifies connectivity before HTTP bootstrap, and closes it on bootstrap failure or shutdown. Worker does not create a redundant pool. There are no retries and no startup migrations. Queries accept SQL plus bound values, with no escaping/concatenation utility for application queries. Connections do not escape the pool boundary. Idle errors emit only an event and optional SQLSTATE. SQL text, values, credentials and raw driver causes are never logged.

Every DB setting is required except DB_CA. There are no implicit production or local DB defaults. The existing NODE_ENV/APP_ENV contract and precedence remain unchanged.

| Variable                                  | Contract                                                                                             |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| DB_HOST                                   | IPv4, IPv6 or hostname                                                                               |
| DB_PORT                                   | Integer 1..65535                                                                                     |
| DB_NAME / DB_USER                         | Lowercase SQL identifier, max 63 characters                                                          |
| DB_PASSWORD                               | Nonempty secret; REPLACE_ME is rejected                                                              |
| MIGRATION_DB_USER / MIGRATION_DB_PASSWORD | Operator-only replacement for runtime identity; runtime reader never selects these                   |
| DB_TLS                                    | disable or verify-full; disable allowed only on loopback in local/ci                                 |
| DB_CA                                     | Optional PEM CA for verify-full, otherwise system trust; certificate verification cannot be disabled |
| DB_POOL_MAX                               | Integer 1..20, runtime only; operator uses one connection                                            |
| DB_CONNECT_TIMEOUT_MS                     | Integer 100..10000; bounds connection and pool acquisition                                           |
| DB_IDLE_TIMEOUT_MS                        | Integer 100..60000                                                                                   |
| DB_STATEMENT_TIMEOUT_MS                   | Integer 100..30000                                                                                   |
| DB_QUERY_TIMEOUT_MS                       | Integer 100..35000, greater than statement timeout                                                   |
| DB_LOCK_TIMEOUT_MS                        | Integer 100..30000, no greater than statement timeout                                                |

Sessions use UTC and pg_catalog search_path. Future queries must schema-qualify application objects. Idle transactions are bounded by the statement timeout. The existing application SHUTDOWN_TIMEOUT_MS bounds process shutdown; pool closure drains bounded in-flight queries, and repeated close calls are safe. The disposable test server has 100 connections: runtime pool 2, concurrent API verification pool 2, migration operator 1 and fixture administrator 1 total at most 6, leaving 94 slots. Worker and web apps own zero DB pools. Size the sum of all deployed process pools below the server's connection budget, reserving operator capacity. Current numbers are local/CI limits, not production sizing.

## Local tests

Prerequisites: pinned Node/pnpm from 00-A, Docker Desktop with Linux containers (or compatible Docker Engine), and the official pinned PostgreSQL image. No Compose or persistent local service is installed by this checkpoint.

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm test:database
pnpm test
```

The test runner starts PostgreSQL 18.6 at the digest recorded in the dependency review, with random credentials, an ephemeral loopback port, tmpfs data, resource limits and a unique name. It provisions non-superuser runtime/migration roles and runs real integration tests. The container is removed in finally on success/failure and on supported termination signals. Abrupt host/process termination cannot guarantee cleanup; identify only containers labelled `website-builder.test=00-d` and remove the exact abandoned test container. Never delete unrelated containers or volumes. Tests do not use native PostgreSQL or mocks as substitutes. The root test command also runs existing workspace, process and browser regressions with runtime credentials only.

## Operator setup and privileges

For a separately provisioned development database, its administrator creates the database and two LOGIN roles (example names wb_runtime and wb_migrator). Set generated passwords interactively with psql `\password`, or via the approved secret manager; do not place passwords in SQL files/history or command arguments. Neither role is superuser, database owner, role administrator, replication role, or CREATEDB role.

Administrator grants CONNECT to both roles, revokes database TEMP and CREATE from PUBLIC, revokes PUBLIC CREATE on public schema, grants database CREATE only to the migrator for the initial schema creation, and creates `migration_meta AUTHORIZATION wb_migrator`. Runtime has no migration-role membership, schema CREATE or metadata access. The disposable fixture proves these permissions. After schema creation, operators may remove the migrator's database CREATE privilege; later schema changes require explicit review. Future domain migrations must explicitly grant only necessary object privileges to runtime, without granting schema ownership/DDL.

Copy `apps/api/.env.example` to its ignored `.env` and supply runtime credentials. Copy root `.env.migration.example` to ignored `.env.migration` and supply migration credentials separately. Process environment wins over the optional operator env file, following native Node loading; there is no DATABASE_URL or alternative PG* configuration path. Root `pnpm dev` passes the explicit DB runtime allowlist only to the API task, not to sibling applications or build tasks. Do not export migration credentials into normal application environments. Never pass secrets in shell arguments. The test fixture generates and supplies credentials in memory.

## Explicit migration commands

Run from repository root after building packages:

```sh
pnpm db:migrate status
pnpm db:migrate check
pnpm db:migrate up
pnpm db:migrate down
```

`status` reads ordered local filenames and applied metadata without creating tables. `check` exits non-zero for pending or divergent history. `up` uses node-pg-migrate's ordering, advisory lock and single transaction. Repeating up performs no already-applied migrations. `down` runs one reviewed migration and is refused outside local/ci. Operator errors exit non-zero without SQL/credentials. The CLI has a 60-second total safety budget; after interruption or timeout, inspect status before retrying. This is a foundation budget, not permission to force long production migrations through it. No migration is run by API boot.

The first versioned CommonJS migration creates the empty `application` schema. This proves actual transactional DDL without inventing business tables or columns. Its down uses RESTRICT, never CASCADE. The tool owns `migration_meta.pgmigrations`, including its internal timestamp columns; DM-003 does not require changing that metadata. Migration credentials own metadata and application schema, never runtime.

Future migrations use unique timestamp-prefixed ordered files in `migrations/`, with explicit up and reviewed down/recovery behavior. Do not edit an applied migration. Prefer expand/contract and roll-forward recovery in deployed environments; a code rollback does not imply a destructive database rollback. Destructive changes require the documented approval, rollout and recovery strategy, restore evidence and production-size rehearsal before deployment. No such production readiness is claimed by disposable up/down tests.

## Failure and security handling

Invalid/missing config identifies keys, not values. Auth/connect/query failures use sanitized DatabaseError with only a validated SQLSTATE; no raw cause. Fix access, TLS trust, role permissions or timeout budgets explicitly rather than retrying forever. TLS verification is enabled for all non-local deployments. Integration proves plaintext loopback behavior; production TLS/network/provider deployment is not provisioned here. No external diagnostics are sent. Migration tooling is a root dev/operator dependency, not an API runtime dependency.

Related: [configuration](00-c-configuration.md), [dependency review](00-d-dependency-review.md), [data rules](../en/systems/02-data-model.md), [security](../en/systems/14-security.md), [testing](../en/systems/22-testing.md), [ADR-001](../adr/ADR-001-stage-00-cross-tenant-test-applicability.md).
