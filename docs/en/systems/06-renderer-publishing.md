# 06 — Website Renderer & Publishing

> **Rule prefix:** `RP-` · **Status:** Binding · **Owner:** Full-stack
> **Governing document:** [`../00-PROJECT-RULES.md`](../00-PROJECT-RULES.md) · **العربية:** [`../../ar/systems/06-renderer-publishing.md`](../../ar/systems/06-renderer-publishing.md)

---

## 0. Purpose and scope

This system determines **what the world sees**. Any error here is visible directly to visitors of our customers' sites — not in an internal dashboard.

**Governing rule:** draft and published are **two entirely separate worlds**. The editor writes to the first; visitors read from the second; and the only bridge between them is the explicit publish operation.

---

## 1. The revision model

```
Editor ──► Draft Revision ──[Publish]──► Immutable Published Revision ──► Renderer ──► Visitor
             (mutable)                        (never changes)
```

**`RP-001` (MUST):** Each site has **one mutable draft revision** and a **series of immutable published revisions**.

**`RP-002` (MUST NOT):** **A published revision is never modified after creation.** Any change produces a new revision with a higher version number.

> **Why:** If the published revision were mutable, half-finished edits would appear to visitors during editing — meaning a customer could show their site to their own client while it is broken.

**`RP-003` (MUST):** `websites.published_revision_id` points to the currently live revision. **Swapping that pointer is the atomic publish operation.**

**`RP-004` (MUST):** `version` is a monotonically increasing integer per site, never reused.

**`RP-005` (MUST):** A published revision is a **self-contained snapshot**: it contains every page, section, theme, and asset reference needed to render, without reading the draft.

> **Why:** Depending on live tables means a draft edit can leak into the published site — and that rendering one published site takes dozens of queries.

**`RP-006` (MUST):** The snapshot carries a `schemaVersion` per section, so the renderer knows how to display it even after schemas evolve (`CE-023`).

---

## 2. The publish operation

```
POST /api/v1/websites/{websiteId}/publish
Idempotency-Key: 01J...
{ "expectedDraftVersion": 42 }

202 Accepted
{ "jobId": "job_...", "status": "queued" }
```

**`RP-010` (MUST):** Publishing is an **asynchronous operation** returning `202` immediately. The UI polls status.

**`RP-011` (MUST):** Publish accepts `expectedDraftVersion`. If the version differs → `409` (someone else edited meanwhile).

**`RP-012` (MUST):** Publish is **idempotent** via `Idempotency-Key`. Repeating the same request never produces two revisions. See [`15-api-standards.md`](15-api-standards.md).

**`RP-013` (MUST):** Publish steps, in exactly this order:

```
1. Verify permission and entitlement
2. Validate the entire draft (every section against its schema)
3. Check publish rules (home page exists, slugs valid, no broken asset references)
4. Build the snapshot
5. Store the new revision with status "building"
6. Mark it "published" and swap published_revision_id  ← atomic
7. Invalidate cache keys for the affected site only
8. Emit the WebsitePublished event
9. Record in audit_logs
```

**`RP-014` (MUST):** **If any step before 6 fails, the live revision is never replaced.** The current site keeps serving unchanged.

**`RP-015` (MUST):** A publish failure gives the user an **understandable, actionable reason** ("the home page contains a section with missing data: title is required"), never "an error occurred".

**`RP-016` (MUST):** Validation runs on the **entire draft** before publishing, not only on what changed. A half-valid published revision is unacceptable.

---

## 3. Rollback

**`RP-020` (MUST):** Rollback means **re-activating a previous published revision** by swapping the pointer. It is neither an edit nor a deletion.

**`RP-021` (MUST):** Rollback is **instant** and requires no rebuild. This is the entire justification for snapshots.

**`RP-022` (MUST):** The last **N published revisions** are retained (N ≥ 10 in the MVP) before cleanup. See [`21-backup-dr-retention.md`](21-backup-dr-retention.md).

**`RP-023` (MUST):** Rollback **does not modify the draft**. A user may roll back the live site and continue working on their edits.

**`RP-024` (MUST):** Every rollback is recorded in `audit_logs` with the actor and both revisions.

---

## 4. Renderer responsibilities

**`RP-030` (MUST):** The renderer reads the **published revision only** (`MT-051`). No path — no parameter, header, or cookie — makes it serve a draft on a public hostname.

**`RP-031` (MUST):** Draft preview, where it exists, lives on a **completely separate authenticated path**, with `X-Robots-Tag: noindex` and `Cache-Control: no-store`.

**`RP-032` (MUST):** The renderer resolves `hostname → site_id` from the approved domains table, then reads the snapshot. See [`07-domains-ssl.md`](07-domains-ssl.md).

**`RP-033` (MUST):** The renderer selects the component from the registry by `type` + `variant` + `schemaVersion` (`CE-050`).

**`RP-034` (MUST):** An unknown `type`/`variant` is **skipped silently** with a logged warning — it never takes down the page (`CE-052`).

**`RP-035` (MUST NOT):** Published HTML must **never** expose internal identifiers, `organization_id`, a guessable `revisionId`, the owner's email, subscription status, or any administrative data (`MT-052`).

**`RP-036` (MUST):** The renderer **reads no user context and no session**. The visitor is always anonymous.

---

## 5. SEO and metadata

**`RP-040` (MUST):** Every published page emits a unique `<title>`, a `meta description`, a `canonical`, Open Graph tags, and correct `lang` and `dir`.

**`RP-041` (MUST):** `sitemap.xml` and `robots.txt` are generated automatically per published site and reflect the actual pages.

**`RP-042` (MUST):** Unpublished and hidden pages **do not appear** in `sitemap.xml`.

**`RP-043` (MUST):** A site on the **platform subdomain** and its copy on the **custom domain** must not compete in search: once the custom domain is active, either a permanent redirect from the subdomain, or a `canonical` pointing to the custom domain. The choice is uniform and documented.

**`RP-044` (MUST):** `hreflang` is applied where more than one language exists for the same content. See [`23-i18n-rtl.md`](23-i18n-rtl.md).

**`RP-045` (MUST):** An unpublished or disabled site returns `404` or an appropriate status page **with** `noindex`. A search engine must never index a disabled site.

---

## 6. Performance and rendering strategy

**`RP-050` (MUST):** A typical public request is served from the **CDN/edge** or from the renderer with **one snapshot read** — never a query chain per section (`CORE-014`).

**`RP-051` (MUST):** The cache key for a published page is `hostname + path + publishedRevisionId`.

> **Why include `publishedRevisionId`:** invalidation becomes automatic. A new revision is a new key — no precise purge needed, and no risk of serving stale content.

**`RP-052` (MUST):** On publish, invalidation covers the **affected site only**. Global cache purges are forbidden.

**`RP-053` (MUST NOT):** No N+1 in the render path (`CORE-066`).

**`RP-054` (MUST):** The rendering strategy (SSR / ISR / edge / static) is a **measurable, changeable decision**, not dogma. The criteria: site count, change rate, invalidation cost, and the need for dynamic blocks. Changing it requires an ADR.

**`RP-055` (MUST):** No separate static HTML file is built per site in the MVP. That does not scale to hundreds of thousands of sites.

**`RP-056` (MUST):** Assets (images, fonts, CSS) are served from **immutable URLs** with a content hash and a long cache lifetime.

---

## 7. Anti-patterns

| # | Pattern | Why it is dangerous |
|---|---|---|
| 1 | Renderer reading the draft | Half-finished edits visible to visitors |
| 2 | Editing a published revision in place | Loses rollback and exposes partial changes |
| 3 | Publish replacing live before validation | Mid-failure leaves a broken site |
| 4 | Synchronous publish inside the request | Timeouts on large sites |
| 5 | Snapshot referencing live tables | Draft leakage plus query explosion |
| 6 | Cache key without `revisionId` | Stale content after publish |
| 7 | Global cache purge on every publish | Performance collapse across all sites |
| 8 | Internal identifiers in HTML | Information leakage |
| 9 | Indexing a disabled site | Damages the customer's reputation |
| 10 | A draft revision on a public hostname | Leaks unfinished content |
| 11 | Unknown `type` taking down the page | A customer site collapses after a rollback |
| 12 | Vague publish failure message | The customer is stuck with no path forward |

---

## 8. Required tests

**`RP-060` (MUST):** **Draft non-leakage test**: a draft edit does not appear on the public path before publishing. This is a critical test.

**`RP-061` (MUST):** **Publish atomicity test**: simulate a mid-publish failure → the previous live revision keeps serving intact.

**`RP-062` (MUST):** **Idempotency test**: the same `Idempotency-Key` twice produces one revision.

**`RP-063` (MUST):** **Rollback test**: publish twice, then roll back → the site serves the first revision immediately.

**`RP-064` (MUST):** **Backward compatibility test**: a snapshot with an old `schemaVersion` renders successfully after schemas are updated.

**`RP-065` (MUST):** **Non-leakage test**: published HTML contains no `organization_id`, no owner email, and no internal identifier.

**`RP-066` (MUST):** **Performance test**: rendering a published page takes a constant number of queries, independent of section count.

**`RP-067` (MUST):** E2E: create → edit → publish → visit the public domain → confirm the edit appears; then edit without publishing → confirm it does **not** appear.

---

## 9. Definition of Done — renderer & publishing

- [ ] Publish is asynchronous and returns `202` with a `jobId`.
- [ ] `expectedDraftVersion` supported, with `409` on conflict.
- [ ] `Idempotency-Key` supported and tested.
- [ ] Full validation before the snapshot is built.
- [ ] Pointer swap is atomic; a failure before it never touches the live revision.
- [ ] The snapshot is self-contained and carries `schemaVersion`.
- [ ] Invalidation covers the affected site only.
- [ ] Cache key includes `publishedRevisionId`.
- [ ] Rollback is instant and does not touch the draft.
- [ ] The renderer reads published only — no draft path exists.
- [ ] Full SEO: title/description/canonical/OG/sitemap/robots.
- [ ] A disabled site returns `noindex`.
- [ ] No internal identifiers leak.
- [ ] Constant query count per page render.
- [ ] Draft non-leakage test passes.
- [ ] `audit_logs` records every publish and rollback.

---

## 10. What requires an ADR

- Changing the core rendering strategy (SSR ↔ static ↔ edge).
- Allowing any draft read from a public path.
- Changing the revision model (away from snapshots).
- Building separate static files per site.
- Changing the cache invalidation strategy.

---

## 11. Cross-references

[`01-multi-tenancy.md`](01-multi-tenancy.md) public-path isolation · [`03-content-engine.md`](03-content-engine.md) registry and versions · [`04-visual-editor.md`](04-visual-editor.md) drafts · [`07-domains-ssl.md`](07-domains-ssl.md) domain resolution · [`20-performance-caching.md`](20-performance-caching.md) · [`23-i18n-rtl.md`](23-i18n-rtl.md)
