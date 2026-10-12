# Solo-developer governance amendment proposal

Date: 2026-10-11. Status: **PROPOSED ONLY; NOT BINDING OR AUTHORIZED FOR EXECUTION.**

Scope: governance and initial publication of `Hasoba96/website-builder-saas`. This document does not approve publication, change repository settings, amend governing documents, certify earlier Git practice, or close checkpoint 00-J. Checkpoints 00-A through 00-I retain their approved status. **00-J remains BLOCKED.** No 00-K or Stage 01 work is authorized.

## 1. Recommendation

Adopt an explicitly owner-operated solo review mode, not a fiction of independent human review. Keep protected-main PRs, small ordinary PRs, full successful CI, security controls and architecture boundaries. Replace the unavailable reviewer-count requirement only for eligible changes with documented AI-assisted technical review plus a separate, explicit owner decision.

Make two narrowly scoped, single-use bootstrap exceptions: an empty-tree genesis commit establishing `main`, and one aggregate foundation-import PR whose complete diff exceeds 400 real-code lines but is exhaustively partitioned into reviewed packets of at most 400 real-code lines. The aggregate PR must pass the complete real hosted pipeline before merge. This is an explicit size exception, not a claim that a large PR satisfies the existing limit.

Do not merge partial bootstrap slices with reduced CI. Assemble dependency-ordered, reviewed commits locally, publish the complete candidate only after specific authorization, and open one fully testable PR. Partial verification is diagnostic evidence, never merge acceptance. If the owner rejects either bootstrap exception, bootstrap remains blocked; this proposal offers no hidden fallback.

The tradeoff is material: fewer independent people inspect eligible changes. Automated gates are independently executed checks, not independent authorship, human judgment, or an assurance against a compromised owner account.

## 2. Authority and inspected evidence

The authority order remains [Project Rules section 0](../en/00-PROJECT-RULES.md#0-how-to-use-this-file), approved ADRs, relevant English systems, architecture reference, then stage/task instructions. Arabic documents remain synchronized translations. The root [Arabic governing summary](../../القواعد%20الحاكمة.md) and [Implementation Playbook](../../IMPLEMENTATION-PLAYBOOK.md) do not override the English rules.

Reviewed governance sources: the full Project Rules and Playbook; the accepted [ADR-001](../adr/ADR-001-stage-00-cross-tenant-test-applicability.md) and ADR template; the [Stage 00 technical decision report](../stage-00-technical-decision-report.md); systems [14 Security](../en/systems/14-security.md), [18 Infrastructure/CI](../en/systems/18-infrastructure-cicd.md), [19 Observability](../en/systems/19-observability.md), [21 Backup/DR](../en/systems/21-backup-dr-retention.md), [22 Testing](../en/systems/22-testing.md); migration approval provisions in [02 Data Model](../en/systems/02-data-model.md); governance/review references across the English systems and the architecture reference. ADR-001 is the only accepted ADR found in `docs/adr`.

Operational sources: [00-H testing baseline](../checkpoints/00-h-testing-baseline.md), [00-I closure](../checkpoints/00-i-closure-report.md), [00-J closure and recovery](../checkpoints/00-j-closure-report.md), [publication plan](../checkpoints/00-j-publication-plan.md), [CI runbook](../runbooks/ci.md), workflow and current CI policy/orchestration scripts. No tests or prior checkpoint decisions were rewritten.

Read-only observations on this date:

- Local Git remains unborn on `chore/infra-checkpoint-00-a`; no remote. The two-line `.githooks/pre-commit` addition is staged; substantial other source is unstaged/untracked. That index must not be accidentally included in an alleged empty commit.
- GitHub repository metadata confirms **public**, size 0, default branch name `main`; the branches endpoint returns `[]`. The owner reports GitHub Free; billing was not inspected.
- GitHub Actions runs endpoint returns `total_count: 0`. There is no hosted PASS, provider artifact or verified commit SHA.
- Ruleset ID `24885869`, **Protect Main Branch**, is **disabled**, targeting exactly `refs/heads/main`, with no exclusions or bypass actors. Its configured rules block deletion and non-fast-forward updates, require PRs with **one approving review**, last-push approval, stale-review dismissal, resolved review threads and extra approval for unattributed changes. Code-owner review is false. Required status-check configuration has strict mode true but an **empty check list**.
- Repository metadata permits squash merge only; auto-merge is false. The ruleset lists merge/squash/rebase, but that does not override repository-level availability.
- Actions administration settings were not verified. Repository metadata permissions do not prove every administration endpoint or local Git authentication is usable.
- The existing recovery report records local **167/167 tests PASS**, nine build tasks, ten native coverage reports, security scans and Windows browser verification. Those are dated local results, not rerun or upgraded to hosted evidence by this proposal. Linux visuals and four current image builds/smokes remain unverified.

Evidence endpoints: [repository](https://api.github.com/repos/Hasoba96/website-builder-saas), [branches](https://api.github.com/repos/Hasoba96/website-builder-saas/branches), [ruleset](https://api.github.com/repos/Hasoba96/website-builder-saas/rulesets/24885869), [workflow runs](https://api.github.com/repos/Hasoba96/website-builder-saas/actions/runs). These are live resources; the observations above are the dated snapshot. The older publication plan's private-repository/403 statements remain historical evidence, not current repository state.

## 3. Exact conflicts and provisions

Locations below refer to the current documents, before any proposed amendment.

| Source                                                                                         | Current requirement                                                                                     | Solo/bootstrap consequence                                                             | Proposed treatment                                                                                                                         |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Project Rules section 7.1, CORE-040, line 299; main branch diagram                             | No direct push to main; every change through PR and review                                              | An empty repository has no commit serving as a PR base                                 | One empty-tree genesis exception only; normal rule unchanged                                                                               |
| CORE-041, line 301                                                                             | Branch lifetime under five working days                                                                 | Existing unpublished branch is already long-lived; prolonged bootstrap can repeat this | No retroactive compliance claim; prepare review packets before starting a fresh, explicitly authorized publication branch; retain deadline |
| Section 7.2; CORE-042                                                                          | Conventional Commits and breaking-change migration plans                                                | Multiple roles held by owner do not remove these requirements                          | Unchanged                                                                                                                                  |
| CORE-043, line 326                                                                             | PR purpose, owner module, tenancy/DB impact, tests, rollback, UI screenshots                            | Owner must explicitly identify each role and actual N/A                                | Retain; add solo review/evidence/risk fields beside CORE-045                                                                               |
| CORE-044, line 335                                                                             | At most 400 changed lines of real code, excluding generated files and lockfiles                         | Complete initial source exceeds limit; partial source cannot satisfy full acceptance   | One aggregate-import size exception with exhaustive small review packets; all later PRs retain limit                                       |
| CORE-045, line 337                                                                             | At least one reviewer; two for tenancy, auth, billing, publishing or migrations, including module owner | No independent reviewer exists                                                         | Explicit solo alternative for eligible changes; independent human review retained for the hard cases below                                 |
| CORE-046, line 339; IN-031                                                                     | No red CI or unanswered review thread at merge                                                          | Self-approval cannot cure missing evidence                                             | Unchanged; missing/neutral/skipped required work is not acceptance                                                                         |
| Playbook section 9, first paragraph                                                            | A separate independent review of all stage changes                                                      | AI implementation and another AI pass do not supply independent human review           | Clarify review independence claims and the approved solo alternative                                                                       |
| Playbook section 11                                                                            | Protected main, no direct push, short branches, small PRs and required sensitive review                 | Must mirror amended root rules without competing exceptions                            | Cross-reference the exact amended provisions                                                                                               |
| DM-034, line 186                                                                               | Written migration rollback plan; impossible rollback/data deletion requires a second approval           | Owner alone cannot supply two distinct approvals                                       | **Unchanged; blocking without a qualified second human**                                                                                   |
| IN-030 and section 8; TS-060/061/063 and section 10; Playbook sections 10/12 and Stage 00 gate | All applicable CI/tests/security green, coverage published, evidence and approver required              | Partial bootstrap and local-only results cannot close J                                | Unchanged; only one complete import PR is submitted for merge                                                                              |
| CORE-002; SE-040/041/060-064/086                                                               | Dependency review, hard blockers, secrets, frozen lockfile, scripts and scans                           | Solo mode cannot accept an unsafe graph or publish secrets                             | Unchanged                                                                                                                                  |
| CORE-050/051; DM-030-036; IN-040-047                                                           | Flags, migration safety, automated/recorded deployment and rollback                                     | Role consolidation does not waive later production responsibilities                    | Unchanged; deployment remains outside 00-J                                                                                                 |
| OB-060; BR-023; Playbook section 12                                                            | Incident/restore decision ownership and stage approver                                                  | One owner can hold named roles, but must record responsibility and escalation limits   | No fabricated second person or on-call coverage; no backup implementation here                                                             |

**Attribution precision:** CORE-045 literally says "reviewer", not "independent human reviewer". Playbook section 9 says independent review; the existing J publication plan explicitly interprets the reviewer requirement as human and rejects agent substitution. Do not silently resolve that combination by counting the same owner twice or counting Codex as the absent person. The amendment must state the new alternative openly. DM-034 separately requires a second approval; the proposed interpretation explicitly excludes a second click or second AI session by the same owner.

No general owner waiver power was found. CORE-002 permits only its specified dependency-age/tracking decisions; Playbook Stage 14 permits documented Medium-risk acceptance with owner/deadline, not High/Critical acceptance. Neither grants a reviewer, PR-size, CI or irreversible-migration waiver. CORE-134 still requires stopping on an unresolved binding conflict.

## 4. Proposed solo review model

### Eligibility and evidence

Solo mode applies only after explicit owner adoption and synchronized governing text. Record the owner, repository, effective date, review date, approved risk categories and termination conditions. Reassess at every checkpoint and at least every 90 days; this is a proposed governance review interval, not a change to CORE-002 tracking deadlines. Hiring another maintainer, first real customer data, a material incident or a new production trust boundary triggers immediate reassessment. Expired adoption blocks new merges until renewed through a documented decision.

For every eligible change:

1. Codex implements within the approved stage and rules. The owner remains accountable for module ownership, risk classification and acceptance.
2. Run a distinct review pass against the actual diff and binding rules, preferably in fresh context. Record reviewer/tool identity, model where known, date, reviewed base/head or local content hashes, findings, fixes, remaining risks and limitations. Describe it as **AI-assisted technical review**, including when the same agent implemented it. Multiple agents or passes are not multiple independent humans.
3. Execute the existing deterministic architecture, security and test gates independently of the review prose. Record native results for the candidate. The owner reviews changes to the validators themselves; passing self-authored validators is not proof of independent security assurance.
4. Obtain separate explicit owner permission before commits/publication operations, as required by the current task's approval boundary. Include exact files/hunks, excluded files, line counts, scan results, branch/remote, public-exposure consequences and operation scope. Approval expires when content or destination changes. A bounded batch may be approved only if its exact inventory and operations are enumerated.
5. Before merge, obtain a new owner acceptance tied to the current PR head, tested merge candidate, risk decision, completed hosted jobs and artifact review. Publication approval is not merge approval. New commits or a changed base invalidate affected review and merge approval.
6. Record owner approval as an actual owner-authored comment or an attributable owner instruction with its source/time. Codex may quote such an instruction with attribution but must not invent it, post a fake human review, or represent an agent-authored comment as a human GitHub approval. Prefer the owner performing the merge in GitHub after checks pass.

Use the existing CORE-043 PR template requirements plus: risk class/rationale, sensitive paths, review record, source hashes, owner publication decision, owner merge decision, hosted run/coverage/artifact links, line count, bootstrap authorization if applicable, and any independent human approval required below. Store sanitized records only. No production data, credentials, raw chats or unrelated private attachments are required as evidence.

### Risk classes and independent-human boundary

These are proposed review classifications, not new product architecture or claims of existing enforcement. The highest actual impact wins; filenames alone cannot downgrade risk.

- **Routine:** documentation, isolated tests and non-security application changes with no protected data/trust-boundary impact. Require the complete solo path and applicable CI.
- **Sensitive, solo-eligible:** current non-production infrastructure, reversible foundation migrations, dependency changes, security-hardening implementations, CI/evidence tooling and container/privilege configuration. Require a dedicated threat/failure review, negative tests, rollback/recovery reasoning and explicit owner risk acceptance in addition to normal gates. A-I approval is context, not a substitute for reviewing the publication diff. The foundation import is at least this class.
- **Independent human required:** an irreversible migration under DM-034; changes to active production authentication/session/authorization, tenant isolation, payments, publishing integrity or domain ownership boundaries; production data deletion/recovery with irreversible effect; bespoke cryptography or executable-untrusted-code security design; and proposals to remove or weaken mandatory security/CI controls. Require a qualified human distinct from the owner/implementer, plus the owner/module owner's decision. AI review does not fill the missing role. Existing architecture restrictions/ADRs still apply even when two humans approve.

Pre-production work on the five CORE-045 sensitive categories may use the sensitive solo path only when no real users, real customer data, production credentials or real payments are exposed, the change is reversible, tests cover the actual security boundaries, and deployment/feature activation remains prevented. **Before any pilot or production activation, the relevant security-sensitive implementation must receive independent human review.** A deployment label alone is not isolation; preview/staging with real access or data is not eligible. Unknown exposure or an unresolved classification dispute blocks acceptance.

This permits genuine development without pretending solo review is sufficient for all future operations. It does not authorize Stage 01 now. DM-034's second approval remains required wherever its irreversible-migration condition applies, including non-production work; the absence of customer data is not a blanket exemption. Current disposable test cleanup is not a product migration approval mechanism.

There is no owner-only exception to this independent-human boundary in this proposal. If no qualified reviewer is available when it applies, report BLOCKED. Acquisition of a reviewer must use real identity and appropriate expertise; additional owner-controlled GitHub accounts, bots or AI identities cannot satisfy it.

### Non-waivable gates

Retain CORE-002 hard blockers; no secrets/PII exposure; real PostgreSQL/Redis tests and privilege checks; required coverage/native reports; reviewed Linux visuals; all four image build/smoke and production-tooling-boundary checks; successful actual hosted CI and artifact publication; architecture/tenant boundaries; existing false-pass protection and stage sequencing. No approval can convert missing evidence, zero tests, skipped suites, stale reports, unresolved High/Critical findings or an unsafe image into PASS.

No `pull_request_target` execution of untrusted code, privileged fork token, fake status context, blanket snapshot update, test suppression, broad bypass actor or emergency direct-main code push is introduced.

## 5. Exact proposed policy changes

The following text is a draft for later reconciliation. Keep all existing Rule IDs. It has **not** replaced current policy. English text must be mirrored semantically into Arabic before adoption is operationalized.

### CORE-040: retain rule, append a single-use exception

**Before:** "Never push directly to `main`. Every change goes through a PR and review."

**After, proposed full rule:**

> **CORE-040 (MUST NOT):** Never push directly to `main`. Every change goes through a PR and review. The sole bootstrap exception is one owner-authorized root commit with an empty tree, creating `main` in the empty `Hasoba96/website-builder-saas` repository. It contains no files, source, workflow, configuration or credentials and is not a verified application baseline. Record the approved operation and resulting commit/tree identity. The exception expires immediately when that ref is created and cannot authorize any later direct push. Activate the approved main protections before publishing the source candidate. All subsequent main changes require a reviewed PR and every applicable successful CI gate.

The main-branch diagram should link this exception rather than imply a general bypass. Creating an empty branch without a commit is not a Git solution. A GitHub-generated README/license commit would contain files and would not satisfy this narrowly proposed empty-tree exception.

### CORE-044: ordinary limit unchanged, bounded import exception

**Before:** "PR size ≤ 400 changed lines of real code (excluding generated files and lockfiles). Larger PRs get split."

**After, proposed full rule:**

> **CORE-044 (MUST):** PR size is at most 400 changed lines of real code, excluding generated files and lockfiles. Larger PRs get split. One owner-authorized initial foundation-import PR into the empty-tree `main` base of `Hasoba96/website-builder-saas` may exceed the aggregate limit only after its entire diff is partitioned into dependency-ordered, individually reviewed packets of at most 400 changed real-code lines. The manifest must identify every file/hunk, packet and commit, code-line count, exclusions, review result and approved final tree. Security configuration, scripts and tests are not excluded merely because they are infrastructure. Non-code and excluded generated/binary changes remain inventoried and reviewed. No application source is imported through a direct main push. No incomplete packet is merged with reduced CI. The complete PR must pass all mandatory hosted gates on its current merge candidate and receive explicit owner merge approval. The authorization is limited to the current approved A-I/J foundation, its approved governance reconciliation and necessary reviewed J fixes/baselines; it cannot include 00-K or product work. It expires on the first import merge or the recorded bootstrap deadline, whichever occurs first. Any changed candidate requires updated review and approval. After that import, the ordinary limit applies without exception.

This does not authorize one giant implementation commit. Each real-code commit should correspond to a coherent reviewed packet; do not split expressions arbitrarily, omit tests or disguise hand-written source as generated. If a coherent change cannot satisfy a packet limit, stop for a specific decision; do not invent a further exemption. Declare intermediate commits unbuildable when dependencies are incomplete, rather than fabricate green evidence.

### CORE-045: explicit alternative, not disguised human review

**Before:** "At least one reviewer. Changes touching multi-tenancy, auth, billing, publishing, or migrations require two reviewers, one of whom owns the module."

**After, proposed full rule and attached solo procedure:**

> **CORE-045 (MUST):** In team mode, require at least one human reviewer other than the implementer; changes touching multi-tenancy, auth, billing, publishing or migrations require two human reviewers, including the module owner. In explicitly adopted solo-owner mode, eligible changes may instead receive a documented AI-assisted technical review followed by explicit owner acceptance under the solo procedure below. This is an alternative governance path, not independent human review and not fulfillment of a two-person requirement. Never fabricate approvals or count multiple owner-controlled or AI identities as different human reviewers.
>
> Solo adoption identifies the accountable owner, repository, effective date and reassessment date, no more than 90 days later. Reassess at every checkpoint and immediately on another maintainer joining, first real customer data, material incident or new production trust boundary. Expired adoption prevents new merges until renewed. Every change records actual risk/exposure, module ownership, reviewed source identity, AI-review limitations, findings and resolution, negative/failure tests, rollback plan and required CI evidence. Obtain explicit owner authorization for publication and separately for merge, tied to the exact reviewed content and operation; changed head/base invalidates affected acceptance. All CORE-043/046 and applicable system requirements remain mandatory.
>
> Routine changes and reversible, isolated non-production sensitive changes may use solo review. Sensitive changes require an explicit threat/failure review and owner residual-risk decision. Pre-production changes in the five sensitive categories are eligible only without real users, customer data, production credentials or real payments, with tested boundaries and prevention of premature deployment/activation. Independent human review is mandatory before their first pilot/production activation and for changes to active production security-sensitive boundaries thereafter. Irreversible migrations under DM-034, irreversible production data operations, bespoke cryptography/untrusted-code security designs and proposals to weaken mandatory controls require a qualified independent human in addition to the owner/module-owner decision. Other binding prohibitions and ADR requirements still apply; review cannot waive them. If required independent review is unavailable or classification/exposure is unresolved, block the change. No owner-only exception to these cases is created.

The procedure in section 4 supplies the detailed proposed record format and classifications and should be incorporated under section 7.3 or linked to a canonical approved governance runbook at reconciliation, not left binding only through a draft proposal. Team-mode wording makes the human distinction explicit prospectively; it does not retroactively claim the old wording already said this.

### Playbook sections 9 and 11; root summary items 22 and 23

**Before, section 9:** an independent review is performed on all stage changes. **Proposed replacement opening:**

> After implementing a stage, perform a distinct review pass over every added or changed file using the ten review areas below. Apply CORE-045: team review and independent-human-required changes retain their human review obligations; eligible solo changes use documented AI-assisted technical review and explicit owner acceptance. A separate AI pass is not independent human review. Every applicable test/security gate remains mandatory.

Keep all ten review areas. In section 11, append: "Apply only the explicitly bounded bootstrap exceptions in CORE-040/044 and the solo review procedure in CORE-045; no stage gate or CI exception is implied." Keep its protection and no-red-CI requirements.

Root Arabic summary item 22 should retain small/focused changes and reference the one-time CORE-044 import exception; item 23 should distinguish its existing self-review pass from CORE-045 acceptance. These are reference reconciliations, not separate waiver authorities. Translate the exact approved meaning, not an abbreviated weaker rule.

### Provisions intentionally unchanged

CORE-041/042/043/046, CORE-002/010-016/070/090/091/134, DM-034, IN-002/030/031/033/034, SE-040-045/060-064, TS-024/026/052/053/060-063, ADR-001, all security/architecture and stage gates remain in force. No branch-lifetime exception is proposed: finish preparation before publication, preserve the true work history, and do not reset its age by renaming. If the new publication branch cannot close within five working days, stop for an explicit scheduling/governance decision instead of merging red or silently extending the rule.

### Exceptions and ADR determination

Only the two bootstrap permissions above are newly proposed exceptions. Before use, record rule ID, purpose, exact repository/ref/tree or inventory hash, approved operations, owner identity and approval source, deadline, controls, evidence, and closure/expiry. Permission for one operation does not authorize another. Do not grant general "owner may override any MUST" authority. Preserve all historic BLOCKED findings and prior accepted ADRs.

**ADR required for this recommended proposal: NO.** CORE-090 is not triggered by reviewer/publication governance alone. Systems 14 section 12, 18 section 9, 19 section 10, 21 section 9 and 22 section 11 do not trigger because this proposal changes no architecture, security control in those systems, deployment strategy/provider, diagnostic destination, backup policy or test category/requirement. No ADR is created here. Explicit owner approval and synchronized governing amendments are still required.

If the owner instead wants partial PRs merged with missing CI, altered testing requirements or skipped categories, **22-testing section 11 requires an ADR**, and this proposal does not recommend or authorize that option. A generic exception record cannot substitute for an applicable ADR or override Project Rules section 0.

## 6. Bootstrap procedure proposed for later approval

### A. Approve governance before publication

1. Owner reviews and approves/rejects the exact policy text, solo eligibility limits, non-waivable independent review cases and both single-use bootstrap exceptions. Record this first decision outside Git while no committed baseline exists; reconcile the English/Arabic governing files locally in a separately authorized task. The first full import records that dated adoption. A proposal or an agent's acknowledgment is not approval.
2. Prepare the exact public inventory. Preserve the existing checkout/index; work from an explicitly authorized isolated staging area when assembling commits. Include reviewed applications/packages, migrations, tests, scripts, infrastructure, workflow, safe examples, lockfile, selected documentation and approved snapshots. Exclude actual environment files, generated credentials, `.local`, dependencies/stores, build/coverage/raw reports, raw traces/logs and unrelated private files. Review documentation and commit author email for privacy, not just code for secrets. Public source need not imply an unapproved open-source license.
3. Build a packet manifest before starting the publication clock: files/hunks, dependency predecessors, code counts, non-code/binary inventory, review findings, diagnostic checks, explicit missing checks and content hashes. Use existing approved current source, including security fixes; do not reconstruct vulnerable historical dependency states merely to imitate A-I chronology.

Suggested dependency order, with each group split into actual <=400-code-line packets: governance/hygiene; toolchain/workspace/guards; schemas/config; four shells; PostgreSQL/migrations/fixtures; Redis/BullMQ/fixtures; logging/probes/security; guarded tests/coverage/browser snapshots; Compose/application images; CI/evidence tooling and final runbooks. Tests travel with their boundary where possible. This is an ordering plan, not an already reviewed file-level publication authorization.

### B. Establish only the empty base

4. Present the exact empty-tree commit/ref operation for a separate owner approval. Proposed target: `refs/heads/main` at the stated repository, one root commit with no files, Conventional Commit message such as `chore(infra): establish empty repository base`. Verify the tree is empty and the parent list empty before publication. Use an isolated index/assembly checkout so the currently staged hook is not included. Do not rename, reset, overwrite or initialize the existing repository.
5. After approval only, create/publish that one commit and verify the remote branch/tree. Record it as **base initialization only; CI NOT APPLICABLE to an empty tree, not application PASS**. This exception is not a path to publish a README, bootstrap workflow or code before tests. Confirm `main` as default branch. Genesis authorization is consumed immediately.
6. Activate the approved protections described below before source publication. The empty main remains non-deployable. No deployment is configured. Do not use a persistent bypass actor to establish it.

### C. Assemble small reviewed changes without partial merges

7. After separate approval, create a new short-lived publication branch from that genesis. Use the repository's existing naming convention, for example `chore/infra-initial-publication`; the name itself still needs operation approval. Assemble dependency-ordered Conventional Commits, each mapping to its reviewed packet. Scan **all new commit trees/history**, not only the final tree, before any source push. Never publish a temporary secret-bearing or knowingly vulnerable intermediate state.
8. Run genuine staged diagnostics on each dependency-complete subset: document/secret checks first, then schema/config unit checks, app builds, and real infrastructure checks as their required components exist. Record command, tree/hash, exit status and applicability. A subset missing dependencies or the complete harness is **NOT MERGEABLE / FULL CI NOT RUN**, not green bootstrap CI. Do not submit partial-source PRs and then exempt them from IN-030/TS-060. No partial packet merges occur.
9. Assemble the complete candidate. Compare its full tree against the approved final inventory and every packet; no unreviewed extras. Run available full local gates. For disk-blocked image/Linux gates, record NOT VERIFIED and use actual approved GitHub-hosted Linux execution before merge; do not run unsafe local builds or treat historical images as fresh evidence. Owner must approve publishing this complete candidate, its commit history and one aggregate PR under the explicit CORE-044 exception.

### D. Full provider gate before the only source merge

10. Publish only the approved complete branch, then open the aggregate PR into empty-tree main. Its description links every packet, source/merge-candidate identities, exception record and review dispositions. It is not accepted until both real `verify` and `images` jobs finish successfully with valid artifacts. Do not submit multiple partial PRs merely to satisfy cosmetic size accounting.
11. Use the existing `pull_request` trigger for first execution. Do not rely on `workflow_dispatch` before the workflow exists on default main. The PR event tests a merge ref, not necessarily the head SHA: record base/head/tested merge SHA and verify the source tree. Provider event semantics are documented in [GitHub workflow events](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#pull_request) and [manual dispatch](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#workflow_dispatch). If the initial event fails to run, investigate without merging a placeholder workflow or declaring success.
12. Generate missing Linux snapshots only in the pinned matching environment, inspect every image, then rerun the normal visual suite without update flags. Any workflow needed solely to obtain those diagnostics requires separate reviewed owner authorization; it cannot replace `verify` or `images`, change false-pass guards, or weaken final assertions. Each published fix/snapshot update needs renewed content-specific approval and review. Retain failed run evidence.
13. Verify required check contexts and source app against actual runs and inspect downloaded sanitized artifacts. Before merge, ruleset must be active with both required checks and strict up-to-date enforcement. Check failures, missing reports, canceled/stale runs, skips or unusable artifacts block acceptance even if GitHub's merge box is permissive.
14. Obtain explicit owner merge approval for that exact candidate. Keep the current squash-only repository setting unless separately changed by the owner. Preserve packet/commit mapping and review evidence in the PR/manifest even if squash changes main's commit identity. The final main tree must equal the reviewed tested candidate tree. Require the normal push-to-main workflow to pass on the resulting SHA before final 00-J closure; a post-merge failure blocks closure and requires a reviewed corrective PR, not an unreviewed direct push.
15. Consume/close the bootstrap size authorization, retain evidence, and return to <=400-code-line PRs. Record hosted timings, real fixture cleanup, four image results, Linux visual acceptance, published coverage and owner acceptance. Only then reassess 00-J; do not start 00-K.

**Why this sequence:** an empty commit solves Git's missing-base problem but does not solve source acceptance. Small local review packets preserve tractable review; the single explicitly exceptional aggregate PR supplies a complete runnable tree. No partial tree reaches main, no reduced test pipeline replaces the real one, and no fake successful checks are attached to missing functionality. Accepting the one-time aggregate size exception is the explicit cost of preserving the existing full-CI-before-merge rule.

## 7. Proposed GitHub settings and activation order

GitHub documents rulesets for public repositories on Free; a PR rule can require a PR without requiring approving reviews. Authors cannot approve their own PRs. Therefore zero required GitHub approvals is an honest **different control model**, not simulated compliance with current CORE-045. See [ruleset availability and rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets) and [required review behavior](https://docs.github.com/en/pull-requests/how-tos/review-pull-requests/approving-a-pull-request-with-required-reviews).

### Ruleset target state, only after amendment and explicit setting approval

| Setting                                 | Observed now             | Proposed solo target                                                               |
| --------------------------------------- | ------------------------ | ---------------------------------------------------------------------------------- |
| Enforcement                             | Disabled                 | Active after empty genesis, before source publication                              |
| Target / exclusions                     | `refs/heads/main` / none | Retain                                                                             |
| Bypass actors                           | None                     | Retain none; no owner/bot bypass                                                   |
| Require PR                              | Configured, inactive     | Enabled                                                                            |
| Required approving reviews              | 1                        | 0 for adopted solo mode; owner acceptance separately recorded                      |
| Last-push approval                      | True                     | False; a separate eligible approver is unavailable                                 |
| Extra approval for unattributed changes | True                     | False in solo configuration; never use it as a fake owner-review gate              |
| Code-owner review                       | False                    | Retain false while no independent reviewer exists; ownership record still required |
| Dismiss stale approvals                 | True                     | Retain; separate owner acceptance also invalidated by changed content/base         |
| Resolve review conversations            | True                     | Retain; do not dismiss substantive unresolved findings to merge                    |
| Required status checks                  | Empty list               | `verify` and `images`, exact observed job contexts, expected GitHub Actions source |
| Require up-to-date branch               | True                     | Retain with actual required checks populated                                       |
| Force pushes / deletions                | Configured blocked       | Retain blocked                                                                     |
| Restrict updates/creations              | Not present              | Do not add bypass-only update restrictions that also prohibit legitimate PR merges |
| Repository merge / auto-merge           | Squash only / off        | Retain; owner decides merge after evidence review                                  |

This is a proposed configuration, not an applied or tested one. Conditional human review for the independent-human-required class is not enforced by zero-approval rules alone. Before such a PR can merge, configure an enforceable positive human-review requirement with the real reviewer available, or keep it blocked. An owner attestation alone cannot satisfy that class. Do not pretend a CODEOWNERS entry pointing to the PR author is a second reviewer.

**Immediate versus run-dependent:** after genesis, PR/no-force-push/no-deletion/no-bypass controls can be active immediately. Required check names can be entered prospectively; use `verify` and `images` from the existing workflow, leaving main blocked until they run. GitHub documents entering check names in [creating rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/creating-rulesets-for-a-repository). Actual check spelling/source app, real successful conclusions, artifact availability and strict merge behavior require provider execution. If the UI cannot associate an expected source before the first run, keep a documented **no-merge hold**, retain the named requirements where possible, and bind/verify the source immediately after the run. An empty required-check list is never accepted as enforcement.

Avoid permanent lockout by configuring solo review counts accurately, not by installing a bypass. Missing or misspelled contexts remain blocking until an owner-authorized correction preserves the intended gate; record before/after settings and evidence. Settings can be edited by authorized administrators ([ruleset management](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/managing-rulesets-for-a-repository)); that administrative power is a residual risk, not permission to disable protection around a code push. A disabled ruleset cannot count as protection.

### Actions and public execution

Propose Settings > Actions > General: restricted read-only token default; no permission for Actions to create/approve PRs; approval for all external contributors; only reviewed permitted Actions; seven-day artifacts/log retention where configurable. Preserve the workflow's explicit `contents: read`, Ubuntu-hosted runners, bounded jobs/concurrency, no deployment secrets, no privileged PR event and no shared cross-trust cache. Approving execution of a fork workflow is neither code-review approval nor merge approval. Inspect its code before allowing execution. [GitHub Actions settings](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository).

Public repository forking cannot be prohibited as a substitute for privacy. "Restricted fork permissions" here means restricting workflow execution/token/secrets and merge authority, not claiming outsiders cannot copy the public code. Repository settings have not been verified merely because the local workflow is restrictive. Inspect these settings through owner UI or authorized read access before closure; do not request raw credentials.

### Future private repository

**Public publication is irreversible exposure. Making the repository private later cannot recall copies, downloads or public forks.** GitHub says public forks remain public when detached after a visibility change, and public Actions history/logs are visible. Review source, documentation, metadata and artifacts for public suitability before the first push. [Visibility consequences](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/managing-repository-settings/setting-repository-visibility).

Returning to private requires separate explicit owner authorization and verification that the account plan still supports required protections. GitHub Free's public ruleset availability does not imply equivalent private availability; an eligible paid plan or another explicitly approved compliant arrangement would be necessary before relying on private protections. Pause publication/merges during that transition until enforcement is verified. No change of visibility, plan, owner, credentials or provider is authorized by this proposal.

## 8. Risks, compensating controls and residual blockers

| Risk                                                             | Proposed control                                                                                                     | Residual limitation/blocker                                                                      |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Owner and AI share blind spots                                   | Distinct documented technical review, hostile-input/real-infrastructure tests, explicit owner risk decision          | Not independent human review; high-consequence cases remain blocked without it                   |
| Initial import overwhelms review                                 | <=400-code-line packets, exhaustive diff mapping, many coherent commits, one complete-candidate PR                   | Aggregate PR exceeds existing CORE-044; specific amendment/approval required                     |
| Partial bootstrap falsely looks green                            | No partial PR merges; diagnostic status and missing gates explicit; full final CI unchanged                          | Cannot accept baseline until complete candidate runs                                             |
| CI scripts/workflow can be changed by their author               | Treat them as sensitive, review gate diff and native inventory, retain false-pass tests, verify trusted check source | Same owner controls repo/settings; not tamper-proof separation of duties                         |
| Zero GitHub approvals appears equivalent to owner review         | Owner acceptance attributed to real human and exact SHA; manual merge; no bots/secondary identities                  | GitHub does not natively enforce the proposed human attestation with a zero-review rule          |
| Required checks can report skipped/neutral or misleading success | Inspect actual jobs, native counts, coverage, assertions, artifact gates and executed SHA                            | Green merge UI alone is insufficient                                                             |
| Account compromise or accidental admin change                    | Least privilege, owner account MFA/recovery readiness, no bypass actors, recorded settings changes                   | Single-person operational dependency remains; MFA status not verified here                       |
| Public source/evidence exposes private information               | Exact inventory, all-commit secret scan, document/metadata review, sanitized artifact allowlist                      | Scanner cannot establish global confidentiality; owner must knowingly approve public publication |
| Disk/memory limitations                                          | Conservative sequential commands; approved adequately resourced Linux provider execution                             | Local restrictions remain; no local image/Linux PASS invented                                    |
| Branch takes too long                                            | Prepare packets before publication; retain CORE-041 deadline                                                         | Time expiry needs a new explicit decision, not red merge or branch-renaming fiction              |
| CI or images fail after publication                              | Keep main protected, review fixes, rerun same mandatory gates                                                        | No waived tests, fake success statuses or automatic approval for follow-up pushes                |

The scoped owner exception process is limited to the two bootstrap cases. Other policy changes require their own proposal, explicit adoption and applicable ADR review. Existing Medium-risk and dependency tracking mechanisms remain limited to their own scope. No unilateral general emergency merge procedure is added.

## 9. Exact reconciliation plan, not executed

1. `docs/en/00-PROJECT-RULES.md`: update **CORE-040, CORE-044, CORE-045** as approved; synchronize the main diagram and attach the solo procedure under section 7.3. Do not renumber or alter unrelated rules.
2. `docs/ar/00-PROJECT-RULES.md`: matching semantic translation of those changes; English remains authoritative.
3. `IMPLEMENTATION-PLAYBOOK.md`: section 9 review opening and section 11 references only, using the proposed text above. No CI/Stage Gate or sequencing change.
4. `القواعد الحاكمة.md`: items 22/23 reference the explicit size/review policy; retain security and CI prohibitions.
5. `docs/runbooks/ci.md`: replace prospective publication/settings guidance with the adopted model; clearly date the superseded private-state assumption. Add the reviewed packet manifest/approval procedure and provider evidence checks. No silent reinterpretation of mandatory gates.
6. `docs/checkpoints/00-j-publication-plan.md`: append a dated adopted plan, exact reviewed slices/operations and adoption reference; preserve the prior blocked/private plan as history.
7. `docs/checkpoints/00-j-closure-report.md`: append only new actual evidence and status when obtained; no retrospective green hosted run or rewritten A-I acceptance.
8. `docs/stage-00-technical-decision-report.md`: append a dated owner-approved governance reference, explicitly leaving approved stack/testing/CI decisions unchanged.

No normative edits are needed in systems 02/14/18/19/21/22 or their Arabic mirrors for this recommended approach. DM-034, IN-030 and TS-060 remain intact; the bootstrap design avoids changing them. No edits to ADR-001, historical A-I reports or the accepted 00-H testing baseline. This proposal can remain a historical proposed record with a later approval/supersession reference; the operative policy must reside in the governing documents, not silently in a proposal.

Following adoption, assess whether small additions to existing PR/evidence validation are necessary to check packet counts, required risk/approval fields and manifest identity. Do not create a second test framework or fake reviewer status. Any implementation is a separately authorized 00-J change with real negative tests and full acceptance. Machine validation of an approval field cannot authenticate the human by itself; retain direct owner attestation and operational control.

## 10. Mandatory remaining 00-J gates

The proposal does not execute or re-certify these gates:

1. Adopt/reconcile governance, approve exact source/history/publication inventory and every commit/push/PR operation before performing it. Obtain authorized Git access without exposing tokens. Resolve main bootstrap and review policy honestly.
2. Activate and verify the approved main ruleset and Actions settings. Require both real job contexts and resolved review discussions; inspect actual enforcement, not just stored settings.
3. Run fresh `pnpm ci:validate`, `pnpm ci:verify` and `pnpm ci:images` on the reviewed complete candidate as applicable; hosted Linux execution must independently prove the required jobs, not reuse local reports or substitute cached success.
4. Prove frozen installation/scripts disabled, pinned tools, format, lint/boundaries, strict typecheck, workspace validation, all **nine** builds and the current guarded **167-test minimum** inventory with required assertions and no missing/skipped/stale suites. New tests raise the inventory; 167 is not a ceiling.
5. Retain real PostgreSQL, Redis/BullMQ and Compose fixtures, privilege/lifecycle/outage checks, security-negative and observability regressions, exact-owned cleanup and zero leftover test containers. Do not alter existing developer volumes/credentials.
6. Verify Linux production Chromium AR/EN, RTL/LTR, mobile/desktop, hydration, accessibility, CSP/headers and secret boundary. Review each new Linux baseline and rerun normally. Windows images are not renamed substitutes.
7. Build and smoke-test **all four current application images**, including production/test-tooling separation. Historical pre-security-patch images do not qualify. No registry push or deployment.
8. Pass current dependency/secret gates, graph/lockfile integrity and bundle budgets. Publish required native reports, coverage and safe diagnostics through the actual provider artifact mechanism; inspect downloads and retention. Do not sum overlapping coverage into an invented overall percentage.
9. Record real run URLs, PR head/base/merge SHA, resulting main SHA, both job conclusions and durations, image identities, count/coverage evidence, cleanup and artifact publication. Meet IN-033/TS-062's full-path timing requirement through bounded execution, not omitted work.
10. Review remaining transient-failure concerns from the recovery report under IN-032/TS-021, complete code/security review and obtain owner final acceptance. Only then may 00-J be proposed as PASS. No 00-K or Stage 01 follows automatically.

## 11. Owner decisions needed next

- Approve, amend or reject the proposed solo policy and its independent-human-required boundary. This is a governance adoption decision, not permission to publish code.
- Approve or reject each narrow bootstrap exception: exactly one empty-tree genesis; exactly one aggregate import with reviewed <=400-line packets and unchanged full CI. No exception is currently granted.
- Authorize a subsequent documentation-reconciliation task with the exact file/rule scope above. No ADR is proposed unless that approved scope changes a trigger.
- Separately approve the exact commit/publication plan after file-level packet review, current scans and public-exposure review, including author metadata and any sensitive documentation.
- Separately approve the precise ruleset/Actions settings changes. Verify them before merge; do not treat this proposal as activation permission.
- After actual successful hosted jobs and artifact/visual/image review, approve the specific PR merge and final checkpoint acceptance. An unavailable required human reviewer, failed hard gate, unresolved exposure decision or inaccessible protection remains BLOCKED.

**Stop here. This task creates only this proposal; governing rules, Git history/index/branches/remotes, repository settings and application/test code remain unchanged.**
