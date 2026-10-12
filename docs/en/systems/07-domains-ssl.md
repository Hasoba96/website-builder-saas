# 07 — Subdomains / Custom Domains / SSL

> **Rule prefix:** `DN-` · **Status:** Binding · **Owner:** Backend / DevOps
> **Governing document:** [`../00-PROJECT-RULES.md`](../00-PROJECT-RULES.md) · **العربية:** [`../../ar/systems/07-domains-ssl.md`](../../ar/systems/07-domains-ssl.md)

---

## 0. Purpose and scope

Domain connection is **the single largest generator of support tickets** in a product like this, because it is the one part that depends on configuration the user performs outside our platform, at their registrar. Therefore: **clarity, explicit states, and background verification are not refinements — they are the core requirement.**

It is also a real attack surface: whoever connects a domain they do not own hijacks traffic that is not theirs.

---

## 1. Platform subdomains

```
*.platform.com  →  Cloudflare (DNS + TLS + WAF)  →  Renderer
```

**`DN-001` (MUST):** Wildcard DNS plus wildcard TLS cover all subdomains. Creating a DNS record or certificate per site is **forbidden**.

**`DN-002` (MUST):** The router extracts the hostname → extracts the slug → checks site status → serves the published revision.

**`DN-003` (MUST):** Slugs are validated at creation: letters, digits, and hyphens only, `3–63` characters, not starting or ending with a hyphen, and not in the **reserved word list**.

**`DN-004` (MUST):** A mandatory reserved list including at minimum:

```
www, api, app, admin, dashboard, cdn, assets, static, mail, smtp, imap,
ftp, ns1, ns2, blog, help, support, docs, status, billing, pay, checkout,
login, auth, account, secure, test, staging, dev, preview, internal,
webmail, autodiscover, _domainkey, _dmarc
```

> **Why:** A slug named `mail` or `_dmarc` can break platform email or be used for official-looking phishing.

**`DN-005` (MUST):** Changing a slug leaves a **permanent redirect** from the old one for a documented period, and blocks reuse of the old slug during it.

> **Why:** Without this, the customer's published links break, and someone else could claim the old slug and receive their visitors.

---

## 2. Custom domains — the flow

```
User enters example.com
      ↓
Normalize hostname + check entitlement + check uniqueness
      ↓
Create record with status pending_dns + generate verification token
      ↓
Show clear DNS instructions (CNAME / A / TXT)
      ↓
Background verification job (exponential backoff)
      ↓
verifying → ownership confirmed
      ↓
tls_pending → certificate provisioning
      ↓
active → hostname → site_id cached
```

**`DN-010` (MUST):** The explicit states, **exclusively**:

| State | Meaning | What the user sees |
|---|---|---|
| `pending_dns` | Waiting for DNS setup | Clear instructions + the exact records |
| `verifying` | Verification in progress | "Verifying — may take up to 48 hours" |
| `tls_pending` | Provisioning the certificate | "Enabling security" |
| `active` | Working | ✅ + a link to the site |
| `failed` | Verification failed | **The precise reason** + the corrective step |
| `disconnected` | Was working, then broke | Alert + reason + fix step |

**`DN-011` (MUST):** A `failed` state **MUST** carry an actionable reason: "CNAME record not found" · "points to `x.y.z` instead of `target.platform.com`" · "domain is connected to another account". A bare "verification failed" is **forbidden**.

**`DN-012` (MUST):** Verification is **periodic and background**, never synchronous polling from the browser.

**`DN-013` (MUST):** Retries are scheduled with exponential backoff (e.g. 1m, 5m, 15m, 1h, 6h, 24h) up to a documented maximum (48–72 hours), then `failed` with manual retry available.

---

## 3. Security — preventing domain hijacking

**`DN-020` (MUST):** **No activation without ownership verification.** This is not an optional refinement.

> **Why:** Without verification, anyone could connect `competitor.com` to their account. If that domain ever pointed at us (or already did), they would capture its traffic. Worse: they could exploit an abandoned domain pointing at us to build an official-looking phishing page.

**`DN-021` (MUST):** Accepted verification methods: a `TXT` record with a unique random value, or a `CNAME` to a dedicated verification record. **The token is sufficiently random, unguessable, and bound to exactly one site.**

**`DN-022` (MUST):** **One hostname is never `active` for more than one site at a time**, enforced by a database unique constraint (`DM-021`).

**`DN-023` (MUST):** Disconnecting a domain from one site and connecting it to another **requires full re-verification**.

**`DN-024` (MUST):** Every domain operation (add, verify, activate, disconnect, delete) is recorded in `audit_logs` with actor and timestamp.

**`DN-025` (MUST):** Domain connection is entitlement-gated and checked server-side (`BE-`).

---

## 4. Normalization and validation

**`DN-030` (MUST):** Normalize the hostname before storing or comparing:
- Lowercase it.
- Strip the trailing dot (`example.com.` → `example.com`).
- Convert IDN to punycode (`مثال.com` → `xn--mgbh0fb.com`).
- Strip path, port, and protocol if supplied.

**`DN-031` (MUST):** The hostname is **always stored normalized**. Comparison happens on the normalized form only.

> **Why:** Without normalization, `Example.COM`, `example.com`, and the punycode form are treated as different domains, defeating the uniqueness constraint and making hijacking possible.

**`DN-032` (MUST):** Reject: IP addresses, `localhost`, internal zones (`.local`, `.internal`), domains reserved by the platform, and structurally invalid domains.

**`DN-033` (MUST):** Support `www` and apex together as one comprehensible unit: bound together with unified redirection, not as two separate records confusing the user.

---

## 5. TLS

**`DN-040` (MUST):** Certificates are **fully automated** via Cloudflare for SaaS or an equivalent. Any manual per-customer step is **forbidden**.

**`DN-041` (MUST):** Renewal is automatic and monitored. **Alert well before expiry (≥ 14 days)**, not after.

> **Why:** An expired certificate means every visitor sees a frightening browser warning. That is worse than the site being down.

**`DN-042` (MUST):** HTTPS is mandatory. HTTP always redirects (301) to HTTPS.

**`DN-043` (MUST):** HSTS is enabled on confirmed domains. **Treat `preload` with caution** — it is near-permanent and requires an ADR.

**`DN-044` (MUST):** Certificate provisioning failure keeps the state at `tls_pending` with background retry, and **never** serves the site unprotected.

---

## 6. Runtime domain resolution

**`DN-050` (MUST):** The `hostname → site_id` map is **cached**. This is the hottest query in the entire product.

**`DN-051` (MUST):** Cache lifetime is short to medium (minutes), **with explicit immediate invalidation** on activation, disconnection, slug change, site disablement, or subscription suspension.

**`DN-052` (MUST):** An unknown hostname returns an appropriate error page — it never serves an arbitrary site and never reveals system structure.

**`DN-053` (MUST):** Cache failure (Redis down) **must not take sites down**: fall back to database reads with rate limiting, and raise an alert.

**`DN-054` (MUST NOT):** Never rely on a client-controlled header (such as `X-Forwarded-Host`) to determine the site, except from a trusted source verified at the infrastructure layer.

> **Why:** A forgeable header means anyone can request any customer's site by changing a request header.

---

## 7. Anti-patterns

| # | Pattern | Why it is dangerous |
|---|---|---|
| 1 | Activation without ownership verification | Domain hijacking and phishing |
| 2 | Synchronous verification polling | Timeouts and a poor experience |
| 3 | Storing hostnames unnormalized | Breaks uniqueness → hijacking becomes possible |
| 4 | The same hostname active on two sites | Undefined routing |
| 5 | "Verification failed" with no reason | A guaranteed support ticket |
| 6 | Manual certificates per customer | Does not scale at all |
| 7 | No pre-expiry certificate alert | A security warning for every visitor |
| 8 | A DNS record per site | Does not scale, and is slow |
| 9 | Skipping the reserved word list | Breaks platform services |
| 10 | Trusting `X-Forwarded-Host` | Access to any site by forging a header |
| 11 | Slug change without a redirect | Breaks the customer's published links |
| 12 | Retries without exponential backoff | Abuses the DNS provider and gets blocked |

---

## 8. Required tests

**`DN-060` (MUST):** Normalization test: `Example.COM.`, `example.com`, and the IDN form all normalize to the same value and collide on the uniqueness constraint.

**`DN-061` (MUST):** Hijack prevention test: another tenant attempting to add a hostname active for a first tenant is rejected.

**`DN-062` (MUST):** No-activation-without-verification test: a record in `pending_dns` **is never served**.

**`DN-063` (MUST):** State transition test: every allowed transition works and every disallowed one is rejected.

**`DN-064` (MUST):** Reserved word test: every slug in the list is rejected.

**`DN-065` (MUST):** Invalidation test: disconnecting a domain means the next request **is not** served from cache.

**`DN-066` (MUST):** Graceful degradation test: Redis down → sites keep being served from the database.

---

## 9. Definition of Done — domains & SSL

- [ ] Hostnames normalized before storage and comparison.
- [ ] A unique constraint prevents one hostname being active on two sites.
- [ ] No activation without ownership verification.
- [ ] The verification token is random, unguessable, and site-bound.
- [ ] All six states implemented; every `failed` carries an actionable reason.
- [ ] Verification is background with exponential backoff and a maximum window.
- [ ] TLS is automated; renewal is monitored with an early alert.
- [ ] HTTPS enforced and HTTP redirects.
- [ ] The map is cached with explicit invalidation on every change.
- [ ] The reserved word list is enforced on slugs.
- [ ] Slug changes leave a redirect.
- [ ] No reliance on client-supplied headers.
- [ ] Graceful degradation when the cache fails.
- [ ] Every domain operation in `audit_logs`.
- [ ] DNS instructions are clear and copyable in the UI.

---

## 10. What requires an ADR

- Changing the TLS/CDN provider.
- Enabling HSTS preload.
- Allowing fully delegated nameservers.
- Supporting more than one active domain per site.
- Changing the ownership verification method.

---

## 11. Cross-references

[`02-data-model.md`](02-data-model.md) domains table · [`06-renderer-publishing.md`](06-renderer-publishing.md) resolution and rendering · [`11-billing-entitlements.md`](11-billing-entitlements.md) limits · [`13-queues-jobs-cache.md`](13-queues-jobs-cache.md) verification jobs · [`14-security.md`](14-security.md) hijacking · [`19-observability.md`](19-observability.md) alerting
