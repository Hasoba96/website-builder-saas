# ADR-NNN: <the decision in one sentence>

> Copy this file to `docs/adr/ADR-NNN-<slug>.md` and edit it.
> **النسخة العربية:** [`../../ar/adr/ADR-TEMPLATE.md`](../../ar/adr/ADR-TEMPLATE.md)

---

| Field | Value |
|---|---|
| **Status** | `Proposed` · `Accepted` · `Superseded by ADR-NNN` · `Rejected` |
| **Date** | YYYY-MM-DD |
| **Owners** | Names |
| **Reviewers** | Names |
| **Systems affected** | e.g. `01-multi-tenancy`, `06-renderer-publishing` |
| **Rules affected** | e.g. `CORE-013`, `MT-030` |

---

## Context

What problem are we solving? What are the constraints? **What measurements drive this decision?**

> This is the most important section. An architectural decision without measurement is a personal preference dressed as engineering.
> Give numbers: how many requests per second? What is current latency? How many sites? What does the current situation cost?

## Decision

What exactly did we decide? Stated explicitly and unambiguously.

## Alternatives considered

| Alternative | Why it was rejected |
|---|---|
| First alternative | … |
| Second alternative | … |
| **Doing nothing** | … ← always list it; sometimes it is the right answer |

## Consequences

**Positive**
- …

**Negative** (be honest — every decision has a price)
- …

**What becomes harder after this decision**
- …

## Impact on binding rules

Does this decision violate a rule in `00-PROJECT-RULES.md` or in a system file?

- [ ] It violates nothing
- [ ] It violates: `<rule ID>` — because: …

> **If it does violate:** the relevant docs file must be updated in the same approval PR, adding a reference to this ADR beside the rule.

## Migration and rollback plan

**Migration**
1. …

**Rollback**
How do we reverse this if it goes badly? And what **cannot** be reversed?

## How we will know it was the right call

Which metrics will we review, and when?

| Metric | Current value | Expected value | Review date |
|---|---|---|---|
| … | … | … | … |

---

## Notes

**`CORE-091`:** An accepted ADR is **never edited**. A new decision gets a new ADR, and the old one is marked `Superseded by ADR-NNN`.
