# 08 — Assets & Media Pipeline

> **Rule prefix:** `AS-` · **Status:** Binding · **Owner:** Backend
> **Governing document:** [`../00-PROJECT-RULES.md`](../00-PROJECT-RULES.md) · **العربية:** [`../../ar/systems/08-assets-media.md`](../../ar/systems/08-assets-media.md)

---

## 0. Purpose and scope

File upload is **the most common entry point for attackers in web applications**, and simultaneously **the largest storage and bandwidth cost** in a product like this. These rules address both.

```
Browser
  ↓ request signed upload
Backend: check permission + plan + type + size
  ↓
Signed URL (valid for minutes)
  ↓ direct upload
Object storage (R2)
  ↓ confirmation + queue event
Worker: real validation → strip metadata → optimise → generate variants
  ↓
CDN URLs
```

---

## 1. Direct signed uploads

**`AS-001` (MUST):** Files **do not pass through the backend**. Uploads go directly to storage via a short-lived **signed URL**.

> **Why:** Routing files through the backend consumes its memory and bandwidth, and lets one large upload occupy an entire worker — an easy denial-of-service vector.

**`AS-002` (MUST):** The signed URL is valid for **a few minutes (≤ 15)**, for one upload, to one predetermined object key.

**`AS-003` (MUST):** The backend checks **before** issuing the URL: permission, entitlement, declared file type, declared size, and the tenant's total storage consumption.

**`AS-004` (MUST):** **Size is enforced at the storage layer itself**, never by trusting the client-declared value.

> **Why:** The client declares 2 MB and then uploads 2 GB. Without storage-level enforcement, nothing stops them.

**`AS-005` (MUST):** The `assets` row is created with status `pending` and becomes `ready` only after successful validation and processing.

**`AS-006` (MUST):** Assets stuck in `pending` beyond a defined window are cleaned up by a periodic maintenance job.

---

## 2. Object keys

**`AS-010` (MUST):** The mandatory key structure:

```
org_<orgId>/site_<siteId>/assets/<assetId>/<variant>.<ext>
```

**`AS-011` (MUST NOT):** **Never** use the user-supplied filename as part of the path (`MT-041`). It is stored in `assets.original_filename` as metadata only.

> **Why:** A user filename may contain `../`, control characters, double extensions (`x.jpg.php`), or characters that break filesystems. Never trust it as a path.

**`AS-012` (MUST):** The key is unguessable — `assetId` is a ULID, never a sequential number.

**`AS-013` (MUST):** The extension is derived from the **detected real type**, not from the client-supplied extension.

---

## 3. File validation — defence in depth

**`AS-020` (MUST):** An **allowlist** of permitted types only. Never a blocklist.

Permitted types in the MVP:
```
image/jpeg, image/png, image/webp, image/avif, image/gif, image/svg+xml*, application/pdf*
```
(`*` with the additional conditions below)

**`AS-021` (MUST):** Validation by **magic bytes (binary signature)**, never by extension or by the supplied `Content-Type`.

```
❌ file.name.endsWith('.png')
❌ req.headers['content-type'] === 'image/png'
✅ detectedType = await fileTypeFromBuffer(firstBytes)
```

> **Why:** Both the extension and `Content-Type` are entirely attacker-controlled. The only trustworthy check is the file's own content.

**`AS-022` (MUST):** If the detected type differs from the declared one → **reject** + delete the object + log the incident.

**`AS-023` (MUST):** **SVG is a special danger.** It can contain `<script>`, `onload`, and `<foreignObject>`. Either:
- **Forbid it entirely in the MVP** (the preferred, simpler option), or
- Sanitize it with a specialised sanitizer and serve it from a **separate domain** with `Content-Disposition: attachment`, or inside an `<img>` only.

Serving user-uploaded SVG on the site's own domain without sanitization is **forbidden**.

**`AS-024` (MUST):** Strip sensitive image metadata (EXIF) — above all **geolocation data**.

> **Why:** A photo the customer took on their phone may contain their home coordinates. Publishing it on their public site without stripping is a privacy leak we are responsible for.

**`AS-025` (MUST):** Dimension limits: reject images exceeding a sane dimension cap (e.g. 12000×12000) even when the file size is small.

> **Why:** The "decompression bomb" — a 2 MB PNG that expands into an image consuming gigabytes of memory during processing, killing the worker.

**`AS-026` (MUST):** Processing runs in a worker with explicit memory and time limits, and its failure **must not take down the whole queue**.

---

## 4. Processing and variants

**`AS-030` (MUST):** Processing is **asynchronous** on the `media` queue (`CORE-015`).

**`AS-031` (MUST):** Minimum generated variants:

| Variant | Purpose | Approximate width |
|---|---|---|
| `thumb` | Editor previews and lists | 320px |
| `medium` | General in-section use | 1024px |
| `large` | Backgrounds and hero images | 1920px |
| `original` | Retained for future reprocessing | as-is |

**`AS-032` (MUST):** Generate WebP/AVIF with an appropriate fallback. Serving selects the format by browser support.

**`AS-033` (MUST NOT):** Never upscale an image smaller than the target. The `large` variant of a 400px original stays 400px.

**`AS-034` (MUST):** Real dimensions (`width`, `height`) are stored in `assets` and used in HTML to prevent layout shift (`CE-064`).

**`AS-035` (MUST):** Processing failure leaves the original intact and marks the asset `processing_failed` with an understandable message — **the user's file is never lost**.

---

## 5. Serving and CDN

**`AS-040` (MUST):** Assets are served from the **CDN** with immutable URLs and a long cache lifetime.

**`AS-041` (MUST):** The asset URL includes the variant identifier or a content hash, so changing an image means a new URL with no invalidation needed.

**`AS-042` (MUST NOT):** Never serve user assets from the **same domain as the dashboard**.

> **Why:** A malicious file served from the dashboard's domain inherits the browser's trust in that domain — potentially enabling session theft. A separate domain contains the damage.

**`AS-043` (MUST):** Assets belonging to a disabled site or a suspended subscription stop being served according to a documented policy.

**`AS-044` (MUST):** Correct headers: `Content-Type` from the detected type, and `X-Content-Type-Options: nosniff` always.

---

## 6. Quotas and cleanup

**`AS-050` (MUST):** Total storage per tenant is **computed, monitored, and enforced** as an entitlement.

**`AS-051` (MUST):** The user sees their consumption **before** hitting the limit (`VE-062`).

**`AS-052` (MUST):** Deletion is **soft first** (`deleted_at`), then a scheduled hard delete after a grace period.

> **Why:** Users delete images by accident. Immediate deletion from storage makes recovery impossible.

**`AS-053` (MUST):** A periodic **garbage collection** job removes assets not referenced by any revision (draft or published) after the grace period.

**`AS-054` (MUST NOT):** **Never** delete an asset still referenced by a **published revision** — even if it was removed from the draft. Rolling back to a previous revision must work, images included.

**`AS-055` (MUST):** Deleting a site or an account schedules deletion of all its assets per the retention policy (`CORE-083`).

---

## 7. Anti-patterns

| # | Pattern | Why it is dangerous |
|---|---|---|
| 1 | Trusting the extension or `Content-Type` | Disguised executable upload |
| 2 | User filename in the path | Path traversal and double extensions |
| 3 | Unsanitized SVG on the site domain | Stored XSS |
| 4 | Files passing through the backend | Memory and bandwidth exhaustion, DoS |
| 5 | Trusting the declared size | Unbounded uploads |
| 6 | No dimension cap | Decompression bomb kills the worker |
| 7 | No EXIF stripping | Leaks the customer's home location |
| 8 | User assets on the dashboard domain | Potential session theft |
| 9 | Immediate deletion with no grace | Irreversible loss from one misclick |
| 10 | Deleting an asset referenced by a published revision | Broken images on rollback |
| 11 | No garbage collection | Storage cost grows without ceiling |
| 12 | Synchronous processing in the request | Timeouts and a poor experience |

---

## 8. Required tests

**`AS-060` (MUST):** Malicious upload test: a PHP file named `.jpg` → rejected by the magic-bytes check.

**`AS-061` (MUST):** Mismatch test: declared `image/png` with actual PDF content → rejected and the object deleted.

**`AS-062` (MUST):** SVG test: an SVG containing `<script>` → forbidden or sanitized, **and never executed**.

**`AS-063` (MUST):** Size overrun test: an upload larger than the declared limit → rejected at the storage layer, not by trusting the client.

**`AS-064` (MUST):** Decompression bomb test: huge dimensions with a small file size → rejected before processing.

**`AS-065` (MUST):** EXIF test: an image with GPS coordinates → the served variant contains no location data.

**`AS-066` (MUST):** Isolation test: a tenant cannot reach another tenant's object key (complements `MT-061`).

**`AS-067` (MUST):** Garbage collection test: an asset referenced by a published revision **is not deleted**; a fully unreferenced asset is deleted after the grace period.

---

## 9. Definition of Done — assets

- [ ] Direct upload via a short-lived signed URL to a predetermined key.
- [ ] Permission, plan, type, and size checked before issuing the URL.
- [ ] Size enforced at the storage layer.
- [ ] Type allowlist plus magic-bytes validation.
- [ ] Mismatch rejects, deletes, and logs.
- [ ] SVG forbidden or sanitized and served from a separate domain.
- [ ] EXIF stripped, geolocation removed.
- [ ] Dimension limits enforced before processing.
- [ ] Key starts with `org_/site_` and contains no user filename.
- [ ] Processing is async with memory and time limits.
- [ ] Variants + WebP/AVIF, with no upscaling.
- [ ] Dimensions stored and used in HTML.
- [ ] Served from CDN with immutable URLs on a separate domain.
- [ ] `nosniff` and `Content-Type` from the detected type.
- [ ] Storage quota computed, displayed, and enforced.
- [ ] Soft then scheduled deletion; GC respects published revisions.

---

## 10. What requires an ADR

- Allowing user SVG on the site domain.
- Adding new file types (video, executable documents).
- Changing the storage or CDN provider.
- Serving assets from the dashboard domain.
- Adding virus scanning or file quarantine.

---

## 11. Cross-references

[`03-content-engine.md`](03-content-engine.md) asset references · [`04-visual-editor.md`](04-visual-editor.md) editor uploads · [`05-ai-generation.md`](05-ai-generation.md) generated images · [`11-billing-entitlements.md`](11-billing-entitlements.md) quotas · [`13-queues-jobs-cache.md`](13-queues-jobs-cache.md) · [`14-security.md`](14-security.md) · [`21-backup-dr-retention.md`](21-backup-dr-retention.md)
