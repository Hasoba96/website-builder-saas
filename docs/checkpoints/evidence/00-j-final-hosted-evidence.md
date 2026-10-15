# 00-J sanitized hosted evidence inventory

Revalidated: **2026-10-15**. Owner/module owner: **Hasoba96**. Public disclosure is limited to already-public repository/commit/run identifiers, aggregate results and artifact integrity metadata. No raw logs, archive bytes, credentials, signed URLs or local private configuration are included.

## Candidate and merge provenance

- Foundation PR: [#1](https://github.com/Hasoba96/website-builder-saas/pull/1).
- Approved head: `13b17adb2e045704832269b21c8443d643ba9023`.
- Approved/final tree: `8236bf53070f7bef5b3e8d52f310e0665869159e`.
- PR tested merge: `913b78d47ce147c5c228cac492f54ab43f96e7f4`, same tree.
- Actual squash/main: `2dff420aee5e6123e7c26b8d6514f2976ab56094`; sole parent `ecbf9d6ccde2a00bf3587b02cbd8bd3f6b5d2e83`.
- Merge time: `2026-10-13T18:03:21Z`, before import deadline `2026-10-15T00:20:09Z`.
- PR run: [38436065228](https://github.com/Hasoba96/website-builder-saas/actions/runs/38436065228), attempt 1, SUCCESS.
- Main run: [38443653067](https://github.com/Hasoba96/website-builder-saas/actions/runs/38443653067), push/main, attempt 1, SUCCESS on actual squash SHA.

## Main results and evidence scope

Verify job **115456324507**, 18:03:28Z-18:09:35Z, SUCCESS. Images job **115456323985**, 18:03:28Z-18:06:48Z, SUCCESS. All native steps, including publication and completion, succeeded. Both checks use GitHub Actions app **15368**. Full workflow finished at 18:09:36Z, about 6m12s after creation.

Guarded counts: root 63; API 4; worker 2; config 29; schemas 12; dashboard 4; renderer 4; real PostgreSQL 11; real Redis/BullMQ 15; Compose 6; browser 25; **total 175**. Required suite discovery/assertions and failure/security cases remained enabled. Browser counts: 25 expected/passed, zero skipped/unexpected/flaky, eight normal Linux snapshot comparisons. Main browser metadata identifies the actual main commit and current run, not the earlier PR merge.

Ten native coverage JSON summaries and ten HTML reports were validated as nonempty under the existing policy. No aggregate percentage target is invented. Format, lint/architecture, strict typecheck (14 tasks), workspace graph, build (9 tasks), frozen script-disabled install, supply-chain/license/integrity, vulnerability audit, source/evidence secret scans and bundle budget all passed. Each frontend shipped 186,291 gzip bytes against a 512,000-byte limit. Lockfile SHA-256: `be29a554f8d40b5722408eef0b59e4114dced472f1578b7caf123750c4188074`.

Four independent application image builds and four smokes passed: API/worker/dashboard/renderer, non-root, readiness, shutdown exit 0, and locked production-package identities 115/131/17/17. No image registry push. Both jobs reported zero owned PostgreSQL/Redis/local/image test containers remaining. This does not certify unrelated host resources or production deployment.

## Artifact inventory

| Run         | Artifact        | ID          | ZIP SHA-256                                                        | Expiry UTC           |
| ----------- | --------------- | ----------- | ------------------------------------------------------------------ | -------------------- |
| 38436065228 | evidence-verify | 11834031182 | `437ba62e97288b4f868a3a8151080613e5b42aa8c5f09c9eb21034d5b7603377` | 2026-10-20T17:13:19Z |
| 38436065228 | evidence-images | 11832598145 | `2a6ea548372e285218a17c1f3d33557461e93607db0b9b840ab61634a71c7951` | 2026-10-20T17:10:27Z |
| 38443653067 | evidence-verify | 11836394782 | `2aacbfa0653c38504712497b07318a9b96fbb370349ddee4c43fae4bc01251d7` | 2026-10-20T18:09:32Z |
| 38443653067 | evidence-images | 11836124319 | `15739b71cb45e765f4fa4a03a9deeb6eb97df2e9445b6161be1fe119ec428f3a` | 2026-10-20T18:06:44Z |

GitHub API run/head bindings and ZIP digests matched the downloaded archives. Main verify ZIP: 1,374,318 bytes, 308 extracted files, 7,936,794 expanded bytes. Images ZIP: 527 bytes, one 1,172-byte summary. Safe extraction rejected traversal, duplicate paths, symlinks and size violations. Existing report validators checked native suites, counts, CI identity, coverage, budget and freshness after in-memory relocation of sanitized workspace paths. All 307 non-summary verify files passed unsafe-content checks; summaries received explicit gate/status/lockfile validation. Unsuppressed Gitleaks found no leaks in extracted evidence. Original archives and full logs remain ignored local evidence, not publication content.

Retention is bounded to seven days; all listed artifacts were unexpired at reconciliation. This tracked inventory preserves sanitized provenance after hosted expiry, not archive availability forever. Maintain the existing local verified copies through checkpoint acceptance. New documentation PR/main runs must supply their own fresh native reports and artifacts; these historical runs never substitute for those gates.

## Acceptance and limitations

On 2026-10-13 the owner accepted documented solo-owner and public-disclosure risks and authorized the exact foundation squash merge. On 2026-10-15 the owner authorized the ordinary documentation-only closure operation with separate AI-assisted review and conditional merge/main verification. Independent human review is not claimed. ADR-001 remains the only cross-tenant N/A for the domain-free Stage 00; no other gate is waived. Production activation, backup/restore and 00-K are not verified or authorized here.

Current protection facts and formal closure conditions are recorded in the [closure reconciliation](../00-j-closure-report.md#final-reconciliation---2026-10-15). The final operational report must bind this documentation PR and its resulting main run to actual identities before declaring 00-J CLOSED/PASS; those not-yet-created identifiers are intentionally not guessed in this inventory.
