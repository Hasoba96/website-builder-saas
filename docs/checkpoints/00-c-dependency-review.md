# 00-C Dependency Review

Review date: 2026-10-01. Owner: engineering platform / checkpoint maintainer.
Reviewer: Codex under the owner's checkpoint implementation authorization.

## Pre-install decision

Only two direct dependency changes are needed. No framework changes, overrides,
install-hook approvals, or age exceptions are introduced.

| Package   | Exact version | Necessity and exposure                                                                                                                          | Maintenance, compatibility, license                                                                                                               | Disposition |
| --------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| zod       | 4.6.5         | Shared configuration schemas required by CORE-022/071; Node runtime and build, not browser configuration                                        | Stable official release, 2026-09-13; actively maintained 4.x; TypeScript 5.5+ (project 6.0.3), no peer dependencies, no runtime dependencies, MIT | ACCEPT      |
| @next/env | 16.3.7        | Official environment-file loader in the existing Next launcher; promoted from the existing graph to direct root tooling use, not a new resolver | Exact match for installed Next 16.3.7; existing reviewed release 2026-09-29; maintained Next framework component, no dependencies/peers, MIT      | ACCEPT      |

Zod implements the already documented schema strategy; handwritten validation or
a competing validation library would duplicate that strategy. Its official
registry tarball is 1,052,733 bytes compressed / 6,140,311 bytes unpacked, including
multiple distributions and source. The public config entrypoint imports only
types and does not ship Zod. The @next/env tarball is 4,829 bytes compressed /
11,895 bytes unpacked. Both have no install/preinstall/postinstall lifecycle hook;
repository build/release scripts are not installed lifecycle hooks. ignore-scripts
remains enabled. Both support Node 24 by their JavaScript API requirements;
actual compatibility is verified by the checkpoint's strict builds and tests.

Fresh official npm bulk advisory and OSV exact-version queries returned no
advisories for either selected version. Official sources show no deprecation,
EOL, malware or compromised-release notice at review time; absence of a notice
is not a universal safety guarantee. MIT obligations require preserving notices.
Downloaded official-registry tarball SHA-512 values matched registry metadata:

- zod: `sha512-v5l/aFXZQeai4awLbOpSoHecE9UiMrnfx75tEXLjNonXVARxQ5mOeipTjROUchszUNCqnE+hqAMujRsRHsut2Q==`
- @next/env: `sha512-/HuhBN1CorqNTmewTIh81yXOQri6B8Ye/c9D7+830XqwVaf8qMnJNrgNxDn6dLtihq8YzBbI6NSAuMKvpr+DvQ==`

Optional provenance attestations were not independently verified. Source and
tarball integrity were verified. Both releases exceed the 1440-minute maturity
floor. No new transitive node is introduced by either package; Zod adds one
unique version and @next/env changes direct-use classification only. Existing
00-B tracked findings, owners, deadlines and event-driven triggers remain in
force on unchanged paths. The existing config package now becomes a runtime
dependency of API/worker; its new schemas/Zod path is explicitly reviewed here.
Final frozen resolution and full-graph audit are required before closure.

## Sources

- [Zod official release](https://github.com/colinhacks/zod/releases/tag/v4.6.5)
- [Zod requirements](https://zod.dev/)
- [Zod package metadata](https://registry.npmjs.org/zod/4.6.5)
- [Next environment loading and browser semantics](https://nextjs.org/docs/app/guides/environment-variables)
- [@next/env package metadata](https://registry.npmjs.org/@next%2fenv/16.3.7)
- [Existing complete graph review](00-b-dependency-review.md)

Re-evaluate immediately under CORE-002 on advisory, source/integrity, support,
consumer/path, direct-use, exposure, privilege or supported-remediation changes.
No new tracked age/deprecation acceptance is required for these two packages.

## Final graph gate

2026-10-01: PASS. Frozen clean installation downloaded 324 packages into a new
store, reused zero packages, and retained the same lockfile SHA-256:
`088acd52725e79ca0e3b28373b50b0b8701556823d4f73a93458301be87f4a14`.
Full-graph `pnpm audit --audit-level high` reported no known vulnerabilities.
The lockfile contains 409 unique third-party versions, compared with 408 in the
00-B baseline. A direct lockfile diff confirmed that Zod is the only new resolved
version; other changes are workspace links and direct/runtime classification.
Strict peer checks, engine checks, the release-age floor, lifecycle-script
restrictions, and existing tracked findings remain unchanged. Six real build
tasks passed both in the workspace and in the freshly installed source copy.
See [closure evidence](evidence/00-c-verification.json) for final verification.
