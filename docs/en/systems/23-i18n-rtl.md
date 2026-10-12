# 23 — i18n / RTL / Localization

> **Rule prefix:** `IL-` · **Status:** Binding · **Owner:** Frontend
> **Governing document:** [`../00-PROJECT-RULES.md`](../00-PROJECT-RULES.md) · **العربية:** [`../../ar/systems/23-i18n-rtl.md`](../../ar/systems/23-i18n-rtl.md)

---

## 0. Why this is its own system

This is an **Arabic-first**, multilingual product. Arabic is not "an extra language added later" — it is **the primary language for most users**, and RTL is a core assumption rather than an exception.

**Governing rule:** RTL is **an architectural decision from day one**, not a set of fixes applied after complaints.

> **Why:** Adding RTL later means revisiting every component, every CSS file, every icon, and every layout in the product. The cost today is near zero; the cost in a year is rebuilding the entire presentation layer.

---

## 1. Two entirely separate levels

**`IL-001` (MUST):** A strict distinction between:

| | Dashboard language | Published site language |
|---|---|---|
| Who sets it | The user (site owner) | The site's own setting |
| Affects | The dashboard and editor UI | The site visitors see |
| Independent? | **Completely** | **Completely** |

**`IL-002` (MUST):** A user can run an English dashboard to build an Arabic site, and vice versa. Coupling the two is **forbidden**.

> **Why:** A designer or agency may prefer an English interface while building Arabic sites for their clients. Coupling makes the product unusable for that entire segment.

**`IL-003` (MUST):** The editor preview reflects **the site's** language and direction, not the dashboard's (`VE-014`).

---

## 2. Direction

**`IL-010` (MUST):** Direction comes from **primitives**, not patches (`FE-060`). The decision is made in the base layout layer.

**`IL-011` (MUST):** **Logical CSS properties exclusively**:

| ❌ Forbidden | ✅ Required |
|---|---|
| `margin-left` / `margin-right` | `margin-inline-start` / `margin-inline-end` |
| `padding-left` / `padding-right` | `padding-inline-start` / `padding-inline-end` |
| `left` / `right` | `inset-inline-start` / `inset-inline-end` |
| `text-align: left` | `text-align: start` |
| `border-left` | `border-inline-start` |
| `float: left` | `float: inline-start` |

**`IL-012` (MUST):** `dir` and `lang` are correctly set on the root element, in both the dashboard and published sites.

**`IL-013` (MUST):** Icons:

| Kind | Behaviour in RTL | Examples |
|---|---|---|
| **Directional** | **Mirrored** | Arrow, back/forward, undo/redo, sort |
| **Non-directional** | **Not mirrored** | Search, settings, user, delete, mail |
| **Fixed meaning** | **Not mirrored** | Logos, brand marks, clock, play |

> **Why the detail:** blindly mirroring every icon produces a strange interface (a reversed clock, an inverted logo). Doing the opposite produces arrows pointing the wrong way. The rule needs discrimination, not a blind mechanism.

**`IL-014` (MUST):** Tables, lists, and navigation mirror fully, including column order and button positions.

**`IL-015` (MUST):** Mixed content (Arabic text containing English words, numbers, or links) renders correctly. Direction isolation (`<bdi>` or equivalent) is used where needed.

> **Why:** Without isolation, a heading like "شركة ABC للتسويق" can render in a scrambled order — a defect that appears on real customers' sites.

---

## 3. Translation

**`IL-020` (MUST NOT):** Hardcoded text in a component is **forbidden** (`CORE-069`). Every user-facing string goes through the translation layer.

**`IL-021` (MUST):** Translation keys are **hierarchical and descriptive**:

```
editor.sections.hero.addButton
billing.plan.limitReached.title
errors.domain.notVerified
```

**`IL-022` (MUST NOT):** Never build a sentence by concatenating translated fragments:

```ts
// ❌ Wrong: word order differs fundamentally between languages
t('you.have') + ' ' + count + ' ' + t('websites')

// ✅ Correct: the full sentence with its variables
t('websites.count', { count })
```

**`IL-023` (MUST):** Pluralization goes through the translation mechanism. **Arabic has six plural forms** (zero, one, two, few, many, other) — `if (n === 1)` cannot handle it.

**`IL-024` (MUST):** Dates, numbers, currencies, and durations are formatted with `Intl`, never by hand.

**`IL-025` (MUST):** Numerals in the Arabic interface follow a documented preference (Eastern Arabic ٠١٢ or Western 012) — **consistent across the whole product**, never left to per-screen judgement.

**`IL-026` (MUST):** Translated text may be **30–50% longer** than English. Layouts accommodate that without breaking or truncating.

**`IL-027` (MUST):** Error messages are translated via `error.code` (`API-022`), never by translating the server's text.

---

## 4. Published sites

**`IL-030` (MUST):** Every site has a `locale` and `direction` stored in `websites`.

**`IL-031` (MUST):** The renderer emits correct `lang` and `dir` on `<html>` (`RP-040`).

**`IL-032` (MUST):** Every section variant works in RTL and LTR without exception, and is tested in both (`CE-054`).

**`IL-033` (MUST):** Templates declare their default locale and direction (`CE-043`).

**`IL-034` (MUST):** AI content is generated in the site's language, and this is validated.

**`IL-035` (MUST):** `hreflang` where more than one language exists for the same content (`RP-044`).

---

## 5. Fonts

**`IL-040` (MUST):** Arabic fonts supporting the full character set, including diacritics, numerals, and marks.

**`IL-041` (MUST):** Font testing with: long Arabic text · mixed text · numerals · symbols · punctuation.

**`IL-042` (MUST):** `font-display: swap` and preloading for critical fonts (`FE-072`).

**`IL-043` (MUST):** `line-height` appropriate for Arabic — **Arabic needs more than Latin** because of its dots and extenders.

**`IL-044` (MUST):** Fonts are loaded as subsets to reduce size, verifying no used character is lost.

---

## 6. Anti-patterns

| # | Pattern | Why it is dangerous |
|---|---|---|
| 1 | `margin-left` instead of logical | Broken layout in RTL |
| 2 | Coupling dashboard and site language | Loses an entire user segment |
| 3 | Hardcoded text in a component | Cannot be translated |
| 4 | Building sentences by concatenation | Wrong word order in Arabic |
| 5 | `if (n === 1)` for plurals | Arabic has six forms |
| 6 | Hand-formatting dates | Calendar and format errors |
| 7 | Blindly mirroring every icon | Inverted clocks and logos |
| 8 | Not mirroring directional icons | Arrows pointing the wrong way |
| 9 | Fixed-width layouts | Break with longer text |
| 10 | No isolation for mixed content | Scrambled order on real sites |
| 11 | Latin line-height for Arabic | Cramped, hard-to-read text |
| 12 | A font without full Arabic coverage | Empty boxes on customers' sites |
| 13 | Testing in LTR only | Every RTL break is found by the customer |
| 14 | RTL as a later fix | Rebuilding the whole presentation layer |

---

## 7. Required tests

**`IL-050` (MUST):** Every screen and every variant tested in **RTL and LTR** (`CE-072`, `FE-093`).

**`IL-051` (MUST):** Long text test: a translation 50% longer → no breakage and no truncation.

**`IL-052` (MUST):** Mixed content test: Arabic + English + numerals + links → correct ordering.

**`IL-053` (MUST):** Translation completeness test: **no missing key** in any supported language — the build fails on a gap.

**`IL-054` (MUST):** Pluralization test: all six Arabic plural forms correct.

**`IL-055` (MUST):** Fixtures always include Arabic and English (`TS-027`).

**`IL-056` (MUST):** Independence test: English dashboard + Arabic site → both correct.

---

## 8. Definition of Done — i18n & RTL

- [ ] No hardcoded text — everything through the translation layer.
- [ ] Translation keys hierarchical and descriptive.
- [ ] No sentences built by concatenation.
- [ ] Pluralization through the translation mechanism (six Arabic forms).
- [ ] Dates, numbers, and currencies via `Intl`.
- [ ] Logical CSS properties exclusively.
- [ ] `dir` and `lang` correct at the root.
- [ ] Directional icons mirrored; others not.
- [ ] Correct isolation for mixed content.
- [ ] Layouts accommodate 50% longer text.
- [ ] Line height appropriate for Arabic.
- [ ] The font covers every character used.
- [ ] Dashboard and site language are independent.
- [ ] Preview reflects the site's direction.
- [ ] Tested in RTL and LTR.
- [ ] No missing translation keys.

---

## 9. What requires an ADR

- Adding a third product language.
- Supporting multiple languages **for the same site** (multilingual content).
- Changing the translation library.
- Changing the Arabic numeral preference.
- Adding another RTL language with different rules.

---

## 10. Cross-references

[`03-content-engine.md`](03-content-engine.md) section variants · [`04-visual-editor.md`](04-visual-editor.md) preview · [`05-ai-generation.md`](05-ai-generation.md) generation language · [`06-renderer-publishing.md`](06-renderer-publishing.md) `lang`/`dir`/`hreflang` · [`15-api-standards.md`](15-api-standards.md) error codes · [`16-frontend-standards.md`](16-frontend-standards.md) · [`22-testing.md`](22-testing.md)
