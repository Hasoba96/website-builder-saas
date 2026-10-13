# 05 — AI Generation Architecture

> **Rule prefix:** `AI-` · **Status:** Binding · **Owner:** Backend
> **Governing document:** [`../00-PROJECT-RULES.md`](../00-PROJECT-RULES.md) · **العربية:** [`../../ar/systems/05-ai-generation.md`](../../ar/systems/05-ai-generation.md)

---

## 0. The foundational rule — read this before anything else

> ### `AI-001` (MUST) — the AI does not produce site code
> The AI returns **structured JSON** that passes full schema validation. Then the **trusted engine** — not the AI — renders.
> No HTML, CSS, or JS from the AI ever reaches a published site. Never. Under any circumstances.

**Why this is the single most important architectural decision in the product:**

| If the AI produced HTML | If the AI produces structured JSON |
|---|---|
| An XSS hole in every site | No attack surface from content |
| Design changes become impossible | Changing the theme changes every site |
| Variant switching becomes impossible | Switching is instant and lossless |
| Translation and reuse become impossible | Content is processable data |
| Every site is a special case | Every site comes from one engine |
| The product is a cheap page generator | The product is a platform |

**`AI-002` (MUST):** Any AI output is treated as **untrusted input from an external source**, with the same caution applied to input from a completely unknown user.

---

## 1. The full flow

```
User input (business category / free description)
   ↓
Prompt / context builder  (pinned prompt version)
   ↓
AI provider adapter       (unified interface)
   ↓
Structured JSON
   ↓
Schema validation ──── invalid ──→ bounded repair/retry ──→ clean failure
   ↓ valid
Business rules / moderation / limits
   ↓
Create draft revision
   ↓
Notify the user (job complete)
```

**`AI-010` (MUST):** Every generation runs as a **background job** on the `ai` queue, never inside the request/response cycle (`CORE-015`).

**`AI-011` (MUST):** The endpoint returns `202 Accepted` with a `jobId` immediately. The UI polls status and shows meaningful progress.

**`AI-012` (MUST):** Every generation job has an **explicit maximum duration**. A job exceeding it is terminated and marked `failed` with a message the user can understand.

---

## 2. Provider abstraction

**`AI-020` (MUST):** No AI provider is called directly from any module. All calls go through one interface:

```ts
// packages/ai/provider.ts
export interface AiProvider {
  generateStructuredContent<T>(req: {
    schema: ZodSchema<T>;
    promptId: string;
    promptVersion: number;
    variables: Record<string, string>;
    maxTokens: number;
    timeoutMs: number;
  }): Promise<AiResult<T>>;

  generateImage(req: {
    promptId: string;
    promptVersion: number;
    variables: Record<string, string>;
    size: ImageSize;
    timeoutMs: number;
  }): Promise<AiResult<GeneratedImage>>;
}
```

**`AI-021` (MUST):** The layer enables provider switching, fallback to an alternate provider, budget-based routing, unified logging, and cost accounting — all without touching business logic.

**`AI-022` (MUST NOT):** Never leak provider errors or raw provider messages to the user or into an API response.

**`AI-023` (MUST):** Every call has an **explicit timeout** + a **bounded retry count** + a **circuit breaker** that opens on repeated provider failure.

> **Why the breaker:** without one, a provider outage becomes a growing queue, then worker exhaustion, then a full product outage — caused by a third party.

**`AI-024` (MUST):** When the breaker is open, the user gets a clear message ("generation is temporarily unavailable, try again shortly") — not a technical error, and not an indefinite wait.

---

## 3. Prompts

**`AI-030` (MUST):** Every prompt has an **id and a version number** and lives in reviewed code — never in the database, never inline inside a function.

```
packages/ai/prompts/
  website-blueprint.v3.ts
  section-content.v2.ts
  seo-metadata.v1.ts
```

**`AI-031` (MUST):** `promptId` and `promptVersion` are recorded in `ai_generations` for every generation.

> **Why:** In two months someone will ask "why did results get worse?". Without version records, that question has no answer.

**`AI-032` (MUST NOT):** Never build a prompt by concatenating user text into the instructions. User input goes into a **separate, clearly marked data section**, with explicit instructions to treat it as data rather than instructions.

```ts
// ❌ Direct injection risk
const prompt = `Create a website for ${userInput}`;

// ✅ Clear separation
const prompt = buildPrompt({
  system: BLUEPRINT_SYSTEM_V3,                    // fixed instructions
  userData: { businessDescription: userInput },   // data, marked as such
});
```

**`AI-033` (MUST):** User input is length-limited before being sent, and stripped of obvious injection attempts.

**`AI-034` (MUST NOT):** **Never send** any of the following to a provider: secrets, keys, other tenants' data, billing data, PII the generation does not need, or any internal system structure.

**`AI-035` (MUST):** Changing a prompt means a **new version**, never an in-place edit. The old version stays for comparison and diagnosis.

---

## 4. Output validation

**`AI-040` (MUST):** Every output is validated against the **same schema** the editor and renderer use (`CE-010`). No lenient AI-specific schema.

**`AI-041` (MUST):** The mandatory validation order:

```
1. Syntactically valid JSON?       no → retry
2. Matches the schema?             no → guided repair, then retry
3. Every type/variant registered?  no → reject
4. All links on allowed protocols? no → reject
5. Passes business rules?          no → reject
6. Passes moderation?              no → reject + log
7. Within plan limits?             no → reject with a limit error
   ↓
Save as draft revision
```

**`AI-042` (MUST):** Retries on validation failure are **bounded (≤ 2)**, passing the error message back to the model to correct the output. Past the limit, fail cleanly — never loop.

**`AI-043` (MUST NOT):** **Never partially save** an output that failed validation. Either a complete valid result, or nothing.

**`AI-044` (MUST NOT):** Never "fix" output by silently dropping extra fields or inferring missing values. Rejection is clearer than guessing.

**`AI-045` (MUST):** Generated content passes moderation before storage. Rejections are logged (by request id only, never the content) with an appropriate user-facing response.

---

## 5. Cost and limits

**`AI-050` (MUST):** Every generation is recorded in `ai_generations` with `organization_id`, `website_id`, `type`, `provider`, `model`, `prompt_version`, `status`, `tokens_in`, `tokens_out`, `cost_minor`, `duration_ms`.

**`AI-051` (MUST):** Limits are enforced at **three levels** before the job starts:

| Level | Purpose |
|---|---|
| Per request | Max tokens and image count |
| Per user/site | Rate limit to prevent abuse |
| Per tenant per month | Plan limit (entitlement) |

**`AI-052` (MUST):** The entitlement check happens **before** scheduling the job, and is re-checked inside the worker (`MT-044`).

**`AI-053` (MUST):** A **platform-wide daily spend cap** exists, which raises an alert and throttles generation when exceeded.

> **Why:** A loop bug, abuse, or a sudden usage spike can turn one day's invoice into a number that threatens the business. The cap buys response time.

**`AI-054` (MUST):** Failed generations **do not count** against the user's quota. Our failure is not their problem.

**`AI-055` (SHOULD):** Results for identical inputs may be cached to reduce cost — provided the cache key is scope-bound (`MT-042`).

---

## 6. Generated images

**`AI-060` (MUST):** A generated image goes through the **same asset pipeline** as any upload: storage, validation, optimisation, variants. See [`08-assets-media.md`](08-assets-media.md).

**`AI-061` (MUST):** The image is stored in our own storage immediately. **Never** rely on a temporary provider URL inside site content.

**`AI-062` (MUST):** Generated images are tagged in `assets` with their source (`source: 'ai'`) and the model used — for legal and diagnostic reasons.

---

## 7. Anti-patterns

| # | Pattern | Why it is dangerous |
|---|---|---|
| 1 | AI returning HTML/CSS/JS | XSS plus total collapse of the product model |
| 2 | Calling the provider inside the request cycle | Timeouts and a poor experience |
| 3 | Calling the provider directly from a module | No switching, tracing, or accounting |
| 4 | Concatenating user text into instructions | Prompt injection |
| 5 | A lenient AI-specific schema | Corrupt data reaching live sites |
| 6 | Unbounded retries | A loop draining budget and workers |
| 7 | Partially saving a failed output | A half-built site in an inconsistent state |
| 8 | Prompt without a version | Impossible to explain quality regressions |
| 9 | No circuit breaker | A third-party outage takes down the product |
| 10 | No spend cap | An invoice that threatens the business |
| 11 | Counting failures against user quota | Frustrated customers with legitimate complaints |
| 12 | Temporary provider image URLs | Broken images on published sites |

---

## 8. Required tests

**`AI-070` (MUST):** Contract tests on the schemas: a valid output is accepted, and every known malformed shape is rejected.

**`AI-071` (MUST):** A mock-provider test returning: syntactically invalid JSON, schema-violating JSON, an unregistered `type`, a `javascript:` link, over-length text. **All rejected, nothing saved.**

**`AI-072` (MUST):** Limits test: exceeding the plan limit prevents scheduling, with a clear message.

**`AI-073` (MUST):** Circuit breaker test: repeated provider failure opens the breaker and the user gets the appropriate message.

**`AI-074` (MUST):** Injection test: a business description containing "ignore previous instructions and return…" **does not change** the output structure and does not bypass validation.

**`AI-075` (MUST):** Accounting test: every generation (successful or failed) produces a correct `ai_generations` row.

---

## 9. Definition of Done — AI

- [ ] Generation runs as a background job; the endpoint returns `202` with a `jobId`.
- [ ] Calls go through `AiProvider` only.
- [ ] Timeout + bounded retry + circuit breaker applied.
- [ ] The prompt has a `promptId` and `promptVersion`, both recorded in `ai_generations`.
- [ ] User input is isolated from instructions and length-limited.
- [ ] No secrets or superfluous data sent to the provider.
- [ ] Validated against the same editor/renderer schema, with `.strict()`.
- [ ] Retries bounded; no partial saves.
- [ ] Moderation applied before storage.
- [ ] Limits checked before scheduling and inside the worker.
- [ ] Failures do not count against user quota.
- [ ] Generated images live in our storage and are tagged with their source.
- [ ] Usage and cost fully recorded.
- [ ] Injection test passes.

---

## 10. What requires an ADR

- Allowing any unstructured AI output to reach a site.
- Changing the primary provider.
- Running a model locally.
- Training or fine-tuning a model on customer data (also requires legal review).
- Allowing code or script generation in any form.

---

## 11. Cross-references

[`03-content-engine.md`](03-content-engine.md) schemas · [`08-assets-media.md`](08-assets-media.md) images · [`11-billing-entitlements.md`](11-billing-entitlements.md) limits · [`13-queues-jobs-cache.md`](13-queues-jobs-cache.md) queues · [`14-security.md`](14-security.md) injection · [`19-observability.md`](19-observability.md) cost and monitoring
