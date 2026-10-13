# 03 — Section / Template / Theme Engine

> **Rule prefix:** `CE-` · **Status:** Binding · **Owner:** Full-stack
> **Governing document:** [`../00-PROJECT-RULES.md`](../00-PROJECT-RULES.md) · **العربية:** [`../../ar/systems/03-content-engine.md`](../../ar/systems/03-content-engine.md)
> **Implements principle:** `CORE-011` (Content ≠ Presentation)

---

## 0. Purpose and scope

This is **the heart of the product**. How well this system is designed sets the ceiling on what the product can offer, how fast new templates ship, and what it costs to maintain over years.

The governing principle in one sentence: **content is data, design is a separate choice, and neither knows the other's internals.**

```
Section Type   →  what is this block, functionally?   (hero, services, contact)
Variant        →  what does it look like?             (hero-07)
Data           →  what is the actual content?         (title, text, image)
Theme Tokens   →  what is the site's visual identity? (colors, fonts, radii)
Template       →  which section composition fits this business?
```

---

## 1. The section contract

### 1.1 Canonical shape

```json
{
  "id": "sec_01J...",
  "type": "hero",
  "variant": "hero-07",
  "schemaVersion": 1,
  "data": {
    "title": "Mohamed Ahmed",
    "subtitle": "Performance Marketing Specialist",
    "cta": { "label": "Contact me", "href": "#contact" },
    "image": { "assetId": "ast_01J...", "alt": "Portrait" }
  },
  "settings": {
    "visibility": { "mobile": true, "desktop": true },
    "spacing": "default",
    "background": "surface"
  }
}
```

### 1.2 Core rules

**`CE-001` (MUST):** Every section has `type`, `variant`, `schemaVersion`, `data`, and `settings`. No section exists without all of them.

**`CE-002` (MUST NOT):** **Never store raw HTML** in `data` — not from the AI, not from the editor, not from any source. This is `CORE-011`, and it is non-negotiable.

> **Why:** Raw HTML means: (a) a permanent XSS hole, (b) design changes become impossible, (c) translation becomes impossible, (d) content reuse becomes impossible, (e) variant switching becomes impossible. The whole product loses its value.

**`CE-003` (MUST):** Simple text fields are plain text. Rich text — where it exists — is stored in a structured representation (portable text / AST), never HTML, and converted at render time with sanitization.

**`CE-004` (MUST):** **A variant never changes the shape of the data.**

> This is the single most important rule in this file. Every `hero` variant consumes exactly the **same** `HeroData`. Switching from `hero-03` to `hero-07` **must work instantly, with no data loss and no migration**.

```ts
// ✅ Correct: one schema per type; variants differ only visually
type HeroData = {
  title: string;
  subtitle?: string;
  cta?: CtaLink;
  image?: AssetRef;
};
// hero-01 ... hero-12 all consume HeroData

// ❌ Wrong: a variant with its own fields
type Hero07Data = { title: string; badgeText: string; };  // forbidden
```

**`CE-005` (MUST):** If a variant needs a field that does not exist, there are **only two** options:
1. Add the field as **optional** to the whole type's schema (variants that don't use it ignore it).
2. Create a **new section type**.

The third option — variant-specific fields — is forbidden.

**`CE-006` (MUST):** Images are referenced by `assetId`, never by direct URL. The final URL is resolved at render time.

> **Why:** Direct URLs break when the CDN changes, cannot serve a device-appropriate optimised variant, and do not update when the image is reprocessed.

**`CE-007` (MUST):** Every external link in `data` is validated: protocol from an allowlist (`https`, `mailto`, `tel`, `#anchor`) only. `javascript:` and `data:` are **absolutely forbidden**.

---

## 2. Schemas and the source of truth

**`CE-010` (MUST):** Every section type has one schema defined in `packages/schemas/sections/<type>.ts` using Zod, and it is the **single source of truth** for that type.

```ts
// packages/schemas/sections/hero.ts
export const heroDataV1 = z.object({
  title: z.string().min(1).max(120),
  subtitle: z.string().max(240).optional(),
  cta: ctaLinkSchema.optional(),
  image: assetRefSchema.optional(),
}).strict();

export const heroVariants = ['hero-01','hero-02','hero-07'] as const;

export const heroSection = z.object({
  type: z.literal('hero'),
  variant: z.enum(heroVariants),
  schemaVersion: z.literal(1),
  data: heroDataV1,
  settings: sectionSettingsSchema,
});
```

**`CE-011` (MUST):** The schema is used **everywhere**: validating AI output, validating editor saves, TypeScript types for components, and API doc generation. Redefining the same shape elsewhere is forbidden (`CORE-022`).

**`CE-012` (MUST):** Every schema uses `.strict()` — unknown fields are **rejected**, never silently passed through.

> **Why:** Today's extra field is tomorrow's corrupt data, and may be an injection attempt.

**`CE-013` (MUST):** Every text field has a **maximum length**. An unbounded field is a denial-of-service vector and a layout breaker.

**`CE-014` (MUST):** Any section data written to the database **passes validation first**, whatever its source — AI, editor, import, or template.

---

## 3. Schema versioning

**`CE-020` (MUST):** `schemaVersion` is an integer starting at `1`, incremented **only** on a breaking change to the data shape.

**`CE-021` (MUST):** Adding an **optional** field is not breaking and does not bump the version.

**`CE-022` (MUST):** A breaking change (removing a field, changing its type, making an optional field required) requires:
1. A new `schemaVersion`.
2. An **upgrade function** `migrateHeroV1ToV2(data)` in `packages/schemas`.
3. Retaining the ability to **read** the old version for a documented transition period.

**`CE-023` (MUST):** The renderer **MUST** know how to display every version still present in the database. Never ship a change that makes published sites unrenderable.

**`CE-024` (MUST):** Upgrading old data happens in a **batched background job** — never as an immediate bulk update, and never on read in a hot path.

---

## 4. Theme tokens

### 4.1 Shape

```json
{
  "colors": {
    "primary": "#111827",
    "accent": "#2563EB",
    "background": "#FFFFFF",
    "surface": "#F9FAFB",
    "text": "#111827",
    "textMuted": "#6B7280",
    "border": "#E5E7EB"
  },
  "typography": {
    "heading": "Alexandria",
    "body": "Tajawal",
    "scale": "default"
  },
  "radius": { "sm": 8, "md": 16, "lg": 24 },
  "layout": { "container": 1200, "sectionGap": 96 }
}
```

### 4.2 Rules

**`CE-030` (MUST):** Components read **tokens only**. No color, font, or size is written directly inside a section component.

```tsx
// ❌ Forbidden
<h1 className="text-[#2563EB] font-[Tajawal]">

// ✅ Correct
<h1 className="text-accent font-body">
```

**`CE-031` (MUST):** Tokens are applied as **CSS custom properties** at the published site's root, so changing the entire visual identity requires no rebuild.

**`CE-032` (MUST):** The token set is **closed and documented**. Adding a new token means updating all five themes and verifying no variant breaks.

**`CE-033` (MUST):** Every stock theme **MUST** meet sufficient contrast (WCAG AA: 4.5:1 for body text) between `text` and `background`, and between `primary` and its background. This is tested automatically.

**`CE-034` (SHOULD):** Section-level overrides come from a **closed set** (alternate background, larger spacing), never arbitrary CSS freedom.

> **Why:** Full freedom means every site becomes a special case, making it impossible to improve the product or change the identity later.

---

## 5. Templates and blueprints

```json
{
  "category": "media_buyer",
  "schemaVersion": 1,
  "locale": "ar",
  "sections": [
    { "type": "hero",         "variant": "hero-07" },
    { "type": "stats",        "variant": "stats-03" },
    { "type": "case_studies", "variant": "case-study-04" },
    { "type": "services",     "variant": "services-06" },
    { "type": "contact",      "variant": "contact-02" }
  ],
  "defaultTheme": "midnight"
}
```

**`CE-040` (MUST):** A template defines **composition and variants only**. Content comes from the AI or from separately defined defaults.

**`CE-041` (MUST):** Every template is validated on load: every `type` exists, and every `variant` is registered for that `type`.

**`CE-042` (MUST):** Templates are **data, not code**. Adding a new template must not require deploying a new application version.

**`CE-043` (MUST):** Every template declares its default locale and direction. See [`23-i18n-rtl.md`](23-i18n-rtl.md).

---

## 6. The section registry

**`CE-050` (MUST):** There is **one central registry** mapping `type` and `variant` to component and schema:

```ts
// packages/site-sections/registry.ts
export const sectionRegistry = {
  hero: {
    schema: heroSection,
    variants: {
      'hero-01': { component: Hero01, preview: '/previews/hero-01.webp' },
      'hero-07': { component: Hero07, preview: '/previews/hero-07.webp' },
    },
  },
} as const satisfies SectionRegistry;
```

**`CE-051` (MUST):** Renderer and editor both read from the **same registry**. Two lists must never exist.

**`CE-052` (MUST):** An unknown `type`/`variant` **must not take down the page**. The renderer skips it silently and logs a warning; the editor shows a removable "unsupported type" state.

> **Why:** A published site must never collapse because of a data error or a version rollback.

**`CE-053` (MUST):** Every variant has a **preview image** in the registry, shown in the editor.

**`CE-054` (MUST):** Every new variant is tested in: Arabic (RTL) and English (LTR) × mobile and desktop × short and long content × with and without an image.

---

## 7. Building section components

**`CE-060` (MUST):** A section component is a **pure rendering function** from `(data, settings, tokens)` to HTML. It must not fetch data, read user context, or know anything about the dashboard.

**`CE-061` (MUST NOT):** No `dangerouslySetInnerHTML` inside any section component except through a centrally documented, approved sanitizer.

**`CE-062` (MUST):** Every component degrades safely with missing optional fields: no image, no button, very short text, very long text. **No crash and no broken layout.**

**`CE-063` (MUST):** Semantic HTML: `<section>`, correctly ordered `<h1>`–`<h6>`, `<nav>`, and `<button>` vs `<a>` according to function. See [`16-frontend-standards.md`](16-frontend-standards.md).

**`CE-064` (MUST):** Every image has an `alt` (sourced from `data`) and explicit dimensions or `aspect-ratio` to prevent layout shift (CLS).

**`CE-065` (MUST NOT):** No client-side JavaScript inside a section component except where functionally required (slider, accordion), and then minimally. Static sections render with no JS.

---

## 8. Anti-patterns

| # | Pattern | Why it is dangerous |
|---|---|---|
| 1 | Raw HTML in `data` | XSS + design changes become impossible |
| 2 | Variant-specific fields | Switching variants loses data |
| 3 | Color/font hardcoded in a component | Breaks consistency; identity can't be changed |
| 4 | Direct image URL instead of `assetId` | Breaks on CDN change; no image optimisation |
| 5 | Schema without `.strict()` | Extra fields become corrupt data |
| 6 | Text field with no max length | DoS and broken layout |
| 7 | Editor variant list separate from the registry | Editor offers what the renderer can't render |
| 8 | Unknown `type` taking down the page | A customer site collapses on a data error |
| 9 | Section component fetching data | Breaks caching, performance, and isolation |
| 10 | Schema upgrade on read | Hot-path load plus unpredictable behaviour |

---

## 9. Required tests

**`CE-070` (MUST):** Per section type: a schema test accepting valid input and rejecting (missing field, wrong type, extra field, over-length text, `javascript:` link).

**`CE-071` (MUST):** **Variant interchange test** — mandatory per type:

```ts
it('every variant renders the same data without loss', () => {
  const data = validHeroFixture();
  for (const variant of heroVariants) {
    const html = renderSection({ type: 'hero', variant, data, settings });
    expect(html).toContain(data.title);     // no content loss
    expect(() => heroSection.parse({ type:'hero', variant, data, ... })).not.toThrow();
  }
});
```

**`CE-072` (MUST):** Visual regression test per variant across RTL/LTR × mobile/desktop.

**`CE-073` (MUST):** "Minimal fields" test: every variant renders with the least possible data (required fields only) without breaking.

**`CE-074` (MUST):** XSS test: content containing `<script>`, `javascript:`, and `onerror=` is rejected at validation or sanitized at render — and never executes.

**`CE-075` (MUST):** Automated contrast test for every stock theme (`CE-033`).

---

## 10. Definition of Done — content engine

When adding a **new section type**:
- [ ] Schema in `packages/schemas/sections/` with `.strict()` and length limits.
- [ ] Registered in `sectionRegistry` with all variants.
- [ ] Preview image for each variant.
- [ ] All variants consume the same data schema (`CE-004`).
- [ ] Variant interchange test passes.
- [ ] Minimal-fields test passes.
- [ ] Visual regression test in RTL and LTR.
- [ ] No hardcoded colors/fonts — tokens only.
- [ ] Images by `assetId` with `alt` and dimensions.
- [ ] Semantic HTML passing basic accessibility checks.
- [ ] Documented in the section catalogue.

When adding a **variant to an existing type**:
- [ ] No new required fields (`CE-005`).
- [ ] Registered + preview image.
- [ ] Visual test + minimal-fields test.

When **changing an existing schema**:
- [ ] Is the change breaking? If so: new `schemaVersion` + upgrade function.
- [ ] The renderer reads both versions.
- [ ] A batched upgrade job is scheduled.
- [ ] No published site becomes unrenderable.

---

## 11. What requires an ADR

- Allowing user-supplied HTML, CSS, or JS.
- Changing the rich-text representation.
- Allowing variant-specific fields (violating `CE-004`).
- Changing the schema versioning mechanism.
- Moving section definitions out of `packages/schemas`.

---

## 12. Cross-references

[`02-data-model.md`](02-data-model.md) JSONB storage · [`04-visual-editor.md`](04-visual-editor.md) editing UI · [`05-ai-generation.md`](05-ai-generation.md) validating AI output · [`06-renderer-publishing.md`](06-renderer-publishing.md) rendering · [`08-assets-media.md`](08-assets-media.md) images · [`14-security.md`](14-security.md) XSS · [`23-i18n-rtl.md`](23-i18n-rtl.md) RTL
