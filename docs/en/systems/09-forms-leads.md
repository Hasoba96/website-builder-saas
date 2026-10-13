# 09 — Forms, Leads & Notifications

> **Rule prefix:** `FL-` · **Status:** Binding · **Owner:** Backend
> **Governing document:** [`../00-PROJECT-RULES.md`](../00-PROJECT-RULES.md) · **العربية:** [`../../ar/systems/09-forms-leads.md`](../../ar/systems/09-forms-leads.md)

---

## 0. Purpose and scope

```
Public form → validation → bot/rate controls → lead storage → event → notifications / webhooks
```

**Two entirely different contexts:**

| | Who uses it | Characteristics |
|---|---|---|
| **Form submission** | A completely anonymous visitor | Public path · unauthenticated · **must be assumed hostile** |
| **Reading leads** | The site owner | Authenticated path · tenant-scoped · personal data |

**Direct commercial value:** leads are **why the customer pays us**. A beautiful site that fails to deliver a prospect's message is, to its owner, a failed product. Therefore: **losing one lead is more serious than a temporary editor outage.**

---

## 1. Form definition

**`FL-001` (MUST):** A form is defined as a **structured schema** in `forms.schema_json`, never as HTML.

```json
{
  "schemaVersion": 1,
  "fields": [
    { "key": "name",    "type": "text",     "label": "Name",    "required": true,  "maxLength": 100 },
    { "key": "phone",   "type": "phone",    "label": "Phone",   "required": true },
    { "key": "email",   "type": "email",    "label": "Email",   "required": false },
    { "key": "message", "type": "textarea", "label": "Message", "required": false, "maxLength": 2000 }
  ],
  "successMessage": "Thank you! We'll be in touch shortly.",
  "notifications": { "email": true, "webhook": false }
}
```

**`FL-002` (MUST):** Field types come from a **closed set**: `text`, `textarea`, `email`, `phone`, `number`, `select`, `checkbox`, `date`. Each type has known validation rules.

**`FL-003` (MUST):** Every text field has a mandatory `maxLength` (`CE-013`).

**`FL-004` (MUST NOT):** No executable fields and no file uploads in MVP forms. File upload from an anonymous visitor is an attack surface we do not need yet.

---

## 2. Submission — the public path

**`FL-010` (MUST):** Validation is **always server-side** against the stored form schema — never against a form structure supplied by the client (`CORE-005`).

> **Why:** An attacker sends fields that were never in the form. Trusting a client-supplied structure means storing anything.

**`FL-011` (MUST):** Fields not defined in the schema are **rejected**, not silently ignored.

**`FL-012` (MUST):** **Rate limiting is mandatory** on the public path: per IP, per site, and platform-wide.

**`FL-013` (MUST):** Layered bot controls:

| Layer | Mechanism | Note |
|---|---|---|
| 1 | Honeypot (hidden field) | Stops simple bots with zero user friction |
| 2 | Minimum fill time | Submission in < 2 seconds is probably a bot |
| 3 | Rate limit | Stops bulk submission |
| 4 | Turnstile / CAPTCHA | **Only when needed** — on detected abuse or highly targeted sites |

**`FL-014` (MUST NOT):** Never impose a CAPTCHA on every visitor by default.

> **Why:** Every added friction reduces conversion. Our customer pays us to get leads — not to make getting them harder. Layers 1–3 suffice in the overwhelming majority of cases.

**`FL-015` (MUST):** Total request size is capped strictly.

**`FL-016` (MUST):** The response to the visitor is **uniform and fast**, whether the submission was considered suspicious or not.

> **Why:** A different response for suspicious submissions teaches the bot how to bypass the filter.

**`FL-017` (MUST):** The submission is stored **before** any notification is triggered. Notifications may fail — the lead is never lost.

```
✅ validate → store lead → return success to visitor → emit notification event (async)
❌ validate → send email → store   ← an email failure loses the lead
```

---

## 3. Lead storage and data protection

**`FL-020` (MUST):** A lead carries `organization_id`, `website_id`, and `form_id` directly (`MT-003`).

**`FL-021` (MUST NOT):** **Never log lead content** (`CORE-081`). Identifiers only.

**`FL-022` (MUST):** `source_json` carries useful context (page, referrer, UTM) **without excessive visitor fingerprinting**.

**`FL-023` (MUST):** IP address: stored **only** where there is a clear operational need (abuse detection), with a short documented retention and preferably hashed. See [`21-backup-dr-retention.md`](21-backup-dr-retention.md).

**`FL-024` (MUST):** An explicit retention policy for leads, and their deletion as part of site or account deletion.

**`FL-025` (MUST):** Lead export (CSV) is available to the site owner — their customer data is theirs.

**`FL-026` (MUST):** Displaying a lead in the dashboard **always escapes the content**.

> **Why:** A visitor types `<img src=x onerror=...>` into the message field. Rendered unescaped in the dashboard, we have executed code in the site owner's session — stored XSS targeting our own customer.

**`FL-027` (MUST):** CSV export prevents **formula injection**: any value beginning with `=`, `+`, `-`, `@`, tab, or CR is prefixed with a single quote.

> **Why:** A value like `=cmd|'/c calc'!A1` executes when the file is opened in Excel on our customer's machine.

---

## 4. Notifications

**`FL-030` (MUST):** All notifications are **asynchronous** on the `notifications` queue (`CORE-015`).

**`FL-031` (MUST):** Notification failure **does not affect** submission success or the visitor's response.

**`FL-032` (MUST):** Retry with exponential backoff and a maximum, then a **dead-letter queue** with an alert.

**`FL-033` (MUST):** The site owner sees the **notification status** per lead in the dashboard (sent / failed / pending).

> **Why:** Without it, a customer who did not receive an email alert assumes the product lost the lead — and from their perspective the complaint is fair.

**`FL-034` (MUST):** Notification email is sent from the **platform domain** with correct SPF/DKIM/DMARC. Spoofing the customer's domain is **forbidden**.

**`FL-035` (MUST):** The notification carries enough to act on (name, phone, summary) with a link to the full lead in the dashboard.

**`FL-036` (MUST):** WhatsApp links are built with correct encoding (`wa.me`) and treated as a CTA, not as a reliable notification channel.

---

## 5. Webhooks (once added)

**`FL-040` (MUST):** Every outbound webhook is **signed (HMAC)** with a timestamp in the header.

**`FL-041` (MUST):** The timestamp sits within a narrow window to prevent replay.

**`FL-042` (MUST):** The payload carries a unique event id so the receiver can deduplicate.

**`FL-043` (MUST):** Retry with exponential backoff + DLQ + status visibility in the dashboard.

**`FL-044` (MUST):** Webhook URLs are subject to **SSRF controls**: `localhost`, internal networks, and reserved ranges are forbidden. See [`14-security.md`](14-security.md).

> **Why:** Without this, a customer sets a webhook to `http://169.254.169.254/...`, making our servers read infrastructure credentials and send them to the customer.

**`FL-045` (MUST):** An explicit short timeout on every webhook call.

---

## 6. Anti-patterns

| # | Pattern | Why it is dangerous |
|---|---|---|
| 1 | Validating against a client-supplied structure | Anything gets stored |
| 2 | Sending email before storing | An email failure loses the lead |
| 3 | No rate limit on the public path | Spam flooding |
| 4 | CAPTCHA for every visitor by default | Conversion collapse |
| 5 | A different response for suspicious submissions | Teaches the bot to bypass |
| 6 | Logging lead content | PII leakage in logs |
| 7 | Rendering a lead unescaped | Stored XSS against the site owner |
| 8 | CSV without injection protection | Command execution on the customer's machine |
| 9 | Notification failure failing the request | A lead lost to an email outage |
| 10 | No notification status visibility | "The product lost my data" complaints |
| 11 | Unsigned webhooks | Event forgery |
| 12 | Webhooks without SSRF controls | Infrastructure credential disclosure |
| 13 | Spoofing the customer's domain in email | Reputation damage and spam folders |

---

## 7. Required tests

**`FL-050` (MUST):** Undefined field test: submitting a field not in the schema → rejected.

**`FL-051` (MUST):** Stored XSS test: `<script>` in a message field → stored as text and rendered escaped in the dashboard.

**`FL-052` (MUST):** CSV injection test: a value beginning with `=` → prefixed with a quote on export.

**`FL-053` (MUST):** Ordering test: simulate an email provider failure → the lead **is stored** and the visitor sees success.

**`FL-054` (MUST):** Rate limit test: rapid repeated submissions → limited, with a uniform response.

**`FL-055` (MUST):** Isolation test: a tenant cannot read another tenant's leads (complements `MT-061`).

**`FL-056` (MUST):** SSRF test: a webhook pointed at an internal address → rejected.

**`FL-057` (MUST):** Honeypot test: filling the hidden field → treated as a bot with no distinguishable response.

---

## 8. Definition of Done — forms & leads

- [ ] The form is a structured schema with length limits.
- [ ] Validation is server-side against the stored schema only.
- [ ] Undefined fields are rejected.
- [ ] Rate limit + honeypot + minimum fill time applied.
- [ ] No default CAPTCHA for every visitor.
- [ ] Response is uniform and fast for everyone.
- [ ] The lead is stored before any notification.
- [ ] The lead carries `organization_id` and `website_id`.
- [ ] No lead content in logs.
- [ ] Retention policy set; IP hashed or not stored.
- [ ] Dashboard rendering is escaped.
- [ ] CSV export is injection-protected.
- [ ] Notifications are async with retry and DLQ.
- [ ] Notification status is visible to the site owner.
- [ ] Email sent from the platform domain with SPF/DKIM/DMARC.
- [ ] Webhooks signed, SSRF-protected, and replay-protected.

---

## 9. What requires an ADR

- Allowing file uploads from public forms.
- Adding new notification channels (SMS, official WhatsApp API).
- Storing raw IP addresses persistently.
- Building a full CRM or lead pipeline (outside the MVP).
- Sending from the customer's own domain.

---

## 10. Cross-references

[`01-multi-tenancy.md`](01-multi-tenancy.md) · [`06-renderer-publishing.md`](06-renderer-publishing.md) the public path · [`13-queues-jobs-cache.md`](13-queues-jobs-cache.md) · [`14-security.md`](14-security.md) XSS and SSRF · [`19-observability.md`](19-observability.md) · [`21-backup-dr-retention.md`](21-backup-dr-retention.md)
