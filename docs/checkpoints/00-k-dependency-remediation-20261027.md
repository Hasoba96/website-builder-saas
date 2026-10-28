# 00-K dependency remediation preflight - 2026-10-27

Owner/module owner: Hasoba96, infrastructure/API dependency security. **BLOCKED by the existing release-maturity policy. No package update, install, lockfile change, commit, branch, push or PR. 00-K is not CLOSED.** The owner authorized remediation and one protected publication only after every required gate passes; this record does not grant a security or governance exception.

## Preserved candidate and current repository

Remote main remains `5d86555402507d73f103713b198789c594a1811c`, protected by active ruleset 24885869 with strict GitHub Actions `verify`/`images`, app 15368, required PR/resolved threads, solo approvals zero, stale-review dismissal, squash-only, no bypass/force-push/deletion. Local HEAD remains `105dbaab8eca8ddfa2e96c2a91db4ee2628b66be`; both trees are `752b2d37f2fbd8646e5c092099c5bd05a2319e96`. The existing branch/index and all eight prior candidate files were verified and preserved before investigation.

The [resumption inventory](00-k-resumption-inventory.json), SHA-256 `c8596342eab20c1914b1cf746717eb689c546146d08a9b565b799487d6aa50c4`, and [resumption report](00-k-resumption-20261027.md) remain byte-identical. All 298 original-checkout Git-eligible files, HEAD, branch and index match the preserved fingerprint. Persistent development volumes remain untouched. Lockfile SHA-256 remains `be29a554f8d40b5722408eef0b59e4114dced472f1578b7caf123750c4188074`.

Fresh preflight: Node 24.21.0, pnpm 10.34.6, Linux Docker Engine 29.8.1, zero containers; C: 18,344,325,120 free bytes, F: 21,354,434,560, approximately 5.3 GiB free RAM. Capacity/runtime is not the blocker. Private preservation, registry, graph, audit and negative-resolution evidence is under `.local/00k-dependency-20261027`; none of its raw logs or metadata archives is publication payload.

## Fresh advisory and consumer review

The current audit still reports 6 High, 2 Critical, 9 Moderate and 3 Low. The eight previously reported High/Critical advisories were re-read from GitHub's reviewed advisory pages and compared with fresh official npm packuments and the current lockfile graph. They are not treated as resolved or waived on claimed non-reachability.

| Package / installed version | Current consumer and exposure                                                                              | Nearest fixed candidate, not installed                                                   |
| --------------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| vite 8.3.1                  | Root direct build/test peer; Vitest/mocker also consume Vite                                               | 8.3.3, MIT, Node ^20.19 or >=22.12                                                       |
| next 16.3.8                 | Direct runtime/build dependency in both web apps; next-intl peer; root directly invokes matching @next/env | next and @next/env 16.4.1, MIT, Node >=20.9, React/DOM 19.3 peers supported              |
| zod 4.6.5                   | Direct schemas dependency, used through config/observability/database/queue/application boundaries         | 4.6.6, MIT, same schema framework major                                                  |
| multer 2.4.0                | Exact transitive pin in @nestjs/platform-express 12.1.1, explicitly declared by both API and Worker        | multer 2.5.0 via adapter 12.3.0; MIT; adapter peers accept existing Nest core/common ^12 |
| body-parser 2.3.0           | Express 5.2.1 through the same adapter; body parsing remains disabled by the application boundary          | 2.4.0 within supported Express 2.x dependency range; MIT                                 |
| undici 6.29.0               | CI artifact consumer through @actions/github 9.1.1 and @actions/http-client 4.0.1/3.0.2                    | 6.29.1 in the existing 6.x ranges; MIT, Node >=18.17                                     |

Also necessary for the unchanged zero-finding audit exit requirement: Vitest and matching V8 provider 5.0.2 to 5.0.3 for two @vitest/mocker Moderate findings; fast-uri 3.1.8 to 3.1.9 in the existing ajv 8.20.0/schema-utils/webpack path for its Moderate/Low findings. Vite and undici corrections cover their additional lower-severity findings. Use targeted normal package-manager resolution of compatible transitive ranges, not overrides, new artificial direct pins or broad unrelated updates. A resolved graph must still be audited; this is not a prediction that no new finding can arise.

Selected candidate publication dates, current latest stable dates/versions, exact metadata/integrities, engine/peer/license declarations and install-script fields were collected privately. The nearest fixed Vite, Vitest/provider, Next/env, Zod, body-parser, multer, undici and fast-uri candidates predate the 24-hour floor. Their ordinary licenses are MIT except fast-uri BSD-3-Clause; existing Sharp/native notice obligations remain mandatory. Undici declares a development `prepare` script; lifecycle execution remains disabled. No candidate code was installed or executed. Complete graph/integrity/license/maintenance acceptance and build/bundle compatibility remain pending resolution and testing, not blanket-approved from this table.

## Confirmed mandatory blocker

The existing [00-A installation discipline](00-a-toolchain.md#installation-discipline) states that newly resolved releases must be at least **1440 minutes** old. `pnpm-workspace.yaml:5` enforces `minimumReleaseAge: 1440`. This is separate from CORE-002's direct-dependency 18-month age review and cannot be removed or bypassed to fix a vulnerability. See the [official pnpm 10 setting](https://pnpm.io/10.x/settings#minimumreleaseage).

All stable Nest 12 adapter manifests were inspected. Releases through 12.2.0 retain an exact vulnerable multer pin. The first fixed adapter is **@nestjs/platform-express 12.3.0**, published **2026-10-27T09:03:09.821Z**, using multer 2.5.0. Its [official release](https://github.com/nestjs/nest/releases/tag/v12.3.0) is dated October 27. Later 12.3.1 and 12.3.2 were also published today; none is mature. This is an available supported fix blocked temporarily by the existing maturity requirement, not evidence that no upstream fix exists.

At **2026-10-27T12:45:24.262Z**, the earliest fixed adapter was less than four hours old. A separate metadata-only diagnostic workspace with the same 1440-minute floor, strict peers/engines, official registry and disabled scripts ran `pnpm install --lockfile-only --ignore-scripts`. It returned exit 1:

```text
ERR_PNPM_NO_MATURE_MATCHING_VERSION
Version 12.3.0 ... of @nestjs/platform-express does not meet the minimumReleaseAge constraint
```

No `node_modules` was created. Root manifests, node_modules, lockfile and acceptance policy remain unchanged. No `minimumReleaseAgeExclude`, override, forced resolution, alternative adapter, downgrade/framework replacement or unpublished fork was introduced. Keeping the vulnerable exact multer pin would fail CORE-002; replacing it outside the consumer's declaration would violate the explicitly prohibited override policy.

Earliest eligibility for **12.3.0**: **2026-10-28T09:03:09.821Z**, approximately **12:03:10 Cairo time on October 28**. Recheck exact time, advisories, metadata, support and the complete graph then. Later adapter patches have later eligibility times. No automatic installation, delayed task, waiver or publication is scheduled.

## Review packets and conditional continuation

Existing actual packet: 374 conservative code lines, untouched. Review the eventual security remediation separately: nine direct pin replacements across root, both web apps, schemas, API and Worker would add 18 changed lines. Four minimal current acceptance-record replacements (review date, lock hash, review reference and Next/env security version record) would add eight more. The **conditional aggregate is 400**, not a measured final diff or permission for additional compatibility changes. Actual formatting, graph acceptance and compatibility changes must be counted after implementation; generated lockfile/review inventories and Markdown remain separately reviewed, not used to hide executable/security configuration changes.

If any necessary compatibility/security-code change takes the ordinary aggregate above 400, stop before branch/commit/publication and present a compliant PR sequence for owner decision. Multiple commits or <=400-line subpackets do not authorize an oversized ordinary PR. The consumed foundation-import exception is unavailable.

The preserved [combined investigation inventory](00-k-dependency-remediation-inventory.json) records the actual current ten-file candidate, its hashes and this blocker; it is **not publication-ready**. No dependent implementation, canonical full CI, new image/browser verification or hosted run was attempted after confirmed maturity rejection. The earlier 186/186 tests, 14 typechecks and nine builds remain dated evidence in the resumption report, not fresh dependency-remediation verification. Fresh work here consists of identity/preservation, metadata/advisory/consumer review, audit, the negative maturity check, documentation/secret checks and exact resource inventory.

Distinct same-agent AI-assisted technical/security/disclosure review confirmed the exact consumer pin, all fixed Nest 12 release dates, the reproducible maturity refusal and preservation boundaries. It is not independent human/model approval. Disposition is **BLOCK**, with upgrade compatibility, full graph review and all local/hosted gates pending. No new risk acceptance or governance exception is invented.

Once maturity permits, the existing owner authorization covers resuming the same bounded review/update/local-CI/protected-PR sequence; no redundant approval for those already authorized phases is needed. First finish CORE-002 review and minimal normal resolution, then install with scripts disabled, run focused compatibility checks and complete `pnpm ci:verify`, all native tests/coverage/secrets/budgets and cleanup. Revalidate exact aggregate/review/main/protection before creating a fresh ordinary branch, reviewed commit(s), one non-force push and one PR. Require fresh Linux `verify`/`images` and sanitized artifact integrity. Merge remains unauthorized. Rollback after any later publication is an ordinary protected reviewed revert, never a direct push or history rewrite.

Primary advisory references: [Vite](https://github.com/advisories/GHSA-587h-7wmj-h5pm), [Next image optimization](https://github.com/advisories/GHSA-2464-fhr4-w9xw), [Next server actions](https://github.com/advisories/GHSA-p3m5-59mp-jv5r), [Next cache](https://github.com/advisories/GHSA-673q-mjm6-r5xr), [Zod](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5), [body-parser](https://github.com/advisories/GHSA-27r3-jxmh-p828), [multer](https://github.com/advisories/GHSA-q7qp-rjg7-q26m), [undici](https://github.com/advisories/GHSA-xjj6-f33q-929c); registry packuments from `registry.npmjs.org`. Package versions and graph findings are investigation evidence, not an exploit certification or completed compatibility review.

Applied rules: CORE-002/040/041/043/044/045/046, existing 00-A maturity policy, unchanged TS-024/060/063 and security gates. No production/customer data, persistent-state mutation, CI waiver, GitHub settings change, deployment, Stage 00-L or Stage 01 work.
