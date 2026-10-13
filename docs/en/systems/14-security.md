# 14 — Security Engineering

> **Rule prefix:** `SE-` · **Status:** Binding · **Owner:** Security
> **Governing document:** [`../00-PROJECT-RULES.md`](../00-PROJECT-RULES.md) · **العربية:** [`../../ar/systems/14-security.md`](../../ar/systems/14-security.md)

---

## 0. Threat model

We host **sites for hundreds of thousands of parties**, on **domains they own**, with **content they upload**. That makes the attack surface wider than an ordinary SaaS application:

| Who we defend against | The threat |
|---|---|
| An anonymous visitor to a published site | Injection, form abuse, denial of service |
| A malicious tenant | Reaching another tenant's data, exploiting our infrastructure |
| A compromised tenant | Using their site to attack their visitors or our customers |
| An external attacker | Domain hijacking, phishing, credential theft |

**Governing rule:** security is not a pre-launch phase. It is **a constraint on every PR** — which is why it appears in the Definition of Done of every system.

---

## 1. Threats and controls

| Risk | Mandatory control | File |
|---|---|---|
| Cross-tenant access | Mandatory scoping + authorization tests | `01` |
| XSS from user content | Structured content + escape by default + no raw HTML | `03`, `09` |
| SSRF | Address allow/deny controls + egress restriction | This file |
| File upload abuse | Real type detection + limits + domain isolation | `08` |
| Credential theft | Secure cookies + rate limits + MFA + monitoring | `12` |
| API abuse | Auth + limits + quotas + WAF | `15` |
| Domain hijacking | DNS verification + uniqueness + audit | `07` |
| Webhook spoofing | Signature verification + replay protection | `11`, `09` |
| Secrets leakage | Secret manager + commit prevention + log redaction | This file |
| Dependency risk | Lockfiles + automated scanning | `18` |
| Prompt injection | Data/instruction separation + output validation | `05` |
| Denial of service | Limits on every public path + bounded sizes | `15`, `20` |

---

## 2. Injection and user content

**`SE-010` (MUST):** Content is **structured, never HTML** (`CE-002`). This alone removes the overwhelming majority of XSS surface from the product.

**`SE-011` (MUST):** Escaping is the default in React. `dangerouslySetInnerHTML` is forbidden except through a centrally approved, documented sanitizer (`CE-061`).

**`SE-012` (MUST):** Any permitted rich text is sanitized with a mature library using an element and attribute allowlist — never a hand-written regex.

**`SE-013` (MUST):** Link protocols come from an allowlist: `https`, `mailto`, `tel`, `#`. **`javascript:` and `data:` are forbidden** (`CE-007`).

**`SE-014` (MUST):** SQL through parameterized queries only (`CORE-064`).

**`SE-015` (MUST):** Lead content is escaped when rendered in the dashboard (`FL-026`), and CSV export is formula-injection protected (`FL-027`).

---

## 3. Content Security Policy

**`SE-020` (MUST):** CSP is applied to **the dashboard** and to **published sites** — with two different policies.

**`SE-021` (MUST):** The dashboard CSP is strict: no `unsafe-inline` and no `unsafe-eval` in production, with nonces or hashes for required scripts.

**`SE-022` (MUST):** The published-site CSP permits only what sections need, and blocks unapproved external scripts.

**`SE-023` (MUST):** Mandatory security headers on every response:

```
Content-Security-Policy: <appropriate policy>
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Frame-Options / frame-ancestors  ← per context
Permissions-Policy: <least privilege>
```

**`SE-024` (MUST):** Domain separation is mandatory: dashboard, published sites, and user assets on **different domains** (`AS-042`).

> **Why:** Domain separation contains any breach. A hole in a customer's site must never reach dashboard sessions.

---

## 4. SSRF

**`SE-030` (MUST):** Any fetch to a user-specified address (webhooks, imports, link checks) is subject to mandatory SSRF controls:

```
✅ Allowed: https only, port 443, a publicly resolvable domain
❌ Rejected:
   - localhost, 127.0.0.0/8, ::1
   - 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16
   - 169.254.0.0/16  ← the most dangerous: cloud credentials
   - fc00::/7, fe80::/10
   - any protocol other than http/https
```

**`SE-031` (MUST):** The check runs **after DNS resolution and before connecting**, and is repeated on every redirect.

> **Why:** An attacker registers a public domain that resolves to `169.254.169.254`, or uses a redirect from a valid domain to an internal address. Checking the string alone is not enough.

**`SE-032` (MUST):** Redirects are **count-limited**, and every hop is checked.

**`SE-033` (MUST):** A short timeout and a response size cap on every external fetch.

---

## 5. Secrets

**`SE-040` (MUST NOT):** **Absolutely no** secret in Git — not in code, tests, examples, logs, or screenshots (`CORE-070`).

**`SE-041` (MUST):** Automated secret scanning in CI **and pre-commit**, failing the build on detection.

**`SE-042` (MUST):** Any leaked secret — even momentarily, even on a deleted branch — is **considered burned and rotated immediately**. Deleting the commit is not sufficient.

**`SE-043` (MUST):** Secrets come from a secret manager or a protected environment, fully separated between environments.

**`SE-044` (MUST NOT):** No production credentials on developer machines except through a controlled mechanism in genuine necessity.

**`SE-045` (MUST):** Automatic redaction in the logger for anything resembling a secret: `password`, `token`, `secret`, `apiKey`, `authorization`, `cookie`, card numbers.

---

## 6. Limits and abuse prevention

**`SE-050` (MUST):** Rate limiting on **every** public path without exception: forms, analytics, authentication, API.

**`SE-051` (MUST):** Limits across more than one dimension: per IP · per account · per site · platform-wide.

**`SE-052` (MUST):** WAF and basic abuse controls configured at the CDN layer.

**`SE-053` (MUST):** Size limits: request size · JSON depth and breadth · array element count · file size.

> **Why JSON depth:** JSON nested thousands of levels deep exhausts the parser's stack and crashes the process — a denial of service from one small request.

**`SE-054` (MUST):** AI generation abuse protections (`AI-051`) and the spend cap (`AI-053`).

---

## 7. Dependencies and supply chain

**`SE-060` (MUST):** Lockfiles are always committed, and CI installs with `--frozen-lockfile`.

**`SE-061` (MUST):** Automated dependency vulnerability scanning, failing the build on critical or high severity.

**`SE-062` (MUST):** Every new dependency is reviewed (`CORE-002`).

> Apply the risk-based classification and disposition in [CORE-002](../00-PROJECT-RULES.md). All direct/transitive dependencies remain in inventory, security scanning, license, integrity/source, and graph review. Transitive age/deprecation findings require documented disposition and applicable tracking deadlines/event-driven re-evaluation, not automatic rejection or silent acceptance. No hard blocker or High/Critical gate is waived.

**`SE-063` (MUST NOT):** Never install packages from unofficial sources or direct Git URLs without review.

**`SE-064` (MUST):** Postinstall scripts are reviewed or disabled where possible.

---

## 8. Audit and incident response

**`SE-070` (MUST):** Recorded in `audit_logs`: publishes · domain changes · member and role changes · billing operations · destructive deletions · API key operations · ownership transfers · every deliberate guard bypass (`MT-024`).

**`SE-071` (MUST):** The log is **append-only** and not modifiable by ordinary users.

**`SE-072` (MUST):** Every entry carries actor · tenant · action · target · timestamp · `requestId`.

**`SE-073` (MUST):** An incident response plan documented in `docs/runbooks/`: who is notified, how we contain, how we communicate, how we document.

**`SE-074` (MUST):** Any cross-tenant access incident is treated as a **critical incident** — immediate containment, investigation, then a written root cause analysis.

---

## 9. Anti-patterns

| # | Pattern | Why it is dangerous |
|---|---|---|
| 1 | Sanitizing HTML with hand-written regex | Always bypassed — use a mature library |
| 2 | A protocol blocklist | Always incomplete — allowlist only |
| 3 | SSRF checks on the string before DNS resolution | Bypassed by a domain resolving internally |
| 4 | No check on redirects | Bypassed in one hop |
| 5 | A secret in a test or example | Git remembers everything |
| 6 | Deleting a commit as a leak remedy | The secret is already burned |
| 7 | `unsafe-inline` in production CSP | Defeats most of CSP's value |
| 8 | Everything on one origin | One breach reaches everything |
| 9 | A public path without rate limiting | Cheap denial of service |
| 10 | No JSON depth limit | Process crash from a small request |
| 11 | Error messages revealing internals | Free reconnaissance for an attacker |
| 12 | A mutable audit log | Evidence erased after a breach |
| 13 | Ignoring dependency vulnerabilities | Supply-chain compromise |

---

## 10. Required tests

**`SE-080` (MUST):** A security test suite in CI covering: cross-tenant access · XSS · upload validation · authorization · SSRF · prompt injection.

> Cross-tenant runtime applicability in Stage 00 is governed by [ADR-001](../../adr/ADR-001-stage-00-cross-tenant-test-applicability.md). No other security requirement is waived by that decision.

**`SE-081` (MUST):** XSS test: known payloads in every text field → no execution in any render context.

**`SE-082` (MUST):** SSRF test: direct internal addresses, a domain resolving internally, and a redirect to an internal address → **all rejected**.

**`SE-083` (MUST):** Header test: every security header present on every response.

**`SE-084` (MUST):** Log redaction test: logging an object containing `password` and `token` → the values are redacted.

**`SE-085` (MUST):** Size limit test: deeply nested JSON, a huge array, a large request → gracefully rejected.

**`SE-086` (MUST):** Secret scanning and dependency scanning on every CI run.

---

## 11. Definition of Done — security

- [ ] No raw HTML from any source.
- [ ] Escaping by default; sanitization via a mature library.
- [ ] Link protocol allowlist.
- [ ] CSP applied with no `unsafe-inline` in production.
- [ ] Every security header on every response.
- [ ] Domain separation applied.
- [ ] SSRF controls after DNS resolution and on every redirect.
- [ ] No secrets in Git; automated scanning enabled.
- [ ] Secret redaction in the logger.
- [ ] Rate limiting on every public path across dimensions.
- [ ] Size and depth limits applied.
- [ ] Lockfiles + vulnerability scanning failing the build.
- [ ] `audit_logs` append-only and covering every sensitive event.
- [ ] The security test suite is green.
- [ ] The incident runbook exists and is current.

---

## 12. What requires an ADR

- Allowing user-supplied code execution (requires a full sandbox model).
- Relaxing CSP in any way.
- Serving user assets from the dashboard domain.
- Allowing fetches to internal addresses for any reason.
- A permanent bypass of any control in this file.

---

## 13. Cross-references

Every system file carries a security dimension. The most closely related: [`01`](01-multi-tenancy.md) · [`03`](03-content-engine.md) · [`05`](05-ai-generation.md) · [`07`](07-domains-ssl.md) · [`08`](08-assets-media.md) · [`09`](09-forms-leads.md) · [`12`](12-auth.md) · [`15`](15-api-standards.md) · [`18`](18-infrastructure-cicd.md) · [`22`](22-testing.md)
