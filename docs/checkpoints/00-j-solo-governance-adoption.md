# Solo governance adoption and reconciliation

Effective date: **2026-10-11**. Responsible owner and module owner for the current foundation: **Project owner, GitHub `Hasoba96`**. Repository: `Hasoba96/website-builder-saas`. Authority: the owner's explicit adoption/reconciliation instruction in this task and [CORE-040/044/045](../en/00-PROJECT-RULES.md#7-git--branches-commits-pull-requests), not an invented independent approval.

## Decision and limits

The direction in the [historical proposal](../proposals/solo-developer-governance-amendment.md) is adopted through the governing English/Arabic rules. This record supplies adoption parameters; it does not override those rules. Solo mode permits a separate documented AI-assisted review and explicit owner acceptance for eligible changes. It is not independent human review. The owner retains implementation, module-ownership and acceptance responsibility; those are roles held by one person, not multiple reviewers.

This reconciliation is **sensitive, reversible, non-production governance work**. Threat review: fewer independent people, large initial import, self-authored CI controls, owner-account compromise and irreversible public disclosure remain material risks. Controls are reviewed small packets, exact identities, distinct publication/merge authorization, protected-main PRs, independently executed hosted gates, no bypass actors and the retained independent-human-required class. Automated gates do not make their author independent. Owner acceptance of this direction is recorded; acceptance of the final reconciled text and any publication operation is still to be requested.

No general exception mechanism is added. CORE-002 hard blockers, CORE-041/042/043/046, DM-034, SE-040/041/060/061, IN-030/031/033/034, TS-024/060/061/063 and all other unchanged provisions remain binding. No waiver of secrets, vulnerabilities, real databases, coverage, images, Linux visual acceptance or actual hosted CI. ADR-001 remains the sole applicable domain-free cross-tenant N/A. A-I history is unchanged; **00-J remains BLOCKED**, and neither 00-K nor Stage 01 starts.

## Review and expiration

**Dated status update, 2026-10-12:** local genesis and its publication were separately authorized and completed. Remote main is `ecbf9d6ccde2a00bf3587b02cbd8bd3f6b5d2e83`, zero parents/files, expected empty tree. CORE-040's single-use exception is now **CONSUMED/EXPIRED**, not available for another operation. Main PR ruleset 24885869 is active with zero required approvals; required CI contexts are still empty, so merge remains blocked by policy. See the [publication review](00-j-publication-review.md) and [current preparation](00-j-publication-plan.md#current-preparation-addendum--2026-10-12). Source assembly/publication and merge remain unauthorized; the aggregate-import exception remains unused. The following bullets and original verification record preserve the state at adoption, not permission to repeat genesis.

- Solo mode must be reviewed **by 2027-01-09**, 90 days after adoption. No new merge after that deadline without an explicit recorded renewal. Also review at every checkpoint and immediately on another maintainer joining, first real customer data, a material incident or a new production trust boundary.
- The empty-tree exception is available for one root commit creating the first `main` only. It is **UNUSED; execution NOT AUTHORIZED**. It expires immediately when that remote ref is created, or on **2027-01-09** if unused. Owner must separately approve the exact commit and push operations. No source files, workflow, README or credentials may enter this commit.
- The aggregate foundation-import exception is **UNUSED; execution NOT AUTHORIZED**. It expires on the first import merge, **2027-01-09**, or an earlier recorded bootstrap deadline, whichever occurs first. Before creating its branch, record a concrete deadline satisfying CORE-041's **under five working days** requirement; the 90-day eligibility window does not extend branch life. Expiry cannot be avoided by renaming/recreating a branch. No red/partial merge is a remedy for expiry.
- Changes to scope, candidate content or head/base require refreshed affected reviews and explicit acceptance. Unused expired exceptions require a new documented owner decision; no agent may renew them automatically.

## Required review record for publication packets

For each packet retain file/hunk identity, conservative line count, file and hunk hashes, exclusions, dependency order, module owner, risk/exposure classification, public-disclosure findings, separate AI technical-review findings and resolutions, failure/negative evidence and rollback. Retain a truthful review status: inventory or public-exposure review alone is **not** a completed code review. Before publication, map packets to actual commits, scan every commit tree, and bind the manifest to the actual final Git tree. Before merge, record tested head/base/merge identities, both hosted jobs, native reports, coverage, image/visual acceptance, artifacts, resolved threads and the owner's exact merge authorization.

Sensitive pre-production changes require the owner's residual-risk decision. Independent-human-required cases in CORE-045 stay blocked without a qualified separate person, including irreversible migrations under DM-034. No second account, AI pass or attestation field substitutes for that person. Reclassify if real data, real payments, production credentials or activation appears.

## Reconciliation and ADR review

Only CORE-040, CORE-044 and CORE-045 change; their IDs remain stable. English remains authoritative; Arabic expresses the same single-use limits, review deadline, risk classes and non-waivable cases. Playbook sections 9/11 and summary items 22/23 reference the new procedure, not a competing policy. Systems 02/14/18/19/21/22 and their translations are unchanged.

**ADR REQUIRED: NO for this scope.** Rechecked CORE-090, Security section 12, Infrastructure section 9, Observability section 10, Backup/DR section 9 and Testing section 11: no architecture/provider/data/retention change, security-control bypass in those systems, CI-category exemption or testing relaxation. DM-034's second approval is expressly retained. Any later expansion meeting a trigger stops for that process. No approved ADR is edited.

## Publication preparation

The [publication plan](00-j-publication-plan.md#current-adopted-plan--2026-10-11) contains the proposed empty-tree operation and approval boundaries. The [packet manifest](00-j-publication-packets.json) inventories the current candidate only. It is not permission to commit or publish, not a statement that all technical packet reviews passed, and not a completed CI candidate: required future Linux baselines and any J fixes must be newly inventoried/reviewed before publication.

The owner's public-repository decision is distinct from consent to publish source or personal metadata. Intended disclosure includes source, governance/product plans, security design, dependency/image versions, historical host paths/resource identifiers and Windows shell screenshots. Secret scanning is necessary, not proof of confidentiality. Exact metadata and public exposure require owner approval. Returning to private cannot recall downloaded source or public forks.

## Verification record

Executed documentation-only checks on 2026-10-11:

- `pnpm format:check`: PASS for all files covered by the existing formatter policy. Governing/reference Markdown remains deliberately excluded by the pre-existing `.prettierignore`; no mass reformatting or ignore-rule change. Changed governing passages received manual whitespace/semantic review.
- Local links in the eight modified/new Markdown documents: **110 checked, zero missing files/headings**. No online execution or GitHub-setting verification is inferred from link validation.
- English/Arabic semantic review: matching single-use scope, owner approvals, team versus solo distinction, sensitive cases, independent-human requirements, expiration and unchanged gates. **48 stable CORE rule definitions** in each language, no duplication or renumbering. Reversing only the three replaced rule passages and main diagram reconstructs each original file hash; unrelated rules are byte-preserved.
- `git diff --check` and staged whitespace check: PASS. Manual review covers all changed/new documents and the generated manifest's counts, ranges, exclusions and disclosure classes.
- `pnpm security:secrets`: PASS across **295 tracked/untracked Git-eligible paths**, no leaks and no scanner suppression. The eight existing Windows snapshot images were visually inspected for public exposure: shell labels/language links only, no visible credentials or personal data. This does not verify Linux visuals or constitute owner publication approval.
- Packet validation: **294 payload files, 295 payload packets**, **10,465 conservatively counted real-code lines**, maximum **397 per packet**. File/hunk hashes match current bytes, ranges have no gaps/overlaps, every Git-eligible payload file is inventoried. One 416-line Redis test file is split at a complete top-level test boundary into 343/73-line review packets, with one proposed coherent file commit. The generated manifest is separately inventoried as its self-control record; its final hash is recorded outside itself in task evidence. It grants no technical-review PASS.
- Baseline comparison: **seven existing documentation files changed; 286 pre-existing eligible files unchanged**, including the proposal, all A-I reports, systems/ADRs, closure report, runtime/test/CI code, workflow and lockfile. Two new eligible records: this adoption record and the manifest. Ignored local preparation helpers are not publication content.
- Git remains unborn on `chore/infra-checkpoint-00-a`; only the original two-line hook is staged, and no remote exists. No commit, index-content rewrite, branch/ref creation, remote change, GitHub settings change or publication occurred.

No runtime/build/hosted result is re-certified. The recorded 167/167 local tests remain historical evidence. No new governing contradiction was found within this adopted scope; operational approval, packet technical review, public-disclosure acceptance and the mandatory remaining 00-J provider/image/Linux gates remain unresolved, not waived. Regenerate and revalidate the manifest after any content change, including this record, and repeat the secret scan before approval.
