# 00-J initial publication plan

## Current preparation addendum — 2026-10-12

This addendum supersedes current-state assumptions below; their genesis operation examples are historical, **not instructions to repeat genesis**. Remote main is now the verified empty root `ecbf9d6ccde2a00bf3587b02cbd8bd3f6b5d2e83`; CORE-040's exception is consumed. Main PR ruleset 24885869 is active with zero required approving reviews. Its required-check list is empty: this is not complete merge protection compliance.

The [publication review](00-j-publication-review.md) records separate technical, security and disclosure passes, actual settings, findings and limits. The refreshed [manifest](00-j-publication-packets.json) includes genesis/preparation evidence and file/hunk hashes, conservative counts, proposed Git modes, review references and exact per-group Git arguments. The [execution specification](00-j-publication-execution.md) is the current dependency-ordered plan, with branch lifetime, check registration, rollback and distinct approval steps.

**Preparation only.** Source assembly, commit, branch, push, PR, merge and settings changes remain unauthorized. Owner packet/disclosure/residual-risk acceptance, actual commit/tree mapping, full hosted tests/coverage/artifacts, Linux visual acceptance, four current image builds/smokes and required-check enforcement remain open. No 00-J PASS, 00-K or Stage 01. Earlier dated text is preserved as history, not current authorization or remote state.

## Current adopted plan — 2026-10-11

Policy direction is now adopted in CORE-040/044/045; **all Git/publication/settings operations remain NOT AUTHORIZED**. The [adoption record](00-j-solo-governance-adoption.md) defines the owner, 2027-01-09 review/outer expiry, single-use limits and independent-human-required cases. The sections after the historical divider below retain the earlier plan verbatim; their private-state and unavailable-policy statements are not current instructions.

### Candidate and review packets

The [packet manifest](00-j-publication-packets.json) inventories the current staged/unstaged/untracked Git-eligible working-tree candidate against an empty source tree. It does not stage anything or silently select the index version instead of the working copy. Each file has a raw SHA-256, normalized-text hash where applicable, count, exposure classification and exact added-line ranges. Packet IDs map to proposed commit groups, dependency phases and at most 400 conservatively counted real-code lines. Generated/lockfile/document/binary exclusions remain explicitly inventoried. The manifest itself is a control record: its externally recorded digest avoids an impossible self-hash; it must be included in final approval and Git-tree verification.

Preparation is not completed technical review or approval. Public-exposure inventory review checks intended disclosure and scanner/ignore boundaries; it cannot certify all code or confidentiality. Every packet still needs its separate technical-review result and owner acceptance before any commit/publication. No author-controlled AI identity is an independent reviewer. The final commit IDs and Git tree cannot exist before commit approval; they must be filled from actual authorized assembly, not fabricated now. Required Linux baselines and any J fixes are absent from this snapshot and must be separately reviewed and added. Any changed byte invalidates its packet/hash and affected acceptance.

Review governance/repository hygiene, toolchain/contracts, infrastructure boundaries, apps, test harnesses, local infrastructure and CI in dependency order recorded in the manifest. Source and its tests may span packets; buildability is assessed on the fully assembled candidate, not claimed for partial additions. Intermediate commits are diagnostic-only and never individual partial PR merges. Publish one complete aggregate foundation-import PR only after specific owner authorization, with all mandatory hosted checks before merge. The final squash-merged main tree must equal the reviewed candidate tree. CORE-041 remains under five working days; prepare reviews before the authorized short-lived source branch starts.

### Exact proposed empty-tree genesis operation

Target: `https://github.com/Hasoba96/website-builder-saas.git`, currently PUBLIC according to the owner's instruction and proposal's dated inspection. Proposed message: `chore(infra): establish empty repository genesis`. Include **zero files**. Current local branch: `chore/infra-checkpoint-00-a`; do not rename it or add a remote. Git uses SHA-1; expected empty tree: `4b825dc642cb6eb9a060e54bf8d69288fbee4904`. Expected root: no parents. No application/workflow CI result exists for this empty tree.

**Approval A, local commit only:** owner must first confirm commit author name and a safe author email (prefer the owner's verified GitHub noreply address), and explicitly approve one empty root commit on the current unborn local branch. No author identity is configured in the inspected local Git settings. Do not invent it. Record branch/index/working-file hashes, verify HEAD remains unborn, `.local/00j-genesis.index` does not exist, required toolchain is available, and rerun the current secret scan. Use a separate index so the already staged hook is not committed. The following is an unexecuted operation specification; placeholders must be filled from that approval, not guessed:

```powershell
# NOT AUTHORIZED TO RUN. Approved author identity must be supplied first.
$approvedName = '<owner-approved author name>'
$approvedEmail = '<owner-approved author email>'
$previousIndex = $env:GIT_INDEX_FILE
if (Test-Path -LiteralPath '.local/00j-genesis.index') { throw 'Genesis index already exists; inspect first.' }
try {
    $env:GIT_INDEX_FILE = Join-Path (Get-Location) '.local/00j-genesis.index'
    git read-tree --empty
    if ($LASTEXITCODE -ne 0) { throw 'Empty index preparation failed.' }
    $entries = @(git ls-files --stage)
    if ($LASTEXITCODE -ne 0 -or $entries.Count -ne 0) { throw 'Genesis index is not empty.' }
    git -c core.hooksPath=.githooks -c "user.name=$approvedName" -c "user.email=$approvedEmail" commit --allow-empty -m 'chore(infra): establish empty repository genesis'
    if ($LASTEXITCODE -ne 0) { throw 'Genesis commit or mandatory pre-commit scan failed.' }
    git show --no-patch --format='%H %T %P' HEAD
    if ($LASTEXITCODE -ne 0) { throw 'Genesis identity verification failed.' }
} finally {
    $env:GIT_INDEX_FILE = $previousIndex
}
```

The existing Gitleaks hook remains enabled; do not use `--no-verify` or bypass a failure. Confirm zero tree entries, the exact empty-tree hash, no parent, approved author metadata, unchanged real index and source hashes before proposing publication. This necessarily materializes the current unborn local branch, explicitly included in Approval A; it does not create local `main`, rename a branch, stage source or configure a remote. A failed verification stops for inspection; no reset or commit deletion is authorized. The isolated index is ignored local tooling, not publication content.

**Approval B, empty genesis publication only:** after inspecting the actual root SHA, owner separately approves exactly `git push https://github.com/Hasoba96/website-builder-saas.git <verified-root-SHA>:refs/heads/main`. First recheck that the remote has no commits/branches and existing authorized authentication works. No force flag, token in the URL, remote addition, other ref, source publication or settings change. If the repository is no longer empty, stop: the exception no longer applies. Verify remote `main` resolves to that empty root; immediately mark CORE-040 consumed in the evidence. No command in Approval B is executable until the actual SHA and explicit push approval exist.

**Later, separate approvals:** exact protection/Actions settings, source commit/branch plan and public-exposure inventory, complete candidate push/PR, then exact merge after actual hosted verification. Source branch proposed name `chore/infra-foundation-import`; creation and its concrete under-five-working-day deadline require approval. Initial genesis metadata is itself public disclosure even though its tree is empty.

### Public exposure and exclusions

Intended inventory includes application/tooling/test source, exact dependency/image pins, English/Arabic architecture/product/governance documents, historical reports and sanitized checked-in evidence, safe example environment files, and eight Windows shell snapshots. Historical documents disclose developer path names, local resource identifiers, project security design and operational limitations. These are not credentials, but owner must explicitly accept their public disclosure; scanner PASS is not privacy approval. The manifest records per-file exposure flags without copying secret values. No license grant for the project's own source is inferred from public visibility.

Exclude ignored `.local/`, real environment/credential files, build output, coverage/raw logs/traces/reports, Docker/WSL data, browser profiles and dependency stores. Never use `git add .` as approval. Review each exact tree and every commit for secrets before publishing. Do not resurrect superseded vulnerable dependencies by reconstructing historical checkpoints. Returning to PRIVATE later cannot retract copies; verify protection-plan support before any separately approved visibility transition.

### Protection and acceptance hold

The target settings are recorded in the [CI runbook](../runbooks/ci.md#baseline-and-owner-publication): PR required, zero approval-count only for eligible solo mode, no last-push/extra unattributed approval, resolved conversations, strict required `verify`/`images`, no bypass, force push or deletion, squash-only/manual merge, least-privilege Actions. No settings changed here. Activate approved protections after genesis and before source publication. If check-source selection needs a first run, maintain the no-merge hold until both real contexts/source and enforcement are verified. Required independent-human changes cannot use the solo settings as a bypass.

**00-J remains BLOCKED:** packet technical review/owner acceptance and Git operations; actual active protections; complete hosted Linux `verify`/`images`; Linux visual acceptance; four current image builds/smokes; native coverage and sanitized published artifacts; tested candidate/main identities and owner acceptance. Local 167/167 is historical, not a hosted substitute. No 00-K or Stage 01.

---

## Historical pre-adoption plan (retained unchanged)

Date: 2026-10-11. Status at the time: proposed, not authorized or executed.

## Inspected baseline

The local branch is `chore/infra-checkpoint-00-a`, with no commit and no remote. The existing staged hook and all unstaged/untracked work are preserved. No branch rename, index rewrite, commit, remote addition or push has been performed by this recovery task.

The authorized GitHub connector can read `Hasoba96/website-builder-saas`: private, empty, default branch name `main`, no branch returned. Connector access does not prove local Git authentication. A noninteractive read-only HTTPS `git ls-remote` could not authenticate; no token was requested or printed. Fresh read-only GitHub results: workflow runs `total_count: 0`; ruleset lookup returned HTTP 403, "Upgrade to GitHub Pro or make this repository public to enable this feature." Classic branch-protection lookup separately returned HTTP 403, "Resource not accessible by integration." These are distinct plan/access limitations, not proof of active protection. Keep the repository private; owner action is needed to obtain/verify required protection capabilities without weakening CORE-040.

## Publication inventory

Include the reviewed source in `apps/`, `packages/`, `migrations/`, `scripts/`, `tests/`, `infra/`, `.github/`, root toolchain/configuration files, exact lockfile, safe example environment files, approved Windows snapshots, reviewed future Linux snapshots, and current documentation. Preserve every A-I checkpoint and dated J finding. Inspect the exact staged diff for every slice before committing; this directory-level plan is not authorization to publish arbitrary future files.

Exclude `.local/`, real `.env*` files, generated infrastructure credentials, `node_modules/`, stores, build output, `.next/`, coverage, raw logs, native reports, traces, Docker/WSL data, private local settings, and all unrelated files. Existing ignore rules remain enabled. The final recovery secret scan passed for 292 Git-eligible paths; repeat it on each exact staged publication inventory. Do not treat generated evidence as automatically safe for upload.

## Dependency-ordered review sequence

Each numbered group requires one or more independently reviewable PRs, not one oversized PR per checkpoint. Before approval, enumerate exact files/hunks and real-code line counts for each slice; split until every PR satisfies CORE-044's 400-line limit. No test removal, placeholder success, or architectural rewrite is permitted to make slices smaller.

1. Governance, approved decisions, documentation authority and repository hygiene.
2. Pinned workspace/toolchain, source-secret checks and architecture boundary enforcement.
3. Shared schemas/configuration and their real tests, followed by independent application shells.
4. PostgreSQL configuration, pool, migration infrastructure and real-container fixtures/tests. Migration changes require two reviewers including the module owner.
5. Redis/BullMQ configuration, lifecycle and isolated real-container tests.
6. Structured logging, errors, probes and security controls with their regression tests.
7. Guarded test orchestration, coverage/evidence checks and reviewed browser baselines.
8. Local Compose infrastructure, exact-owned lifecycle/reset controls and independently buildable application images.
9. CI workflow, local verification commands, sanitized artifact handling, reviewed SDK graph and 00-J evidence.
10. The dated Next.js 16.3.8 security correction and any later reviewed recovery fixes, integrated into the appropriate earlier slice before that slice is published if necessary to avoid introducing a vulnerable baseline.

Use fresh short-lived branches with the documented `feat/`, `fix/`, `chore/`, or `docs/` convention; use `chore/infra-*` for CI work, Conventional Commits and CORE-043 PR descriptions. Do not rename the current working branch automatically. All PRs require at least one reviewer; sensitive categories listed in CORE-045 require two, including the owning reviewer. The owner must identify eligible reviewers; an automated agent is not substituted for required human approval.

## Binding bootstrap conflict: owner decision required

CORE-040 forbids every direct push to `main`, but this empty repository has no base commit/branch against which GitHub can open an initial PR. Creating an empty genesis commit on `main` would still require explicit governance authorization; this plan does not grant it. Merely creating a feature branch does not establish a compliant main base.

CORE-044 requires small reviewed PRs, while IN-030 and TS-060 require applicable checks/tests for every PR. The current complete workflow expects all nine build tasks and the full guarded test inventory; partial historical bootstrap slices cannot silently be declared green using missing suites or zero-task placeholders. A single giant baseline would violate CORE-044. No general bootstrap exception exists in the inspected rules. The owner must resolve the initial base and staged acceptance process explicitly before any publication; ordinary permission to push alone does not rewrite these rules.

## Exact operation awaiting approval

No commit or push is currently proposed for execution because the bootstrap policy and exact per-PR slices are unresolved. The first possible operation is an owner-approved empty base initialization, followed only by specifically reviewed feature-branch commits and PRs, if the owner supplies a binding bootstrap decision permitting it. An empty base would include no application source, credentials or generated files. Target repository remains `https://github.com/Hasoba96/website-builder-saas.git`, private; eventual protected base remains `main`. Do not change visibility, force-push, bypass reviews or attach a remote without the agreed operation plan.

After that decision, present the exact files, counts, commit messages, target branch, remote operation, latest secret scan and applicable reviewers for the first slice, then obtain explicit commit/publication approval. Authorization for one slice does not authorize later pushes or fixes. Existing connector access may support approved API operations; local Git publication requires owner-configured authorized Git authentication. Never request raw tokens in chat.

## Repository settings to verify with the owner

- Settings > Branches or Rulesets: protect `main`; require PR review, required checks `verify` and `images`, resolved conversations and no bypass/direct push/force push/deletion. Configure the actual reviewer identities and sensitive-change ownership before claiming enforcement.
- Settings > Actions > General: read-only workflow token, no workflow PR-approval permission, no write tokens or repository secrets for untrusted fork runs; require applicable contributor approval. Restrict permitted Actions to the reviewed repository-owned action. Keep seven-day artifact retention.
- Verify the GitHub account plan supports these protections for this private repository. Documented intent is not evidence of active protection. Do not change access or visibility to work around plan limitations.

No settings have been changed. Repository metadata currently reports `allow_forking: true`; this is not evidence that fork-run token/secrets/contributor approval settings meet the required policy. After authorized publication, inspect both real hosted jobs and sanitized artifacts for the exact commit SHA. Missing local Linux/image evidence can only be replaced by equivalent actual verified Linux execution, never by YAML validation or a fabricated green run. Final 00-J remains BLOCKED until all mandatory gates pass; 00-K is not started.
