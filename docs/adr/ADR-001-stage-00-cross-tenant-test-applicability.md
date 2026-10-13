# ADR-001: Cross-tenant runtime tests are not applicable to the domain-free Stage 00

> Created using `docs/en/adr/ADR-TEMPLATE.md`.
> This records the project owner's approved Decision 3 of 2026-09-30. It does not authorize Stage 00 implementation.

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-09-30 |
| **Owners** | Project owner (user) |
| **Reviewers** | Project owner approved the decision in the task instruction; no independent code review is claimed |
| **Systems affected** | `01-multi-tenancy`, `14-security`, `18-infrastructure-cicd`, `22-testing` |
| **Rules affected** | Applicability of `MT-001`, `MT-060`, `TS-010`, `TS-011`, `TS-061`, and the cross-tenant portions of `SE-080` and `IN-030`; `CORE-010` remains unchanged |

## Context

The repository contains documentation only. At this decision there are zero application implementations, zero tenant entities, zero authentication flows, and zero tenant-scoped resources. Stage 00 explicitly excludes the domain model, tenant entity, and authentication.

A meaningful runtime cross-tenant test requires two distinct trusted tenant contexts and an implemented resource or boundary whose ownership can be enforced and attacked. These do not exist in Stage 00. Fabricating a tenant or implementing authentication early would expand the approved scope; a passing placeholder would provide no evidence of isolation.

`22-testing` section 11 requires an ADR when a test category is excepted. This record makes the limited applicability explicit instead of silently skipping `TS-010` or `TS-011`.

## Decision

1. Multi-tenancy and tenant isolation remain binding architecture requirements from day one under `CORE-010`. This ADR does not authorize unscoped access, a different tenancy model, or a security bypass.
2. Cross-tenant runtime tests are **N/A in Stage 00 only**, because it has no tenant-capable domain surface. Reports must state this reason and reference ADR-001. N/A is not PASS, a disabled test, or evidence of proven runtime isolation.
3. Do not create fake tenants, premature authentication, fake cross-tenant tests, or an empty passing suite. Do not use `skip` to conceal the applicability decision.
4. The **first tenant-capable code in Stage 01**, including the authentication and tenant boundary, must arrive with a real cross-tenant suite. Do not wait for Website, Lead, or Asset stages when Organization or membership already provides a testable boundary.
5. **No tenant-scoped resource in Stage 01 or any later stage may merge without negative cross-tenant tests** for its implemented operations. The tests must exercise actual ownership enforcement using distinct tenant contexts and verify rejection and non-leakage.
6. Stage 00's N/A ceases to apply if a tenant-capable surface is introduced. Such an addition first requires explicit stage-scope approval and must include its isolation tests in the same change. This is not permission to add that surface now.
7. All other applicable tests and security checks remain required. This ADR does not exempt authentication tests once authentication exists, or any other CI category.

## Alternatives considered

| Alternative | Why it was rejected |
|---|---|
| Implement tenants and authentication in Stage 00 | Violates the approved foundation-only scope and starts Stage 01 early. |
| Add fake resources, mock-only ownership assertions, or an empty passing suite | Does not prove runtime isolation and misrepresents coverage. |
| Disable cross-tenant checks silently | Hides the applicability decision and violates testing governance. |
| Postpone tenant isolation itself | Violates `CORE-010`; architecture remains tenant-aware from day one. |
| **Doing nothing** | Leaves the unconditional testing wording in conflict with Stage 00's absent domain surface. |

## Consequences

**Positive**

- Stage 00 stays minimal and its evidence remains honest.
- The first real tenant boundary must ship with its negative tests.
- Existing and future tenant-scoped resources receive no permanent exemption.

**Negative**

- Stage 00 cannot demonstrate runtime tenant isolation; its closure must state that limitation.
- Reviews must distinguish an absent domain surface from an implemented but untested one.

**What becomes harder after this decision**

- Stage 01's first change must include realistic tenant fixtures and negative tests rather than deferring them to later resource stages.

## Impact on binding rules

- [x] It violates nothing in `docs/en/00-PROJECT-RULES.md`; `CORE-010` remains binding without exception.
- [x] It records a narrowly approved Stage 00 applicability exception to the otherwise unconditional runtime suite requirements in `MT-060`, `TS-010`, `TS-011`, `TS-061`, and the cross-tenant portions of `IN-030` and `SE-080`.

`MT-001` continues to govern the architecture from day one; the domain-free Stage 00 is not required to fabricate the later tenant entity. English and Arabic system documents and the directly affected root rules reference this ADR. No other requirement is relaxed.

## Migration and rollback plan

**Migration**

1. Link this decision beside the affected rules in English and Arabic.
2. Record cross-tenant runtime results as N/A with the absent-surface rationale during Stage 00 review and closure.
3. Require actual cross-tenant tests alongside the first tenant-capable implementation in Stage 01; no database or application migration is performed by this documentation change.

**Rollback**

Supersede this accepted record through a new approved ADR and update the affected references. Do not edit the accepted decision to hide its history (`CORE-091`). There is no runtime state or customer data to roll back. Later discovery of an implemented but untested boundary blocks merge or stage closure; it cannot be covered retroactively by Stage 00's N/A.

## How we will know it was the right call

| Metric | Current value | Expected value | Review date |
|---|---|---|---|
| Tenant-capable runtime surfaces in Stage 00 | 0 | 0 | Every Stage 00 review and closure; calendar date not yet scheduled |
| Fake or silently skipped cross-tenant tests | 0 (no code) | 0 | Every Stage 00 review |
| Negative cross-tenant coverage at first tenant-capable change | N/A (not implemented) | Real suite accompanies the change | First Stage 01 tenant-capable PR, before merge |
| Tenant-scoped resources merged without negative cross-tenant tests | N/A (no resources) | 0 | Every applicable Stage 01+ PR |

## Notes

This decision is limited to Stage 00 and does not expire by permitting untested code in a later stage. It does not approve dependencies, database schemas, APIs, or the start of implementation. An accepted ADR is immutable except for the supersession marker required by `CORE-091`.
