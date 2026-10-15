# Checkpoint 00-K - Backup/Restore Smoke

Date: 2026-10-15. Accountable owner/module owner: Hasoba96, infrastructure. Authorization covers local implementation, disposable verification and review only. No branch, commit, staging, push, PR, merge, deployment, persistent-data change or Stage 00-L/01 work is authorized or performed.

## Status and source identity

**LOCAL PASS. Not fully CLOSED.** The final local guarded verification succeeded with 180/180 tests. Protected publication, fresh hosted `verify` and `images`, evidence validation and explicit owner acceptance remain mandatory under CORE-043/045/046 and TS-060/063.

Approved main `aabbf416c6c0cd789c345b08552c946fc7b15659` was verified against GitHub. The publication checkout's existing local documentation commit `16766c19b08d2331ca33d5bd155018996c1ba982` has the same tree, `6e2b1ebfb9fe481a81d0b0addc198a20a53b4131`. Implementation does not reset or move that checkout. The original development checkout is not an implementation target.

## Requirements and scope

Authority: project rules, Playbook Stage 00 acceptance and approved technical-decision report's backup row. Required scope is an isolated synthetic restore smoke with elapsed-time and integrity evidence. The full production backup/DR definition of done is not silently claimed for this foundation checkpoint.

- BR-001/014/060: real PostgreSQL 18.6 `pg_dump -Fc`, archive validation and restore into a different freshly created database in the owned test container; measured elapsed times.
- BR-012/013: encrypted temporary archive outside the database/container, with ephemeral key/tag/nonce retained separately in RAM. This is not off-host disaster recovery, remote encrypted transport or durable key recovery.
- BR-015/CORE-016: explicit read-only dump role, non-superuser migration restore role, no existing development database endpoint or arbitrary external archive input.
- BR-023: [ordered runbook](../runbooks/backup-restore-smoke.md), owner, verification, refusal/cleanup and future production incident obligations.
- TS-020/021/024/026/027: isolated real infrastructure, realistic synthetic Arabic/English/JSON/UTC data, failure tests, no fake database or skipped-suite substitution.
- TS-060/063: required suite inventory/counts and native coverage include the new tests/helper. Existing full guarded path remains mandatory.
- CORE-044/045: ordinary review packet and separate AI-assisted technical/security/disclosure review. No reuse of consumed import exception.

Redis is not a system of record. No Redis backup, R2/object metadata surface, provider, dependency, retention duration, production migration or product schema is added. Production scheduled backup/PITR, off-host storage, retention, RPO/RTO and quarterly operational scheduling remain future requirements, not exemptions or verified capabilities. ADR-001 cross-tenant runtime N/A remains unchanged.

## Implementation and data verification

`pnpm test:backup` invokes the existing disposable PostgreSQL harness with a focused suite filter. Normal `test:database`, `test` and `ci:verify` retain the full inventory. One isolated PostgreSQL instance contains separate `backup_source` and fresh `backup_target` databases; this is not a second server or failure domain.

The dump includes actual foundation migrations and a test-only table, never a production migration. Assertions compare complete ordered records before/after restore, migration status/check/idempotent up, identity sequence continuation, NOT NULL enforcement, restored runtime SELECT/no-schema-CREATE permissions, and unchanged source records. Occupied-target refusal also verifies existing target records remain unchanged.

Negative cases cover malformed/missing/persistent scope before Docker, missing/truncated/tampered archive, repeated backup, repeated close, occupied target and denied dump permissions. Commands are bounded to 15 seconds and 4 MiB captured output; dump lock wait is two seconds. No retry loop, overwrite mode, plaintext archive file, raw credential logging or untrusted archive ingestion exists.

## Safety and preservation

Initial physical free space: C: 8,743,804,928 bytes; F: 28,625,391,616 bytes. Initial available physical RAM: 3,254,104 KiB. Docker Desktop 4.93.0 / Engine 29.8.1, desktop-linux, Linux amd64, Compose 5.5.1 and WSL2 were available. WSL virtual free space is not treated as physical C: capacity. Cached pinned images avoided image pulls/builds.

Estimated incremental smoke storage is less than 1 GiB with a 4 MiB archive/output bound, a 512 MiB container and at least 2 GiB physical free-space reserve. Existing test harness resource bounds, random credentials, loopback ports, ownership labels and finally cleanup are retained. The helper pins the inspected immutable container ID and requires the approved image, test label, no persistent mounts and PostgreSQL tmpfs.

Persistent development volume `wb-local-bf2d4ed2f26a_postgres-data` and the unrelated pre-existing anonymous volume were left untouched. No existing service was stopped, reset or restored into. Only exact-owned disposable containers and helper-created encrypted directories may be removed. This is noninterference evidence, not an inspection or certification of persistent database contents.

## Verification record

The first focused container-start attempt failed with the existing sanitized Docker-operation error; the root cause was not established. A bounded read-only diagnosis and disposable retry succeeded. The initial helper incorrectly expected tmpfs in Docker's `Mounts` array; actual tmpfs configuration is in `HostConfig.Tmpfs`. The guard was corrected while retaining the prohibition on persistent mounts. Those failed setup results are not counted as passes.

An intermediate full database regression ran 15 tests: 14 passed, including all four backup cases; the existing API-startup test failed without startup output within its existing deadline. No API code, deadline or assertion was changed to hide this result. The first full local CI invocation then failed typecheck because its shell lacked the workflow's required `APP_ENV=ci`. The corrected invocation uses the existing workflow environment, not a configuration bypass. Final results are recorded below after completion.

A subsequent Windows typecheck exposed an existing SWC cache ACL refusal (`ERR_SWC_NATIVE_CACHE`). The pinned native binding loaded successfully using the supported `SWC_NATIVE_BINDING_CACHE` absolute-directory option under the owner's profile. The new cache inherits only owner, SYSTEM and Administrators full control; no existing ACL or security check was disabled. Turbo already allows this environment setting. No dependency, lockfile or application change was made. See the [SWC carrier documentation](https://github.com/swc-project/swc/blob/main/docs/native-addon-carriers.md). This local environment adjustment is not required by the Ubuntu workflow and is not a hosted result.

Local raw/native evidence stays ignored under `.local/00k`, `.local/test-evidence`, `.local/ci/verify` and `coverage`. Do not publish raw archives, credentials, encrypted backup contents or local environment files. Future hosted evidence must use the existing sanitized artifact pipeline.

### Final executed results

`pnpm ci:verify`, started **2026-10-15T19:28:52.625Z**, completed **PASS**, exit 0, in **639,249 ms**. Frozen installation used `--frozen-lockfile --ignore-scripts`. CI configuration, supply-chain/license/integrity, format, ESLint/architectural boundaries, strict typecheck (14/14 tasks), workspace validation, build (9/9 tasks), guarded tests, bundle budget, vulnerability audit, source secrets and cleanup gates all executed successfully. Turbo caching was disabled; this is fresh Windows execution, not hosted evidence.

The full guarded path verified **180/180 tests** in **349,585 ms**: root 64, API 4, worker 2, config 29, schemas 12, dashboard 4, renderer 4, PostgreSQL 15, Redis/BullMQ 15, Compose 6, browser 25. Five tests were added: one isolated scope refusal and four real backup/restore cases. No skipped/todo/zero-suite success was accepted. Existing API startup/shutdown passed in 1,826 ms without modifying its 25-second deadline; the earlier isolated failure's underlying cause remains unproven and retained above, not silently erased. A future recurrence still fails the gate.

Browser tests used production Chromium on Windows: 25/25, including eight existing Windows comparisons, AR/EN, mobile/desktop, keyboard/accessibility/layout, hydration, CSP and browser-secret boundaries. Linux baselines were not changed and Linux execution is not claimed locally. Compose completed 6/6 in 65.38 seconds, Redis 15/15 in 23.10 seconds, PostgreSQL 15/15 in 24.12 seconds.

Final smoke container ID: `352fb7534f517f2f6f0e2d5ffd929e34157e27a8a6f6f83bb97c9338026a9c1e`, exact-owned 00-D disposable fixture. Encrypted custom archive: **7,039 bytes**, SHA-256 **`58d2a945dea5b812f36af7f4539de6c9be71ae80471bf89f91532790a445b76a`**. Backup including validation/encryption: **570.0031 ms**. Fresh-target restore: **1,012.7391 ms**. Full success-case integrity exercise: **5,182.0869 ms**. Two source records, exact data equality, source unchanged, schema/ACL/identity/constraint checks and migration compatibility all passed. Timings describe this small synthetic fixture only, not production RPO/RTO.

Ten native nonempty coverage reports were validated by the unchanged policy. Backup helper database coverage: statements 62/67 (92.53%), branches 32/37 (86.48%), functions 10/10, lines 58/62 (93.54%). This is behavioral evidence, not full coverage or a new threshold. The shared infrastructure coverage denominator now includes the helper; percentages across broad root/database/Redis/local inventories are not directly comparable to earlier denominators. Unexecuted defensive/OS failure branches remain a limitation, not a waived gate.

Dependency audit: no known vulnerabilities. Source secret scan: 316 eligible paths at full-run time, no leaks or suppression; the final documentation/inventory scan is repeated after preparation. Browser bundles: dashboard 186,283 gzip bytes, renderer 186,284, each below 512,000. Lockfile remains `be29a554f8d40b5722408eef0b59e4114dced472f1578b7caf123750c4188074`; no dependency changes.

Final cleanup inspection: zero containers, no `00k-backup-*` directories, both pre-existing Docker volumes still present. C: free **7,976,488,960 bytes**, F: **28,622,823,424 bytes**, above the safety reserve. No image rebuild, persistent-volume mutation, prune/reset or native database substitution occurred. The final closing-interval read-only fingerprint comparison passed for 297 original-checkout files, index, branch and HEAD. One Git-quoted Arabic path was not captured in that initial fingerprint set; this is not a complete before/after byte certification. No writes were directed to the original checkout during this task.

Full-history secret scan also passed: 297 existing commits, approximately 7.21 MB, zero leaks, existing rules with redaction and no new suppression. Git hooks remain configured to `.githooks`; no commit hook is represented as executed because no commit or staging operation was authorized. Final documentation links and whitespace are checked independently after report preparation.

Local evidence SHA-256 inventory (ignored files, not publication payload):

- `.local/00k/ci-verify-private-cache.log`: `4f9137180c4ae98ee8a80364417adf60f4f2a77b844b087bcef9b54f890d3198`.
- `.local/ci/verify/summary.json`: `e58559aa5b9198f1248f8327d756262be5f145793bc29594f82c777d04337809`.
- `.local/test-evidence/summary.json`: `d6926ca5ddb31895a022a25e9ebdfad56df76b6f2a6e53fca96f9c3078c796e3`.
- `.local/test-evidence/database.json`: `77dab4bb013d7b9779f33ba3b4f0432080079590c90ca6bd994ecca5e9f617b8`.
- `.local/test-evidence/browser.json`: `161a968948cfb9fc6efde8d3f09aabf3bea28e37c82970c8610ba9592b1b49c73`.

Not executed for this uncommitted candidate: hosted Linux CI, four application image builds/smokes, hosted artifact publication or protected PR/main verification. Application/image/workflow semantics are unchanged, so disk-intensive local image rebuilds were not repeated for this test-only addition; the required hosted `images` gate is not exempted. No local result is promoted to provider PASS.

## Separate AI-assisted review

A separate review pass inspected implementation, tests, full diff, failure paths and applicable rules after the implementation pass. It is the same AI agent's subsequent review, not an independent model, person or human approval. Hasoba96 remains accountable; publication and residual-risk acceptance are pending.

Technical review: native dump/restore formats and transaction/exit behavior, migration metadata, restored ACLs/sequence/constraints, test independence, missing-suite guards and cleanup ownership. Findings resolved: Docker tmpfs inspection mismatch; strengthen occupied-target checks from counts to complete records; include helper in coverage. No production imports or contract changes are needed.

Security review: this is sensitive, reversible, isolated non-production infrastructure work under CORE-045. Reviewed immutable container identity, exact test scope, read-only backup grants, fixed target creation without DROP, archive authenticity/hash checks before database creation, bounded child processes, captured diagnostic output, exclusive encrypted file creation and key cleanup. Single-use backup state is set before writing so a failed file write cannot enable nonce reuse. Built-in AES-256-GCM is used only for disposable fixture bytes; no production crypto protocol or untrusted-code security service is approved. Production activation or bespoke cryptographic/security design still requires the independent-human-required process.

Disclosure review: source contains synthetic fixtures, public image pins, safe resource IDs/digests and explicit limitations only. No backup payload/key, production/customer data, new credentials or raw environment belongs in tracked evidence. Scanner results and final file hashes must be checked before owner acceptance.

Residual risks: a compromised local Docker daemon/test host is outside this fixture boundary; OS/process copies cannot be guaranteed securely erased; memory-only keys intentionally do not survive process exit; host termination can leave an encrypted temporary residue requiring exact-owned recovery. Same-host restore does not prove regional recovery, production-scale timings or data retention. No independent-human review or global security certification is claimed.

## Publication readiness

One ordinary dependency-coherent PR is proposed: helper, unit/integration assertions, command/discovery/coverage wiring and reviewed documentation. Conservative added/deleted code count is 399 lines, including blank lines, test code and script configuration. No generated-code exclusion is used for implementation. Documentation and generated inventory remain separately reviewed. Final hashes and hunk boundaries are recorded in `00-k-review-inventory.json`; the inventory's own hash is reported outside itself to avoid a self-hash cycle.

Required next owner approval: accept the reviewed non-production risk and exact candidate inventory; authorize a fresh short-lived branch from verified current main, reviewed commit and non-force publication/PR. No such operation has occurred. Revalidate base/tree, file hashes, hooks and source/history secret scans before committing. Both hosted jobs and protected PR criteria must pass before a separately authorized squash merge, followed by main verification and final closure evidence. Rollback is an ordinary authorized revert PR; no persistent data migration is involved.

Stage 00-L and Stage 01 remain unstarted.
