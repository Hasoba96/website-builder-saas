# CHECKPOINT 00-B CLOSURE REPORT

Date: 2026-10-01. Scope: Application Skeletons only.

## STATUS

**PASS** for the applicable 00-B gates. This is not Stage 00 closure, production readiness, or permission to start 00-C. The historical [BLOCKED report](00-b-closure-report.md), [Vitest investigation](00-b-vitest-resolution-investigation.md), and [governance review](00-b-supply-chain-governance-review.md) remain unchanged.

## DEPENDENCY DECISION

Accepted under the binding risk-based CORE-002 after fresh pre-install review, strict resolution, installation, and actual compatibility/security verification. No force flag, legacy peers, unsupported override, patch, fork, suppression, or framework change was used. The 1440-minute maturity floor, exact pins, strict peers/engines, official registry and disabled install scripts remain enforced.

See the dated [POST-CORE-002 review](00-b-dependency-review.md) and [complete inventory](evidence/00-b-dependency-inventory.json): 408 unique resolved third-party versions, 26 unique direct versions including unchanged 00-A tools, and 143 tracked transitive findings. The Windows installation selects 323 packages; the inventory also includes optional/platform versions.

## VITEST GRAPH

Vitest **5.0.2**, Vite **8.3.1**, @vitest/mocker **5.0.2**, estree-walker **3.0.3**. Vitest remains the approved framework. Its mandatory mocker dependency is not removed or substituted. All 408 graph versions were evaluated; npm and OSV returned no known advisories at review time. Frozen installation and real tests passed on Node 24.21.0.

## TRACKED TRANSITIVE FINDINGS

- estree-walker@3.0.3: TRANSITIVE / TEST-DEV TOOLING / upstream DEPRECATED / **ACCEPT WITH TRACKING**. Review by **2026-12-30**. No direct import, privileged install hook, known applicable advisory, or source/integrity blocker found. Maintained Vitest consumer; replacing it is not a supported leaf-level project action.
- 142 age-only transitive findings: **ACCEPT WITH TRACKING**, review by **2027-03-30**. Per-version paths, execution exposure, licenses, ages and rationale are recorded in the review/inventory. Runtime/build paths are not classified as harmless because they are indirect.
- Owner: engineering platform / checkpoint maintainer. Reviewer: Codex acting under explicit owner authorization, not an independent human approval.
- Immediate re-evaluation: new advisory or High/Critical, malware/compromise, consumer/framework or graph/path changes, direct use, production shipping, privilege/execution context, support/EOL/deprecation changes, integrity/provenance concern, or supported upstream replacement. Deadlines are maximum intervals, not grace periods.

## DIRECT AGE EXCEPTIONS / CORE-002 EXCEPTIONS USED

**reflect-metadata@0.2.2**: Direct mandatory Nest peer; published 2024-03-29, older than 18 months. Upstream continues support for legacy TypeScript decorators; no package EOL/deprecation established. Nest 12.1.1 requires ^0.1.12 || ^0.2.0. Apache-2.0; downloaded SHA-512 verified; no known advisory in the selected version or complete graph. Standard decorator metadata is not a compatible drop-in replacement. Accepted under the owner's existing dependency-specific exception; real strict build and lifecycle tests passed.

**rxjs@7.8.2**: Direct mandatory Nest peer; published 2025-02-22, older than 18 months. Upstream identifies RxJS 7 as the maintained production line; no package EOL/deprecation established. Nest 12.1.1 requires ^7.1.0. Apache-2.0; downloaded SHA-512 verified; no known advisory in the selected version or complete graph. Another reactive library or prerelease does not satisfy the framework contract. Accepted under the existing owner exception; its tslib dependency has a separate transitive disposition.

Both remain direct dependencies. Maintenance/source references and alternatives are in the [dependency review](00-b-dependency-review.md). Review by 2026-12-30 and immediately on CORE-002 events; approvals are not permanent security guarantees.

## FILES CREATED

81 Git-eligible files, including this report and verification evidence. Generated next-env.d.ts, dist, .next, node_modules and test-results are not source additions.

```text
apps/api/package.json
apps/api/src/app.module.ts
apps/api/src/bootstrap.ts
apps/api/src/main.ts
apps/api/tests/bootstrap.spec.ts
apps/api/tsconfig.build.json
apps/api/tsconfig.json
apps/api/vitest.config.ts
apps/dashboard-web/next.config.ts
apps/dashboard-web/package.json
apps/dashboard-web/src/app/[locale]/error.tsx
apps/dashboard-web/src/app/[locale]/layout.tsx
apps/dashboard-web/src/app/[locale]/loading.tsx
apps/dashboard-web/src/app/[locale]/page.tsx
apps/dashboard-web/src/app/[locale]/styles.css
apps/dashboard-web/src/i18n/request.ts
apps/dashboard-web/src/i18n/routing.ts
apps/dashboard-web/src/i18n/types.d.ts
apps/dashboard-web/src/messages/ar.json
apps/dashboard-web/src/messages/en.json
apps/dashboard-web/src/proxy.ts
apps/dashboard-web/tests/states.spec.ts
apps/dashboard-web/tests/translations.spec.ts
apps/dashboard-web/tsconfig.json
apps/dashboard-web/vitest.config.ts
apps/public-renderer/next.config.ts
apps/public-renderer/package.json
apps/public-renderer/src/app/[locale]/error.tsx
apps/public-renderer/src/app/[locale]/layout.tsx
apps/public-renderer/src/app/[locale]/loading.tsx
apps/public-renderer/src/app/[locale]/page.tsx
apps/public-renderer/src/app/[locale]/styles.css
apps/public-renderer/src/i18n/request.ts
apps/public-renderer/src/i18n/routing.ts
apps/public-renderer/src/i18n/types.d.ts
apps/public-renderer/src/messages/ar.json
apps/public-renderer/src/messages/en.json
apps/public-renderer/src/proxy.ts
apps/public-renderer/tests/states.spec.ts
apps/public-renderer/tests/translations.spec.ts
apps/public-renderer/tsconfig.json
apps/public-renderer/vitest.config.ts
apps/worker/package.json
apps/worker/src/app.module.ts
apps/worker/src/bootstrap.ts
apps/worker/src/main.ts
apps/worker/tests/bootstrap.spec.ts
apps/worker/tsconfig.build.json
apps/worker/tsconfig.json
apps/worker/vitest.config.ts
docs/checkpoints/00-b-applications.md
docs/checkpoints/00-b-completion-report.md
docs/checkpoints/evidence/00-b-artifact-check.json
docs/checkpoints/evidence/00-b-dependency-inventory.json
docs/checkpoints/evidence/00-b-verification.json
packages/config/base.json
packages/config/next.json
packages/config/node.json
packages/config/package.json
packages/config/src/locales.ts
packages/config/tests/locales.spec.ts
packages/config/tsconfig.json
packages/config/tsconfig.test.json
packages/config/vitest.config.ts
playwright.config.ts
scripts/check-boundaries.spec.ts
scripts/check-boundaries.ts
scripts/next.ts
scripts/process-lifecycle.spec.ts
scripts/scan-secrets.spec.ts
scripts/scan-secrets.ts
tests/browser/shell.spec.ts
tests/browser/shell.spec.ts-snapshots/dashboard-web-ar-1440-win32.png
tests/browser/shell.spec.ts-snapshots/dashboard-web-ar-390-win32.png
tests/browser/shell.spec.ts-snapshots/dashboard-web-en-1440-win32.png
tests/browser/shell.spec.ts-snapshots/dashboard-web-en-390-win32.png
tests/browser/shell.spec.ts-snapshots/public-renderer-ar-1440-win32.png
tests/browser/shell.spec.ts-snapshots/public-renderer-ar-390-win32.png
tests/browser/shell.spec.ts-snapshots/public-renderer-en-1440-win32.png
tests/browser/shell.spec.ts-snapshots/public-renderer-en-390-win32.png
vitest.config.ts
```

## FILES MODIFIED

```text
.gitignore
.prettierignore
README.md
docs/checkpoints/00-b-dependency-review.md
eslint.config.ts
package.json
pnpm-lock.yaml
scripts/turbo.ts
tsconfig.base.json
tsconfig.json
turbo.json
```

Previously approved policy reconciliation edits were preserved, not counted as application implementation changes. No governing rule, playbook, system rule or ADR was changed to fit this implementation.

## APPLICATIONS CREATED

- api: real Nest bootstrap on an OS-assigned loopback port; no controller, business endpoint, health or readiness endpoint. Native HTTP framework header removed; resource closure tested.
- dashboard-web: independent Next application with translated foundation-state shell, AR/EN, RTL/LTR, loading/error boundaries and keyboard-accessible navigation.
- public-renderer: independent Next application with its own UI/catalogs and the same locale primitives. No dashboard UI import, site engine, hostname resolution or published data.
- worker: real queue-free Nest application context with lifecycle handling. An idle timer only keeps the skeleton process alive; no job or queue exists.

## PACKAGES CREATED

Only packages/config: the single strict TypeScript baseline, framework-specific TS presets, and actual AR/EN locale/direction primitives used now. No empty schemas/types/site-sections/ui-dashboard/testing/observability package or speculative domain abstraction was added.

## DEPENDENCIES ADDED

18 new exact direct third-party versions:

- @nestjs/common, @nestjs/core, @nestjs/platform-express, @nestjs/testing: **12.1.1**. Runtime bootstrap/HTTP adapter and real Nest tests; worker's HTTP adapter is a development testing peer.
- reflect-metadata **0.2.2**, rxjs **7.8.2**: mandatory Nest peers.
- next **16.3.7**, react/react-dom **19.3.0**, next-intl **4.14.8**: actual independent web shells and localization.
- @types/react, @types/react-dom **19.3.0**: strict JSX/DOM compilation.
- vitest **5.0.2**, vite **8.3.1**: approved tests and mandatory peer.
- @playwright/test/playwright-core **1.63.0**, @axe-core/playwright **4.13.0**: limited real shell verification required by FE-063/091/092/093, TS-053 and IL-050. No browser-testing platform or product journey was fabricated.
- webpack **5.111.1**: next-intl plugin declaration's real LoaderContext type dependency with skipLibCheck disabled. This does not replace Next's default Turbopack build.

Existing 00-A versions remain unchanged. Licenses, support/release dates, engines, peers, source/integrity and necessity are documented per dependency. No dependency for a later checkpoint was introduced.

## BUILD RESULTS

- api: **PASS**, TypeScript production output.
- dashboard-web: **PASS**, real optimized Next build.
- public-renderer: **PASS**, real optimized Next build.
- worker: **PASS**, TypeScript production output.
- config: **PASS**, actual consumed package output.

Each application was also built individually from the root with pnpm --filter @website-builder/<app> build.

## TURBO TASK RESULTS

- Workspace graph: **5 packages**, four apps plus config.
- Build: **5/5 successful**, 0 Turbo cache hits.
- Typecheck: **6/6 successful**, including the prerequisite config build; root TypeScript check also passed.
- Test task graph: **10/10 successful**: five prerequisite builds and five package test tasks. Root tests/browser checks execute after Turbo.
- No zero-task build/test is counted as evidence. Turbo's JSON packageManager label pnpm9 is its adapter label; the actual pinned executable is pnpm 10.34.6.

## TEST RESULTS

**29 Vitest tests passed**: API 2, worker 2, config 5, dashboard 4, renderer 4, root architecture/lifecycle/secret-gate tests 12. **11 Chromium tests passed**, retries 0. Format, lint, strict typecheck, workspace checks and all builds passed.

Tests exercise actual boot/resource release, translation catalogs and safe route states, public shared imports, forbidden app/internal imports, alias resolution, real compiled processes and the secret scanner's negative path. No fake feature tests, skipped tests, coverage inflation or test framework replacement.

## BOOT / SHUTDOWN RESULTS

API and worker module initialization, actual process startup, shutdown completion, zero exit code and empty stderr passed. The API listener rejects connections after closure. Parent-only Node IPC provides a portable graceful shutdown test with stdin disabled; SIGINT/SIGTERM handlers use the same guarded close path and a 10-second deadline. Foreground dev boot and signal handling were also exercised.

Both Next production servers returned HTTP 200 for AR/EN, then the browser harness terminated its owned servers. Development boot was verified separately. No HTTP control/debug endpoint was introduced.

## I18N RESULTS

Both catalogs have identical nonempty keys and localized titles. Missing keys fail strict compilation through typed next-intl messages and bidirectional catalog shape checks. Arabic is the default, language navigation works by keyboard, and the two applications retain independent selected locales. Loading/error strings are translated; raw error details are not rendered.

## RTL / LTR RESULTS

Both apps passed at 390x844 and 1440x900 in AR/EN: correct root lang/dir, logical CSS layout, no horizontal overflow or overlap, visible focus and skip navigation. Eight normal screenshot baselines were visually reviewed and compared. Eight additional long/mixed-text captures were visually reviewed: more than 50% longer text, Arabic/English/numerals and existing language links remain readable without truncation. Stress fixtures are test-only DOM changes, not product strings.

## PACKAGE BOUNDARY RESULTS

**PASS**: all actual application imports; approved package public exports; four requested cross-app negative cases; path-alias bypass rejection; internal-package and dashboard/site UI separation; static/dynamic/type/require/re-export inspection; local import-cycle detection. Computed imports cannot silently evade the current checker.

## SECURITY RESULTS

No source secrets/credentials, unsafe client environment exposure, raw HTML injection, application-authored debug endpoint, cross-app import, any or TypeScript suppression was found. Native Next development diagnostics remain loopback-only; dev servers are not a production deployment. Next/Turbo telemetry is disabled through project launchers. Next's official agentRules option is false, preventing development startup from generating repository instruction files; only the files generated by this verification were removed. Install scripts remain disabled, sources official, peers/engines strict, direct versions exact and frozen lockfile consistent.

The existing Gitleaks policy was not broadened. Tests prove the source scanner rejects synthetic secret canaries in untracked files and force-added ignored artifacts. Ignored generated Next server keys are not source credentials; separate artifact checks found no matching generated key in client assets.

Current Next production trace evidence: six trace files and 1,454 traced entries per app; **zero test-tool path matches**. Thirteen client files per app, **608,381 raw bytes**, with zero generated-key client matches. This proves the inspected trace/client scope only, not exclusion from an unbuilt container or arbitrary deployment filesystem.

## DEPENDENCY SCAN

**PASS**: pnpm audit returned no known vulnerabilities at any severity. Fresh npm bulk and OSV checks covered all 408 versions and returned no advisories. No malware/compromise evidence appeared in the reviewed official sources. This is not a claim of universal safety or a full third-party code audit. Optional provenance attestations were not independently verified; tarball integrity and official source checks were verified.

Permissive licenses plus MPL-2.0 tooling, CC-BY-4.0 data and LGPL-3.0-or-later native distribution obligations were reviewed. No incompatible intended-use license found. Preserve upstream notices; future container/binary redistribution still needs its applicable license obligations checked.

## SECRET SCAN

**PASS**, zero source findings using Gitleaks 8.30.1. Scope: all tracked files, including tracked ignored files, plus untracked Git-eligible files. Generated directories are excluded by source inventory, not a new secret suppression. No claim is made that scanning ignored local credentials is a substitute for source scanning.

## CLEAN INSTALL

**PASS** from a newly created source-only directory with no node_modules, generated build output or package store copied. pnpm install --frozen-lockfile --ignore-scripts --store-dir .pnpm-store downloaded all **323** selected packages, reused **0**. The full applicable verification sequence was then run from that directory's root against final implementation sources.

The OS/toolchain and reviewed private SWC native cache were shared; this is a clean dependency/source build, not a clean OS or browser-download test. After the final development-only agentRules configuration correction, source changes were synchronized to that verification copy and the full applicable checks repeated; the dependency graph did not change. No real workspace dependency directory was deleted.

## LOCKFILE

Final SHA-256: `30d36d2bcba1384e18066c941b3bb7b879bacfb3242fd3d8259e36f8daeb5fd5`.

Fresh frozen installs left this hash unchanged. The resolved graph matches the reviewed 408-version inventory. pnpm-lock.yaml is ready for a later owner-authorized commit; no commit or staging was performed here.

## KNOWN LIMITATIONS

- Windows x64 / Chromium verification only. Linux containers, other browsers, staging and production deployment are not claimed tested.
- A permissive default Windows SWC cache ACL was rejected by SWC. Its documented private-cache setting was used with a new user-owned directory; integrity checks and existing ACLs were not weakened. Setup is documented in the [guide](00-b-applications.md).
- Portable Windows pnpm.cmd/Turbo can retain batch-shell confirmation prompts after child app shutdown. A second Ctrl+C completes launcher cleanup. Application graceful exit is separately proven; forced shell cleanup is not mislabeled graceful.
- Backend dev compiles once; restart after edits. Shared config must rebuild after changes.
- Concurrent development servers plus full parallel typechecking exhausted available host memory once. The final launcher limits build/check concurrency to two, accepts Turbo's explicit concurrency override, and the full verification was repeated without development servers. No strictness, peer or test gate was weakened.
- API uses a temporary OS-assigned loopback port; worker has no external transport. Typed runtime settings belong to 00-C.
- CI automation, deployment packaging, production artifact filesystem inspection and supply-chain ongoing scheduling are later gates. Tracking deadlines are recorded, not claimed automatically monitored.

## N/A CHECKS

Cross-tenant runtime tests: **N/A under ADR-001**, no tenant-capable surface; tenant isolation is not waived. DB/migrations, Redis/queues, R2, authentication, publishing, site rendering, product journeys, load/DB-query tests, recovery/DR and external error tracking: **N/A**, absent by approved 00-B scope.

Plural/date/currency behavior and tenant/site locale persistence: **N/A**, no such UI/domain surface exists. Error/loading render checks apply now; no fake data-empty/forbidden-resource state is manufactured. Probes/request IDs/general error protocol (00-F), typed environment (00-C), containers (00-I), CI (00-J), and backup (00-K) are not implemented or declared PASS.

## RULE IDS APPLIED

CORE-001/002/013/020/021/023/081/130/132/134; CORE-022 preserved with no domain contracts introduced. BM-020/021/034/052/071; FE-013/030/031/063/091/092/093 for existing surfaces; IL-002/010/011/012/015/020/021/026/050/051/052/053/055/056 for the technical shells; TS-020/021/022/023/026/027/044/053; SE-060/061/062/063/064. CI-specific execution remains scheduled for 00-J, not claimed implemented. ADR-001 remains applicable and unchanged; no new ADR trigger or architectural decision was introduced.

## MANUAL REVIEW

All created/modified implementation and configuration files, manifests, resolved lockfile graph, tests and documentation were inspected. Review covered necessity, architecture/module boundaries, strictness, security/privacy, shutdown/timeouts/resource handling, names, maintainability, source paths, translations/accessibility and accidental complexity.

Ordinary failures were fixed within scope: actual Webpack declaration dependency, strict Next route type generation after dev, Vite JSX automatic runtime for route-state tests, asset proxy matching, Windows stdin-independent lifecycle tests, generated-secret/source distinction, loading/error skip-link targets, and disabling unsolicited Next development agent-file generation through its supported configuration. No rule was edited to fit code and no failed check was suppressed. Full verification was rerun after the fixes.

## GIT STATUS

Existing unborn branch `chore/infra-checkpoint-00-a` retained. Existing staged hook/intent-to-add entries and earlier documentation changes preserved. New 00-B files remain untracked; modified toolchain files remain uncommitted. No add/commit/remote/push was performed in the real repository.

git diff --check passed. Normal git diff cannot display every untracked file in this unborn repository; these were reviewed from the filesystem and are listed above. All three protected historical report SHA-256 values still match their pre-resume values.

## EVIDENCE

- [Dependency review and tracking](00-b-dependency-review.md)
- [Full resolved dependency inventory](evidence/00-b-dependency-inventory.json)
- [Production trace/client inspection](evidence/00-b-artifact-check.json)
- [Verification summary](evidence/00-b-verification.json)
- [Setup, commands and troubleshooting](00-b-applications.md)
- Reproducible tests: scripts/*.spec.ts, app/package tests and tests/browser/shell.spec.ts.
- Eight committed Windows baselines: tests/browser/shell.spec.ts-snapshots/.
- Local-only raw command logs: `.local/00b/clean-final-*.log`, `post-dev-clean-*.log`, `final-*.log` and `individual-*-build.log`. Long-text captures: `test-results/shell-*/long-mixed-text.png`. These generated artifacts are not source commits.

## NEXT CHECKPOINT

**00-C - Typed Configuration & Environment. NOT STARTED.**

**STOP. Await explicit owner approval.**
