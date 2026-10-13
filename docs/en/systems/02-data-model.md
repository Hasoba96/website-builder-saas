# 02 — Domain Model & Database

> **Rule prefix:** `DM-` · **Status:** Binding · **Owner:** Backend
> **Governing document:** [`../00-PROJECT-RULES.md`](../00-PROJECT-RULES.md) · **العربية:** [`../../ar/systems/02-data-model.md`](../../ar/systems/02-data-model.md)

---

## 0. Purpose and scope

Defines the core tables, design rules, when to use JSONB and when not to, and the rules for safe migrations.

**Governing rule:** PostgreSQL is the **single source of truth**. Redis, object storage, and the CDN are all derivatives that can be rebuilt. Lose Redis and we rebuild it; lose Postgres and we have lost the product.

---

## 1. Core tables

### 1.1 Identity and tenants

| Table | Purpose | Key columns |
|---|---|---|
| `users` | User identity | `id`, `email`, `email_verified_at`, `password_hash`, `status`, `created_at` |
| `organizations` | Tenant / billing owner | `id`, `name`, `owner_user_id`, `status`, `created_at` |
| `organization_members` | Memberships and roles | `organization_id`, `user_id`, `role`, `invited_at`, `joined_at` |

### 1.2 Sites and content

| Table | Purpose | Key columns |
|---|---|---|
| `websites` | Site definition | `id`, `organization_id`, `slug`, `status`, `locale`, `default_direction`, `theme_id`, `published_revision_id` |
| `pages` | Site pages | `id`, `website_id`, `organization_id`, `slug`, `title`, `status`, `sort_order` |
| `sections` | Content blocks | `id`, `page_id`, `website_id`, `organization_id`, `type`, `variant`, `schema_version`, `data_json`, `settings_json`, `sort_order` |
| `themes` | Design values | `id`, `website_id`, `organization_id`, `tokens_json`, `base_theme_code` |
| `templates` | Reusable blueprints | `id`, `category`, `schema_version`, `blueprint_json`, `is_active` |
| `site_revisions` | Draft/published snapshots | `id`, `website_id`, `organization_id`, `version`, `status`, `snapshot_json`, `published_at`, `created_by` |

### 1.3 Distribution and media

| Table | Purpose | Key columns |
|---|---|---|
| `domains` | Domains and bindings | `id`, `website_id`, `organization_id`, `hostname`, `status`, `verification_method`, `verification_token`, `verified_at`, `is_primary` |
| `assets` | File metadata | `id`, `website_id`, `organization_id`, `object_key`, `mime`, `bytes`, `width`, `height`, `original_filename`, `status`, `variants_json` |

### 1.4 Engagement and business

| Table | Purpose | Key columns |
|---|---|---|
| `forms` | Form definitions | `id`, `website_id`, `organization_id`, `schema_json`, `notification_config_json` |
| `leads` | Form submissions | `id`, `form_id`, `website_id`, `organization_id`, `payload_json`, `source_json`, `status`, `created_at` |
| `plans` | Plans | `id`, `code`, `price_minor`, `currency`, `interval`, `is_active` |
| `subscriptions` | Subscription state | `id`, `organization_id`, `plan_id`, `status`, `current_period_end`, `grace_until`, `provider_ref` |
| `entitlements` | Plan capabilities | `plan_id`, `feature_key`, `limit_value` |
| `ai_generations` | AI requests | `id`, `website_id`, `organization_id`, `type`, `provider`, `model`, `prompt_version`, `status`, `tokens_in`, `tokens_out`, `cost_minor` |
| `analytics_events` | Raw events / buffer | `site_id`, `organization_id`, `event_type`, `schema_version`, `occurred_at`, `properties_json` |
| `audit_logs` | Sensitive admin events | `id`, `actor_user_id`, `organization_id`, `action`, `target_type`, `target_id`, `metadata_json`, `created_at` |

---

## 2. Table design rules

**`DM-001` (MUST):** Identifiers are **ULID** (or UUIDv7), prefixed by type in their public representation: `site_01J...`, `lead_01J...`.

> **Why ULID rather than UUIDv4:** it sorts by time, so it does not fragment indexes under heavy inserts.
> **Why not a sequential integer:** a sequential id in a public address reveals business volume and permits enumeration.

**`DM-002` (MUST):** Every tenant-owned table carries `organization_id` directly (`MT-003`), and every site-scoped table carries `website_id` directly.

**`DM-003` (MUST):** Application/domain tables carry `created_at` and `updated_at` as `timestamptz` in UTC where semantically applicable (`CORE-030`). Migration-tool-owned internal metadata tables have no application-owned domain semantics and are outside this requirement; do not alter `node-pg-migrate` internals to add these columns.

**`DM-004` (MUST):** Status fields take values from a **documented closed set**, enforced by a `CHECK` constraint or a database enum. Free text is forbidden.

```sql
ALTER TABLE domains ADD CONSTRAINT ck_domains_status CHECK (
  status IN ('pending_dns','verifying','tls_pending','active','failed','disconnected')
);
```

**`DM-005` (MUST):** Deletion of important entities (websites, organizations, leads) is a **soft delete** via `deleted_at`, followed by scheduled hard deletion. See [`21-backup-dr-retention.md`](21-backup-dr-retention.md).

**`DM-006` (MUST NOT):** No `ON DELETE CASCADE` on any relation holding customer data. Cascading deletes turn a small mistake into unrecoverable data loss.

**`DM-007` (MUST):** Money: integer in the smallest unit plus a separate currency column (`CORE-068`). The column name ends in `_minor`.

---

## 3. When to use JSONB — and when not to

This is where teams most often get it wrong. The rule is simple:

> **JSONB for variable-shaped content we read as one block.
> Real columns for anything we search by, filter on, bill on, or apply a business rule to.**

**`DM-010` (MUST):** JSONB is allowed and appropriate for:
- `sections.data_json` — content shape differs per section type.
- `sections.settings_json` — display settings.
- `themes.tokens_json` — design values.
- `templates.blueprint_json` — the section composition.
- `site_revisions.snapshot_json` — the full site snapshot.
- `leads.payload_json` — form fields differ per site.
- `analytics_events.properties_json` — event properties.

**`DM-011` (MUST NOT):** These **must never** live in JSONB — each gets a real column:
- Any status or relation (`*_id`).
- Anything relating to billing, entitlements, or limits.
- Anything we filter, sort, or aggregate on in a query.
- Any date we query by range.
- Any security flag (verification, ownership, permission).

```sql
-- ❌ Wrong: status and plan inside JSON = no indexes, no constraints, brittle queries
subscriptions (id, organization_id, data_json)
  data_json = {"plan":"pro","status":"active","renewsAt":"..."}

-- ✅ Correct
subscriptions (
  id, organization_id, plan_id, status,
  current_period_end timestamptz, grace_until timestamptz,
  provider_ref text, metadata_json jsonb   -- JSON only for non-critical extras
)
```

**`DM-012` (MUST):** Every JSONB column has a **schema defined in `packages/schemas`** and validated before write. JSONB is not a licence to store any shape.

**`DM-013` (MUST):** Every evolving JSONB structure carries a `schemaVersion` — inside the JSON or in a separate column. See [`03-content-engine.md`](03-content-engine.md).

**`DM-014` (SHOULD):** When search inside JSONB is needed, add a **generated column** or a considered GIN index — never a full table scan.

---

## 4. Indexes and constraints

**`DM-020` (MUST):** Indexes start with the scope column (`MT-032`).

**`DM-021` (MUST):** Minimum required indexes:

```sql
-- Domain resolution: the hottest query in the product
CREATE UNIQUE INDEX uq_domains_hostname ON domains (hostname) WHERE deleted_at IS NULL;
CREATE INDEX idx_domains_website ON domains (website_id, status);

-- Subdomain slug resolution
CREATE UNIQUE INDEX uq_websites_slug ON websites (slug) WHERE deleted_at IS NULL;

-- Site reads in the renderer
CREATE INDEX idx_pages_website_sort ON pages (website_id, sort_order);
CREATE INDEX idx_sections_page_sort ON sections (page_id, sort_order);

-- Published revision
CREATE INDEX idx_revisions_website_status ON site_revisions (website_id, status, version DESC);

-- Dashboard lists
CREATE INDEX idx_leads_org_created ON leads (organization_id, created_at DESC);
CREATE INDEX idx_websites_org ON websites (organization_id, status);

-- Memberships
CREATE UNIQUE INDEX uq_members_org_user ON organization_members (organization_id, user_id);
```

**`DM-022` (MUST):** Unique indexes on soft-deletable columns are **partial** (`WHERE deleted_at IS NULL`), otherwise a slug or hostname can never be reused after deletion.

**`DM-023` (MUST NOT):** Never add an index without a measured reason. Every index slows writes and consumes space. Indexes are added for real, existing queries — not for possibilities.

**`DM-024` (MUST):** Every foreign key has a real `FOREIGN KEY` constraint in the database. Referential integrity is not the application layer's responsibility alone.

---

## 5. Migrations

**`DM-030` (MUST):** Every schema change goes through a migration file reviewed in Git. Manual edits to the production schema are **forbidden**.

**`DM-031` (MUST):** Every migration is **online-safe**. The system does not go down to apply a change.

**`DM-032` (MUST NOT):** Never in a single migration:
- Add a `NOT NULL` column without a `DEFAULT` to a large table.
- Rename or drop a column the old code still uses.
- Lock a large table for an extended period.

**`DM-033` (MUST):** Breaking changes proceed in **three phases (expand → migrate → contract)**:

```
1) Expand   : add the new column/table. Write to both old and new. Deploy.
2) Migrate  : backfill historical data in batches. Switch reads to the new. Deploy.
3) Contract : once confirmed, drop the old column in a separate later migration.
```

**`DM-034` (MUST):** Every migration has a **written rollback plan**. If rollback is impossible (data deletion), this is stated explicitly in the PR and requires a second approval.

**`DM-035` (MUST):** Backfilling large tables happens in a **batched background job**, never inside the migration itself.

**`DM-036` (MUST):** Every migration is tested against a **production-sized data copy** before deployment. A migration that passed on a 10-row table says nothing about a 10-million-row one.

---

## 6. Performance and queries

**`DM-040` (MUST NOT):** No N+1 on any hot path — the renderer above all (`CORE-066`).

**`DM-041` (MUST):** Every list query has a **hard limit enforced in code**, even when the client did not ask for one.

**`DM-042` (MUST):** Pagination for large lists is **cursor-based**, not `OFFSET`. See [`15-api-standards.md`](15-api-standards.md).

**`DM-043` (MUST):** Any new query on a hot path is reviewed with `EXPLAIN ANALYZE` before merge, with the output attached to the PR when in doubt.

**`DM-044` (MUST NOT):** No `SELECT *` in production code. Name the columns explicitly — otherwise you leak every column added in future.

---

## 7. Anti-patterns

| # | Pattern | Why it is dangerous |
|---|---|---|
| 1 | Status or relation inside JSONB | No indexes, no constraints, brittle queries |
| 2 | `float` for money | Rounding errors in billing |
| 3 | `timestamp` without timezone | Timezone nightmares |
| 4 | `ON DELETE CASCADE` on customer data | A small mistake erases unrecoverable data |
| 5 | Free text for a status field | Unexpected values break the logic |
| 6 | Index not starting with the scope column | Full scan on a multi-tenant table |
| 7 | Migration locking a large table | Service outage |
| 8 | Backfill inside the migration | Deploy timeout and a half-applied state |
| 9 | `SELECT *` in a response | Leaks internal columns |
| 10 | Database row as an API response | Same, plus layer coupling (`CORE-033`) |

---

## 8. Required tests

**`DM-050` (MUST):** An integration test per repository proving scope is enforced (complements `MT-061`).

**`DM-051` (MUST):** A test proving each `CHECK` and `UNIQUE` constraint actually rejects invalid values.

**`DM-052` (MUST):** A test per JSONB schema: accepts valid input, rejects missing fields, rejects extra fields.

**`DM-053` (MUST):** Every migration is tested up and down in CI against a clean database.

---

## 9. Definition of Done — data model

- [ ] The new application/domain table carries scope and timestamps as applicable under `DM-002` and `DM-003`; migration-tool-owned metadata is not a domain table.
- [ ] Every status field has a `CHECK` constraint and documented values.
- [ ] Indexes start with the scope column; unique indexes are partial where soft delete exists.
- [ ] No `ON DELETE CASCADE` on customer data.
- [ ] Every JSONB column has a schema in `packages/schemas` plus a `schemaVersion`.
- [ ] No status, relation, or billing data inside JSONB.
- [ ] The migration is online-safe and reversible, with a written rollback plan.
- [ ] Backfill is a batched background job, not part of the migration.
- [ ] `EXPLAIN ANALYZE` reviewed for any hot-path query.
- [ ] No `SELECT *` and no DB row passed to the API.
- [ ] `.env.example` and the docs updated if a contract changed.

---

## 10. What requires an ADR

- Changing the primary database or adding a new data store.
- Adopting partitioning or sharding.
- Moving analytics to a separate store (e.g. ClickHouse).
- Changing the identifier strategy (ULID → something else).
- Allowing JSONB for any billing or entitlement data.

---

## 11. Cross-references

[`01-multi-tenancy.md`](01-multi-tenancy.md) · [`03-content-engine.md`](03-content-engine.md) content schemas · [`06-renderer-publishing.md`](06-renderer-publishing.md) revisions · [`11-billing-entitlements.md`](11-billing-entitlements.md) · [`20-performance-caching.md`](20-performance-caching.md) · [`21-backup-dr-retention.md`](21-backup-dr-retention.md)
