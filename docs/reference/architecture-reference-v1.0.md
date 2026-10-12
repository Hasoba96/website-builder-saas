# AI WEBSITE BUILDER — Architecture Engineering Reference

**المرجع الهندسي الأساسي لبناء وتشغيل منصة SaaS متعددة المستأجرين لإنشاء ونشر المواقع**

- **Version:** 1.0
- **Date:** September 2026
- **Source:** `AI_Website_Builder_Architecture_Engineering_Reference_v1.0.docx`

> **حالة الوثيقة**
> هذه الوثيقة مرجع لفهم التصميم العام للمشروع، وتخضع لترتيب أولوية الوثائق المحدد أدناه. القرارات المعمارية تتبع شروط ADR في `docs/en/00-PROJECT-RULES.md`.

> **ملاحظة المرجعية:** محتوى التصميم منقول من الوثيقة الأصلية، مع تسوية نص المرجعية وفق القرار المعتمد. الترتيب النهائي: (1) `docs/en/00-PROJECT-RULES.md`، (2) الـADRs المعتمدة والمنطبقة على القرار، (3) ملفات `docs/en/systems/*` ذات الصلة، (4) هذه الوثيقة، (5) تعليمات المرحلة/المهمة. النسخ العربية ترجمات متزامنة. عند التعارض يتوقف التنفيذ ويُعرض التعارض؛ لا تعلو الوثيقة الأصلية على الدستور الإنجليزي.

---

## 0 — إدارة الوثيقة

| البند | القيمة |
|---|---|
| اسم النظام | AI Website Builder SaaS |
| نوع الوثيقة | Architecture Engineering Reference |
| الإصدار | 1.0 |
| الجمهور | Backend, Frontend, DevOps, QA, Product Engineering |
| نطاقها | MVP → Scale |
| نمط المعمارية الابتدائي | Multi-tenant Modular Monolith |
| قاعدة البيانات الأساسية | PostgreSQL |
| طبقة التخزين | Object Storage (Cloudflare R2 / S3-compatible) |
| Cache / Queue | Redis + BullMQ |
| واجهة الويب | Next.js / React / TypeScript |
| Backend | NestJS / Node.js / TypeScript |

### كيفية استخدام هذه الوثيقة

- المطور الجديد يقرأ الأقسام 1–6 قبل كتابة أي كود إنتاجي.
- أي Feature جديدة يجب تحديد الـ Module المالِك لها وحدودها قبل بدء التنفيذ.
- أي تغيير في Multi-tenancy أو Site Renderer أو Domain Routing أو Data Model يحتاج مراجعة هندسية صريحة.
- الـ MVP لا يُسمح له بالتحول إلى Microservices بلا سبب تشغيلي قابل للقياس.
- كل Merge Request يجب أن يلتزم بمعايير الأمن، الاختبارات، Observability وDefinition of Done الواردة لاحقًا.

### فهرس المحتويات

1. الرؤية والهدف الهندسي
2. المبادئ المعمارية الإلزامية
3. النظرة العامة على النظام
4. رحلة المستخدم وتدفق النشر
5. Multi-tenancy ونموذج العزل
6. Domain Model وقاعدة البيانات
7. Section / Template / Theme Engine
8. Visual Editor
9. AI Generation Architecture
10. Website Renderer & Publishing
11. Subdomains / Custom Domains / SSL
12. Assets & Media Pipeline
13. Forms, Leads & Notifications
14. Analytics
15. Billing & Entitlements
16. Authentication & Authorization
17. Cache, Queues & Background Jobs
18. Security Engineering
19. API Engineering Standards
20. Frontend Engineering Standards
21. Backend Module Boundaries
22. Infrastructure & Deployment
23. Observability & Operations
24. Performance & Caching Strategy
25. Backup / DR / Data Retention
26. CI/CD & Environments
27. Testing Strategy
28. MVP Scope
29. Scaling Roadmap
30. Repository Structure
31. Engineering Workflow & Definition of Done
32. ADR Process
33. Future Extensions
34. Appendix: Schemas, Events & Examples

---

## 1 — الرؤية والهدف الهندسي

الهدف هو بناء منصة SaaS عربية/متعددة اللغات تمكّن المستخدم من إنشاء موقع احترافي، تخصيصه، نشره على Subdomain أو Custom Domain، وإدارته من Dashboard واحدة. المنصة يجب أن تخدم آلاف ثم مئات الآلاف من المواقع من Codebase موحد، بدون إنشاء WordPress أو Container أو Deployment مستقل لكل عميل.

> **الهدف الأساسي**
> المستخدم يختار نشاطه أو يصفه → النظام ينشئ Website Blueprint + Content + Theme → المستخدم يعدّل عبر Visual Editor → Publish → الموقع يصبح متاحًا فورًا مع CDN وSSL.

### أهداف الجودة

| الهدف | المعيار المبدئي |
|---|---|
| سهولة الإنشاء | موقع أولي قابل للنشر في دقائق، بدون معرفة تقنية |
| العزل | لا يمكن لمستأجر الوصول لبيانات مستأجر آخر |
| الاعتمادية | لا يؤدي فشل موقع عميل واحد إلى إسقاط المنصة |
| الأداء | الصفحات المنشورة Cache-first ويفضّل خدمتها من الـ Edge |
| القابلية للتوسع | Vertical scaling ثم horizontal scaling بدون إعادة بناء المنتج |
| قابلية التطوير | Modular boundaries واضحة واختبارات تلقائية |
| التكلفة | تجنب infrastructure per-tenant؛ مشاركة الموارد مع limits عادلة |

---

## 2 — المبادئ المعمارية الإلزامية

**2.1 Multi-tenant by design**
كل Website وكل Query وكل Asset وكل Event يجب أن يحمل tenant/site scope واضحًا. لا يوجد اعتماد على IDs وحدها بدون ownership checks.

**2.2 Content ≠ Presentation**
المحتوى يُخزن كبيانات Structured Data، والتصميم كـ variant/theme منفصل. لا نخزن الصفحة كـ HTML خام من الـ AI.

**2.3 One platform, many sites**
لا Database لكل عميل، لا VM لكل موقع، لا WordPress لكل عميل في الـ MVP.

**2.4 Modular Monolith first**
نبدأ Backend واحدًا منظمًا إلى Modules. الفصل إلى Microservices يتم بسبب قياس ضغط/استقلالية/اعتمادية — not fashion.

**2.5 Edge/cache first for published traffic**
الزيارات العامة للمواقع المنشورة لا يجب أن تضرب PostgreSQL في كل Request.

**2.6 Async for slow work**
AI، الصور، البريد، domain verification، analytics aggregation والأعمال البطيئة تتم عبر Queue/Workers.

**2.7 Least privilege**
كل Service/User/Token يمتلك أقل صلاحيات لازمة.

---

## 3 — النظرة العامة على النظام

```
                          ┌──────────────────────────┐
                          │ User Dashboard / Editor  │
                          │ Next.js + React          │
                          └─────────────┬────────────┘
                                        │ HTTPS / API
                                        ▼
                          ┌──────────────────────────┐
                          │ Backend / API            │
                          │ NestJS Modular Monolith  │
                          └──────┬──────┬──────┬─────┘
                                 │      │      │
                          PostgreSQL  Redis   Object Storage
                                 │      │      │
                                 │   BullMQ    └─ Images / files
                                 │      │
                                 │    Workers
                                 │
                  ┌──────────────┴────────────────┐
                  │ Site Renderer / Publish Layer │
                  └──────────────┬────────────────┘
                                 │
                          Cloudflare CDN / Edge
                                 │
                    ┌────────────┴────────────┐
                    │                         │
              slug.platform.com         customer-domain.com
```

### المكونات الأساسية

| المكوّن | المسؤولية |
|---|---|
| Dashboard | إدارة المواقع، الفوترة، الدومينات، الـ leads، الإعدادات |
| Visual Editor | تعديل المحتوى والـ sections والـ theme مع preview |
| Backend API | منطق الأعمال، validation، permissions، orchestration |
| PostgreSQL | System of record للبيانات الأساسية |
| Redis | Cache، rate limits، queues، ephemeral state |
| Workers | AI، media processing، mail، domain checks، aggregations |
| Object Storage | صور وملفات العملاء والإصدارات المحسّنة |
| Renderer | تحويل Website configuration إلى صفحات قابلة للعرض |
| CDN/Edge | Caching، TLS، routing، WAF، حماية وحمل عالمي |
| AI Adapter | واجهة موحدة لمزوّدي LLM/image models |

---

## 4 — رحلة المستخدم وتدفق النشر

```
Sign up
  ↓
Create Website
  ↓
Select profession / describe business
  ↓
AI Blueprint Job
  ↓
Structured JSON validated against schema
  ↓
Create pages + sections + theme
  ↓
Editor Preview
  ↓
User edits / uploads assets
  ↓
Publish
  ↓
Create immutable site revision
  ↓
Invalidate relevant cache keys
  ↓
Public Renderer / Edge Cache
  ↓
subdomain or custom domain
```

النشر يجب أن يكون عملية واضحة ذات Revision. النسخة المنشورة لا تعتمد مباشرة على draft متغير أثناء التحرير، لتجنب ظهور تعديلات نصف مكتملة للزوار.

---

## 5 — Multi-tenancy ونموذج العزل

### 5.1 Hierarchy

```
User → Organization/Tenant → Website → Page → Section
```

حتى لو بدأ المنتج بمستخدم فردي، وجود Organization/Tenant layer من البداية يسهل إضافة الفرق، الوكالات، billing ownership ونقل المواقع لاحقًا.

### 5.2 Tenant scoping

- كل repository/service method يأخذ `tenantId` أو `siteId` مشتقًا من سياق موثوق، وليس من body فقط.
- كل Query للبيانات الخاصة يضم شرط ownership/tenant scope.
- Public renderer يحل domain/slug إلى `site_id` ثم يقرأ نسخة منشورة فقط.
- Assets path/key يتضمن site أو tenant scope.
- Logs لا تسجل أسرارًا أو محتوى حساسًا؛ لكنها تسجل tenant/site IDs لأغراض التحقيق.

### 5.3 عزل قاعدة البيانات

الـ MVP يستخدم Shared Database + Shared Schema مع `tenant_id`/`site_id`. لاحقًا يمكن استخدام partitioning أو dedicated databases للعملاء enterprise فقط عند الحاجة.

> **ممنوع**
> SELECT/UPDATE/DELETE على جداول tenant-owned بدون Scope. يُفضّل إضافة guard/repository layer واختبارات تمنع Cross-tenant access.

---

## 6 — Domain Model وقاعدة البيانات

### 6.1 الجداول الأساسية

| Table | غرضه | أعمدة أساسية |
|---|---|---|
| `users` | هوية المستخدم | id, email, status, created_at |
| `organizations` | الـ tenant / billing owner | id, name, owner_user_id |
| `organization_members` | عضويات وصلاحيات | organization_id, user_id, role |
| `websites` | تعريف الموقع | id, organization_id, slug, status, locale, theme_id |
| `pages` | صفحات الموقع | id, website_id, slug, title, status, sort_order |
| `sections` | مكونات الصفحة | id, page_id, type, variant, data_json, sort_order |
| `themes` | قيم التصميم العامة | id, website_id, tokens_json |
| `templates` | blueprints قابلة لإعادة الاستخدام | id, category, schema_version, blueprint_json |
| `site_revisions` | نسخ draft/published | id, website_id, version, snapshot_json, published_at |
| `domains` | الدومينات وربطها | id, website_id, hostname, status, verification_method |
| `assets` | metadata للملفات | id, website_id, object_key, mime, width, height |
| `forms` | تعريف النماذج | id, website_id, schema_json |
| `leads` | إرسالات النماذج | id, form_id, website_id, payload_json, created_at |
| `subscriptions` | حالة الاشتراك | organization_id, plan_id, status, renews_at |
| `plans` | الخطط | id, code, price, interval |
| `entitlements` | صلاحيات الخطة | plan_id, feature_key, limit_value |
| `ai_generations` | طلبات AI | website_id, type, model, status, usage, cost |
| `analytics_events` | أحداث خام أو buffer | site_id, event_type, timestamp, properties |
| `audit_logs` | أحداث إدارية حساسة | actor_id, tenant_id, action, target, metadata |

### 6.2 قواعد البيانات

- استخدام UUID/ULID أو IDs غير قابلة للتخمين للـ public identifiers عند الحاجة.
- Unique constraints: slug، hostname، memberships حسب السياق.
- Indexes على `website_id` / `tenant_id` / domain hostname / status / timestamps المستخدمة فعليًا.
- JSONB مناسب لمحتوى sections والـ theme tokens، لكن العلاقات الأساسية والفوترة والصلاحيات تبقى normalized.
- كل schema change يمر عبر migration قابلة للمراجعة والـ rollback/forward strategy.

---

## 7 — Section / Template / Theme Engine

### 7.1 Section Contract

```json
{
  "type": "hero",
  "variant": "hero-07",
  "schemaVersion": 1,
  "data": {
    "title": "محمد أحمد",
    "subtitle": "Performance Marketing Specialist",
    "cta": {"label": "تواصل معي", "href": "#contact"}
  },
  "settings": {
    "visibility": {"mobile": true, "desktop": true}
  }
}
```

كل Section Type يمتلك JSON Schema/TypeScript schema خاصًا به. أي data قادمة من Editor أو AI يجب Validation قبل الحفظ.

### 7.2 Template

```json
{
  "category": "media_buyer",
  "sections": [
    {"type": "hero", "variant": "hero-07"},
    {"type": "stats", "variant": "stats-03"},
    {"type": "case_studies", "variant": "case-study-04"},
    {"type": "services", "variant": "services-06"},
    {"type": "contact", "variant": "contact-02"}
  ]
}
```

### 7.3 Theme Tokens

```json
{
  "colors": {"primary": "#111827", "accent": "#2563EB", "background": "#FFFFFF"},
  "typography": {"heading": "Alexandria", "body": "Tajawal"},
  "radius": {"sm": 8, "md": 16, "lg": 24},
  "layout": {"container": 1200, "sectionGap": 96}
}
```

الـ components تقرأ tokens ولا تخزن styling عشوائيًا لكل عنصر إلا عند وجود override صريح. هذا يحافظ على الاتساق ويسمح بتغيير الهوية البصرية كاملة بسرعة.

---

## 8 — Visual Editor

- Preview iframe أو isolated rendering context لمنع تداخل CSS بين Dashboard والموقع.
- Inline text editing مع autosave/debounce، مع حفظ Draft revision فقط.
- Reorder sections عبر drag-and-drop؛ التخزين يكون `sort_order` أو ordered array داخل revision.
- أوامر section: change variant, duplicate, hide/show, delete, settings.
- Undo/Redo في الواجهة من command history؛ periodic checkpoints في backend.
- Device preview: desktop/tablet/mobile بدون ادعاء أن preview يساوي كل browser فعليًا.
- لا يُسمح بحقن arbitrary JS/HTML في الخطط العادية. إن أُضيف Custom Code مستقبلًا، يُعزل ويُراجع أمنيًا.

### 8.1 Autosave

يفضّل optimistic UI مع debounce قصير. Endpoint الحفظ يقبل revision/version لمنع Last Write Wins غير المرئي. عند conflict، يرجع 409 مع بيانات تساعد الواجهة على المصالحة.

---

## 9 — AI Generation Architecture

> **قاعدة أساسية**
> الـ AI لا ينتج كود الموقع النهائي. الـ AI يرجع JSON Structured Output/Blueprint يخضع للـ schema validation، ثم الـ engine الموثوق هو الذي يرندر.

```
User input
   ↓
Prompt/Context Builder
   ↓
AI Provider Adapter
   ↓
Structured JSON
   ↓
Schema Validation
   ├─ invalid → repair/retry with limit
   └─ valid
       ↓
Business Rules / Moderation / Limits
       ↓
Create draft website revision
```

### 9.1 AI Provider Abstraction

ننشئ interface مثل `generateStructuredContent()` و`generateImage()` بدل استدعاء provider مباشرة من كل module. الهدف: تبديل المزود، fallback، budget routing، logging وcost accounting.

### 9.2 AI Safety / Cost Controls

- Rate limit per plan/user/site.
- Max tokens / image generations per request.
- Usage metering في `ai_generations`.
- Timeout + retry محدود + circuit breaker عند فشل provider.
- عدم إرسال secrets أو بيانات داخلية غير لازمة للـ provider.
- Prompt versioning حتى نعرف أي نسخة أنشأت أي نتيجة.

---

## 10 — Website Renderer & Publishing

### 10.1 Renderer Responsibilities

- حل Site Revision المنشورة فقط.
- تحميل Theme tokens + pages + sections.
- اختيار component الصحيح بناءً على type/variant/schemaVersion.
- تطبيق SEO metadata، canonical، hreflang عند الحاجة، sitemap/robots.
- عدم كشف أي draft أو internal IDs.
- إنتاج HTML سريع وقابل للكاش.

### 10.2 Draft vs Published

```
Editor → Draft Revision → Publish → Immutable Published Revision → Renderer
```

عند Publish يُنشأ snapshot/immutable revision. لو فشل publish فلا يتم استبدال النسخة الحية. Rollback يعني إعادة تفعيل revision سابقة.

### 10.3 Static/SSR strategy

ليس شرطًا بناء ملفات HTML منفصلة لكل موقع. يمكن استخدام SSR/ISR/edge rendering مع caching قوي. القرار النهائي يُقاس حسب حجم المواقع، معدل التغيير، تكلفة invalidation ومتطلبات dynamic blocks.

---

## 11 — Subdomains / Custom Domains / SSL

### 11.1 Platform Subdomains

```
*.platform.com  →  CDN/Edge  →  Renderer
```

Wildcard DNS يحل أي slug إلى نفس طبقة التوجيه. الـ router يستخرج hostname، يتحقق من slug/site status، ثم يخدم النسخة المنشورة.

### 11.2 Custom Domain flow

```
User enters example.com
      ↓
Create domain record = pending
      ↓
Show DNS instructions (CNAME/A/verification)
      ↓
Background verification job
      ↓
Provision/activate TLS
      ↓
Domain status = active
      ↓
hostname → site_id mapping cached
```

### 11.3 Requirements

- Hostname normalization (lowercase, IDN/punycode handling where needed).
- Unique active ownership of hostname.
- Domain verification before activation لمنع hijacking.
- Automated TLS via Cloudflare for SaaS أو provider مكافئ.
- Graceful statuses: `pending_dns`, `verifying`, `tls_pending`, `active`, `failed`, `disconnected`.
- Background re-check وليس synchronous polling من المستخدم.

---

## 12 — Assets & Media Pipeline

```
Browser
  ↓ request signed upload
Backend validates plan/type/size
  ↓
Signed URL
  ↓
Object Storage
  ↓
Queue event
  ↓
Worker: validate → strip metadata if required → optimize → generate variants
  ↓
CDN URLs
```

- لا تمر الملفات الكبيرة عبر Backend إذا أمكن؛ direct signed uploads.
- Whitelist MIME/types والتحقق من magic bytes وليس extension فقط.
- Limits حسب الخطة، ومراقبة total storage per tenant.
- Image variants: thumbnail/medium/original optimized. WebP/AVIF عند ملاءمة الدعم.
- Object keys غير قابلة للتخمين مباشرة ولا تحتوي user filename كمسار موثوق.
- الحذف المنطقي ثم garbage-collection job للملفات غير المرجعية.

---

## 13 — Forms, Leads & Notifications

```
Public Form → Validation → Bot/Rate Controls → Lead Store → Event → Notifications/Webhooks
```

- CSRF/abuse model مناسب للـ public forms، مع rate limit + honeypot/Turnstile عند الحاجة.
- Validation server-side دائمًا.
- PII يتم تقليلها وتحديد retention policy لها.
- Email/WhatsApp/Webhook integrations تُنفذ async.
- Webhook signing + retries + dead-letter handling عند إضافتها.

---

## 14 — Analytics

لا نرسل كل page view كـ transaction ثقيل إلى PostgreSQL. في الـ MVP يمكن batching/queue ثم aggregation. عند نمو الحجم تنتقل الأحداث إلى ClickHouse أو مخزن تحليلي مناسب.

```
Browser lightweight tracker
       ↓
Analytics endpoint / edge collector
       ↓
Queue / buffer
       ↓
Aggregation worker
       ↓
Daily/hourly metrics store
       ↓
Dashboard
```

### 14.1 Events

`page_view` | `cta_click` | `whatsapp_click` | `form_submit` | `booking_click`

يجب Version للـ event schema. لا نجمع معلومات شخصية غير ضرورية. IP raw لا يُخزن دائمًا ما لم توجد حاجة قانونية/تشغيلية واضحة.

---

## 15 — Billing & Entitlements

الكود لا يسأل: "هل المستخدم Pro؟" في عشرات الأماكن. يجب وجود Entitlement Service مركزية تسأل عن feature/limit.

```
can(tenant, "custom_domain") → true/false
limit(tenant, "websites") → 5
limit(tenant, "ai_generations_monthly") → 100
```

- Webhook من payment provider هو مصدر تحديث حالة الدفع، بعد التحقق من signature.
- Webhook processing idempotent.
- Grace period واضح للفشل في التجديد.
- Plan change لا يحذف بيانات مباشرة؛ يعطّل Features/limits وفق policy.
- Usage metering منفصل عن payment provider عند الحاجة.

---

## 16 — Authentication & Authorization

### 16.1 Authentication

- Email/password أو OAuth حسب المنتج.
- Session cookies HttpOnly/Secure/SameSite غالبًا أفضل للـ web dashboard.
- MFA يمكن إضافته لاحقًا للحسابات الحساسة/enterprise.
- Password reset tokens قصيرة العمر وsingle-use.

### 16.2 Authorization

| Role | أمثلة صلاحيات |
|---|---|
| Owner | billing, delete tenant, invite members, full site control |
| Admin | manage sites/members without ownership transfer |
| Editor | edit/publish assigned sites حسب policy |
| Viewer | read analytics/leads only where granted |

> **قاعدة**
> إخفاء زر في الواجهة ليس Authorization. كل endpoint حساس يتحقق Server-side.

---

## 17 — Cache, Queues & Background Jobs

### 17.1 Redis uses

- domain→site mapping
- site config hot cache
- rate limiting
- sessions إن تم اختيارها
- BullMQ queues
- short-lived locks/idempotency helpers

### 17.2 Queues

| Queue | Jobs |
|---|---|
| `ai` | text generation, blueprint, image generation |
| `media` | optimization, variants, cleanup |
| `domains` | verification, TLS status sync |
| `notifications` | email, webhooks, messaging |
| `analytics` | aggregation, rollups |
| `maintenance` | cleanup, retention, orphan assets |

كل Job يحمل idempotency key أو يكون تصميمه idempotent قدر الإمكان. Retries تستخدم exponential backoff وحد أقصى؛ الفشل الدائم يذهب إلى Dead Letter/failed queue مع alert عند الأهمية.

---

## 18 — Security Engineering

### 18.1 Threats الأساسية

| الخطر | التحكم |
|---|---|
| Cross-tenant data access | mandatory scoping + authorization tests |
| XSS from user content | sanitize/escape; structured content; no arbitrary HTML by default |
| SSRF | URL allow/deny controls; egress restrictions for fetchers |
| File upload abuse | type validation, size limits, quarantine/scanning where applicable |
| Credential theft | secure cookies, MFA roadmap, rate limits, anomaly monitoring |
| API abuse | auth, rate limits, quotas, WAF |
| Domain hijack | DNS verification + unique ownership + audit |
| Webhook spoofing | signature validation + replay protection |
| Secrets leakage | secret manager/env; never commit; redact logs |
| Dependency risk | lockfiles, automated dependency/security scanning |

### 18.2 Content Security

- CSP مدروسة للمواقع المنشورة والـ dashboard.
- escape by default في React؛ sanitize لأي rich text مسموح.
- Custom scripts feature مستقبلية فقط وبعزل/تحذير واضح.

### 18.3 Audit

نسجل actions الحساسة: publish, domain changes, member changes, billing actions, destructive deletes, API key operations. السجل append-oriented وغير متاح للتعديل للمستخدم العادي.

---

## 19 — API Engineering Standards

- REST/JSON في الـ MVP مع OpenAPI موثق. GraphQL ليس ضرورة.
- Endpoints versioned عند الحاجة التوافقية (`/api/v1`).
- Validation باستخدام schema مشتركة/DTOs. لا Trust للـ client payload.
- Error envelope ثابت: `code`, `message`, `details`, `requestId`.
- Pagination cursor-based للقوائم الكبيرة؛ limit capped.
- Idempotency keys لعمليات الدفع/النشر/الإنشاء الحساسة حسب الحاجة.
- 409 للـ version conflicts، 422/400 للـ validation حسب convention متفق، 429 للـ rate limit.
- كل Response حساس يراجع عدم تسريب internal fields.

```json
{
  "error": {
    "code": "DOMAIN_NOT_VERIFIED",
    "message": "Domain verification is still pending",
    "requestId": "req_01..."
  }
}
```

---

## 20 — Frontend Engineering Standards

- Next.js + TypeScript strict mode.
- Design System موحد للـ dashboard؛ components الخاصة بالمواقع منفصلة عن admin UI.
- Form state/validation واضحة، وتحويل server errors إلى UX مفهوم.
- No business authorization only in frontend.
- Editor state model موثق؛ avoid prop-drilling المفرط.
- Accessibility أساسية: keyboard, labels, contrast, semantic elements.
- RTL/LTR من primitives وليس patches متفرقة.
- Error boundaries وloading/empty states إلزامية للشاشات الأساسية.

---

## 21 — Backend Module Boundaries

```
/modules
  /auth
  /users
  /organizations
  /websites
  /pages
  /sections
  /templates
  /themes
  /revisions
  /assets
  /domains
  /forms
  /leads
  /billing
  /entitlements
  /analytics
  /ai
  /notifications
  /audit
```

التواصل بين Modules يتم عبر public service interfaces أو domain events، وليس استيراد repositories الداخلية عشوائيًا. الهدف أن يمكن فصل module لاحقًا إذا ظهرت حاجة حقيقية.

---

## 22 — Infrastructure & Deployment

### 22.1 MVP topology

```
Cloudflare DNS / CDN / WAF
        │
        ├── Dashboard + Renderer (Next.js)
        │
        └── API (NestJS)
                │
      ┌─────────┼───────────┐
      │         │           │
 PostgreSQL   Redis    Object Storage
      │         │
      │       Workers
      │
 Managed backups
```

### 22.2 Containerization

Services تُبنى كـ containers قابلة للنشر، لكن لا يوجد container لكل tenant. في البداية يمكن تشغيل API/worker/renderer على managed platform أو عدد محدود من VMs/containers مع health checks.

### 22.3 Configuration

- 12-factor style environment configuration.
- Secrets من managed secret store أو environment المحمي.
- فصل config بين local/staging/production.
- لا production credentials على أجهزة المطورين إلا عبر آلية محكومة عند الضرورة.

---

## 23 — Observability & Operations

- Structured logs JSON مع requestId, service, environment, tenant/site context (بدون PII غير لازمة).
- Metrics: request rate, error rate, p95 latency, DB pool, queue depth, job failure, cache hit ratio, publish latency.
- Tracing للرحلات المعقدة لاحقًا باستخدام OpenTelemetry.
- Error tracking (مثل Sentry) للـ frontend/backend.
- Alerts مرتبطة بأثر المستخدم، لا مجرد CPU spike عابر.

### 23.1 SLOs المبدئية

| الخدمة | مؤشر مبدئي |
|---|---|
| Public site availability | ≥ 99.9% هدف تشغيلي بعد الاستقرار |
| API p95 | < 500ms للعمليات العادية، باستثناء async starts |
| Publish request | يرجع قبول العملية سريعًا؛ completion monitored |
| Queue failure | < 1% للـ normal jobs مع retries |
| Cache hit ratio | يرتفع للمواقع المنشورة ذات الزيارات المتكررة |

---

## 24 — Performance & Caching Strategy

- Public HTML/cache keys حسب hostname + path + publishedRevisionId.
- Assets immutable URLs مع content hashes حيث أمكن.
- عند Publish يتم invalidation للموقع المتأثر فقط.
- Domain→site mapping cache قصير/متوسط مع invalidation عند تغيّر الدومين.
- لا cache لبيانات Dashboard الحساسة بطريقة قد تخلط tenants.
- Database N+1 queries ممنوعة في renderer hot path.

> **هدف الأداء**
> الطلب العام المعتاد لموقع منشور يجب أن يخدم من الـ CDN/Edge أو من renderer بقراءات قليلة ومحسوبة، وليس سلسلة Queries لكل section.

---

## 25 — Backup / Disaster Recovery / Data Retention

- Automated PostgreSQL backups + point-in-time recovery إذا كان provider يدعم.
- اختبار restore دوري؛ النسخة الاحتياطية غير المختبرة ليست خطة استعادة.
- Object storage versioning/retention حسب التكلفة والحاجة.
- RPO/RTO يتم تحديدهما رسميًا قبل الإطلاق التجاري الكبير.
- Data retention للـ logs والـ analytics والـ leads تُحدد حسب المنتج والمتطلبات القانونية.
- Delete account flow يميّز بين soft-delete/grace period وhard deletion المجدول.

---

## 26 — CI/CD & Environments

```
Local → CI → Preview/Test → Staging → Production
```

- Lint + typecheck + unit tests + security/dependency checks قبل merge.
- Integration tests للمسارات الحرجة.
- Database migrations تُراجع وتُطبق بخطة safe rollout.
- Production deploy قابل للـ rollback.
- Feature flags للخصائص عالية المخاطر أو gradual rollout.
- Infrastructure configuration as code قدر الإمكان بعد استقرار الـ MVP.

---

## 27 — Testing Strategy

| نوع الاختبار | ما يجب تغطيته |
|---|---|
| Unit | domain rules, entitlement logic, schema transforms |
| Integration | DB repositories, auth guards, publish flow, billing webhooks |
| Contract | AI structured output schemas, webhooks, provider adapters |
| E2E | signup → generate → edit → publish → visit public site |
| Security | cross-tenant access, XSS, upload validation, authorization |
| Performance | renderer hot path, publish bursts, analytics ingestion |
| Visual regression | section variants الأساسية عبر breakpoints |

> **اختبار إلزامي**
> يجب وجود automated test يحاول الوصول إلى Site/Lead/Asset لمستأجر آخر ويتأكد من الرفض. هذا من أهم اختبارات النظام.

---

## 28 — MVP Scope

### 28.1 داخل الـ MVP

- 10 فئات/أنشطة أولية.
- 5 visual styles / themes رئيسية.
- 10–15 section types وقرابة 80–100 variant إجمالًا.
- AI website blueprint + content generation.
- Visual editor: text/images/reorder/change variant/theme.
- Draft + Publish + revision rollback أساسي.
- Platform subdomain.
- Custom domain + SSL.
- Contact forms + leads.
- WhatsApp CTA.
- Basic analytics.
- Arabic/English + RTL/LTR.
- Plans, billing, entitlements.

### 28.2 خارج الـ MVP

- Full ecommerce engine
- Complex booking marketplace
- Email marketing suite
- Arbitrary custom JavaScript
- Multi-region active-active
- Microservices fleet
- Plugin marketplace
- Advanced CRM automation

> **قاعدة Scope**
> أي Feature خارج القائمة لا تدخل الـ MVP إلا إذا كانت مطلوبة لإثبات Product-Market Fit أو الإيراد مباشرة.

---

## 29 — Scaling Roadmap

| المرحلة | التقريب | التغييرات المحتملة |
|---|---|---|
| Stage A | 0–5K paid / عشرات آلاف المواقع | Modular monolith, managed Postgres/Redis, CDN caching |
| Stage B | 5K–50K paid | horizontal API/renderer, read replicas, stronger queues, analytics store |
| Stage C | 50K–200K paid | DB partitioning where measured, dedicated analytics/ingestion, specialized workers |
| Stage D | 200K+ / high traffic | multi-region reads/edge strategy, service extraction for hot domains, advanced routing |

الأرقام إرشادية وليست triggers تلقائية. trigger الحقيقي هو metrics: CPU/DB contention, queue lag, blast radius, deploy coupling, team ownership, cost.

---

## 30 — Repository Structure

```
/apps
  /dashboard-web
  /public-renderer
  /api
  /worker
/packages
  /ui-dashboard
  /site-sections
  /schemas
  /types
  /config
  /testing
  /observability
/infra
/docs
  /adr
  /api
  /runbooks
```

يمكن استخدام Monorepo (pnpm/turborepo أو Nx) لتسهيل مشاركة TypeScript schemas وsection components. يُمنع مشاركة domain internals بلا contract واضح.

---

## 31 — Engineering Workflow & Definition of Done

### 31.1 Feature workflow

```
Product requirement → Technical design → API/schema decision → Implementation
  → Tests → Review → Staging → Observability check → Release
```

### 31.2 Definition of Done

- Acceptance criteria محققة.
- Authorization/tenant scope reviewed.
- Validation موجودة server-side.
- Unit/integration tests المناسبة مضافة.
- No critical lint/type errors.
- Logs/metrics للأجزاء التشغيلية المهمة.
- Error states في UI معالجة.
- Migrations آمنة ومراجعة إن وجدت.
- API/schema docs محدثة.
- لا secrets أو PII غير لازمة في logs.
- Feature قابلة للـ rollback أو التعطيل إذا كانت عالية المخاطر.

---

## 32 — ADR Process

Architecture Decision Record يستخدم للقرارات التي تؤثر طويلًا على النظام. ملف Markdown واحد لكل قرار داخل `/docs/adr`.

```
ADR-00X: Title
Status: Proposed | Accepted | Superseded
Context:
Decision:
Alternatives considered:
Consequences:
Migration/Rollback notes:
Date:
Owners:
```

### قرارات تتطلب ADR

- تغيير قاعدة البيانات الرئيسية.
- فصل Module إلى Microservice.
- تغيير نموذج multi-tenancy.
- تغيير طريقة rendering/publishing الأساسية.
- اعتماد custom code execution.
- تغيير provider أساسي للدومينات/TLS أو الدفع مع أثر معماري.

---

## 33 — Future Extensions

- Booking module مع availability/calendars.
- Blog/CMS collections.
- Lightweight CRM + lead pipeline.
- Email campaigns and automations.
- Ecommerce/catalog/checkout كمنتج مستقل داخل المنصة.
- Template marketplace.
- Agency workspace / white-label.
- Custom components SDK بعد إنشاء sandbox/security model.
- Localization workflow ومحتوى متعدد اللغات لنفس الموقع.
- AI optimization: rewrite, SEO suggestions, conversion recommendations.

---

## 34 — Appendix: Schemas, Events & Examples

### 34.1 Publish command example

```http
POST /api/v1/websites/{websiteId}/publish
Idempotency-Key: 01J...

{
  "expectedDraftVersion": 42
}

202 Accepted
{
  "jobId": "job_...",
  "status": "queued"
}
```

### 34.2 Domain record states

```
pending_dns → verifying → tls_pending → active
                    ↘ failed
active → disconnected
```

### 34.3 Domain event examples

```json
WebsitePublished {
  websiteId,
  tenantId,
  revisionId,
  publishedAt
}

LeadCaptured {
  websiteId,
  formId,
  leadId,
  capturedAt
}

DomainActivated {
  websiteId,
  hostname,
  activatedAt
}
```

### 34.4 Engineering checklist قبل إطلاق Production

- [ ] Production secrets isolated
- [ ] Backups enabled + restore tested
- [ ] Custom domain verification tested
- [ ] TLS automation tested
- [ ] Cross-tenant security suite passing
- [ ] Rate limits enabled
- [ ] WAF/basic abuse controls configured
- [ ] Payment webhooks signature validation passing
- [ ] Error tracking enabled
- [ ] Request IDs in logs
- [ ] Queue failure monitoring enabled
- [ ] Asset upload limits configured
- [ ] Privacy/retention policy implemented
- [ ] Rollback procedure documented
- [ ] Incident contact/runbook defined

---

## الخلاصة الهندسية

> **المعادلة المعمارية**
> Multi-tenant data model + structured section engine + immutable publish revisions + edge-cached renderer + automated domain/TLS + async workers = منصة Website Builder قابلة للتوسع بتكلفة تشغيل منطقية.

هذه الوثيقة تمثل Baseline v1.0. عند تغيّر افتراض رئيسي، لا يتم تعديل الكود فقط؛ يجب تحديث المرجع و/أو إضافة ADR حتى يظل الفريق متفقًا على طريقة البناء.
