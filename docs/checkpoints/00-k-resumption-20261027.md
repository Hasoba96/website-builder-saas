# 00-K local resumption and security-test correction - 2026-10-27

Owner/module owner: Hasoba96, infrastructure/API verification. **BLOCKED: CORE-002 dependency security gate. 00-K is not CLOSED.** Scope is local diagnosis, correction, testing and review only. Publication, staging, commits, branches, PRs, merges and workflow reruns are not authorized. No Stage 00-L or Stage 01 implementation.

## Identity and preservation

Authenticated GitHub reads confirmed remote main `5d86555402507d73f103713b198789c594a1811c`, tree `752b2d37f2fbd8646e5c092099c5bd05a2319e96`, merged PR #3 and no open PRs. The latest main run is still [38828142735](https://github.com/Hasoba96/website-builder-saas/actions/runs/38828142735), FAILURE; no newer hosted execution is claimed. Main ruleset 24885869 is active: strict `verify`/`images` from GitHub Actions app 15368, required PR/resolved threads, zero solo approvals, stale-review dismissal, squash-only and no bypass/force-push/deletion.

The publication checkout remains on `codex/00-k-backup-restore-smoke`, HEAD `105dbaab8eca8ddfa2e96c2a91db4ee2628b66be`. Its tree equals remote main; commit identities differ because PR #3 was squashed. No fetch/reset/checkout/stash/clean is needed or performed. This merged branch's historical lifetime is not renewed; a future authorized publication must use a fresh ordinary short-lived branch.

All four prior uncommitted file hashes matched the [2026-10-16 inventory](00-k-canary-correction-inventory.json). That inventory's SHA-256 remains `a0d55588588776caa8cbed1f666cfb8909bacd042d328cc0da051964815cfc10`. Exact private copies were preserved before edits. The API correction and both earlier evidence documents remain byte-identical; only the test-count file receives newly authorized additional floors. The [earlier report](00-k-canary-correction.md) remains dated historical evidence, not a current status assertion. The new [combined inventory](00-k-resumption-inventory.json) reconciles the complete candidate without rewriting earlier manifests.

The original development checkout is not a work target. Its 298 Git-eligible files, HEAD, branch and index matched the preserved fingerprint before resumption and at final inventory verification. The publication index and HEAD remain unchanged. Lockfile SHA-256 is `be29a554f8d40b5722408eef0b59e4114dced472f1578b7caf123750c4188074`; no dependency, production source, workflow, migration or image change.

## Compose diagnosis and bounded correction

The first fresh `pnpm test:local` reproduced **5/6**, `Local api startup failed: []`, at the existing 15-second readiness deadline (15,022.57 ms). Free RAM was approximately 6.8 GiB after unused applications were closed; memory exhaustion alone is not a supported root-cause claim. Container health, explicit migrations/restart, Redis ACL and exact-owned resource tests passed.

A separate exact-owned disposable fixture traced wrapper/child startup. The wrapper entered at 63 ms, the actual API process at 343 ms; the child emitted no periodic trace during synchronous module loading/initialization. Its first startup record appeared at 14,202 ms after approximately 976 module loads; actual `/ready` returned 200 at 14,304 ms, followed by clean shutdown/exit 0. This establishes startup loading/initialization consuming almost the entire 15-second harness allowance, independently of a database readiness failure. It does not identify a particular Windows filesystem filter, antivirus product or scheduler as the underlying source of host latency, nor establish the exact timing of the historical October 16 failure.

The test now uses the existing **25-second process-lifecycle bound**, already used by `scripts/process-lifecycle.spec.ts` and `tests/database/foundation.spec.ts`. The measured startup cost justifies this bounded test-harness reconciliation; application connect/query/readiness/shutdown deadlines, actual HTTP 200 readiness, outage 503, dependency-independent health and cleanup assertions are unchanged. No startup retry or production behavior change is introduced.

The old failure formatter projected only stdout/stderr lines, yielding `[]` for a silent running process and losing process-state evidence. It also copied an unvalidated `details` property. The replacement reports only fixed reason codes, numeric exit code and output/signal booleans. Each application has its own capture, while existing combined secret-redaction assertions remain. A deterministic test checks silent-live, exited and terminated cases and excludes synthetic sensitive output from diagnostics. No raw log/error content is included in the new failure message.

Corrected focused Compose execution passed **7/7** in 64.28 seconds. That focused run preceded the final small per-application capture refinement; the complete guarded run subsequently passed all seven Compose tests with the final code in 71.99 seconds. The first diagnostic preloader attempt had a Windows path-with-spaces quoting error; its failure was preserved separately and corrected using `pathToFileURL`. It is not evidence of an application failure or a passing test retry.

## PostgreSQL and API canary contracts

The PostgreSQL assertion `/00f-|malformed-untrusted|foundation_test/` could match the same valid UUID fragment as the earlier API defect. It now checks the complete injected authorization/cookie/query/untrusted-ID values and the actual runtime password. It retains explicit database-name, stack/module/frame rejection and strict `logSchema` validation for every log record. Injection sites share the complete markers; credential absence fails the fixture rather than silently disabling detection.

Two deterministic PostgreSQL cases accept fixed valid UUIDs containing `00f-`, reject complete markers/passwords in multi-record output with the expected failure reason, and reject internal diagnostics and forbidden fields/details. The existing real outage/concurrency/request correlation tests remain. Fresh PostgreSQL tests passed **17/17**, including all four real backup/restore cases and safe refusals. Source data preservation, schema/ACL/sequence/constraint/migration compatibility remain asserted.

The prior API correction remains byte-identical and freshly passed **7/7**, including three deterministic regressions, real HTTP errors and hostile-input security tests. No production request-ID generation, error/status contract, logger or schema changed.

`scripts/test-evidence.ts` now requires API 7, PostgreSQL 17 and Compose 7. Expected complete guarded count is **186**, compared with the previous 183 and original 180. No test removal, skip, focused-only acceptance, retry, suite exclusion or coverage threshold reduction.

## Current dependency security blocker

One fresh `pnpm ci:verify`, started **2026-10-27T12:17:50.777Z**, failed after **26,787 ms** at `ci:supply-chain`, assertion `High/Critical dependency finding`, `8 !== 0`. Frozen install with disabled lifecycle scripts, runtime, CI configuration and cleanup passed. Later canonical CI stages did not execute in that invocation; independent checks must not relabel it PASS.

The fresh audit reports **6 High, 2 Critical, 9 Moderate, 3 Low**. High/Critical findings are:

| Installed package | Severity | Advisory                                                                 | Audit-reported patched range |
| ----------------- | -------- | ------------------------------------------------------------------------ | ---------------------------- |
| vite 8.3.1        | High     | [GHSA-587h-7wmj-h5pm](https://github.com/advisories/GHSA-587h-7wmj-h5pm) | >=8.3.3                      |
| next 16.3.8       | Critical | [GHSA-2464-fhr4-w9xw](https://github.com/advisories/GHSA-2464-fhr4-w9xw) | >=16.4.1                     |
| next 16.3.8       | High     | [GHSA-p3m5-59mp-jv5r](https://github.com/advisories/GHSA-p3m5-59mp-jv5r) | >=16.4.1                     |
| next 16.3.8       | Critical | [GHSA-673q-mjm6-r5xr](https://github.com/advisories/GHSA-673q-mjm6-r5xr) | >=16.4.1                     |
| zod 4.6.5         | High     | [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5) | >=4.6.6                      |
| body-parser 2.3.0 | High     | [GHSA-27r3-jxmh-p828](https://github.com/advisories/GHSA-27r3-jxmh-p828) | >=2.4.0                      |
| multer 2.4.0      | High     | [GHSA-q7qp-rjg7-q26m](https://github.com/advisories/GHSA-q7qp-rjg7-q26m) | >=2.5.0                      |
| undici 6.29.0     | High     | [GHSA-xjj6-f33q-929c](https://github.com/advisories/GHSA-xjj6-f33q-929c) | >=6.29.1                     |

These are scanner findings, not a completed exploitability assessment or approved upgrade plan. CORE-002 explicitly prohibits unresolved High/Critical even for dev/optional dependencies or claimed non-reachability. The existing gate correctly fails closed. No audit suppression, policy exception, override, lockfile edit or unrelated package upgrade is made. Supported consumer/dependency remediation requires its own reviewed scope; patched ranges above do not establish stack compatibility or license acceptance.

## Verification and safety

After the canonical CI failure, separately invoked independent checks completed successfully, starting **2026-10-27T12:19:28.517Z**, elapsed **852,814 ms**. Format, ESLint/architectural boundaries, strict typecheck **14/14**, workspace validation, production builds **9/9**, guarded `pnpm test`, bundle budgets and source secret scanning passed. Code/lockfile hashes were checked before and after these commands. These successes do not convert the canonical `ci:verify` failure into PASS; no supply-chain gate was bypassed or marked successful.

The full guarded suite passed **186/186** in **407,829 ms**: root 64, API 7, worker 2, config 29, schemas 12, dashboard 4, renderer 4, PostgreSQL 17, Redis/BullMQ 15, Compose 7, browser 25. All eleven required suite reports were validated with the existing guards and no skip/todo/focused/zero-assertion substitution. The real-runner false-pass meta-tests also passed. Ten native nonempty coverage JSON/HTML reports passed the unchanged policy. A separate integrity check confirmed every native report and coverage summary was fresh for this invocation, and preserved private copies/hashes; no stale report was accepted.

Production Chromium on **Windows** passed 25/25, including eight existing Windows snapshot comparisons, Arabic/English, RTL/LTR, desktop/mobile, accessibility/keyboard, layout, hydration, CSP and browser-secret boundaries. No snapshot changed. Fresh hosted Linux comparisons and four image builds/smokes remain NOT VERIFIED for this candidate; no earlier run is substituted.

The complete-run real backup/restore smoke used exact-owned container `8c4f0662fb799c707a72f5aaee8072a9fcff8a5225f1976b8404337c460cc8ec`: encrypted archive 7,039 bytes, SHA-256 `b6535849e699623c0ae1f85d70fce9be266cee091cba82296c470b3a2ceeaf9b`; backup 681.9156 ms, restore 1,169.4434 ms, full integrity case 6,028.3366 ms. Two synthetic records, unchanged source, schema/ACL/sequence/constraint/migration compatibility and negative cases passed. This is not production DR or PITR evidence.

Bundle sizes: dashboard 186,283 and renderer 186,284 gzip bytes, each below 512,000. Source secret scan passed for **321 Git-eligible paths** and full-history scan passed for **299 commits**, with no new suppression. Final documentation/manifest formatting, whitespace, links and source scanning are rechecked after reconciliation. Private evidence index `.local/00k-resume-20261027/evidence-integrity.json`, SHA-256 `77f99a43611707384eb7ef5fe079766b643f026ddbc5c28a2da546c24c81aff0`, binds the fresh native/coverage reports, backup result, failed CI summary and audit. Raw evidence remains ignored; only safe references/digests are publication candidates.

Initial C: free 17,655,484,416 bytes; F: 21,361,696,768 bytes. Docker Desktop/WSL2 was stopped; one ordinary supported Desktop start restored Linux Engine 29.8.1. No reset/repair/prune/storage relocation. Initial available RAM after Docker was approximately 923 MiB; after the owner closed unused apps it exceeded 6 GiB. Verification uses pinned Node 24.21.0/pnpm 10.34.6, sequential uncached Turbo, the existing 1536 MiB heap limit and existing private SWC cache. System default Node 24.18.0 is not used for verification.

Only exact-owned new disposable PostgreSQL/Redis/Compose resources are targets. Persistent development volume `wb-local-bf2d4ed2f26a_postgres-data`, the pre-existing anonymous volume and generated development credentials are preserved. No image rebuild or persistent database mutation is authorized/performed. Final inventory/preservation checks and evidence digests are recorded privately under `.local/00k-resume-20261027`; no raw logs, archives, keys or environment files are publication payload.

After full execution, Docker inventory contained **zero containers**, the same two pre-existing volumes and only bridge/host/none networks; no backup temporary directory remained. Measured free space was C: **15,660,478,464 bytes**, F: **21,356,040,192 bytes**. Existing Git hooks remain configured; no commit hook is represented as executed because staging/commits are not authorized.

## Distinct technical, security and disclosure review

A separate post-implementation pass by the same AI agent reviewed all changed code, production response/log contracts, exact marker checks and failure reasons, strict schemas, real fixture ownership, startup timing evidence, boundedness, per-application diagnostics, full-suite floors and protected-publication requirements. This is not independent human or independent-model review. Owner/module responsibility remains Hasoba96; no publication or merge acceptance is implied.

Technical/security findings resolved: PostgreSQL UUID-fragment collision; inadequate evidenced cold-start allowance; empty startup diagnostics; unnecessary unvalidated diagnostic details; shared-output attribution across applications. API code and security assertions remain preserved. The test-startup allowance is not a relaxation of production resource/security timeouts. All six added tests relative to main remain mandatory and passed in the full guarded run. No unresolved defect is identified in the scoped corrections. Dependency findings remain an explicit unresolved acceptance blocker.

Disclosure review: synthetic canaries, safe public hashes/identifiers and sanitized metadata only. Local diagnostic raw output stays ignored. No production/customer data or external telemetry. Test-only code remains outside production imports/builds. The combined ordinary packet is **374 conservative added/deleted real-code lines**, including blanks and test/config code, within the 400-line limit; generated inventory and Markdown remain separately reviewed. Eight candidate files are inventoried, including the two preserved historical evidence files and the generated inventory itself.

## Publication disposition

**NO-GO for publication acceptance or checkpoint closure while CORE-002 remains blocked.** This session cannot restore green remote main because publication and dependency remediation are outside the authorized correction scope.

Next owner authorization: bounded CORE-002 dependency remediation review and supported updates, including necessary direct manifests/lockfile/acceptance evidence, without unsupported overrides or weakened gates. Preserve this candidate, rerun complete canonical CI after remediation, refresh exact hashes/reviews and request separate protected publication approval. A fresh ordinary branch/commit/PR must pass current Linux `verify`/`images`, native test/coverage/evidence integrity, all eight snapshots and four image builds/smokes. Only an explicitly authorized protected squash merge, fresh main CI and tracked closure reconciliation can close 00-K. The consumed 00-J exception and expired historical branch authorization are not reused.

Rollback, if later needed after publication, is an ordinary reviewed protected revert PR subject to the same successful security/test gates. No persistent state or migration needs restoration for this test-only correction; no direct push or history rewrite is a rollback mechanism.

Applied requirements: CORE-002/040/041/044/045/046, TS-020/021/024/025/026/060/063, OB-001/003/004/005/007, SE-045, API-063, approved Stage 00 technical decisions and ADR-001. Tenant tests remain N/A only while no tenant-capable domain surface exists. No production DR/PITR, provider verification, security certification or Stage 00-L/01 claim.
