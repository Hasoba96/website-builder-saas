# 00-J dependency review

Review date: 2026-10-08. Scope: CI tooling only. CORE-002 applies to CI and all transitives. No new runtime application dependency is authorized by this review.

## Rejected prebundled candidates

Official release manifests and production lockfiles were fetched from the Actions repositories without installing or executing them. `npm audit --omit=dev --package-lock-only --json` reported:

| Candidate                             | High findings | Decision |
| ------------------------------------- | ------------: | -------- |
| actions/checkout 7.0.1                |             1 | BLOCK    |
| actions/checkout 6.1.0 / 5.1.0        |        2 each | BLOCK    |
| actions/setup-node 7.0.0              |             2 | BLOCK    |
| actions/setup-node 6.5.0              |             3 | BLOCK    |
| actions/upload-artifact 7.0.1 / 7.0.2 |        5 each | BLOCK    |

For example, checkout 7.0.1 and setup-node 7.0.0 lock undici 6.27.0; upload-artifact locks 6.23.0. Both are affected by [GHSA-rfgv-xxqx-mfg5](https://github.com/advisories/GHSA-rfgv-xxqx-mfg5), patched in 6.28.1. The upload bundle also contains the WebSocket implementation. CI-only exposure does not waive CORE-002. No rejected action will be referenced by a workflow. No fork, override, patch or vulnerability suppression is used.

## Supported replacement

Use native Git and the checksum-verified official Node distribution for checkout/toolchain setup. Use the [official Artifact SDK](https://github.com/actions/toolkit/tree/main/packages/artifact) through a repository-owned JavaScript action for artifact upload. This uses the supported SDK API, not a custom artifact protocol or a patched upstream action. The local action is versioned with the reviewed repository commit; there is no floating external action ref.

Direct dependency: `@actions/artifact@6.3.1`, root devDependency, MIT, stable semver release published 2026-10-06T12:49:22Z. It exceeds the 1,440-minute maturity floor. Maintained by GitHub Actions; the latest official upload-artifact release uses this SDK. Needed now for native GitHub test/coverage evidence (TS-063); excluded from application runtime images. Node 24 compatibility is checked with strict engines and peers. No framework or application API is changed.

An isolated metadata-only pnpm resolution, with strict peers, automatic peer installation disabled, lifecycle scripts disabled and the maturity floor enabled, resolved 152 package versions. Audit: zero Critical, High, Moderate or Low findings. The combined repository graph must pass again before installation and at closure. Registry sources are npmjs.org with SHA-512 integrity. No dependency lifecycle install scripts were found in this candidate graph. No known malware/compromise evidence was identified; this is not a guarantee of absence.

Licenses: MIT, MIT/X11, ISC, BSD-3-Clause, Apache-2.0, 0BSD, BlueOak-1.0.0 and Apache-2.0 AND BSD-3-Clause. Preserve notices. `buffers@0.1.1` omits license metadata in its npm tarball; Debian's [upstream license review](https://sources.debian.org/copyright/license/node-buffers/0.1.1-2/) records MIT and the exact upstream license commit. Its source repository is no longer available at the recorded URL. Retain this evidence and classify the metadata/source availability gap WITH TRACKING, not as proof of an incompatible license or of active maintenance. Do not redistribute it without its MIT notice. CI upload tooling is not shipped in application images.

## Tracked findings

Owner: project maintainer. Reviewer: checkpoint implementer. Authorization: binding CORE-002 risk-based policy, not a new exception.

- `glob@10.5.0`, transitive through archiver: upstream deprecation, ACCEPT WITH TRACKING, review by 2027-01-06 (90 days). The selected release is not in the current audit's vulnerable ranges. No direct use, arbitrary user-controlled glob or product runtime exposure. No supported dependency-range change is made by this project.
- Age-only transitive versions listed in the generated inventory: ACCEPT WITH TRACKING, review by 2027-04-06 (180 days). These are maintained-consumer paths for archive/stream/HTTP support, not direct dependencies. The isolated candidate has no unresolved High/Critical finding. No blanket approval of other versions or future graph changes.
- `buffers@0.1.1`: review by 2027-01-06 because license metadata and source availability are additional signals. Its MIT evidence is retained above; it is an indirect unzip-stream dependency, not directly imported by project code.

Re-evaluate immediately on new advisories, compromise evidence, consumer/path changes, direct use, shipping or privilege changes, support/deprecation changes, integrity concerns, or a supported upstream replacement. Deadlines do not defer hard blockers. Existing Nest direct-age approvals and existing A-I tracked findings remain unchanged.

## Verification tools

Node 24.21.0, pnpm 10.34.6 and Gitleaks 8.30.1 retain their existing approved versions. Linux bootstrap uses exact official downloads and checked hashes, not `latest` or install hooks. Git and Docker are runner-provided capabilities with explicit prerequisite checks. No credentials or provider access are requested locally.

Raw candidate manifests/audits are ignored local investigation evidence under `.local/00j-review`; sanitized checkpoint evidence records accepted inventory and final combined scan results. A successful local audit is not a GitHub-hosted run.

## Recovery review — 2026-10-11

Fresh audit rejected Next.js 16.3.7: one High, four Moderate and one Low advisory. The High finding is [GHSA-cjq9-62q9-8jv4](https://github.com/advisories/GHSA-cjq9-62q9-8jv4), with the registry advisory naming 16.3.8 as patched. No non-reachability waiver is used. Earlier dated audit results remain historical, not current acceptance.

Candidate direct updates: `next@16.3.8` in both Next applications and root `@next/env@16.3.8`. These retain the existing runtime framework and framework-owned environment loader; no competing package or architecture is introduced. The [official stable release](https://github.com/vercel/next.js/releases/tag/v16.3.8) and npm metadata identify a maintained security patch. Both packages were published on 2026-09-30, exceeding the 1,440-minute maturity floor. Next requires Node >=20.9.0 and supports the current React/React DOM 19.3.0 peers. Existing next-intl/Playwright compatibility remains subject to strict peer resolution and regression tests. Both licenses are MIT. Registry tarballs carry SHA-512 integrity; no install lifecycle hook is enabled. Select this corrective patch rather than unrelated latest minor 16.4.0.

Before installation: update the exact candidate pins, resolve the lockfile without installing or running hooks, inspect every package-version delta and its source/license/engine/peer/maintenance metadata, then audit the complete graph. Acceptance is conditional until those checks pass. Existing tracked findings, owners and earlier review deadlines remain unchanged; package updates do not reset their clocks. Review owner: project maintainer; reviewer: checkpoint implementer. No exception, override, fork, force flag or suppression is authorized.

Completed pre-install review: the lockfile delta contains only Next.js, its matching environment loader and eight optional platform SWC packages, all at 16.3.8; all other resolved versions remain unchanged. Fresh npm metadata for each changed package declares MIT, no deprecation and no install lifecycle script. SHA-512 values match the resolved lockfile. Strict peer resolution succeeded without overrides. The complete candidate audit reports zero findings at every severity (609 audited dependencies). No new compromise signal was found in the consulted official release/advisory and registry evidence; this is not a claim of guaranteed absence. Disposition: ACCEPT for this security patch, with existing transitive tracking retained. The accepted lockfile SHA-256 is `be29a554f8d40b5722408eef0b59e4114dced472f1578b7caf123750c4188074`. Installation and build/browser regression remain separate execution gates.
