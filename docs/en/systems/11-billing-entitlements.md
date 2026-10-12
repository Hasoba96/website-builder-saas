# 11 — Billing & Entitlements

> **Rule prefix:** `BE-` · **Status:** Binding · **Owner:** Backend
> **Governing document:** [`../00-PROJECT-RULES.md`](../00-PROJECT-RULES.md) · **العربية:** [`../../ar/systems/11-billing-entitlements.md`](../../ar/systems/11-billing-entitlements.md)

---

## 0. The foundational rule

> ### `BE-001` (MUST NOT)
> The code **must never** ask "is this user Pro?" in dozens of places.
> Every question about a feature or a limit goes through **one central Entitlement Service**.

```ts
can(tenant, 'custom_domain')            → boolean
limit(tenant, 'websites')               → 5
limit(tenant, 'ai_generations_monthly') → 100
usage(tenant, 'storage_bytes')          → 1_240_000_000
```

**Why this rule comes before everything else:**

Plan-name checks scattered through the code mean adding a new plan requires editing dozens of files, a promotional offer for one customer becomes impossible, and every forgotten place becomes either a hole (a paid feature given free) or a bug (a customer who paid and does not receive what they paid for). As plans multiply, this mess becomes unfixable.

```ts
// ❌ Forbidden — scattered, brittle, unevolvable
if (org.plan === 'pro' || org.plan === 'business') { ... }
if (subscription.planCode !== 'free') { ... }

// ✅ Correct — one source of truth
if (await entitlements.can(ctx, 'custom_domain')) { ... }
```

---

## 1. The entitlement model

**`BE-010` (MUST):** Every feature or limit has a **stable, documented `feature_key`**. Plans map keys to values, not the other way round.

| `feature_key` | Type | Example |
|---|---|---|
| `websites` | limit | 1 / 5 / 25 |
| `pages_per_website` | limit | 5 / 20 / unlimited |
| `custom_domain` | boolean | false / true |
| `remove_branding` | boolean | false / true |
| `ai_generations_monthly` | limit | 10 / 100 / 1000 |
| `storage_bytes` | limit | 500MB / 5GB / 50GB |
| `team_members` | limit | 1 / 5 / 25 |
| `leads_retention_days` | limit | 30 / 365 / 1095 |
| `analytics_history_days` | limit | 7 / 90 / 365 |

**`BE-011` (MUST):** "Unlimited" is represented by an explicit, known value (`null` or `-1`), **documented and consistent** — never by an arbitrary large number.

**`BE-012` (MUST):** Adding a new feature means adding a new `feature_key` plus its value in **every** existing plan. Leaving a plan without a defined value is **forbidden**.

> **Why:** A missing key means undefined behaviour — and it will be read either as "denied", angering a paying customer, or as "allowed", giving a paid feature away.

**`BE-013` (MUST):** The entitlement service supports **tenant-level overrides** above the plan value.

> **Why:** One day you will need to give an important customer a higher limit, or compensate someone for an outage. Without an override mechanism, the only recourse becomes a dangerous manual database edit.

**`BE-014` (MUST):** Resolution order: **tenant override → plan value → safe default (the most restrictive)**.

---

## 2. Enforcement

**`BE-020` (MUST):** Enforcement is **always server-side** (`CORE-004`). The UI displays limits and improves the experience; it enforces nothing.

**`BE-021` (MUST):** The check happens at the **actual point of execution**, not only in the UI and not at one distant chokepoint.

**`BE-022` (MUST):** Count-based limit checks are **atomic with creation** — never a check followed by a separate create.

```ts
// ❌ Race condition: two concurrent requests both exceed the limit
const count = await websites.countInOrg(orgId);
if (count >= limit) throw new LimitExceeded();
await websites.create(...);

// ✅ Atomic: a database constraint, a lock, or a check inside the transaction
await db.transaction(async (tx) => {
  const count = await websites.countInOrgForUpdate(tx, orgId);
  if (count >= limit) throw new LimitExceeded('websites', limit);
  await websites.create(tx, ...);
});
```

**`BE-023` (MUST):** The error carries **the key, the limit, and current usage**, so the customer can understand and act:

```json
{
  "error": {
    "code": "PLAN_LIMIT_EXCEEDED",
    "featureKey": "websites",
    "limit": 5,
    "current": 5,
    "message": "You have reached the maximum number of websites on your current plan"
  }
}
```

**`BE-024` (MUST):** Monthly limits have a **clear reset window** tied to the subscription cycle, not the calendar month — unless explicitly documented otherwise.

**`BE-025` (MUST):** The check also runs in the worker, not only at scheduling time (`MT-044`).

---

## 3. Subscriptions and lifecycle

**`BE-030` (MUST):** Subscription states come from a closed set:

```
trialing → active → past_due → canceled
                 ↘ paused
active → active (renewal)
```

**`BE-031` (MUST):** A failed renewal enters a **documented grace period** before any restriction.

> **Why:** An expired card or a transient bank failure is entirely routine. Taking down a customer's site at the first payment failure harms someone who would have paid hours later — and loses the relationship permanently.

**`BE-032` (MUST):** During the grace period the site **keeps working**, with a clear notice in the dashboard and by email.

**`BE-033` (MUST NOT):** **Never delete data** on a plan downgrade or cancellation (`CORE-083`).

**`BE-034` (MUST):** Downgrades follow a documented policy:

| Situation | Mandatory behaviour |
|---|---|
| More sites than the new plan's limit | They stay readable and published; no new creation until back under the limit |
| Storage over the limit | No new uploads; no automatic deletion |
| Custom domain no longer in the plan | Documented policy (deferred disablement after notice) — never an abrupt cut |
| More members than the limit | No new additions; no automatic removal |

**`BE-035` (MUST):** Cancellation keeps service until the **end of the paid period**, then moves to a restricted state with a retention window before any deletion.

**`BE-036` (MUST):** Every subscription state change is recorded in `audit_logs`.

---

## 4. Payment provider webhooks

**`BE-040` (MUST):** The provider webhook is the **source of truth** for payment state — not the UI result and not the post-payment redirect.

> **Why:** The user may close the browser before the redirect. The payment succeeded and the account was never activated — a guaranteed support ticket and a rightly angry customer.

**`BE-041` (MUST):** **Signature verification is mandatory** before any processing. No valid signature means immediate rejection.

> **Why:** Without verification, anyone who learns the webhook URL sends "payment succeeded" and gets a paid plan free.

**`BE-042` (MUST):** Processing is **idempotent**. Providers resend events when in doubt — that is normal behaviour, not an exception.

**`BE-043` (MUST):** Events may arrive **out of order**. Processing relies on the **timestamp or version number** in the event, never on arrival order.

> **Why:** Processing a stale "cancelled" event after a newer "renewed" event cancels a paying customer's active subscription.

**`BE-044` (MUST):** An unknown event is logged and safely ignored **with a `200` response** — never a failure that makes the provider retry indefinitely.

**`BE-045` (MUST):** Processing failures go to a retry queue then a DLQ **with an immediate alert**. A failed payment webhook is not an ordinary error — it is money.

**`BE-046` (MUST):** Every received webhook is recorded with its event id and processing status, for reconciliation and audit.

---

## 5. Usage metering

**`BE-050` (MUST):** Usage is measured **in our own systems**, never by relying on the payment provider.

**`BE-051` (MUST):** Current usage is visible to the user in the dashboard alongside their limit.

**`BE-052` (MUST):** Alert on approaching the limit (e.g. 80%) **before** reaching it.

**`BE-053` (MUST):** Expensive usage computations (storage, for instance) are aggregated periodically and stored, never computed per request.

---

## 6. Money in code

**`BE-060` (MUST):** Amounts are **integers in the smallest unit** plus a currency code (`CORE-068`). `float` is **forbidden** under any circumstance.

**`BE-061` (MUST):** Every financial calculation (tax, discount, proration) uses integer arithmetic, with a documented and tested rounding rule.

**`BE-062` (MUST):** Prices are read from one source. A hardcoded price in code is **forbidden**.

**`BE-063` (MUST NOT):** **Never** store card or bank account data in our systems. The provider holds it; we hold only its reference.

---

## 7. Anti-patterns

| # | Pattern | Why it is dangerous |
|---|---|---|
| 1 | Plan-name checks scattered in code | Unfixable mess as plans grow |
| 2 | Enforcement only in the UI | Limits bypassed by a direct API call |
| 3 | Check then create in two steps | Race condition exceeds the limit |
| 4 | Webhook without signature verification | A free paid plan for anyone |
| 5 | Non-idempotent webhook processing | Double billing or wrong state |
| 6 | Ignoring event ordering | Cancels a paying customer's subscription |
| 7 | Treating the redirect as payment confirmation | Successful payment, unactivated account |
| 8 | Deleting data on downgrade | Irreversible loss plus legal exposure |
| 9 | Cutting service instantly on payment failure | Losing a customer over an expired card |
| 10 | `float` for money | Rounding errors in money |
| 11 | Missing feature key in a plan | Undefined behaviour |
| 12 | Storing card data | Enormous, needless PCI exposure |
| 13 | No tenant override mechanism | Dangerous manual database edits |

---

## 8. Required tests

**`BE-070` (MUST):** A test per `feature_key` per plan: the value is defined and correctly applied.

**`BE-071` (MUST):** Race condition test: two concurrent create requests at the limit → only one succeeds.

**`BE-072` (MUST):** Webhook signature test: a wrong or missing signature → rejected with no state change.

**`BE-073` (MUST):** Idempotency test: the same event twice → a single state change.

**`BE-074` (MUST):** Ordering test: a stale event arriving after a newer one → **does not revert** the newer state.

**`BE-075` (MUST):** Downgrade test: over-limit data **is not deleted**, and restrictions apply only to new creation.

**`BE-076` (MUST):** Grace period test: a failed renewal → the site keeps working through the grace window.

**`BE-077` (MUST):** Financial calculation test: tax, discount, and proration in integer arithmetic with no rounding errors.

---

## 9. Definition of Done — billing & entitlements

- [ ] Every feature check goes through `EntitlementService` — no plan-name checks in code.
- [ ] Any new `feature_key` is defined in every plan.
- [ ] Enforcement is server-side at the point of execution.
- [ ] Limit checks are atomic with creation.
- [ ] Errors carry the key, the limit, and current usage.
- [ ] Webhook signature verified before any processing.
- [ ] Processing is idempotent and order-independent.
- [ ] Every event recorded with its id and processing status.
- [ ] Payment webhook failures raise an immediate alert.
- [ ] A grace period applies before any restriction.
- [ ] No data deletion on downgrade or cancellation.
- [ ] Usage measured by us, shown to the user, with an early warning.
- [ ] All amounts are integers in the smallest unit.
- [ ] No card data stored in our systems.
- [ ] A tenant-level override mechanism exists.
- [ ] All subscription changes recorded in `audit_logs`.

---

## 10. What requires an ADR

- Changing the payment provider.
- Adopting usage-based billing.
- Supporting multiple currencies or regional pricing.
- Fundamentally changing the entitlement model.
- Allowing any payment data storage on our side.

---

## 11. Cross-references

[`01-multi-tenancy.md`](01-multi-tenancy.md) · [`02-data-model.md`](02-data-model.md) plan tables · [`05-ai-generation.md`](05-ai-generation.md) generation limits · [`07-domains-ssl.md`](07-domains-ssl.md) · [`08-assets-media.md`](08-assets-media.md) storage quota · [`12-auth.md`](12-auth.md) · [`14-security.md`](14-security.md) webhook spoofing
