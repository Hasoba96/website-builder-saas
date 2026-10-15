# Stage 00 backup/restore smoke

Owner: Hasoba96, infrastructure module. This is a disposable local/CI rehearsal, not an operator command for existing databases or a production backup service.

## Scope and requirements

The Playbook Stage 00 gate requires a documented backup/restore smoke. The approved Stage 00 technical decision report limits this to isolated synthetic data, measured elapsed time and integrity verification. PostgreSQL is the only current system of record. Redis is disposable infrastructure; no Redis backup is introduced. No R2 consumer, assets or object metadata exist. R2 backup/versioning belongs with the later storage surface, not a fake emulator or provider integration here.

- BR-001/014/060: real pg_dump, archive validation, clean-target pg_restore, integrity assertions and measured time.
- BR-012: temporary archive bytes are encrypted using Node's standard AES-256-GCM implementation, a fresh random key and nonce per archive. Key, nonce and authentication tag stay in process memory, separate from the encrypted file; never logged or persisted. This test-only use does not define a production cryptographic protocol or key-management design.
- BR-013: the encrypted archive is outside the database/container in an ignored host temporary directory. Same-host testing is not off-host disaster recovery.
- BR-015/CORE-016: database dump uses an explicitly granted read-only role; restore uses the existing non-superuser migration role. Fixture administration is confined to a verified disposable container. Native test results and safe structured smoke evidence record the exercise; production access auditing is not implemented.
- BR-023: the ordered procedure below defines local decision ownership, verification and failure handling. No customer communication is needed for synthetic data; production incidents require an approved owner-led communication plan before activation.
- TS-020/024/026/027/060/063: real container tests, synthetic AR/EN/JSON/UTC values, negative cases, no skips, native reports/coverage, automatic inclusion in the guarded test path.

No PostgreSQL backup strategy/provider is replaced. BR-010/011/016/020/021 and full production DR remain unfulfilled future operational requirements: scheduled backups/PITR, approved daily/weekly/monthly retention durations, durable separately managed keys, authenticated encrypted remote transport, off-host location, R2 retention, quarterly scheduling, and measured commercial RPO/RTO. This smoke must not be advertised as satisfying them. No retention duration is invented or changed.

## Safety preflight

Use the pinned Node/pnpm and Docker Desktop Linux engine. Check C: (Docker's physical backing drive), F: (checkout), memory, and WSL storage before running. The existing PostgreSQL 18.6 image is pinned to `postgres@sha256:77f585114c32fbca283dc835b0596f4e52b51b4c6662d7810b2f4084f60a1873`. Do not pull/build images under capacity pressure. WSL's large virtual free-space figure does not replace physical host capacity.

The smoke reuses the existing 00-D harness: unique `wbp-00d-<uuid>` name, `website-builder.test=00-d`, ephemeral loopback port, 512 MiB memory, one CPU, 128 PIDs and tmpfs database storage. The helper verifies the exact image, label, no persistent mounts and PostgreSQL tmpfs, then pins the immutable container ID. It cannot accept a development database name, arbitrary host or external archive. Local PostgreSQL socket/Docker IPC remains within the trusted test host; no remote backup transport or production TLS proof is claimed.

Budget: one existing-image container, three small fixture databases including the original harness database, at most 4 MiB dump/output per command, 15-second command deadline and 2-second dump lock wait. Allow approximately 512 MiB container memory plus bounded Node/build memory, less than 1 GiB estimated additional temporary host storage, and keep at least 2 GiB physical free-space reserve. The full regression path has additional costs; assess it separately. Stop if capacity or Docker health is unsafe. Never prune, relocate/reset Docker, unregister WSL, or touch persistent volumes.

## Commands and lifecycle

From the publication checkout, after the standard frozen installation:

```powershell
pnpm test:backup
pnpm test:database
```

`test:backup` builds the existing API dependency closure and runs only the new focused suite in the real disposable database harness. It is not evidence for the full suite. `test:database` includes old and new database suites. `pnpm test` and `pnpm ci:verify` include the required backup suite through the existing guarded database category; missing discovery/counts remain fatal. No workflow changes are needed.

1. Harness creates its own PostgreSQL container and existing runtime/migration roles with generated credentials. Persistent development services are neither required nor modified.
2. Tests create `backup_source` inside that owned container, run actual versioned foundation migrations, and add only `application.smoke_records` as a test fixture. No production migration or domain schema is added.
3. `backup_reader` receives CONNECT, schema USAGE and SELECT on the exact fixture tables/sequences. It has no password/network login capability; local socket trust is confined to the owned test container. It cannot administer roles/databases or modify source records.
4. `pg_dump -Fc` produces a compressed custom-format archive through a bounded process pipe. `pg_restore --list` checks its structure. Plain bytes exist only in process memory and are overwritten after use; encrypted bytes are created exclusively in `.local/00k-backup-*/snapshot.enc`.
5. Restore checks size, regular-file identity, SHA-256, AEAD authentication and archive structure before creating the target. `CREATE DATABASE backup_target` without DROP/IF NOT EXISTS atomically refuses an occupied target. No overwrite mode exists.
6. `pg_restore --no-owner --exit-on-error --single-transaction` restores into the new database using `wb_migrator`. ACL entries remain in the dump; roles are intentionally pre-provisioned in the fixture, not exported with global passwords. Data, sequence continuation, NOT NULL constraint, runtime SELECT/no-DDL and migration metadata/idempotent up are checked.
7. Compare source records before/after; preserve the source during restore. Refuse tampering, truncation, missing archive, invalid scope, duplicate backup/occupied target and insufficient dump privileges. Failures remain nonzero and sanitized; there is no retry loop or native/mock fallback.
8. Finally remove only the helper-created encrypted directory and clear its key material. The original harness finally removes its own container and databases. It does not remove existing development volumes. Repeated helper close is safe.

No plaintext dump, credentials, key or raw database content is written to tracked evidence. The safe JSON exercise line reports resource ID, encrypted artifact digest/size, elapsed times and assertion outcomes. Native Vitest JSON and coverage use existing report locations. Reports preserve failures rather than representing a setup failure's skipped tests as success.

## Failure and recovery

On corruption, permission failure, timeout or occupied target: fail closed, inspect sanitized evidence, do not retry against another database. A failed restore may leave its newly created disposable database, but transaction failure does not silently yield a usable partial restore. Harness teardown removes the whole owned environment. If the host terminates abruptly, preserve evidence and identify the exact abandoned container by name, ID and label; remove only that resource after owner authorization when required. Never use wildcard deletion or prune.

The encrypted file is deliberately unusable after its ephemeral key is discarded. On abrupt termination an encrypted residue may remain under its exact `.local/00k-backup-*` directory; recover ownership evidence before deliberate cleanup. This is test-fixture cleanup, not a production retention policy. No real data is permitted, and no portable/durable backup key recovery claim is made.

Rollback of implementation: a separately authorized ordinary revert PR after publication. No application state or persistent data migration is involved. Before any real deployment, independently review production backup permissions, encryption/key recovery, remote transport, storage, retention and provider/PITR behavior under BR rules and CORE-045; do not activate this test helper as an operational service.

References: [PostgreSQL pg_dump](https://www.postgresql.org/docs/18/app-pgdump.html), [pg_restore](https://www.postgresql.org/docs/18/app-pgrestore.html), [Node crypto](https://nodejs.org/docs/latest-v24.x/api/crypto.html), [Binding backup rules](../en/systems/21-backup-dr-retention.md), [PostgreSQL foundation](../checkpoints/00-d-postgresql.md), [testing baseline](../checkpoints/00-h-testing-baseline.md).
