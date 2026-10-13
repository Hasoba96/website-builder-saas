# 20 — Performance & Caching Strategy

> **Rule prefix:** `PF-` · **Status:** Binding · **Owner:** Full-stack
> **Governing document:** [`../00-PROJECT-RULES.md`](../00-PROJECT-RULES.md) · **العربية:** [`../../ar/systems/20-performance-caching.md`](../../ar/systems/20-performance-caching.md)
> **Implements principle:** `CORE-014` (Edge/cache first)

---

## 0. The governing performance goal

> **A typical public request for a published site must be served from the CDN/edge, or from the renderer with one measured read — never a query chain per section.**

Why this is an existence condition rather than an optimisation: public traffic is **orders of magnitude larger** than dashboard operations. If every visitor hits the database, the product collapses with the first successful customer — meaning **our customer's success becomes the cause of our outage**, the worst possible failure mode.

---

## 1. Cache layers

```
Visitor
  ↓
① CDN / Edge          ← most requests end here
  ↓ (miss)
② Renderer + application cache
  ↓ (miss)
③ Redis  (site config · domain map)
  ↓ (miss)
④ PostgreSQL          ← as few requests as possible reach here
```

**`PF-001` (MUST):** Every layer has an explicitly defined and documented key and invalidation strategy.

**`PF-002` (MUST NOT):** Never rely on TTL expiry alone for data a user edits and expects to see updated immediately (`QJ-051`).

---

## 2. Published site caching

**`PF-010` (MUST):** The cache key for a published page is **`hostname + path + publishedRevisionId`** (`RP-051`).

> **Why include `publishedRevisionId`:** invalidation becomes **automatic and free**. A new revision is a new key. No precise purge is needed, no risk of serving stale content, and no race between publish and invalidation.

**`PF-011` (MUST):** Invalidation on publish covers the **affected site only** (`RP-052`). Global purges are forbidden (`QJ-052`).

**`PF-012` (MUST):** The `hostname → site_id` map is cached with a short-to-medium TTL and explicit invalidation on every change (`DN-051`).

**`PF-013` (MUST):** A cache layer outage **must not take sites down** — fall back to the database with rate limiting and an alert (`DN-053`).

**`PF-014` (MUST):** Stampede protection on hot keys (`QJ-053`).

---

## 3. The hot render path

**`PF-020` (MUST NOT):** **No N+1** in the render path (`CORE-066`). This is the most important rule in this file.

**`PF-021` (MUST):** The query count to render a published page is **constant**, independent of page or section count.

> This is what the self-contained snapshot achieves (`RP-005`): one read brings everything needed.

**`PF-022` (MUST):** Any new hot-path query is reviewed with `EXPLAIN ANALYZE` before merge (`DM-043`).

**`PF-023` (MUST):** The render path **calls no third party** synchronously. No AI, no email, no DNS, nothing external.

> **Why:** A third party's slowness becomes, instantly, slowness on every one of our customers' sites.

**`PF-024` (MUST):** Section components do not fetch data (`CE-060`).

---

## 4. Assets

**`PF-030` (MUST):** Assets use **immutable** URLs with a content hash and a long cache lifetime (`AS-041`).

**`PF-031` (MUST):** Images are sized for their context — never serving the full original in a thumbnail (`AS-031`).

**`PF-032` (MUST):** WebP/AVIF with an appropriate fallback (`AS-032`).

**`PF-033` (MUST):** Fonts: a limited set, `font-display: swap`, preloading the critical ones (`FE-072`).

**`PF-034` (MUST):** Images carry explicit dimensions to prevent layout shift (`CE-064`).

---

## 5. Dashboard caching

**`PF-040` (MUST NOT):** **Never** cache sensitive dashboard data in a way that could mix tenants (`MT-043`).

**`PF-041` (MUST NOT):** No `Cache-Control: public` on any response containing private data.

**`PF-042` (MUST):** Dashboard caching is client-side (the fetching layer) with explicit invalidation after each mutation, never TTL alone.

**`PF-043` (MUST):** Expensive computations (usage, analytics aggregates) are precomputed, never calculated per request (`BE-053`, `AN-044`).

---

## 6. Database

**`PF-050` (MUST):** Indexes start with the scope column (`MT-032`) and are added only for real queries (`DM-023`).

**`PF-051` (MUST):** Every list has a server-enforced maximum (`DM-041`, `API-041`).

**`PF-052` (MUST):** Pagination is cursor-based (`API-040`).

**`PF-053` (MUST):** Connection pools are calculated and capped per service (`IN-053`).

**`PF-054` (MUST):** Slow queries are monitored, logged, and reviewed periodically.

**`PF-055` (SHOULD):** With growth, heavy reads move to read replicas — by measurement, not anticipation.

---

## 7. Budgets and measurement

**`PF-060` (MUST):** Explicit, monitored budgets:

| What is measured | Budget |
|---|---|
| API latency (p95) | < 500ms (`OB-030`) |
| Page render query count | Constant (independent of section count) |
| Dashboard bundle size | A monitored CI limit (`FE-074`) |
| Published site JS size | As small as possible — ideally zero for static sections |
| Published site cache hit ratio | High and rising |

**`PF-061` (MUST):** Performance is **measured, not assumed**. "It feels fast on my machine" is not a measurement.

**`PF-062` (MUST):** Load testing on critical paths before launch: site rendering · publish bursts · analytics ingestion.

**`PF-063` (MUST NOT):** **No premature optimisation without measurement.** Optimise what is measured to be slow, not what you think is slow.

> **Why:** Optimising without measurement adds complexity that hinders maintenance and usually targets the wrong place — while the real bottleneck remains.

---

## 8. Anti-patterns

| # | Pattern | Why it is dangerous |
|---|---|---|
| 1 | N+1 in the render path | Collapses with the first successful customer |
| 2 | Cache key without `revisionId` | Stale content after publish |
| 3 | Global purge on every publish | Performance collapse across all sites |
| 4 | A third-party call in the render path | External slowness hits every customer |
| 5 | A section component fetching data | Breaks caching and performance |
| 6 | `Cache-Control: public` for private data | Leakage between users |
| 7 | Cache key without scope | Leakage between tenants |
| 8 | TTL alone for user-edited data | "My edit didn't show up" |
| 9 | A list with no maximum | A huge response takes down the service |
| 10 | `OFFSET` for large lists | Growing slowness plus inconsistent results |
| 11 | Expensive computation per request | Chronic, worsening slowness |
| 12 | Images without dimensions | Layout shift harms UX and SEO |
| 13 | Optimising without measurement | Complexity with no benefit |
| 14 | Unbounded connection pools | Connection exhaustion means total outage |

---

## 9. Required tests

**`PF-070` (MUST):** Query count test: rendering a page with 5 sections and with 40 sections → **the same query count**.

**`PF-071` (MUST):** Invalidation test: after publish, the next request reflects the new content immediately.

**`PF-072` (MUST):** Cache isolation test: keys for different tenants never intersect.

**`PF-073` (MUST):** Load test: site rendering under concurrent load stays within the latency budget.

**`PF-074` (MUST):** Graceful degradation test: cache outage → sites keep being served.

**`PF-075` (MUST):** Bundle budget test in CI.

---

## 10. Definition of Done — performance

- [ ] No N+1 on any hot path.
- [ ] Render query count is constant.
- [ ] Cache key includes `publishedRevisionId`.
- [ ] Invalidation is explicit and targeted to the affected site.
- [ ] No third-party calls in the render path.
- [ ] Assets use immutable URLs at appropriate sizes.
- [ ] No public caching of private data.
- [ ] Every cache key carries scope and a TTL.
- [ ] Stampede protection on hot keys.
- [ ] Graceful degradation on cache outage.
- [ ] Indexes start with the scope column; `EXPLAIN` reviewed.
- [ ] List maximums and cursor-based pagination.
- [ ] Expensive computations precomputed.
- [ ] Performance budgets measured in CI.
- [ ] Load testing on critical paths.

---

## 11. What requires an ADR

- Changing the rendering strategy (SSR ↔ ISR ↔ static ↔ edge).
- Adding read replicas or database partitioning.
- Adding a new cache layer.
- Changing the CDN provider.
- Changing the invalidation strategy.

---

## 12. Cross-references

[`02-data-model.md`](02-data-model.md) · [`03-content-engine.md`](03-content-engine.md) · [`06-renderer-publishing.md`](06-renderer-publishing.md) · [`08-assets-media.md`](08-assets-media.md) · [`10-analytics.md`](10-analytics.md) · [`13-queues-jobs-cache.md`](13-queues-jobs-cache.md) · [`16-frontend-standards.md`](16-frontend-standards.md) · [`19-observability.md`](19-observability.md)
