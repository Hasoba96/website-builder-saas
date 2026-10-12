# Foundation publication execution specification

Date: 2026-10-12. **PLANNED ONLY, NOT AUTHORIZED OR EXECUTED.** Authority: CORE-040/041/043/044/045/046 and the [adopted solo procedure](00-j-solo-governance-adoption.md). Findings and limits: [publication review](00-j-publication-review.md). No exception to complete CI, security or owner acceptance.

## Candidate and approval

The [manifest](00-j-publication-packets.json) is the exhaustive working-copy allowlist. Approve its payload identity and its externally recorded file SHA-256, including all documentation/binary disclosures, sensitive residual risk and stated review limitations. Its own digest is external to avoid a self-hash cycle. Proposed `C001` etc. are labels, not Git SHAs. All actual commit/tree identities remain unassigned until authorized assembly. A changed byte, path, mode, head or base requires affected review and approval again.

Order is governance, workspace/source guards, schemas, configuration, infrastructure/migrations, apps, test harnesses, local infrastructure/images, CI, then evidence. Each exact file/hunk belongs to a <=400-real-code-line packet; generated/lockfile/document/binary exclusions are still inventoried. Partial commits receive diagnostic verification only; only one complete aggregate PR can merge after all mandatory hosted gates. No partial green placeholders or reconstruction of old vulnerable dependencies.

## Step 1: separately approved local assembly

Proposed isolated checkout: `F:\Website Builder Publication`. Keep original `F:\Website Builder Proj`, its branch, index, remote configuration and credentials unchanged. Destination must not exist; do not remove/reuse an occupied directory. The following operations require explicit owner approval first:

```powershell
$source = 'F:\Website Builder Proj'
$assembly = 'F:\Website Builder Publication'
$remote = 'https://github.com/Hasoba96/website-builder-saas.git'
$genesis = 'ecbf9d6ccde2a00bf3587b02cbd8bd3f6b5d2e83'
if (Test-Path -LiteralPath $assembly) { throw 'Assembly destination exists.' }
git ls-remote $remote refs/heads/main
# STOP unless main still equals the exact approved genesis SHA.
git clone --no-checkout --single-branch --branch main $remote $assembly
git -C $assembly switch --create chore/infra-foundation-import $genesis
git -C $assembly config --local core.hooksPath .githooks
git -C $assembly config --local user.name 'M Hasoba'
git -C $assembly config --local user.email '269009588+Hasoba96@users.noreply.github.com'
```

Check every command exit code and stop on failure; this specification is not an unchecked batch script. The identity matches genesis but its source-commit reuse must be approved. Only the isolated checkout receives an `origin` remote. Record branch creation **T0 in UTC** and expiration **T0 + 72 hours**, strictly under five working days and before the outer **2027-01-09** exception deadline. Do not create the branch until the owner can complete its approval/review window. Expiry means stop for owner decision, not clock reset, branch recreation, force push or red merge.

Copy only approved manifest-listed regular files and the manifest into the isolated checkout, preserving relative paths. Reject symlinks, absolute/escaping paths, unknown files and changed hashes. No `.local`, credentials, stores, reports or `.git` data. All candidate files must be present before committing so the approved scanner configuration and hook are available throughout assembly. Compare copied raw hashes first, then staged blob hashes against normalized-LF hashes (raw binary hashes for binary files). `.gitattributes` governs text normalization.

Run a fresh complete source secret scan before the first source commit. For each ordered `proposedCommits` entry, use its exact `gitAddArguments` and `gitCommitArguments` with `git -C $assembly`. Inspect `git diff --cached --name-status`, `git diff --cached --numstat` and `git diff --cached --check`; only the current group's paths may be staged. When staging the hook, additionally run:

```powershell
git -C $assembly update-index --chmod=+x -- .githooks/pre-commit
```

The hook must be mode 100755; other proposed files are 100644. The mandatory existing Gitleaks pre-commit hook runs for every commit. No `--no-verify`, blanket `git add .`, amend, reset or history rewriting. Validate every intermediate tree/history for secrets because the entire history, not only final state, becomes public. Record each group's real SHA and tree using `git rev-parse HEAD` and `git rev-parse HEAD^{tree}` in an external local ledger.

After all payload groups, commit the approved manifest as the control record:

```powershell
git -C $assembly add -- docs/checkpoints/00-j-publication-packets.json
git -C $assembly commit -m 'docs(docs): record foundation publication manifest'
git -C $assembly rev-parse HEAD
git -C $assembly rev-parse 'HEAD^{tree}'
git -C $assembly ls-tree -r --full-tree HEAD
git -C $assembly log --format='%H %P %s' $genesis..HEAD
```

Bind manifest group IDs to actual commits and the final tree in the separate ledger/approval record. Do not insert a commit's own SHA into its contents. An additional tracked mapping file would itself require review/approval; do not smuggle it into the approved final tree. Require exact allowlist/mode/blob equality, genesis ancestry, no unrelated commits, all-history/source scans and preservation of the original checkout before returning the candidate for publication approval. No local assembly approval grants a push.

## Step 2: separately approved source push and PR

After owner approval tied to the actual head SHA, tree, ledger and public inventory, recheck remote main/genesis, active protection and target branch absence/unexpected work. Propose only this non-force refspec from the isolated checkout:

```powershell
git -C 'F:\Website Builder Publication' push origin <OWNER-APPROVED-SOURCE-SHA>:refs/heads/chore/infra-foundation-import
```

The placeholder cannot be replaced until real approved commits exist. No main push, `--all`, tags or other refs. Separately approved creation of one aggregate PR uses base `main`, head `chore/infra-foundation-import`, with CORE-043 purpose/scope, packet/commit/tree map, risk, testing, rollback and screenshots. Retain an explicit no-merge hold. Unavailable local disk-intensive verification may be completed by equivalent real hosted Linux execution; unavailable evidence is never a PASS.

## Step 3: register and verify required checks

Workflow name is **CI**. Job keys **verify** and **images** have no `name` override; these are expected check names, to be confirmed from actual check runs. PR execution tests the event's merge candidate, potentially different from source head: record head, base, event SHA, run URL and both job results. Main-push/dispatch triggers do not replace the first PR run. No hosted run currently exists.

After separately authorized first execution, the owner opens Settings > Rules > Rulesets > Protect Main Branch > Require status checks. Add the exact observed `verify` and `images`, retain strict up-to-date mode, and select **GitHub Actions** as the expected producer when available. Inspect the saved ruleset API for two nonempty context entries and the actual integration source, then verify PR enforcement. Never synthesize successful statuses to register names. GitHub's selection guidance requires a successful check within the preceding seven days; app association requires real producer evidence. If failed/missing checks cannot yet be selected, maintain the no-merge hold, review/re-authorize fixes and rerun. [Required checks](https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/troubleshooting-required-status-checks), [check sources](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets).

Separately reconcile stale-review dismissal to the retained target and inspect repository Actions read-only, fork/contributor, permitted-action and retention settings. These are owner operations, not performed by preparation. Empty contexts, skipped/neutral jobs or missing artifacts never satisfy the project's complete-success gate. Missing Linux baselines must be generated in pinned Linux Chromium, visually reviewed individually and rerun without update flags. Future baseline/fix commits and pushes require refreshed packet review and exact approval.

## Step 4: final merge approval and rollback

Only after current-candidate full hosted tests, native coverage, security gates, Linux visual acceptance, four current image builds/smokes, artifact publication, resolved findings and verified protection should a separate owner merge approval be requested. Verify resulting main tree equals the approved candidate and inspect its push workflow before 00-J closure. No auto-merge, deployment or 00-K.

Before push: stop and retain the isolated branch/ledger; original work is untouched. After push before merge: main stays at genesis; closing the PR or deleting the branch needs separate authorization and cannot retract public copies. After eventual merge: use a new reviewed corrective/revert PR with full CI, not rewritten history or direct main push. No volume, database or credential deletion belongs to this rollback. Irreversible data operations/production activation remain outside eligible solo scope.
