# 10 — Analytics

> **Rule prefix:** `AN-` · **Status:** Binding · **Owner:** Backend / Data
> **Governing document:** [`../00-PROJECT-RULES.md`](../00-PROJECT-RULES.md) · **العربية:** [`../../ar/systems/10-analytics.md`](../../ar/systems/10-analytics.md)

---

## 0. Purpose and scope

```
Lightweight browser tracker
       ↓
Collection endpoint / edge collector
       ↓
Queue / buffer
       ↓
Aggregation worker
       ↓
Daily/hourly metrics store
       ↓
Dashboard
```

**Governing rule:** analytics is a system of an **entirely different scale** from the rest of the product. One site with moderate traffic produces more events than every dashboard operation combined. Designing it like an ordinary table means it becomes **the first thing to take down the database**.

**Second rule:** analytics is **not critical**. Losing 1% of events is entirely acceptable; taking down the database to record them is not.

---

## 1. The foundational rule

**`AN-001` (MUST NOT):** **Never** write every `page_view` as a direct transaction to PostgreSQL on the hot path.

> **Why:** 10,000 sites × 100 visits a day is a million writes a day for the least active version of this product. With growth it becomes tens of millions. That consumes database connections, slows everything else, and turns customer success into our outage.

**`AN-002` (MUST):** Ingestion goes through a **buffer/queue**, then **periodic aggregation**.

**`AN-003` (MUST):** The collection endpoint **responds immediately** (`204 No Content`) without waiting for processing.

**`AN-004` (MUST):** Ingestion failure has **no effect whatsoever** on serving the site to the visitor.

> **Why:** The customer's site matters incomparably more than a statistic. An analytics outage must be entirely invisible to the visitor.

---

## 2. Events

**`AN-010` (MUST):** Events come from a **documented closed set**:

| Event | When |
|---|---|
| `page_view` | Page load |
| `cta_click` | Call-to-action click |
| `whatsapp_click` | WhatsApp link click |
| `form_submit` | Successful form submission |
| `booking_click` | Booking button click |

**`AN-011` (MUST NOT):** Never accept arbitrary event types from the client. Any unregistered type is **silently rejected**.

**`AN-012` (MUST):** Every event carries a `schemaVersion`. Changing an event's shape means a new version.

**`AN-013` (MUST):** Properties (`properties_json`) come from a known set with strict size limits.

**`AN-014` (MUST):** Every event carries `site_id` and `organization_id` (`MT-003`).

---

## 3. The browser tracker

**`AN-020` (MUST):** The tracker is **very light** — a few kilobytes, no dependencies, non-render-blocking (`async`/`defer`).

**`AN-021` (MUST):** Tracker failure (network, ad blocker, error) **does not break the site and produces no console error**.

**`AN-022` (MUST):** Sending uses `navigator.sendBeacon` or `fetch` with `keepalive`, so it is not cancelled when the page unloads.

**`AN-023` (MUST NOT):** No mouse tracking, keystroke tracking, session recording, or device fingerprinting in the MVP.

**`AN-024` (MUST):** The tracker **uses no tracking cookies** in the MVP. Unique visits are estimated in a privacy-respecting way (a daily rotating hash, storing no persistent identifier).

> **Why:** Tracking cookies trigger legal obligations (consent, banners) that burden our customers' sites and harm their experience — in exchange for statistical precision most of them do not need.

---

## 4. Privacy

**`AN-030` (MUST):** **We do not collect unnecessary personal data.** Analytics answers "how many" and "from where" — not "who".

**`AN-031` (MUST NOT):** Never store raw IP addresses without a clear, documented legal or operational need. The default: **not stored**; used transiently to derive a country and then discarded, or hashed with a rotating salt.

**`AN-032` (MUST NOT):** Never store the full `user_agent`. Extract the useful categories (device type, broad browser) and discard the rest — to reduce fingerprinting.

**`AN-033` (MUST):** Referrers are reduced to the domain only, never the full path.

> **Why:** A full path may contain session identifiers or personal search data from another site.

**`AN-034` (MUST):** A clear retention policy: raw events for a short period, aggregates for longer. See [`21-backup-dr-retention.md`](21-backup-dr-retention.md).

**`AN-035` (MUST):** Respect `Do Not Track` / `Global Privacy Control` where applicable.

---

## 5. Ingestion and aggregation

**`AN-040` (MUST):** The collection endpoint has a **rate limit** per IP and per site.

**`AN-041` (MUST):** Payloads are size-capped, and batching is supported to reduce request count.

**`AN-042` (MUST):** Aggregation runs as a background job on the `analytics` queue, producing **hourly and daily** metrics per site.

**`AN-043` (MUST):** Aggregation is **idempotent**: re-running the job for the same window does not double the numbers (`QJ-`).

**`AN-044` (MUST):** The dashboard reads from **aggregate tables only**, never from raw events.

> **Why:** A query over raw events to draw one simple chart may scan millions of rows every time the page opens.

**`AN-045` (MUST):** Raw events are cleaned up after aggregation and the retention window.

**`AN-046` (MUST):** The dashboard states **when the numbers were last updated**. The user knows the data is aggregated, not real time.

---

## 6. Scaling

**`AN-050` (MUST):** The design assumes events **will move to a separate analytical store** (ClickHouse or equivalent) with growth. Therefore reads and writes are isolated behind one interface:

```ts
interface AnalyticsStore {
  ingest(events: AnalyticsEvent[]): Promise<void>;
  queryDaily(scope: TenantScope, siteId: string, range: DateRange): Promise<DailyMetrics[]>;
}
```

**`AN-051` (MUST):** Moving to a separate store **must not require changing any other module**.

**`AN-052` (MUST):** The `analytics_events` table is **isolated from operational tables**: no foreign keys to or from it tying it into critical paths.

> **Why:** A huge table with foreign-key ties becomes impossible to move or partition later.

**`AN-053` (MUST):** The table is prepared for time-based partitioning when needed — not discovered late, after hundreds of millions of rows.

---

## 7. Anti-patterns

| # | Pattern | Why it is dangerous |
|---|---|---|
| 1 | Direct write per page view | Exhausts and takes down the database |
| 2 | Synchronous ingestion slowing the page | Direct harm to the customer's site |
| 3 | Analytics failure breaking rendering | An outage caused by a non-critical system |
| 4 | Accepting arbitrary event types | Flooding and meaningless data |
| 5 | Storing raw IP by default | Legal obligations with no upside |
| 6 | Storing the full `user_agent` | Unnecessary device fingerprinting |
| 7 | Full-path referrers | Leaks data from other sites |
| 8 | Dashboard querying raw events | Severe slowness, then failure |
| 9 | Non-idempotent aggregation | Doubled numbers destroy trust |
| 10 | Foreign keys on the events table | Migration and partitioning become impossible |
| 11 | No growth path | A full rewrite later |
| 12 | Heavy tracking (session recording) | Slowness plus serious privacy risk |

---

## 8. Required tests

**`AN-060` (MUST):** Rendering isolation test: disable the collection endpoint → the site renders normally with no visible error.

**`AN-061` (MUST):** Rejection test: an unregistered event type → silently rejected, nothing stored.

**`AN-062` (MUST):** Idempotency test: running aggregation twice for the same window → identical numbers.

**`AN-063` (MUST):** Tenant isolation test: one site's numbers never appear for another tenant (`MT-061`).

**`AN-064` (MUST):** Privacy test: the stored event contains no raw IP, no full `user_agent`, and no full-path referrer.

**`AN-065` (MUST):** Load test: a large event batch does not affect core API response times.

---

## 9. Definition of Done — analytics

- [ ] Ingestion via buffer/queue, with an immediate `204` response.
- [ ] Ingestion failure is invisible to the visitor.
- [ ] Event types from a closed set with a `schemaVersion`.
- [ ] Every event carries `site_id` and `organization_id`.
- [ ] The tracker is light, `async`, and does not break the site on failure.
- [ ] No tracking cookies and no device fingerprinting.
- [ ] No raw IP, no full `user_agent`, no full-path referrer.
- [ ] Rate limit on the collection endpoint.
- [ ] Aggregation is idempotent and runs as a background job.
- [ ] The dashboard reads aggregates only.
- [ ] Last-updated time shown to the user.
- [ ] Retention policy applied with raw-event cleanup.
- [ ] Access goes through the `AnalyticsStore` interface.
- [ ] No foreign keys tying the events table into critical paths.

---

## 10. What requires an ADR

- Moving to a separate analytical store (ClickHouse or similar).
- Adding tracking cookies or a persistent visitor identifier.
- Adding session recording or heatmaps.
- Storing raw IP addresses persistently.
- Opening a public analytics API to customers.

---

## 11. Cross-references

[`02-data-model.md`](02-data-model.md) · [`06-renderer-publishing.md`](06-renderer-publishing.md) · [`09-forms-leads.md`](09-forms-leads.md) the `form_submit` event · [`13-queues-jobs-cache.md`](13-queues-jobs-cache.md) · [`20-performance-caching.md`](20-performance-caching.md) · [`21-backup-dr-retention.md`](21-backup-dr-retention.md)
