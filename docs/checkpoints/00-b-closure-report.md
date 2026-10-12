# CHECKPOINT 00-B CLOSURE REPORT

Date: 2026-09-30. Scope: Application Skeletons, with the owner's preceding CORE-002 clarification. Checkpoint 00-A remains owner-approved PASS.

## STATUS

**BLOCKED before application code or package installation.** The governance clarification is complete, but the candidate dependency graph contains an upstream-deprecated package. This is not successful checkpoint closure and does not authorize 00-C.

## FILES CREATED

- [00-b-dependency-review.md](00-b-dependency-review.md): approval record, documentation review, 17 direct candidates, conditional exceptions, graph findings and sources.
- This closure report.

Ignored local evidence and isolated metadata-review files were also produced. They are not application code or new workspace packages. The isolated review manifest is not the repository's package.json.

## FILES MODIFIED

- [English Project Rules](../en/00-PROJECT-RULES.md): only CORE-002.
- [Arabic Project Rules](../ar/00-PROJECT-RULES.md): corresponding CORE-002 translation only.

Rule ID, default age rejection, approved stack and security gates were preserved. No Playbook, system rule, approved ADR, workspace manifest, root tool configuration or real lockfile changed. No ADR was created: this clarification does not trigger CORE-090 or a system-specific architectural change.

## APPLICATIONS CREATED

- api: not created.
- dashboard-web: not created.
- public-renderer: not created.
- worker: not created.

## PACKAGES CREATED

None.

## DEPENDENCIES ADDED

None. `pnpm install --lockfile-only --ignore-scripts` resolved metadata in a separate candidate directory; it did not install package code, create node_modules or run lifecycle scripts. No `--force`, legacy peer mode, peer override or security suppression was used.

## DEPENDENCY REVIEW

See the linked review. Direct registry review and candidate-lockfile vulnerability audit completed. Per-package maintenance review found `estree-walker@3.0.3`, required by `vitest@5.0.2` through `@vitest/mocker@5.0.2`. Its upstream README declares deprecation, despite an absent npm deprecation marker. The age exception cannot admit deprecated dependencies. Remaining age dispositions and runtime compatibility testing are not complete or approved.

## RULE IDS APPLIED

CORE-002, CORE-090, CORE-091, CORE-130, CORE-134; SE-040, SE-060, SE-061, SE-062, SE-063, SE-064. FE-063, FE-091, FE-092, FE-093 and TS-053 justify evaluating limited browser/accessibility tooling for the actual shells, not installing a future product test platform. ADR-001 remains unchanged.

## BUILD RESULTS

- api: NOT RUN, blocked before creation.
- dashboard-web: NOT RUN, blocked before creation.
- public-renderer: NOT RUN, blocked before creation.
- worker: NOT RUN, blocked before creation.

## TEST RESULTS

Application tests, boot/shutdown and new TypeScript surfaces: NOT RUN. No zero-task build or test result is used as evidence. Documentation formatting and secret checks: PASS. Rule-ID/translation review: PASS; only CORE-002 changed. Four local document links resolve. The existing 00-A tooling lint and typecheck were rerun successfully; neither checks a 00-B application. These results do not prove application readiness.

## I18N / RTL RESULTS

NOT RUN. No shells or translations exist yet.

## PACKAGE BOUNDARY RESULTS

NOT RUN. No application imports or new shared packages exist yet.

## SECURITY RESULTS

**Dependency acceptance gate: FAIL**, due to established upstream deprecation, not a claimed vulnerability. No secrets, credentials, cloud accounts, external diagnostics, runtime endpoints or client environment exposure were introduced. Strict engine/peer validation and disabled lifecycle scripts remain intact. The two rule diffs retain cumulative exception conditions; popularity, EOL/deprecation and unresolved High/Critical cannot bypass them.

## DEPENDENCY SCAN

**PASS for the candidate vulnerability audit only:** 360 audit entries, zero info/low/moderate/high/critical advisories, no muted findings. This is not a maintenance PASS or permission to install. Registry metadata review covered 359 unique resolved package versions; it revealed 60 new age-review candidates relative to 00-A, not 60 accepted exceptions.

## SECRET SCAN

**PASS:** Gitleaks scanned the real workspace source/config/docs (about 853 KB) with redaction and found no leaks. Generated local review caches are excluded by the unchanged 00-A configuration. No allowlist or scanner policy was changed.

## CLEAN INSTALL

**NOT RUN:** the graph was rejected before installing package code. Metadata resolution is not a clean-install test. The 00-A workspace lockfile hash remains unchanged.

## CORE-002 EXCEPTIONS USED

**Zero exceptions consumed by an installation.** The following dependency-specific approvals were recorded and investigated, not expanded to other dependencies:

| Field                              | reflect-metadata                                                                              | rxjs                                                                                                      |
| ---------------------------------- | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Version                            | 0.2.2                                                                                         | 7.8.2                                                                                                     |
| Why required                       | Mandatory Nest core/common metadata peer                                                      | Mandatory Nest core/common reactive runtime peer                                                          |
| Why older than 18 months           | Latest stable publication 2024-03-29                                                          | Latest stable publication 2025-02-22                                                                      |
| Maintenance evidence               | README continues legacy-decorator support; non-archived repository, activity 2026-08-24       | README identifies version 7 as maintained production latest; non-archived repository, activity 2026-08-08 |
| Compatibility evidence             | Nest 12.1.1 declares ^0.1.12 or ^0.2.0                                                        | Nest 12.1.1 declares ^7.1.0                                                                               |
| Security scan                      | No direct advisory; candidate graph audit zero vulnerabilities                                | No direct advisory; candidate graph audit zero vulnerabilities                                            |
| License                            | Apache-2.0                                                                                    | Apache-2.0                                                                                                |
| Alternative considered             | Standard decorator metadata                                                                   | Another reactive library or next-generation prerelease                                                    |
| Why conditional approval justified | No drop-in replacement satisfying the Nest contract; continued support and compatible version | Replacements do not satisfy Nest's stable peer contract; upstream maintains the production version        |
| Actual disposition                 | Not installed; overall graph rejected                                                         | Not installed; overall graph rejected; tslib needs its own age disposition                                |

`estree-walker@3.0.3` receives **no exception** because it is explicitly deprecated. No blanket age approval was given to the other transitive packages.

## KNOWN LIMITATIONS

The review does not establish a complete installable alternative graph or claim all Vitest versions are affected. A compatible supported release eliminating the rejected dependency remains an option to investigate; changing the approved core testing framework would require the decision/ADR mandated by 22-testing section 11. No such decision was made here. Some repository API records are unavailable due to HTTP 403 and are preserved as failures, not maintenance evidence.

## N/A CHECKS

Cross-tenant runtime: N/A under ADR-001. DB, migrations, Redis, queues and product journeys: N/A by checkpoint scope. Missing application build/boot/UI checks are NOT RUN because of the blocker, not successful or waived tests.

## MANUAL REVIEW

Reviewed both governance diffs before dependency resolution: only CORE-002 changed; English/Arabic conditions agree. Default rejection, all ten cumulative conditions, strict peers, vulnerability gates, dependency-specific evidence and re-evaluation triggers remain binding. The stack and architecture are unchanged. Reviewed both new reports and confirmed the deprecation from the upstream README and the dependency edge from registry metadata. Root format check and Git whitespace check passed; no application code exists to review.

## GIT STATUS

Original 00-A working/index state is preserved. No commit, remote or push. The two new reports are untracked; governing documents were already untracked in the unborn repository and were reviewed with no-index diffs against pre-change copies. Existing application directories remain absent. The real lockfile retains SHA-256 `9207c172b2ec3c5ecef4e7af95516a863c5c11260ed94594fd8b7a76016918b6`.

## EVIDENCE

[Dependency review](00-b-dependency-review.md) contains the exact candidate versions and primary sources. Ignored `.local/evidence/00-b/` contains the candidate graph/lockfile, audit JSON, package and repository observations, and both rule diffs. Candidate lockfile SHA-256: `70a4137af2c12af7744ba423c2a18bfc43e22797ee1a401f7985b8b6a61964d9`. Local absolute paths in raw evidence are not shared project configuration.

## NEXT CHECKPOINT

00-C: Typed Configuration & Environment. **Not authorized and not started.** 00-B remains BLOCKED. Stop pending the owner's decision on the rejected dependency graph; do not use the age clarification to admit a deprecated package.
