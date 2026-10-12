# 12 — Authentication & Authorization

> **Rule prefix:** `AU-` · **Status:** Binding · **Owner:** Backend / Security
> **Governing document:** [`../00-PROJECT-RULES.md`](../00-PROJECT-RULES.md) · **العربية:** [`../../ar/systems/12-auth.md`](../../ar/systems/12-auth.md)
> **Implements principle:** `CORE-016` (Least privilege)

---

## 0. The essential distinction

| | The question | Failure means |
|---|---|---|
| **Authentication** | Who are you? | Impersonation |
| **Authorization** | What are you allowed to do? | Privilege escalation |

Both are always required. **Correct authentication without correct authorization means every registered user can do everything.**

---

## 1. Authentication

**`AU-001` (MUST):** Dashboard sessions use **cookies** with these attributes, mandatorily:

```
HttpOnly            ← unreadable by JavaScript (protects against session theft via XSS)
Secure              ← sent over HTTPS only
SameSite=Lax (or Strict)  ← CSRF protection
Path=/
Max-Age explicitly set
```

**`AU-002` (MUST NOT):** **Never** store a session token or any long-lived token in `localStorage` or `sessionStorage`.

> **Why:** A single XSS hole — anywhere in the dashboard — immediately becomes complete theft of every user's session. An `HttpOnly` cookie cannot be read by JavaScript at all.

**`AU-003` (MUST):** Passwords hashed with **Argon2id** (or bcrypt with an appropriate cost factor). MD5 or SHA in any form is **forbidden**.

**`AU-004` (MUST):** Minimum password length **12 characters**, checked against common breached-password lists. Pointless complexity rules (symbol + digit + uppercase) that produce `P@ssw0rd1` are **forbidden**.

**`AU-005` (MUST):** Strict rate limiting on login, registration, password reset, and verification resend — **per account and per IP together**.

**`AU-006` (MUST):** The login failure message is **uniform**: "Email or password is incorrect". Distinguishing "account does not exist" from "wrong password" is **forbidden**.

> **Why:** The distinction allows account enumeration, letting an attacker learn which emails are registered with us and focus the attack there.

**`AU-007` (MUST):** Password reset tokens: **short-lived (≤ 60 minutes)**, **single-use**, strongly random, and invalidated on use or on password change.

**`AU-008` (MUST):** A reset request returns **the same message** whether the email exists or not (same reason as `AU-006`).

**`AU-009` (MUST):** Changing the password or email **invalidates all other sessions** and notifies the user by email.

**`AU-010` (MUST):** Sessions have an **absolute maximum lifetime** in addition to an idle timeout, and are renewed periodically rather than indefinitely.

**`AU-011` (MUST):** Logout invalidates the session **on the server**, not merely by deleting the browser cookie.

**`AU-012` (SHOULD):** MFA available for sensitive accounts, and mandatory for any internal administrative account.

---

## 2. Authorization — roles

**`AU-020` (MUST):** Roles within an organization:

| Role | Permissions |
|---|---|
| **Owner** | Everything: billing, tenant deletion, member invitations, ownership transfer, full site control |
| **Admin** | Manage sites and members — **without** ownership transfer, tenant deletion, or billing |
| **Editor** | Edit and publish assigned sites per policy |
| **Viewer** | Read analytics and leads only where granted |

**`AU-021` (MUST):** **At least one owner always.** An organization must never reach an ownerless state (by removing or demoting the last owner).

**`AU-022` (MUST):** Ownership transfer is an explicit operation confirmed by both parties and recorded in `audit_logs`.

**`AU-023` (MUST NOT):** A user must **never** raise their own role, or another's, above their current role.

> **Why:** Without this rule, one Admin promotes themselves to Owner and takes over the account and its billing.

**`AU-024` (MUST):** Invitations: email plus a short-lived, single-use random token, **bound to the invited email address**.

**`AU-025` (MUST):** Removing a member **invalidates their sessions** for that organization immediately.

---

## 3. Authorization — enforcement

**`AU-030` (MUST):** Checks are **server-side on every sensitive endpoint** (`CORE-004`). Hiding a button is not protection.

**`AU-031` (MUST):** The mandatory check order on every request:

```
1. Authenticated?              no → 401
2. Session valid and active?   no → 401
3. Member of the organization? no → 404 (not 403)
4. Role sufficient for the action? no → 403
5. Resource within scope?      no → 404
6. Entitlement allows it?      no → 403 with limit details
```

**`AU-032` (MUST):** Precise distinction between `401`, `403`, and `404`:

| Code | Meaning |
|---|---|
| `401` | Unauthenticated or session expired |
| `403` | Authenticated and a member, but the role does not permit this action |
| `404` | The resource does not exist **or** does not belong to the tenant (`MT-014`) |

**`AU-033` (MUST):** The default is **deny**. An endpoint without an explicit check is **rejected**, not allowed.

> **Why:** With an open default, a forgotten endpoint becomes a silent hole. With a closed default, it becomes a visible bug caught immediately in testing.

**`AU-034` (MUST):** Permissions are checked on **the action and the resource together**, never on the action alone.

---

## 4. API keys (once added)

**`AU-040` (MUST):** Keys are stored **hashed**, like passwords. Storing them in plaintext is **forbidden**.

**`AU-041` (MUST):** The key is shown **once only**, at creation, and cannot be retrieved afterwards.

**`AU-042` (MUST):** Each key carries a limited permission scope, one organization, an optional expiry, and a last-used record.

**`AU-043` (MUST):** Key revocation is **immediate**.

**`AU-044` (MUST):** Key creation, revocation, and first use are all recorded in `audit_logs`.

---

## 5. Session security

**`AU-050` (MUST):** CSRF protection on every state-changing dashboard operation: `SameSite` plus a CSRF token or an `Origin`/`Referer` check.

**`AU-051` (MUST):** Session fixation is prevented: a **new session identifier** on every successful login.

**`AU-052` (MUST):** Sensitive operations (changing email, changing password, deleting the organization, transferring ownership, changing billing) require **password re-confirmation** if time has passed since authentication.

**`AU-053` (MUST):** Email notification on: login from a new device, password change, email change, member added or removed, billing change.

**`AU-054` (MUST):** Users can view their active sessions and terminate any of them.

---

## 6. Logging and audit

**`AU-060` (MUST NOT):** **Never** log passwords, tokens, API keys, or session material — not even in development, and not even partially hashed.

**`AU-061` (MUST):** Recorded in `audit_logs`: successful and failed logins, password change, email change, role changes, invitations, removals, API key operations, ownership transfer.

**`AU-062` (MUST):** Repeated failed login attempts **raise an alert** above a threshold.

---

## 7. Anti-patterns

| # | Pattern | Why it is dangerous |
|---|---|---|
| 1 | Token in `localStorage` | Any XSS means theft of every session |
| 2 | Error message distinguishing existing accounts | Account enumeration |
| 3 | `403` for another tenant's resource | Confirms the resource exists |
| 4 | Default "allow" | A forgotten endpoint is a silent hole |
| 5 | Checking the action without the resource | Modifying a resource you don't own |
| 6 | Raising a role above your own | Account takeover |
| 7 | Plaintext API keys | A database leak leaks every key |
| 8 | Long-lived reset tokens | A wide attack window |
| 9 | Reusable reset tokens | Re-takeover after recovery |
| 10 | No invalidation on password change | The attacker stays inside the account |
| 11 | No new session id on login | Session fixation |
| 12 | No CSRF protection | Operations executed on the user's behalf |
| 13 | MD5/SHA for passwords | Instantly cracked on breach |
| 14 | Pointless complexity rules | Weaker passwords in practice |

---

## 8. Required tests

**`AU-070` (MUST):** A test per role × per action: permitted is allowed, forbidden is rejected with the correct code.

**`AU-071` (MUST):** Privilege escalation test: an Admin attempting to promote themselves to Owner → rejected.

**`AU-072` (MUST):** Non-enumeration test: an existing email and a non-existent one → **the same message and approximately the same response time**.

**`AU-073` (MUST):** Reset token test: used twice → the second is rejected; after expiry → rejected.

**`AU-074` (MUST):** Invalidation test: after a password change, other sessions **no longer work**.

**`AU-075` (MUST):** Session fixation test: the session identifier changes after login.

**`AU-076` (MUST):** CSRF test: a state-changing request without a valid token → rejected.

**`AU-077` (MUST):** Last owner test: removing or demoting the last owner → rejected.

**`AU-078` (MUST):** Closed-default test: an endpoint without a guard → the test fails.

---

## 9. Definition of Done — auth

- [ ] Session in a cookie with `HttpOnly` + `Secure` + `SameSite`.
- [ ] No token in browser storage.
- [ ] Passwords hashed with Argon2id/bcrypt at an appropriate cost.
- [ ] 12-character minimum plus breached-list checking, no pointless complexity rules.
- [ ] Rate limiting on every authentication path.
- [ ] Uniform messages preventing account enumeration.
- [ ] Reset tokens short-lived and single-use.
- [ ] Password/email change invalidates other sessions and notifies the user.
- [ ] A new session id on every login.
- [ ] CSRF protection on every state-changing operation.
- [ ] The six-step check order applied.
- [ ] `401`/`403`/`404` used precisely.
- [ ] Default deny — no endpoint without a guard.
- [ ] Checks cover action and resource together.
- [ ] At least one owner always guaranteed.
- [ ] No secrets or tokens logged.
- [ ] All sensitive events in `audit_logs`.

---

## 10. What requires an ADR

- Adding OAuth, SSO, or SAML.
- Changing the session mechanism (cookies → JWT, for instance).
- Adding roles or a finer permission-based model.
- Allowing cross-organization API keys.
- Relaxing any security requirement in this file.

---

## 11. Cross-references

[`01-multi-tenancy.md`](01-multi-tenancy.md) context derivation · [`11-billing-entitlements.md`](11-billing-entitlements.md) · [`14-security.md`](14-security.md) · [`15-api-standards.md`](15-api-standards.md) status codes · [`19-observability.md`](19-observability.md) alerting · [`22-testing.md`](22-testing.md)
