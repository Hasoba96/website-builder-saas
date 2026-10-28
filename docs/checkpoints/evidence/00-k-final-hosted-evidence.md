# 00-K final implementation hosted evidence - 2026-10-28

This sanitized inventory binds accepted implementation evidence to exact GitHub identities. Raw logs, ZIPs, keys, generated credentials, signed URLs, backup contents and machine-specific diagnostics remain private. No future documentation-PR or main identity is invented here; its final operational report records the actual results after the closure condition in the [checkpoint reconciliation](../00-k-closure-report.md#final-technical-acceptance-reconciliation---2026-10-28) is fulfilled.

## Source and run identities

- [PR #4](https://github.com/Hasoba96/website-builder-saas/pull/4): approved head `73e46080dec672bb535fdd1adb14241bb66a4177`, base `5d86555402507d73f103713b198789c594a1811c`, tested merge `dfc9ad87cdc4e947c1f12497d6aceef6bd324a8c`, tree `04add140f93c1651f59582378607988fb01e15a5`.
- [PR run 40747950773](https://github.com/Hasoba96/website-builder-saas/actions/runs/40747950773): pull_request, verify/images SUCCESS; native browser metadata binds tested merge/base/run.
- Owner-authorized squash at 2026-10-28T19:36:19Z: main `7f9e44cbc19d6f17f6a34536488d41766aa8154b`, sole parent the approved base, same tree. The approved source was preserved byte-for-byte.
- [Main run 40755794236](https://github.com/Hasoba96/website-builder-saas/actions/runs/40755794236): fresh push/main execution at that squash SHA, verify/images SUCCESS; exact checkout and browser metadata bind main/run. PR results were not reused as main results.
- Lock SHA-256: `60061b036a4ca44917f066d629a33da7a17ff5bc6855edf52cac48748f28a9af`; original reviewed inventory SHA-256 at the correction commit: `7df1e63cb28d9f8ad5e14e0086a12507850e5cce995a1fbe25fc2f75f90df624`. That inventory is an immutable pre-publication review snapshot, not a current-status dashboard.

## Artifact identity, integrity and retention

Metadata and actual downloaded bytes were verified while unexpired on 2026-10-28. Retention is seven days. Local retained copies and receipt/hash records are available privately; expiry metadata alone is not proof of later downloadable evidence.

| Run         | Artifact        |          ID | ZIP bytes | SHA-256                                                            | Expiry UTC           |
| ----------- | --------------- | ----------: | --------: | ------------------------------------------------------------------ | -------------------- |
| 40747950773 | evidence-verify | 12841888483 |   1365178 | `2f40f452671c8b8d2af8aaebaffacf20d5d61bc3d7cac698515a1442e6aaf9aa` | 2026-11-04T18:50:28Z |
| 40747950773 | evidence-images | 12843335858 |       526 | `a3a257b97ebc85626510bee50d193b1513fbfa04bf25a2936faaeab86ce8716c` | 2026-11-04T18:48:04Z |
| 40755794236 | evidence-verify | 12845319414 |   1364755 | `7b377d0cbd8f372a5a6fff2d41ea46050d4b0392f8af1e68d0b41325712e70a8` | 2026-11-04T19:41:41Z |
| 40755794236 | evidence-images | 12846235956 |       524 | `f33101017cad3b78b578c656a3f9a1e42c003762fea8d823a668105f5d3ee686` | 2026-11-04T19:39:17Z |

Both verify archives contain316 members; each images archive contains one native gate summary. Before extraction, bounded sizes, duplicate/rooted/traversal/symlink paths were checked. Every downloaded digest matches GitHub's SHA-256 metadata. Existing artifact-content assertions, native test/browser/coverage validators and separate Gitleaks scans passed without new suppressions. Summary status is PASS/HOSTED_RUN with the exact lock hash; current-native timestamps and source/run identities were checked. Both actual upload steps succeeded, not merely artifact configuration.

## Actual native results

Both runs report the same186/186 guarded inventory: root 64, API 7, Worker 2, config 29, schemas 12, Dashboard 4, Renderer 4, real PostgreSQL 17, real Redis/BullMQ 15, Compose 7, production Chromium 25. No skips/todos/failures/flaky successes; all eight accepted Linux screenshot comparisons ran normally. Ten nonempty coverage summaries passed unchanged policy; no global coverage or full accessibility certification is claimed.

Typecheck14/14, builds 9/9, frozen disabled-script install, format/lint/boundaries/workspace, supply-chain/license/audit/source-secret and bundle gates passed. Both hosted frontends measure187778 gzip bytes, below 512000. Four independent Linux/musl images and four non-root/readiness/locale/tooling-exclusion/structured-log/clean-shutdown smokes passed in each run. Every job concluded with zero owned test containers and successful sanitized evidence publication.

Main backup/restore evidence: encrypted archive7039 bytes, two recovered synthetic records, unchanged source, migration compatibility and integrity/privilege/refusal assertions; backup134.742264 ms, restore190.705924 ms, total1311.187389 ms. These are disposable same-host fixture timings, not production DR/RPO/RTO. No plaintext backup payload or keys are published.

Separate AI-assisted review and owner acceptance are recorded in the [closure reconciliation](../00-k-closure-report.md#final-technical-acceptance-reconciliation---2026-10-28). Main protection remains effective with strict verify/images from Actions15368 and no bypass; documentation publication and fresh main acceptance remain mandatory before formal closure. No governance, source, workflow, dependency, baseline or test change is introduced by this evidence record.
