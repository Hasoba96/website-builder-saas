# 16 — Frontend Engineering Standards

> **Rule prefix:** `FE-` · **Status:** Binding · **Owner:** Frontend
> **Governing document:** [`../00-PROJECT-RULES.md`](../00-PROJECT-RULES.md) · **العربية:** [`../../ar/systems/16-frontend-standards.md`](../../ar/systems/16-frontend-standards.md)

---

## 0. Two separate visual worlds

| | Dashboard | Site components |
|---|---|---|
| Package | `packages/ui-dashboard` | `packages/site-sections` |
| Consumed by | `apps/dashboard-web` | `apps/public-renderer` + editor preview |
| Audience | A logged-in user working daily | An anonymous visitor passing once |
| Priority | Information density and efficiency | Load speed and beauty |
| Styling | Internal design system | Per-site theme tokens |

**`FE-001` (MUST NOT):** No imports between the two packages, in either direction (`CORE-021`).

> **Why:** Mixing them means a dashboard improvement can change the appearance of published customer sites — or that dashboard code ships to every site's visitors.

---

## 1. TypeScript

**`FE-010` (MUST):** `strict: true` in every package. Partial disabling is forbidden.

**`FE-011` (MUST NOT):** `any` is forbidden (`CORE-031`), and `@ts-ignore` is forbidden (`CORE-032`).

**`FE-012` (MUST):** API types are derived from `packages/schemas`, never hand-written in the frontend.

> **Why:** A hand-written type drifts from the backend silently, so the UI breaks in production with no build error at all.

**`FE-013` (MUST):** Props types are explicit and named `<ComponentName>Props`.

---

## 2. State

**`FE-020` (MUST):** A clear separation between three kinds of state:

| Kind | The right tool |
|---|---|
| Server state (API data) | A data-fetching layer with cache and invalidation |
| UI state (modals, tabs, selection) | Local component state |
| Form state | A form library with schema validation |

**`FE-021` (MUST NOT):** Never copy server data into a global store and synchronise it by hand. This is an inexhaustible source of stale-data bugs.

**`FE-022` (MUST):** Fetching, caching, and invalidation go through **one unified layer** across the application.

**`FE-023` (MUST):** Excessive prop drilling is solved with context or better composition — not by putting everything in a global store.

**`FE-024` (MUST):** Editor state is explicitly documented (`VE-001`).

---

## 3. Mandatory UI states

**`FE-030` (MUST):** Every primary screen handles **four states** — not one:

| State | Required |
|---|---|
| **Loading** | A skeleton or clear indicator, with no layout shift |
| **Empty** | An explanation plus a suggested action, never a blank page |
| **Error** | A comprehensible reason + retry + a route to support |
| **Success** | The content |

**`FE-031` (MUST):** Error boundaries on every main route. An error in one component **must not white-screen** the whole application.

**`FE-032` (MUST):** Server errors are translated into comprehensible messages via `error.code` (`API-022`), never by displaying the raw server message.

**`FE-033` (MUST):** Every state-changing action gives **clear confirmation**: success or failure. Silence after a click is the worst possible response.

**`FE-034` (MUST):** Destructive actions (deleting a site, deleting an account) require explicit confirmation stating **exactly what will be deleted**, not "are you sure?".

---

## 4. Authorization in the UI

**`FE-040` (MUST NOT):** **The UI does not enforce permissions** (`CORE-004`). It displays them and improves the experience only.

**`FE-041` (MUST):** What the plan does not allow is shown disabled **with a reason and an upgrade path** — never hidden, never silently failing (`VE-060`).

**`FE-042` (MUST):** The UI handles a `403` from the server gracefully even when it believed the action was permitted. The server is the authority.

---

## 5. Accessibility

**`FE-050` (MUST):** Semantic HTML: `<button>` for actions, `<a>` for navigation, `<h1>`–`<h6>` in logical order, `<nav>`, `<main>`, `<footer>`.

**`FE-051` (MUST):** Every interactive element is **keyboard reachable**, with a visible focus indicator.

**`FE-052` (MUST):** Every form field has a properly associated `<label>`. A `placeholder` is **not** a substitute for a label.

**`FE-053` (MUST):** Colour contrast meets WCAG AA (4.5:1 for body text, 3:1 for large text) — in the dashboard and in every stock theme (`CE-033`).

**`FE-054` (MUST):** Modals trap focus, close on `Escape`, and return focus to the trigger.

**`FE-055` (MUST):** Every image has appropriate `alt` (`CE-064`); decorative images use `alt=""`.

**`FE-056` (MUST NOT):** Never rely on colour alone to convey information.

---

## 6. RTL / LTR

**`FE-060` (MUST):** Direction comes from **primitives**, not scattered patches (`IL-`). See [`23-i18n-rtl.md`](23-i18n-rtl.md).

**`FE-061` (MUST):** Always use logical CSS properties:

```css
/* ❌ Forbidden */  margin-left: 16px;  padding-right: 8px;  text-align: left;
/* ✅ Correct */    margin-inline-start: 16px;  padding-inline-end: 8px;  text-align: start;
```

**`FE-062` (MUST):** Directional icons (arrows, back, forward) mirror in RTL; non-directional ones (search, settings) do not.

**`FE-063` (MUST):** Every screen is tested in RTL and LTR before merge.

---

## 7. Performance

**`FE-070` (MUST):** Published sites are **as light as possible**: no unnecessary JavaScript, no heavy libraries, no superfluous fonts.

> **Why:** The customer's visitor is on a slow mobile connection. Every extra kilobyte reduces the chance of converting them — which harms our customer directly.

**`FE-071` (MUST):** Images carry explicit dimensions or `aspect-ratio` to prevent layout shift (CLS).

**`FE-072` (MUST):** Fonts: a limited set, `font-display: swap`, and preloading for the critical ones.

**`FE-073` (MUST):** Route-level code splitting in the dashboard.

**`FE-074` (MUST):** A bundle size budget monitored in CI. Exceeding it fails the build or raises an explicit warning.

**`FE-075` (MUST NOT):** Never add a heavy library for a simple problem (`CORE-002`).

---

## 8. Forms

**`FE-080` (MUST):** Client-side validation against the **same schema** as the server (`packages/schemas`) — a better experience, never a substitute for server validation.

**`FE-081` (MUST):** Field errors are shown **beside the field**, not in a general list at the top of the page.

**`FE-082` (MUST):** Double-submit protection: disable the button while submitting plus duplicate prevention.

**`FE-083` (MUST):** The submitting state is visible, and failure never loses what the user typed.

---

## 9. Anti-patterns

| # | Pattern | Why it is dangerous |
|---|---|---|
| 1 | Imports between the two UI packages | Dashboard code ships to visitors |
| 2 | Hand-written API types | Silent drift breaks production |
| 3 | Copying server data into a global store | Chronic stale data |
| 4 | A screen with no error or empty state | A broken experience |
| 5 | No error boundary | A white screen from one error |
| 6 | Displaying the raw server message | Incomprehensible text or leakage |
| 7 | Hiding a button as authorization | The API is exposed |
| 8 | `<div onClick>` instead of `<button>` | Unreachable by keyboard |
| 9 | `placeholder` instead of `label` | Disappears on typing; unreadable to screen readers |
| 10 | `margin-left` instead of logical | Broken layout in RTL |
| 11 | Images without dimensions | Layout shift harms UX and SEO |
| 12 | A heavy library in a published site | Slow load means fewer conversions |
| 13 | No double-submit protection | Duplicate leads or operations |
| 14 | "Are you sure?" with no detail | Accidental deletion |

---

## 10. Required tests

**`FE-090` (MUST):** A test per primary screen across its four states.

**`FE-091` (MUST):** Automated accessibility testing (axe or equivalent) on every main screen in CI.

**`FE-092` (MUST):** Keyboard navigation tests for critical paths.

**`FE-093` (MUST):** Visual regression tests in RTL and LTR at multiple breakpoints.

**`FE-094` (MUST):** Bundle budget test in CI.

**`FE-095` (MUST):** `403` handling test: the UI neither crashes nor shows a technical error.

---

## 11. Definition of Done — frontend

- [ ] `strict: true`, no `any`, no `@ts-ignore`.
- [ ] API types from `packages/schemas`.
- [ ] No imports between the two UI packages.
- [ ] Server state via the unified fetching layer.
- [ ] All four states handled.
- [ ] Error boundary on the route.
- [ ] Errors translated via `error.code`.
- [ ] Destructive actions confirmed with specifics.
- [ ] Limits shown with a reason and an upgrade path.
- [ ] Semantic HTML + full keyboard navigation + visible focus.
- [ ] A `label` per field, and WCAG AA contrast.
- [ ] Logical CSS properties only.
- [ ] Tested in RTL and LTR.
- [ ] Images sized; fonts limited with `swap`.
- [ ] Bundle budget within limits.
- [ ] Double-submit protection.
- [ ] Automated accessibility test green.

---

## 12. What requires an ADR

- Changing the framework or the core state library.
- Adding a heavy UI library.
- Changing the dashboard's rendering strategy.
- Merging the two UI packages.
- Relaxing any accessibility requirement.

---

## 13. Cross-references

[`03-content-engine.md`](03-content-engine.md) section components · [`04-visual-editor.md`](04-visual-editor.md) · [`06-renderer-publishing.md`](06-renderer-publishing.md) · [`11-billing-entitlements.md`](11-billing-entitlements.md) · [`15-api-standards.md`](15-api-standards.md) · [`20-performance-caching.md`](20-performance-caching.md) · [`23-i18n-rtl.md`](23-i18n-rtl.md)
