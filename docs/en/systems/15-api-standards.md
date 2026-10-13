# 15 — API Engineering Standards

> **Rule prefix:** `API-` · **Status:** Binding · **Owner:** Backend
> **Governing document:** [`../00-PROJECT-RULES.md`](../00-PROJECT-RULES.md) · **العربية:** [`../../ar/systems/15-api-standards.md`](../../ar/systems/15-api-standards.md)

---

## 0. Purpose and scope

**Governing rule:** the API is a **contract**. Whatever enters a response becomes a commitment; removing it or changing its meaning breaks its consumers. Therefore: **consistency early is far cheaper than correction later.**

**`API-001` (MUST):** REST/JSON in the MVP, documented with **OpenAPI**. GraphQL is not a necessity and requires an ADR.

---

## 1. Paths and versioning

**`API-010` (MUST):** All product/business API paths live under `/api/v1/`. The operational infrastructure probes `/health` and `/ready` are not product APIs and are explicitly exempt from the API version prefix. Their unversioned paths are required by `IN-004`. This exception introduces no other endpoint.

**`API-011` (MUST):** Product/business API paths are `kebab-case` and **plural**, with hierarchy reflecting ownership. The two operational probe paths retain their exact names under `API-010` and `IN-004`:

```
GET    /api/v1/websites
POST   /api/v1/websites
GET    /api/v1/websites/{websiteId}
PATCH  /api/v1/websites/{websiteId}
GET    /api/v1/websites/{websiteId}/pages
POST   /api/v1/websites/{websiteId}/publish
GET    /api/v1/websites/{websiteId}/leads
```

**`API-012` (MUST NOT):** No verbs in paths except for operations that are not genuinely CRUD (`/publish`, `/rollback`, `/verify`). `POST /api/v1/getWebsites` is wrong.

**`API-013` (MUST):** JSON fields are always `camelCase` — in requests and responses.

**`API-014` (MUST):** A breaking change requires a new version. Breaking includes: removing a field, changing its type, changing its meaning, making an optional field required, narrowing accepted values.

**`API-015` (MUST):** Adding an optional field is **not breaking**. Clients must ignore unknown fields.

---

## 2. Responses

**`API-020` (MUST):** A uniform success shape:

```json
{ "data": { ... } }
{ "data": [ ... ], "pagination": { "nextCursor": "...", "hasMore": true } }
```

**`API-021` (MUST):** A uniform error shape — **without exception**:

```json
{
  "error": {
    "code": "DOMAIN_NOT_VERIFIED",
    "message": "Domain verification is still pending",
    "details": { "hostname": "example.com", "status": "pending_dns" },
    "requestId": "req_01J..."
  }
}
```

**`API-022` (MUST):** `code` is **stable and machine-readable** in `SCREAMING_SNAKE_CASE`. Clients branch on `code`, never on the `message` text.

> **Why:** Message text changes with translation and refinement. The code is a stable contract.

**`API-023` (MUST):** `requestId` in **every** response (success and failure) and in the response header too.

> **Why:** A customer reports a problem with one number, and we find its entire context in the logs immediately — rather than searching by approximate timestamp.

**`API-024` (MUST NOT):** **Never** leak internal exception messages, stack traces, or database details (`CORE-062`).

**`API-025` (MUST):** Responses are built from an **explicit DTO**, never from a database row (`CORE-033`).

---

## 3. Status codes

**`API-030` (MUST):** Precise usage:

| Code | When |
|---|---|
| `200` | Success with content |
| `201` | Resource created (with `Location`) |
| `202` | Async operation accepted (publish, AI generation) |
| `204` | Success with no content |
| `400` | Structurally malformed request |
| `401` | Unauthenticated or session expired |
| `403` | Authenticated but forbidden (role or plan limit) |
| `404` | Not found **or** not owned by the tenant (`MT-014`) |
| `409` | Version or state conflict (`VE-022`) |
| `422` | Structurally valid but semantically invalid |
| `429` | Rate limit exceeded (with `Retry-After`) |
| `500` | Unexpected internal error |
| `503` | Temporarily unavailable (circuit breaker open) |

**`API-031` (MUST):** The distinction between `400` (malformed JSON, wrong type) and `422` (valid structure, unacceptable value) is **consistent across the whole project**.

**`API-032` (MUST):** `429` always carries `Retry-After`.

**`API-033` (MUST NOT):** Never return `200` with an error in the body. The status code is part of the contract.

---

## 4. Input validation

**`API-034` (MUST):** Every input is validated against a schema from `packages/schemas` (`CORE-022`). **No client payload is trusted** (`CORE-005`).

**`API-035` (MUST):** Schemas are `.strict()` — unknown fields are rejected (`CE-012`).

**`API-036` (MUST):** Validation errors return **all** problems at once, never one at a time:

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "details": {
      "fields": [
        { "path": "title",    "code": "TOO_LONG",  "max": 120 },
        { "path": "cta.href", "code": "INVALID_PROTOCOL" }
      ]
    },
    "requestId": "req_01J..."
  }
}
```

> **Why:** Returning one error at a time forces the user through repeated, frustrating fix cycles.

**`API-037` (MUST):** Strict limits: request size · JSON depth · array element count · per-field text length (`SE-053`).

---

## 5. Pagination and lists

**`API-040` (MUST):** Pagination is **cursor-based** for large lists, never `OFFSET`.

> **Why:** `OFFSET` slows linearly with depth and produces duplicated or missing results when data changes during traversal.

**`API-041` (MUST):** A server-enforced maximum regardless of what the client requests (e.g. `limit ≤ 100`).

**`API-042` (MUST):** The cursor is **opaque** to the client. Clients must never construct one or depend on its structure.

**`API-043` (MUST):** A stable, defined sort order for every list; otherwise pagination is non-deterministic.

**`API-044` (MUST):** Filters and sorting come from a **field-name allowlist**. Never pass client input into `ORDER BY`.

---

## 6. Idempotency

**`API-050` (MUST):** The `Idempotency-Key` header is supported on: publish · subscription creation · any payment operation · any creation whose repetition costs something.

**`API-051` (MUST):** The same key with the same payload within the defined window → **the same response**, with no second execution.

**`API-052` (MUST):** The same key with a **different** payload → an explicit `409`. That is a client bug and must surface, not be swallowed.

**`API-053` (MUST):** The key retention window is documented (24 hours, for instance).

---

## 7. API-level security

**`API-060` (MUST):** Every non-public endpoint sits behind an authentication and authorization guard (`AU-031`), with a **deny** default (`AU-033`).

**`API-061` (MUST):** Rate limiting on all paths, especially public ones (`SE-050`).

**`API-062` (MUST):** CORS configured with a specific origin allowlist. **`*` with credentials is forbidden.**

**`API-063` (MUST):** Every response is reviewed for internal field leakage (`MT-026`).

**`API-064` (MUST):** Sensitive operations are recorded in `audit_logs` (`SE-070`).

---

## 8. Documentation

**`API-070` (MUST):** OpenAPI is **generated from the schemas**, never hand-written — otherwise it diverges from reality within weeks.

**`API-071` (MUST):** Every endpoint documents: purpose · required authentication · required role · limits · possible error codes · an example.

**`API-072` (MUST):** Updating documentation is part of the Definition of Done, not a later task.

---

## 9. Anti-patterns

| # | Pattern | Why it is dangerous |
|---|---|---|
| 1 | Different error shapes across endpoints | Clients write bespoke handling for each |
| 2 | `200` with an error body | Violates the contract and confuses every client |
| 3 | Leaking a stack trace | Free reconnaissance for an attacker |
| 4 | A database row as a response | Leaks future internal fields |
| 5 | `OFFSET` for large lists | Slow plus duplicated or missing results |
| 6 | A list with no maximum | A huge response takes down the service |
| 7 | Sorting by raw client input | SQL injection or structure disclosure |
| 8 | Clients branching on message text | Breaks on any wording improvement |
| 9 | No `requestId` | Diagnosis becomes near-impossible |
| 10 | One validation error at a time | A frustrating experience |
| 11 | `CORS: *` with credentials | Cross-origin data theft |
| 12 | `snake_case` fields in JSON | Conflicts with project conventions |
| 13 | A breaking change without versioning | Silently breaks every client |
| 14 | Swallowing a key reused with a different payload | A client bug becomes corrupt data |

---

## 10. Required tests

**`API-080` (MUST):** A contract test per endpoint: success and error shapes match the standard.

**`API-081` (MUST):** Status code test: every error case returns the correct code (especially `403` vs `404`).

**`API-082` (MUST):** Validation test: extra fields rejected, and all errors returned at once.

**`API-083` (MUST):** Pagination test: the maximum is enforced, the cursor works, with no duplication and no loss.

**`API-084` (MUST):** Idempotency test: repetition with the same key → the same result; with a different payload → `409`.

**`API-085` (MUST):** Non-leakage test: no internal fields and no stack traces in any response.

**`API-086` (MUST):** `requestId` test: present in every response and in the header.

---

## 11. Definition of Done — API

- [ ] Product/business API path under `/api/v1/`, `kebab-case`, plural, hierarchical; operational probes use exactly `/health` and `/ready` (`IN-004`).
- [ ] JSON fields in `camelCase`.
- [ ] Success and error shapes match the standard.
- [ ] Stable `code`, and `requestId` in every response and header.
- [ ] Correct status code per the table.
- [ ] Validation via a shared `.strict()` schema, all errors at once.
- [ ] Size and depth limits applied.
- [ ] Cursor-based pagination with an enforced maximum.
- [ ] Filters and sorting from an allowlist.
- [ ] `Idempotency-Key` supported where required and tested.
- [ ] Guard applied, with a deny default.
- [ ] Rate limiting configured.
- [ ] CORS restricted to known origins.
- [ ] Responses built from explicit DTOs with no leakage.
- [ ] OpenAPI generated and current.
- [ ] Sensitive operations in `audit_logs`.

---

## 12. What requires an ADR

- Adding GraphQL or gRPC.
- Releasing API `v2`.
- Opening a public API to customers or third-party developers.
- Changing the uniform error shape.
- Changing the pagination strategy.

---

## 13. Cross-references

[`01-multi-tenancy.md`](01-multi-tenancy.md) · [`03-content-engine.md`](03-content-engine.md) schemas · [`04-visual-editor.md`](04-visual-editor.md) `409` · [`06-renderer-publishing.md`](06-renderer-publishing.md) `202` and idempotency · [`11-billing-entitlements.md`](11-billing-entitlements.md) limit errors · [`12-auth.md`](12-auth.md) · [`14-security.md`](14-security.md)
