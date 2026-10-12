# 00-H dependency review

Review date: 2026-10-03. Owner: project maintainer. Scope: test tooling only.

## Candidate before installation

`@vitest/coverage-v8@5.0.2` is required to publish coverage evidence under
TS-063 using the already-approved Vitest runner. This is not a framework change
and does not require an ADR under CORE-090 or testing section 11.

- Exact stable version matches the required `vitest: 5.0.2` peer. Optional
  `@vitest/browser` peer is not needed for Node coverage or our separate Playwright tests.
- Published 2026-09-25; latest stable 5.0.3 published 2026-09-30. Maintained official
  Vitest monorepo, not deprecated; selected version avoids unrelated runner upgrades.
- MIT, 29,156 unpacked bytes. Test/CI execution only; no production import.
- Node 24.21.0 uses V8, supported by the existing Vitest engine requirements.
- Registry: `https://registry.npmjs.org`; tarball has SHA-512 integrity, registry
  signature and provenance metadata. Lifecycle scripts: development/build only,
  no install lifecycle; repository install scripts remain disabled.
- Alternative: Istanbul provider adds instrumentation, unnecessary for Node/V8.
  Raw native coverage alone would not provide Vitest's source-mapped report.
- Sources: [official coverage guide](https://vitest.dev/guide/coverage.html),
  [version manifest](https://registry.npmjs.org/@vitest%2fcoverage-v8/5.0.2),
  [official repository](https://github.com/vitest-dev/vitest/tree/v5.0.2/packages/coverage-v8).

## Resolved graph acceptance before installation

2026-10-03: lockfile-only resolution completed with strict peers/engines and the
1,440-minute maturity floor intact. No existing package version changed. Added
12 package versions (one direct, eleven transitive):

| Package                            | Version | Release date | Disposition          |
| ---------------------------------- | ------- | ------------ | -------------------- |
| @vitest/coverage-v8                | 5.0.2   | 2026-09-25   | ACCEPT               |
| @babel/helper-string-parser        | 7.29.7  | 2026-05-25   | ACCEPT               |
| @babel/helper-validator-identifier | 7.29.7  | 2026-05-25   | ACCEPT               |
| @babel/parser                      | 7.29.9  | 2026-09-18   | ACCEPT               |
| @babel/types                       | 7.29.8  | 2026-07-31   | ACCEPT               |
| @bcoe/v8-coverage                  | 1.0.2   | 2025-01-15   | ACCEPT WITH TRACKING |
| @vitest/istanbul-lib-coverage      | 1.0.2   | 2026-09-27   | ACCEPT               |
| @vitest/istanbul-lib-report        | 1.0.2   | 2026-09-27   | ACCEPT               |
| ast-v8-to-istanbul                 | 1.0.7   | 2026-09-21   | ACCEPT               |
| js-tokens                          | 10.0.0  | 2025-12-08   | ACCEPT               |
| magicast                           | 0.5.5   | 2026-09-11   | ACCEPT               |
| tinyrainbow                        | 3.2.0   | 2026-09-30   | ACCEPT               |

All twelve: MIT; official registry tarball bytes SHA-512 verified against registry
and lockfile; no install hooks; no registry deprecation; declared Node engines
compatible with Node 24.21.0. Full lockfile audit: 482 dependencies, zero advisories
at every severity, no suppressed findings. No known compromise surfaced in the
reviewed registry/advisory evidence; this is not proof of absence of malware.
Raw metadata/integrity evidence: `.local/evidence/00h-dependency-inventory.json`.

The new coverage path `coverage-v8 -> ast-v8-to-istanbul -> estree-walker@3.0.3`
retains the upstream-deprecated finding despite no npm deprecation flag. It is
test/CI tooling only, not directly used by project code, no lifecycle privileges,
no supported leaf substitution under project control. ACCEPT WITH TRACKING;
owner project maintainer, reviewer Codex under approved CORE-002. Existing
2026-12-30 review deadline remains (not extended). No fork/override/suppression.

`coverage-v8 -> @bcoe/v8-coverage@1.0.2`: age-only transitive, stable coverage-data
utility required by maintained consumer, Node >=18, no hooks/advisories or known
runtime incompatibility. No newer supported release. ACCEPT WITH TRACKING;
owner project maintainer, reviewer Codex; review by 2027-04-01 (180 days).
Existing unchanged graph findings/approvals remain as recorded in 00-B/00-D/00-E;
their deadlines are not reset by this report. Reused parser/source-map paths are
test-only, with no new production exposure.

For both tracked findings, immediately re-evaluate on new advisory, High/Critical,
compromise, consumer/graph/path change, direct use, production shipping, privilege,
execution context, support/deprecation/EOL change, integrity/source concern, or
supported replacement. Periodic deadlines do not defer these triggers.

Installation accepted for this exact graph. Reports are local artifacts, no
external coverage service or transmission. Production artifact exclusion is a
separate verification gate, not inferred from `devDependencies`.
