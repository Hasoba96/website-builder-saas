# Checkpoint 00-K - Backup/Restore Smoke

## Final technical acceptance reconciliation - 2026-10-28

**Technical acceptance: PASS.** Accountable owner/module owner: Hasoba96, infrastructure. This dated reconciliation supersedes the status conclusions in the historical local record below and the earlier canary/dependency resumption reports; it preserves their failed attempts and observations. Scope is the approved isolated synthetic PostgreSQL backup/restore smoke and its inherited verification/security foundation, not production backup/DR or overall Stage 00 acceptance.

**Formal closure condition:** this reconciliation must reach main through its ordinary protected documentation PR, with successful `verify` and `images` on that PR and its resulting main commit, validated native evidence/artifact integrity and the owner's conditional acceptance. Only after those actual conditions hold may the final operational report state **00-K CLOSED/PASS**. That report records the documentation PR, squash SHA/tree and fresh main run; no future identity is invented here. This follows the existing 00-J documentation-closure pattern, without waiving any gate or creating an endless evidence-only commit loop.

### Accepted implementation, corrections and owner decision

The original implementation was published through [PR #3](https://github.com/Hasoba96/website-builder-saas/pull/3). Its main commit `5d86555402507d73f103713b198789c594a1811c` subsequently failed [main run 38828142735](https://github.com/Hasoba96/website-builder-saas/actions/runs/38828142735) when a valid generated request ID collided with a fragment-based test assertion. That failure remains a failure; later execution is not a relabelled rerun.

[Correction PR #4](https://github.com/Hasoba96/website-builder-saas/pull/4) preserved production request-ID/error/logging contracts while adding precise API/PostgreSQL canary regressions, bounded Compose startup diagnostics and supported security dependency remediation. The ordinary packet is400 conservative changed real-code lines across20 inventoried files; Markdown, generated review inventories and lockfile were separately reviewed. No consumed foundation-import exception, dependency override, audit suppression, maturity-policy change or weakened assertion was used.

Owner explicitly authorized and accepted the exact protected squash on 2026-10-28. Approved head: `73e46080dec672bb535fdd1adb14241bb66a4177`; base: `5d86555402507d73f103713b198789c594a1811c`; tree: `04add140f93c1651f59582378607988fb01e15a5`. PR #4 merged at **2026-10-28T19:36:19Z**, producing main `7f9e44cbc19d6f17f6a34536488d41766aa8154b`, sole parent the approved base and identical approved tree. Source and lockfile identity were verified after the merge. The branch was within its recorded 2026-10-31T18:41:30Z lifetime. Owner also authorized the required protected documentation closure operation; this is conditional acceptance under adopted solo governance, not independent human approval.

The Windows verification environment required a supported process-only private SWC cache. Unsafe shared/F: ancestor permissions and an overlong265-character custom lock path were retained as failed evidence. A separately authorized220-character short-path experiment passed full owner/DACL/reparse validation and a genuine SWC1.16.12 native TypeScript transform. No guard, loader, registry, existing ACL or shared cache was changed; no cache setting was committed. The isolated Linux fallback was unnecessary. This is a tested local operational remedy, not an assertion that all Windows caches are safe.

### Fresh actual acceptance evidence

[PR run 40747950773](https://github.com/Hasoba96/website-builder-saas/actions/runs/40747950773) passed both required jobs on the approved candidate. Independently, [main push run 40755794236](https://github.com/Hasoba96/website-builder-saas/actions/runs/40755794236) passed on actual squash commit `7f9e44cbc19d6f17f6a34536488d41766aa8154b`: `verify` 19:36:25–19:41:44Z and `images` 19:36:25–19:39:21Z. This is fresh Ubuntu 24.04 execution, not substituted Windows/PR evidence. Native reports, coverage, logs, artifacts, source/run identity metadata and cleanup were downloaded and revalidated; see the [sanitized hosted evidence inventory](evidence/00-k-final-hosted-evidence.md).

- Frozen scripts-disabled install, pinned Node.js 24.21.0/pnpm 10.34.6, unchanged 1440-minute release floor and strict engines/peers; supply-chain/license/source/integrity, format/lint/boundaries, workspace, typecheck 14/14 and builds 9/9: PASS.
- Guarded tests **186/186**: root 64, API 7, Worker 2, config 29, schemas 12, Dashboard 4, Renderer 4, PostgreSQL 17, Redis/BullMQ 15, Compose 7 and production Chromium 25. No missing, skipped, todo, zero-suite or flaky success. Six regression tests increased the original 180 count; none were removed.
- Browser 25/25 includes eight normal accepted Linux snapshot comparisons, AR/EN, RTL/LTR,390px/1440px, accessibility/keyboard/layout, hydration, CSP and browser-secret boundaries. No update flags or snapshot/tolerance edits.
- Ten native nonempty coverage summaries passed existing policy. This is not a new global coverage percentage or full WCAG/security claim. Both hosted web gzip budgets are187778/512000 bytes.
- Actual PostgreSQL backup/restore used the real pinned isolated fixture, recovered two synthetic records into a fresh target, proved source unchanged, schema/migration/grant/constraint/sequence consistency and negative/refusal paths. The main exercise used a 7039-byte encrypted archive, backup134.742264 ms, restore190.705924 ms and full exercise1311.187389 ms. These tiny-fixture timings do not establish production RPO/RTO.
- Four independent Linux/musl application builds and four smoke checks passed non-root execution, readiness/health, locale HTML where applicable, installed-test-tooling exclusion, structured output, clean shutdown and no OOM. No image registry publication or deployment.
- Audit reported no known vulnerabilities; full graph/license review and source/artifact secrets passed. Existing direct/transitive tracking obligations remain binding; no review deadline was extended. Lock SHA-256 is `60061b036a4ca44917f066d629a33da7a17ff5bc6855edf52cac48748f28a9af`. Local all-ref history scan after fetching the implementation merge reported302 scanned commits, no leaks and no new suppression; final closure-commit/history scans remain mandatory.
- Both jobs reported zero owned PostgreSQL/Redis/local/image containers. Original development checkout and existing persistent volumes were preserved; no restore/reset/prune of persistent development or production data, WSL repair, destructive operation or production/customer-data use occurred.

### Review, risks and final scope

Separate AI-assisted technical/security/disclosure passes reviewed the 400-line candidate, all 53 new dependency identities, actual local evidence and hosted ZIP/native reports. Findings about historical status wording and authorized fetch metadata were corrected. No unresolved scoped technical/security blocker remains. Review is not independent human approval, a penetration test or a platform-wide security certification. Hasoba96 retains module ownership and conditional acceptance responsibility; independent-human-required production/irreversible cases under CORE-045 remain unchanged.

Main ruleset24885869 remains active: required PR and resolved threads; strict successful `verify`/`images` from GitHub Actions15368; zero solo approvals with stale-review dismissal; squash only; no bypass, force push or main deletion. No security setting was changed. Mandatory documentation PR/main checks and reviews cannot be bypassed.

Production scheduled backups/PITR, off-host durability/key recovery, remote backup transport, retention schedules, commercial RPO/RTO and regional DR remain future operational requirements. Redis is not a system of record; no R2 asset/object consumer exists. ADR-001's narrow domain-free cross-tenant runtime N/A remains unchanged. Real staging/provider activation, active error-tracker receipt/alerts and overall Foundation closure are **not** established by this backup checkpoint. K acceptance does not silently close Stage 00, approve a00-L charter or authorize Stage 01.

Applied rules: CORE-002/016/040/041/043/044/045/046/130–134; BR-001/012/013/014/015/023/060; TS-020/021/024/026/027/060/063; SE-040/041/045/060–064; IN-002/030/031/033/034; ADR-001. Systems14/18/19/21/22, the Playbook and approved technical decisions remain unchanged. Rollback is a separately reviewed protected compatible repair/revert with all gates; reintroducing known vulnerable dependencies is not an acceptable shortcut. No persistent schema/data rollback is involved.

**Next:** after the formal closure condition above, read-only00-L handoff may identify the existing proposed minimum scope and outstanding owner/ADR decisions. No00-L source or Stage 01 implementation starts from this report.

## Historical local implementation record - 2026-10-15

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
