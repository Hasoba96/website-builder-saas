# 00-K security-canary assertion correction

Date: 2026-10-16. Owner/module owner: Hasoba96, infrastructure/API operations tests. **Focused correction PASS; full local verification BLOCKED. 00-K is not CLOSED.** Local correction, tests and review only are authorized. No branch, staging, commit, push, PR, merge, workflow rerun, deployment or Stage 00-L/01 work occurred.

## Identity and preserved history

Authenticated remote main was verified as `5d86555402507d73f103713b198789c594a1811c`, tree `752b2d37f2fbd8646e5c092099c5bd05a2319e96`. The unchanged local HEAD `105dbaab8eca8ddfa2e96c2a91db4ee2628b66be` has that same tree. No reset, fetch, branch switch or history rewriting was required. The original development checkout is not an implementation target.

The original [00-K local record](00-k-closure-report.md) and [approved implementation inventory](00-k-review-inventory.json) remain unchanged. [Failed main run 38828142735](https://github.com/Hasoba96/website-builder-saas/actions/runs/38828142735) is retained as failure evidence, not replaced with an earlier PR PASS. Local ignored evidence resides under `.local/00k-canary-fix-20261016`; previous hosted evidence remains under `.local/00k-publication-20261016/main`.

## Root cause and exact correction

The original API assertion `/00f-|secret|stack|node_modules/` scanned a complete response including `requestId`. Valid UUID `req_1f1dbd0c-dc3f-400f-850b-d9cd09f54bc5` contains `00f-`; the hosted generic NOT_FOUND response therefore failed without exposing a secret. The later body and log assertions also matched that ambiguous fragment.

`apps/api/tests/operations.spec.ts` now shares eight complete fixture markers between injection and detection: exception, validation, authorization, cookie, query, body, untrusted request ID and path. It still inspects full response/log content, never removes request IDs or masks fields. Explicit stack/module-path/frame checks remain, and existing strict `errorSchema`/`logSchema` validate every response/log record, rejecting unexpected sensitive fields and nested details. Production request-ID generation, error mapping, response codes, correlation, logging and schemas are unchanged. This fixture detector is not a general-purpose production DLP system.

Three deterministic regression tests supplement, not replace, the real Nest HTTP test:

- Three fixed valid UUIDs, including the exact hosted collision and other hexadecimal fragments, pass in both response and log shapes. The test explicitly demonstrates the old fragment matches the known ID.
- All eight complete markers fail detection in responses and multi-record log streams, including authorization, cookie, query and body. Expected failure reason is checked so a schema/type error cannot falsely prove canary detection.
- Three diagnostic strings fail in both formats. Nine forbidden field names are rejected at error/log top-level fields and nested details, without relying on canary content. Valid fixtures are separately accepted first.

`scripts/test-evidence.ts` raises the API minimum from 4 to 7, protecting the three added tests. Expected complete count becomes 183, not a reduction of the original 180. No suite exclusion, retry, skip, coverage threshold or workflow change was introduced. The two code-file diffs total **176 conservative added/deleted lines**, including blanks; documentation/generated inventory are separately reviewed under ordinary CORE-044.

## Executed verification

- Focused operations suite: **4/4 PASS**; real HTTP integration plus three deterministic detector regressions.
- Complete API suite, separately executed: **7/7 PASS**, including bootstrap, operations and hostile-input/security regressions. Existing runner coverage remains enabled.
- Evidence/false-pass guards: **4/4 PASS**, including actual runner refusal of zero discovery, focused-only execution and zero assertions. This focused coverage output is not a complete-project coverage claim.
- One `pnpm ci:verify` attempt started at **2026-10-16T00:34:47.335Z**, failed after **547,738 ms**. Frozen install with disabled lifecycle scripts, runtime, CI policy, supply-chain, format, lint/architectural boundaries, strict typecheck **14/14**, workspace validation and build **9/9** passed. Uncached, sequential Turbo and the existing 1536 MiB heap setting were used.
- The full guarded test path stopped at Compose: **5 passed / 1 failed**. `tests/local/foundation.spec.ts:267` reported `Local api startup failed: []` after the existing 15-second readiness deadline. No structured startup output was captured. The underlying cause is **not established**; low available memory is context, not proof. This is unrelated to the fixed API canary assertion and is not silently converted to PASS.
- Remaining full-suite PostgreSQL/Redis/root/application/browser execution and complete ten-suite coverage validation were not reached. The separate API and guard runs cannot replace a successful full guarded path. No full-run retry was used to obtain a lucky result.
- Separately executed dependency audit: no known vulnerabilities. Bundle budget: dashboard 186,283 and renderer 186,284 gzip bytes, each below 512,000. Local history scan: **299 commits**, no leaks, no new suppression. Final source scan, format/whitespace and inventory validation are recorded with the external completion evidence after document generation.
- No new hosted/Linux snapshot or four-image build/smoke verification is claimed. Those gates remain mandatory for the corrected published candidate and resulting main.

## Safety and scope

Initial read-only safety inspection found C: 8,856,367,104 bytes free and F: 28,603,711,488 bytes free, approximately 3.85 GiB available physical RAM, Docker Engine 29.8.1/Linux and no running or stopped containers. Both existing development/anonymous volumes were inventoried and preserved. Before full execution both drives exceeded the 4 GiB safety threshold. At the failed test's inspection, C: had 5,765,148,672 bytes free and physical free RAM was 1,419,472 KiB. No disk exhaustion is established.

Only existing exact-owned disposable fixtures were used; CI cleanup reported zero test containers. No persistent development data, Docker/WSL reset, prune, image rebuild or application process outside the harness was modified. Existing owner/SYSTEM/Administrators-only SWC cache configuration was reused without changing ACLs. The original checkout's 298 file hashes, index, branch and HEAD are compared with the prior preserved fingerprint during final inventory validation. Candidate Git index and HEAD remain untouched.

## Separate review and remaining findings

A distinct post-implementation technical/security/disclosure review inspected the exact diff, deterministic failure reasons, real HTTP assertions, strict schemas, production build exclusion of tests, discovery floor and full-run failure evidence. This is a separate pass by the same AI agent, **not independent human/model review**. Risk class: sensitive but reversible, isolated non-production security-test correction under CORE-045. Owner authorized local correction only; publication/merge acceptance remains separate. No production security control, custom cryptography or architecture decision changed.

Technical/security result for the requested API correction: no unresolved actionable defect found. The original HTTP statuses, incoming-ID rejection, response/header correlation, log correlation, single unexpected-error count and cleared async context remain asserted. Negative tests verify full leaks and forbidden fields are rejected, rather than merely deleting the original assertion. Disclosure review found synthetic fixture data and safe public identifiers only; no credentials or raw failure logs are publication payload.

**Related pre-existing finding:** `tests/database/operations.spec.ts:93` separately scans full logs with `/00f-|malformed-untrusted|foundation_test/`. Since these logs contain the same UUID format, it has the same potential collision. It is outside the specifically corrected API file and remains unchanged, explicitly reported for separately scoped approval. Root observability and browser tests use non-hexadecimal `canary` markers and do not share this particular UUID-fragment collision. A green run alone would not remove the related risk.

**Full-verification blocker:** the Compose API startup failure requires bounded diagnosis and a successful complete guarded run without weakening startup bounds. No production or unrelated test source was edited to hide it. Candidate inventory is reviewable but is **not a publication GO** while required verification remains incomplete. No global security or production backup/PITR readiness is claimed.

## Publication plan and rules

The [correction inventory](00-k-canary-correction-inventory.json) records exact file/blob/hunk hashes and packet `00-K-CANARY-01`; its own hash is recorded externally to avoid recursion. Existing manifests remain historical, not regenerated. No dependency or lockfile change.

Next: obtain scoped authorization to address the related database-test assertion and diagnose the Compose startup issue if additional changes are needed; preserve failures, rerun focused/security tests and the complete guarded path, then refresh the review/inventory. After successful gates and explicit publication authorization, create a fresh short-lived branch from verified main, one reviewed ordinary commit and protected PR. Require fresh Linux `verify`/`images`, native artifacts, all expected tests/snapshots/images and security gates. Only a separately authorized squash merge followed by fresh main success can precede final tracked 00-K closure reconciliation. Do not rerun until random UUIDs happen to pass, extend timeouts or waive tests.

Applied rules: CORE-040/041/043/044/045/046, OB-001/003/004/005/007, SE-045, API-063, TS-024/026/060/063, ADR-001 and Playbook review/closure requirements. Cross-tenant runtime remains N/A only because no tenant-capable domain surface exists. No new policy exception, production DR claim or Stage 00-L/01 work.
