# 01 — Multi-tenancy & Isolation

> **Rule prefix:** `MT-` · **Status:** Binding · **Owner:** Backend
> **Governing document:** [`../00-PROJECT-RULES.md`](../00-PROJECT-RULES.md) · **العربية:** [`../../ar/systems/01-multi-tenancy.md`](../../ar/systems/01-multi-tenancy.md)
> **Implements principle:** `CORE-010` (Multi-tenant by design)

---

## 0. Purpose and scope

This system is **the most security-critical layer in the entire product**. A single breach here means one customer sees another customer's data — not an ordinary bug, but a security incident requiring customer notification, and potentially the end of the product commercially.

**In scope:** ownership hierarchy · deriving tenant context · enforcing scope at every layer · isolation across database, storage, cache, queues, and logs · cross-tenant access tests.

**Out of scope:** authentication mechanics (see [`12-auth.md`](12-auth.md)) · plan limits (see [`11-billing-entitlements.md`](11-billing-entitlements.md)).

---

## 1. Ownership hierarchy

```
User  ──(membership + role)──►  Organization (Tenant)
                                      │
                                      ├── Website ──┬── Page ── Section
                                      │             ├── Theme
                                      │             ├── Domain
                                      │             ├── Asset
                                      │             ├── Form ── Lead
                                      │             └── Revision
                                      ├── Subscription
                                      └── Audit Log
```

**`MT-001` (MUST):** The **Organization/Tenant layer exists from day one**, even if every user in the product is a single individual. An individual user is an organization with one member.

> **Stage 00 applicability:** This architectural requirement remains binding. Stage 00 has no domain model, tenant entity, or authentication; it must not fabricate them to make a runtime isolation test possible. Entity implementation and runtime test applicability follow [ADR-001](../../adr/ADR-001-stage-00-cross-tenant-test-applicability.md); the first tenant-capable code in Stage 01 must enforce isolation and include its negative tests.

> **Why:** Adding a tenant layer later means migrating every table, every query, and every line of code in the product. Its cost today is near zero; its cost in a year is a product rewrite.

**`MT-002` (MUST):** Every customer-owned entity has a **clear ownership chain terminating at `organization_id`**. There are no orphan entities.

**`MT-003` (MUST):** Tables read on hot paths **MUST** carry `organization_id` **denormalized**, even where it could be derived through a JOIN.

```sql
-- Correct: scope can be enforced in a single predicate
SELECT * FROM leads
WHERE organization_id = $1 AND website_id = $2;

-- Wrong: scope depends on a JOIN someone will eventually forget
SELECT l.* FROM leads l
JOIN websites w ON w.id = l.website_id
WHERE w.organization_id = $1;
```

**`MT-004` (MUST):** Denormalized fields (`organization_id` on `leads`, `assets`, `sections`, …) are **written at creation and never updated**. Transferring ownership of an entity happens through an explicit, documented transfer operation, not a casual `UPDATE`.

---

## 2. Tenant context — where it comes from

### `MT-010` (MUST) — the single source of truth

Tenant context is **derived exclusively from the trusted session/token after verifying membership**.

```ts
// packages/types/tenant-context.ts
export interface TenantContext {
  readonly userId: string;
  readonly organizationId: string;
  readonly role: OrganizationRole;
  readonly requestId: string;
}
```

### `MT-011` (MUST NOT) — the single most dangerous rule in the project

It is **absolutely forbidden** to take `organizationId` or `tenantId` from:
- the request body
- the query string
- any client-controlled header
- any value originating in the frontend

```ts
// ❌ A direct security hole — any customer types any id and reads someone else's data
async function getLeads(req) {
  return this.repo.findByOrg(req.body.organizationId);
}

// ✅ Correct
async function getLeads(ctx: TenantContext) {
  return this.repo.findByOrg(ctx.organizationId);
}
```

**`MT-012` (MUST):** If a user belongs to more than one organization, selecting the active organization happens through an **explicit action** (workspace switch) that re-verifies membership and updates the session — never through a parameter sent with every request.

**`MT-013` (MUST):** A resource identifier coming from the client (e.g. `websiteId` in the path) is **treated as untrusted input**. The first step is always to **resolve the resource within the current tenant scope** and fail with `404` if it does not belong there.

```ts
// Every operation on a site starts like this — without exception
const site = await this.websites.findByIdInOrg(websiteId, ctx.organizationId);
if (!site) throw new NotFoundError('WEBSITE_NOT_FOUND');
```

**`MT-014` (MUST):** A resource not belonging to the tenant returns **`404 Not Found`**, not `403 Forbidden`.

> **Why:** `403` confirms to an attacker that the resource exists and belongs to someone else — an information leak enabling enumeration. `404` does not distinguish "does not exist" from "not yours".

---

## 3. Enforcing scope at every layer

### 3.1 Repository layer

**`MT-020` (MUST):** Every function in a repository handling a tenant-owned table **takes scope as a mandatory first parameter**, and there is no overload without it.

```ts
interface LeadRepository {
  findMany(scope: TenantScope, filter: LeadFilter): Promise<Lead[]>;
  findById(scope: TenantScope, id: string): Promise<Lead | null>;
  create(scope: TenantScope, data: NewLead): Promise<Lead>;
  delete(scope: TenantScope, id: string): Promise<void>;
}
```

**`MT-021` (MUST NOT):** No generic `findById(id)` may exist on a tenant-owned table. However convenient it looks, it is a trap waiting for someone to fall into.

**`MT-022` (MUST):** Database access goes through **one repository layer**. Calling the ORM or raw SQL directly from a controller or service outside that layer is forbidden.

### 3.2 Automatic guard

**`MT-023` (SHOULD):** Strongly prefer automatic scope enforcement at the data-access level (Postgres Row Level Security, or ORM middleware that injects the `organization_id` predicate unconditionally), so that forgetting becomes **technically impossible** rather than merely against the rules.

**`MT-024` (MUST):** Any path that deliberately bypasses the automatic guard (maintenance tasks, cross-tenant background jobs) **MUST**:
1. Be marked by an explicitly named function: `unsafeCrossTenantQuery()`.
2. Carry a comment explaining why.
3. Be recorded in `audit_logs`.
4. Be enumerable and reviewed — a short list the team knows.

### 3.3 API layer

**`MT-025` (MUST):** Every non-public endpoint passes through a guard that builds `TenantContext` before any business logic runs. An endpoint that reaches business logic without context **fails explicitly**; it does not continue with an empty context.

**`MT-026` (MUST):** Responses **do not contain** `organization_id` or internal identifiers the client does not need. See `CORE-033`.

---

## 4. Database isolation

**`MT-030` (MUST):** The MVP model is **shared database + shared schema** with `organization_id` on every tenant-owned table.

**`MT-031` (MUST NOT):** No per-customer database or schema in the MVP (`CORE-012`). Moving to dedicated databases for enterprise customers requires an **ADR**.

**`MT-032` (MUST):** Every index on a tenant-owned table **starts with `organization_id`** (or `website_id` for site-scoped tables), because that is the first predicate in every real query.

```sql
CREATE INDEX idx_leads_org_created
  ON leads (organization_id, created_at DESC);
```

**`MT-033` (MUST):** Unique constraints that must be unique **within a tenant** include `organization_id` in the key:

```sql
-- A website slug is globally unique (it appears in the subdomain)
CREATE UNIQUE INDEX uq_websites_slug ON websites (slug);

-- A page slug is unique only within its site
CREATE UNIQUE INDEX uq_pages_website_slug ON pages (website_id, slug);
```

> Note the distinction: what appears in a public address is globally unique; what is internal is unique within its own scope.

---

## 5. Isolation outside the database

### 5.1 Object storage

**`MT-040` (MUST):** Every object key **starts with the tenant and site scope**:

```
org_<orgId>/site_<siteId>/assets/<assetId>/<variant>.<ext>
```

**`MT-041` (MUST NOT):** Never use the user-supplied filename as part of the path. The original name is stored in `assets.original_filename` as metadata only. See [`08-assets-media.md`](08-assets-media.md).

### 5.2 Cache

**`MT-042` (MUST):** Every cache key carries scope explicitly. A key without scope is cross-tenant data leakage.

```
✅ org:org_01J:site:site_07:config
✅ site:published:site_07:v42
❌ site:config:07          ← which 07? belonging to whom?
```

**`MT-043` (MUST NOT):** It is **absolutely forbidden** to cache sensitive dashboard data under a key that could be shared between tenants, or at CDN level (`Cache-Control: public`) for any response containing private data.

### 5.3 Queues and background jobs

**`MT-044` (MUST):** Every job payload carries `organizationId` and, where applicable, `siteId`, and the worker **re-verifies ownership** at execution time.

> **Why:** A job may run minutes or hours later. The site may have been deleted, the subscription may have lapsed, the resource may have been transferred. Authorisation at scheduling time is not authorisation at execution time.

**`MT-045` (MUST):** Cross-tenant jobs (aggregations, cleanup) **process one tenant per iteration** and never mix results into one shared structure.

### 5.4 Logs

**`MT-046` (MUST):** Every log line carries `requestId`, `organizationId`, and `siteId` where they exist — for investigation and diagnosis.

**`MT-047` (MUST NOT):** Never log tenant content itself (section text, lead content, form data) or any secret. Identifiers only. See `CORE-081`.

---

## 6. The public path (renderer) — a special case

A visitor on `example.com` is **neither authenticated nor a member of any tenant**. The rules here invert: there is no user context, yet isolation must remain airtight.

**`MT-050` (MUST):** The renderer resolves **hostname → site_id** through the approved domains table only. Relying on any other client-controlled header is forbidden.

**`MT-051` (MUST):** The renderer reads the **published revision only**. No public path may reach a draft, under any circumstance. See [`06-renderer-publishing.md`](06-renderer-publishing.md).

**`MT-052` (MUST NOT):** Published HTML must never expose internal identifiers, `organization_id`, the owner's email, subscription status, or any dashboard data.

**`MT-053` (MUST):** If a site is unpublished, disabled, or its subscription is suspended, the renderer returns an appropriate status page — **without disclosing the detailed reason to the visitor**.

---

## 7. Anti-patterns

| # | Forbidden pattern | Why it is dangerous | The correct form |
|---|---|---|---|
| 1 | `findById(id)` with no scope | The first hole any pentester finds | `findById(scope, id)` |
| 2 | Taking `orgId` from the body | Complete isolation bypass in one line | Derive from the session |
| 3 | `403` for another tenant's resource | Confirms the resource exists (enumeration) | `404` |
| 4 | Relying on a JOIN for scope | Easily forgotten on the next edit | Direct `organization_id` |
| 5 | Cache key without scope | Cross-tenant data leakage | Scope in the key |
| 6 | Hiding a UI button as "protection" | The API is directly exposed | Server-side check |
| 7 | `SELECT *` in an API response | Leaks internal columns as they are added | Explicit DTO |
| 8 | Worker trusting scheduling-time authorisation | State changes before execution | Re-verify at execution |
| 9 | Admin endpoint without a role check | Privilege escalation | Explicit role check |
| 10 | Copying code between modules and editing it | Someone drops the scope in the copy | One shared repository |

---

## 8. Required tests

**`MT-060` (MUST):** A dedicated `cross-tenant.spec.ts` suite runs in CI and fails the build on any regression.

> **Stage 00 only:** Cross-tenant runtime tests are N/A while there is no tenant-capable domain surface, under [ADR-001](../../adr/ADR-001-stage-00-cross-tenant-test-applicability.md). Tenant isolation remains binding from day one. No fake tenants, premature authentication, fake passing tests, or silent skips are allowed. The first tenant-capable code in Stage 01 must include the suite; no tenant-scoped resource in Stage 01 or later may merge without negative cross-tenant tests. This is not a permanent exemption and does not exempt any other test category.

**`MT-061` (MUST):** For every tenant-owned resource, a test of exactly this shape exists:

```ts
describe('cross-tenant isolation: <resource>', () => {
  it('returns 404 when reading another tenant resource', async () => {
    const a = await createTenantWithResource();
    const b = await createTenant();
    const res = await api.as(b).get(`/api/v1/<resource>/${a.resourceId}`);
    expect(res.status).toBe(404);          // not 403
    expect(res.body).not.toContain(a.orgId);
  });

  it('does not include other tenant rows in list endpoints', async () => { /* ... */ });
  it('rejects update on another tenant resource', async () => { /* ... */ });
  it('rejects delete on another tenant resource', async () => { /* ... */ });
  it('ignores organizationId sent in the request body', async () => { /* ... */ });
});
```

**`MT-062` (MUST):** Tests cover **every verb**: single read, list, create, update, delete, and file upload. Covering reads alone is **not acceptable**.

**`MT-063` (MUST):** A dedicated test proves that **sending `organizationId` in the body has no effect whatsoever** on the result.

**`MT-064` (MUST):** No PR creating a new tenant-owned table is merged before its tests are added to this suite.

---

## 9. Definition of Done — multi-tenancy

No PR touching tenant data is merged until all of the following hold:

- [ ] Every new table carries `organization_id` (and `website_id` where relevant).
- [ ] Indexes on new tables start with the scope column.
- [ ] Every new repository function takes scope mandatorily.
- [ ] No `findById(id)` without scope appears in the change.
- [ ] `organizationId` is derived from the session only, never read from client input.
- [ ] An unowned resource returns `404`, not `403`.
- [ ] New cache keys carry scope.
- [ ] New storage keys start with `org_/site_`.
- [ ] New job payloads carry scope, and the worker re-verifies.
- [ ] Cross-tenant tests added for every verb.
- [ ] Logs carry identifiers and not content.
- [ ] API responses leak no internal fields.

---

## 10. What requires an ADR

- Moving to a dedicated database or schema for any customer segment.
- Adding a new ownership layer (e.g. a Workspace between Organization and Website).
- Allowing any resource to be shared between tenants (shared templates, agencies, white-label).
- Changing where tenant context is derived from.
- Any permanent exception to `MT-011` or `MT-020`.

---

## 11. Cross-references

[`02-data-model.md`](02-data-model.md) tables and constraints · [`06-renderer-publishing.md`](06-renderer-publishing.md) public-path isolation · [`08-assets-media.md`](08-assets-media.md) storage keys · [`12-auth.md`](12-auth.md) roles and permissions · [`13-queues-jobs-cache.md`](13-queues-jobs-cache.md) queues and cache · [`14-security.md`](14-security.md) threat model · [`22-testing.md`](22-testing.md) testing strategy
