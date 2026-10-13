# IMPLEMENTATION-PLAYBOOK --- دليل التنفيذ الأساسي للمشروع

**Project:** AI Website Builder SaaS\
**Version:** 1.0\
**Status:** Binding Execution Guide\
**Priority:** تعليمات Stage/Task في المرتبة الخامسة وفق §2؛ لا تتجاوز المراجع الأعلى\
**Last Updated:** 2026-09-30

------------------------------------------------------------------------

## 1. وظيفة هذا الملف

هذا الملف هو **المرجع الأساسي لترتيب تنفيذ المشروع وإغلاق مراحله**.

-   `00-PROJECT-RULES.md` يحدد القواعد الهندسية العليا التي لا يجوز
    مخالفتها.
-   `systems/01..23` هي **مراجع الأنظمة** وليست ترتيبًا زمنيًا للتنفيذ.
-   هذا الملف يحدد: **ماذا نبني أولًا، ما الملفات التي يجب قراءتها لكل
    مرحلة، ما الاختبارات المطلوبة، ومتى تعتبر المرحلة PASS ومقفولة.**

> **قاعدة حاكمة:** رقم ملف النظام لا يعني أنه يُنفذ في نفس ترتيبه
> الرقمي.\
> مثال: `12-auth` و`14-security` و`15-api-standards` و`22-testing` تدخل
> من أول مراحل المشروع، وليست مراحل مؤجلة إلى ما بعد 11.

------------------------------------------------------------------------

## 2. ترتيب أولوية المراجع

عند أي تعارض أو غموض، يكون ترتيب المرجعية:

1.  [docs/en/00-PROJECT-RULES.md](docs/en/00-PROJECT-RULES.md)، أعلى Binding Engineering Authority.
2.  Approved ADRs المنطبقة على القرار.
3.  ملفات [docs/en/systems](docs/en/systems) ذات الصلة.
4.  [docs/reference/architecture-reference-v1.0.md](docs/reference/architecture-reference-v1.0.md).
5.  تعليمات Stage/Task، بما فيها هذا Playbook وTask Specification / Acceptance Criteria.

إذا وجد المبرمج أن المطلوب في Task يخالف قاعدة Binding، **يتوقف ولا
يتحايل على القاعدة** ويطلب قرارًا/ADR حسب الدستور.

------------------------------------------------------------------------

## 3. قاعدة العمل الأساسية

لا يُبنى المشروع كالتالي:

`Backend كله → Frontend كله → Security في النهاية → Testing في النهاية`

بل يُبنى كـ **Vertical Slices** صغيرة تعمل End-to-End:

`Specification → Design → Implementation → Automated Tests → Security Review → Code Review → Staging → Acceptance → Close Stage`

تُطبق حدود Stage 00 الموثقة أدناه على بند Staging فقط في هذه المرحلة؛ التحقق المحلي لا يُسجّل كنشر Staging حقيقي.

**ممنوع الانتقال للمرحلة التالية إذا فشل Stage Gate للمرحلة الحالية.**

------------------------------------------------------------------------

## 4. قواعد إلزامية في كل مرحلة

يجب تطبيق قواعد `00-PROJECT-RULES.md` دائمًا، وبالأخص:

-   كل بيانات Website/Asset/Lead/Event يجب أن تكون Tenant/Site scoped.
-   الـID وحده لا يكفي لإثبات الصلاحية؛ ownership/authorization يتحقق
    على السيرفر.
-   Content منفصل عن Presentation؛ لا يتم تخزين صفحات المستخدم كـraw
    HTML.
-   منصة واحدة Multi-tenant؛ لا DB/VM/WordPress/Container لكل عميل.
-   Modular Monolith أولًا؛ لا Microservice بدون سبب مقاس وADR.
-   Published traffic يعتمد على Edge/CDN/Cache ولا يضرب PostgreSQL لكل
    Request.
-   الأعمال البطيئة مثل AI/media/email/domain/analytics تستخدم
    Queue/Workers.
-   Server-side validation إلزامي.
-   Frontend hiding ليس Authorization.
-   لا Secrets أو PII في Logs.
-   Jobs الحساسة Idempotent.
-   كل Network Call له timeout وسياسة retry محدودة.
-   PostgreSQL هو System of Record؛ Redis ليس مصدر الحقيقة.
-   AI output بيانات غير موثوقة: JSON/schema validation + limits قبل
    الحفظ.
-   الأموال integer smallest unit + currency.
-   الوقت UTC/timestamptz.
-   Backup غير مختبر بالـRestore لا يعتبر Backup صالحًا.

------------------------------------------------------------------------

# 5. Definition of Ready --- قبل كتابة الكود

لا تبدأ أي Task قبل تحديد:

-   Goal واضح.
-   Acceptance Criteria قابلة للاختبار.
-   Owner module.
-   System files المطلوب قراءتها.
-   Rule IDs المهمة.
-   Schemas / API contracts.
-   Tenant scope.
-   Authentication / Authorization.
-   Entitlements إن وجدت.
-   Failure/edge cases.
-   هل العملية Sync أم Queue Job.
-   Security risks المتوقعة.
-   Tests المطلوبة.
-   Observability المطلوبة.
-   Migration/Rollback إن وجدت.
-   هل تحتاج Feature Flag أو ADR.

------------------------------------------------------------------------

# 6. قالب إلزامي لأي Task

``` text
TASK:
GOAL:

READ FIRST:
- 00-PROJECT-RULES.md
- systems/...

RULE IDS TO APPLY:

OWNER MODULE:

DEPENDENCIES:

SCHEMA / API CONTRACT:

TENANT SCOPE:

AUTHENTICATION / AUTHORIZATION:

ENTITLEMENTS:

ACCEPTANCE CRITERIA:

EDGE / FAILURE CASES:

SECURITY TESTS:

UNIT TESTS:

INTEGRATION TESTS:

CROSS-TENANT TESTS:

E2E / STAGING TEST:

OBSERVABILITY:

MIGRATION / ROLLBACK:

OUT OF SCOPE:

EVIDENCE REQUIRED BEFORE CLOSING:
```

------------------------------------------------------------------------

# 7. مراحل التنفيذ الصحيحة

## Stage 00 --- Foundation & Engineering Platform

### الهدف

إنشاء أساس يمكن البناء عليه بأمان قبل Features المنتج.

### اقرأ وطبق

-   `00-PROJECT-RULES.md`
-   `15-api-standards`
-   `16-frontend-standards`
-   `17-backend-modules`
-   `18-infrastructure-cicd`
-   `19-observability`
-   `21-backup-dr-retention`
-   `22-testing`

### التنفيذ

-   Monorepo حسب الهيكل المعتمد.
-   `apps/api`
-   `apps/dashboard-web`
-   `apps/public-renderer`
-   `apps/worker`
-   shared packages.
-   TypeScript strict.
-   pnpm + Turborepo/Nx حسب القرار المعتمد.
-   PostgreSQL.
-   Redis/BullMQ.
-   R2 documentation/config boundary فقط حسب النطاق أدناه؛ لا full integration.
-   Environment validation.
-   Migrations.
-   CI/CD.
-   Production-like local verification وتوثيق افتراضات deployment حسب النطاق أدناه.
-   Logging/requestId.
-   Error tracking: Sentry مرشح معتمد؛ لا external diagnostics قبل ADR معتمد وفق `19-observability §10`.
-   Secret management.
-   Backup baseline.

### القرارات التقنية المعتمدة

سجل الاعتمادات وحدودها: [STAGE 00 TECHNICAL DECISION REPORT](docs/stage-00-technical-decision-report.md#approved-decisions). يشمل `pg` دون ORM الآن، و`node-pg-migrate`، وVitest مع `@nestjs/testing` وPlaywright محدود، و`next-intl` للتطبيقين، وGitHub Actions مع منطق الأوامر داخل root scripts. الإصدارات المحددة تخضع لمراجعة compatibility/maintenance/security/license/peers قبل أي install؛ لا floating `latest`.

### حدود Stage 00

- **Testing:** وفق [ADR-001](docs/adr/ADR-001-stage-00-cross-tenant-test-applicability.md)، Cross-tenant runtime tests هي **N/A** فقط لغياب Tenant-capable domain surface؛ ليست PASS ولا تأجيلًا لمتطلب العزل. لا Tenant وهمي أو Auth مبكر أو fake/skipped suite. أول Tenant-capable code في Stage 01 يصاحبه الاختبار الحقيقي؛ لا merge لأي Tenant-scoped resource في Stage 01+ دون negative cross-tenant tests.
- **R2:** يبقى Cloudflare R2 مزود Object Storage المعتمد. لا Asset Upload أو presigned URLs أو image processing أو production credentials أو R2 emulator جديد أو SDK غير مستخدم. عند غياب runtime consumer فعلي يكفي توثيق/config boundary المطلوبة دون integration وهمي؛ Full R2 implementation في Stage 07 (Assets & Media).
- **Staging:** لا hosting provider/credentials مثبتة حاليًا. المطلوب بيئة محلية قابلة للتكرار، production build، تطبيقات deployable/container-buildable، CI ناجح، production-like local verification، وافتراضات deployment موثقة. لا يُدّعى أن Real Staging Deploy = PASS. تُضاف البيئة الحقيقية فور اعتماد hosting environment، وتظل Mandatory Gate قبل أي Pilot/Production deployment؛ لا يُنشأ حساب أو يُختار مزود تلقائيًا.
- **Error tracking:** يمكن تجهيز boundary/config محليًا عند الحاجة، دون إرسال diagnostics لطرف ثالث قبل إنشاء واعتماد ADR المطلوب. هذا لا يثبت تشغيل `OB-021` فعليًا ولا يسجله PASS؛ يظل إثباته بوابة منفصلة قبل إغلاق متطلب error tracking.

### Stage Gate

-   Clean clone يستطيع install/build/test.
-   Lint + typecheck + tests خضراء.
-   لا Secrets داخل Git.
-   بيئة local قابلة للتكرار وproduction build ناجح وتطبيقات deployable/container-buildable.
-   CI ناجح وproduction-like local verification موثق، مع deployment assumptions؛ Real Staging غير مثبت وليس PASS.
-   Migration test ناجح.
-   Logs لا تحتوي Secrets/PII.
-   Backup/restore smoke موثق.

**لا تبدأ Product Features قبل PASS.**

------------------------------------------------------------------------

## Stage 01 --- Authentication + Tenant Boundary

> هذه المرحلة تستخدم `01-multi-tenancy` **و** `12-auth` و`14-security`
> معًا.\
> لذلك الترتيب الرقمي للـsystems ليس ترتيب التنفيذ.

### اقرأ وطبق

-   `01-multi-tenancy`
-   `12-auth`
-   `14-security`
-   `15-api-standards`
-   `17-backend-modules`
-   `22-testing`

### التنفيذ

-   Register/Login/Logout/Session.
-   Tenant/Organization.
-   Membership/ownership model حسب الـdata model.
-   Server-side authorization.
-   Rate limits للمصادقة.
-   Audit للأحداث الحساسة.

### الاختبار الحاسم

-   User A يستطيع موارد Tenant A.
-   User B يستطيع موارد Tenant B.
-   User A يحاول قراءة/تعديل/حذف مورد Tenant B → **يُرفض**.
-   تغيير IDs يدويًا لا يتجاوز ownership.
-   Session expired/invalid/revoked → مرفوض.

### Stage Gate

أي Cross-Tenant access أو IDOR/BOLA = **BLOCKER**.

------------------------------------------------------------------------

## Stage 02 --- Core Data Model: Website + Page

### اقرأ وطبق

-   `01-multi-tenancy`
-   `02-data-model`
-   `12-auth`
-   `14-security`
-   `15-api-standards`
-   `17-backend-modules`
-   `22-testing`

### التنفيذ

-   Website.
-   Page.
-   العلاقات الأساسية.
-   Constraints.
-   Indexes.
-   DTO/domain mapping.
-   Safe migrations.
-   Transactions للعمليات المركبة.

### Stage Gate

-   CRUD scoped بالكامل.
-   Constraints تعمل.
-   لا N+1 واضح في hot paths.
-   Migration strategy مختبرة.
-   Cross-tenant tests خضراء.

------------------------------------------------------------------------

## Stage 03 --- Content / Section / Theme Engine

### اقرأ وطبق

-   `02-data-model`
-   `03-content-engine`
-   `14-security`
-   `16-frontend-standards`
-   `22-testing`
-   `23-i18n-rtl`

### البداية المتعمدة

لا تبدأ بـ100 Component.

ابدأ بـ: - Hero - Stats - Services - Case Studies/Portfolio - Contact

و**2 Variants فقط لكل Section**.

### المطلوب

-   Structured schemas.
-   Section types.
-   Variants.
-   Theme tokens.
-   Schema versioning.
-   Validation.
-   RTL/LTR.

### Stage Gate

-   لا raw HTML كمصدر للصفحة.
-   تغيير Variant لا يفقد Content.
-   تغيير Theme لا يدمر Content.
-   Invalid schema يُرفض server-side.
-   Renderer/editor يستطيعان الاعتماد على نفس section contracts.

------------------------------------------------------------------------

## Stage 04 --- Draft + Revisions + Publishing Core

### اقرأ وطبق

-   `02-data-model`
-   `03-content-engine`
-   `06-renderer-publishing`
-   `13-queues-jobs-cache`
-   `14-security`
-   `20-performance-caching`
-   `22-testing`

### المطلوب

-   Draft.
-   Publish.
-   Immutable Published Revision.
-   Publish idempotency.
-   Basic rollback.
-   Cache invalidation strategy.

### Stage Gate

-   Draft لا يظهر للزائر.
-   Published Revision لا تتعدل in-place.
-   إعادة Publish/Retry لا تنتج فسادًا أو duplicates.
-   Rollback يعمل.
-   فشل publish في المنتصف لا يترك حالة غير متسقة.

------------------------------------------------------------------------

## Stage 05 --- Public Renderer + Subdomains

### اقرأ وطبق

-   `01-multi-tenancy`
-   `03-content-engine`
-   `06-renderer-publishing`
-   `14-security`
-   `18-infrastructure-cicd`
-   `20-performance-caching`
-   `22-testing`
-   `23-i18n-rtl`

### المطلوب

-   Public renderer.
-   hostname → Site resolution.
-   Wildcard subdomain.
-   Published revision only.
-   Edge/cache behavior.
-   404/disabled site states.

### أول Proof of Architecture

يجب أن تعمل الرحلة:

`Sign up → Tenant → Website → Page → Hero → Edit → Save Draft → Publish → username.platform.com`

### Stage Gate

**FIRST WORKING WEBSITE** يعمل End-to-End.

------------------------------------------------------------------------

## Stage 06 --- Visual Editor

### اقرأ وطبق

-   `03-content-engine`
-   `04-visual-editor`
-   `14-security`
-   `16-frontend-standards`
-   `22-testing`
-   `23-i18n-rtl`

### المطلوب

-   Edit text.
-   Change image.
-   Add/Delete/Duplicate section.
-   Reorder.
-   Change variant.
-   Change theme.
-   Desktop/mobile preview.
-   Safe save/conflict behavior.
-   Undo/Redo أو نموذج تحرير آمن حسب التصميم.

### قاعدة مهمة

`packages/site-sections` يجب أن تكون مشتركة بين Editor Preview وPublic
Renderer.

### Stage Gate

ما يراه المستخدم في Preview يطابق ما يُنشر وظيفيًا وبصريًا ضمن الحدود
المعتمدة.

------------------------------------------------------------------------

## Stage 07 --- Assets & Media

### اقرأ وطبق

-   `01-multi-tenancy`
-   `08-assets-media`
-   `13-queues-jobs-cache`
-   `14-security`
-   `20-performance-caching`
-   `22-testing`

### المطلوب

-   Signed/direct upload.
-   R2.
-   File size/type/signature validation.
-   Image processing via workers.
-   Tenant-scoped assets.
-   Cleanup/orphan policy.

### Security Tests

-   fake extension.
-   oversized file.
-   executable content.
-   path/object-key abuse.
-   cross-tenant asset access.

### Stage Gate

الملفات الخبيثة/المضللة/غير المسموحة تُرفض بأمان.

------------------------------------------------------------------------

## Stage 08 --- AI Generation

### اقرأ وطبق

-   `03-content-engine`
-   `05-ai-generation`
-   `13-queues-jobs-cache`
-   `14-security`
-   `15-api-standards`
-   `22-testing`

### المطلوب

`User answers → AI → Structured JSON → Schema Validation → Blueprint → Site`

### ممنوع

-   AI → raw HTML.
-   AI → React/code.
-   حفظ Output قبل validation.

### اختبارات

-   malformed JSON.
-   invalid section.
-   huge input.
-   provider timeout.
-   provider failure.
-   retry.
-   quota/rate limit.
-   malicious/untrusted output.

### Stage Gate

تعطل AI لا يمنع المستخدم من استخدام الـmanual builder.

------------------------------------------------------------------------

## Stage 09 --- Custom Domains + SSL

### اقرأ وطبق

-   `01-multi-tenancy`
-   `06-renderer-publishing`
-   `07-domains-ssl`
-   `13-queues-jobs-cache`
-   `14-security`
-   `18-infrastructure-cicd`
-   `22-testing`

### المطلوب

-   Add domain.
-   DNS instructions.
-   Ownership verification.
-   Domain uniqueness.
-   TLS lifecycle.
-   Routing.
-   removal/reassignment policy.

### Stage Gate

اختبار E2E كامل:
`Add → Verify → TLS → Serve → DNS change/failure → Remove`

ولا يمكن لـTenant الاستيلاء على Domain مملوك لآخر.

------------------------------------------------------------------------

## Stage 10 --- Forms + Leads + Notifications

### اقرأ وطبق

-   `01-multi-tenancy`
-   `09-forms-leads`
-   `13-queues-jobs-cache`
-   `14-security`
-   `15-api-standards`
-   `22-testing`

### المطلوب

-   Public form endpoint.
-   Validation.
-   Rate limit.
-   Anti-spam.
-   Lead storage.
-   Dashboard.
-   Async notification.

### Stage Gate

-   Tenant A لا يرى Leads الخاصة بـTenant B.
-   PII لا يظهر في logs.
-   Abuse controls تعمل.
-   notification failure لا يفقد الـLead.

------------------------------------------------------------------------

## Stage 11 --- Billing + Entitlements

### اقرأ وطبق

-   `01-multi-tenancy`
-   `11-billing-entitlements`
-   `12-auth`
-   `13-queues-jobs-cache`
-   `14-security`
-   `15-api-standards`
-   `22-testing`

### المطلوب

-   Plans.
-   Subscription state.
-   Entitlements.
-   Limits.
-   Payment webhooks.
-   Renewal/cancel/failure states.

### Security Tests

-   forged webhook.
-   replayed webhook.
-   duplicate webhook.
-   duplicate payment processing.
-   plan limit bypass.
-   frontend entitlement bypass.

### Stage Gate

Backend هو صاحب قرار Entitlement.\
أي double-charge أو plan bypass = **BLOCKER**.

------------------------------------------------------------------------

## Stage 12 --- Analytics

### اقرأ وطبق

-   `01-multi-tenancy`
-   `10-analytics`
-   `13-queues-jobs-cache`
-   `14-security`
-   `19-observability`
-   `20-performance-caching`
-   `22-testing`

### المطلوب

-   Page view.
-   CTA click.
-   WhatsApp click.
-   Form submit.
-   Async ingestion/aggregation.
-   Privacy/minimization.

### Stage Gate

Analytics failure لا يعطل الموقع المنشور ولا يضيف latency غير مقبول
للـrenderer.

------------------------------------------------------------------------

## Stage 13 --- Product Expansion

### اقرأ وطبق

-   `03-content-engine`
-   `04-visual-editor`
-   `05-ai-generation`
-   `16-frontend-standards`
-   `22-testing`
-   `23-i18n-rtl`

### المطلوب

بعد ثبات الـCore فقط: - التوسع تدريجيًا إلى 10--15 Section Types. -
80--100 Variants. - 10 Business Categories. - Profession-specific
Blueprints. - Arabic/English + RTL/LTR polishing.

### NICHE EXPANSION FREEZE

**`PB-001` (MUST NOT):** لا يبدأ Niche #1 قبل Stage 13 وبعد PASS للمراحل الأساسية المطلوبة السابقة (Stage 00 إلى Stage 12). لا يجوز تنفيذ Niche #2 أو أي توسع متعدد الـNiches قبل تحقق جميع الشروط التالية بالأدلة:

1. Core Platform stages المطلوبة = PASS.
2. Niche #1 يعمل End-to-End.
3. Tenant isolation tests = PASS.
4. Security Gate = PASS.
5. Recovery/Restore Gate = PASS.
6. Performance baseline = PASS.
7. Publish/Rollback = PASS.
8. Observability baseline = PASS.

هذه بوابة داخل Stage 13 قبل توسيع Niche #1، وليست إذنًا بتجاوز Stage Gates أو تأجيل الاختبارات إلى Stage 14. أعداد الأنواع والـVariants والـBusiness Categories أعلاه أهداف توسع تدريجي بعد اجتياز هذه البوابة، لا متطلبات مبكرة للـFoundation.

### NICHE REUSABILITY TEST

**`PB-002` (MUST):** كل Niche جديد يعتمد أساسًا على Blueprint وConfiguration وQuestionnaire وContent Rules وSection Types وSection Variants وTheme Tokens، وفق `CORE-101`.

يُمنع إنشاء Niche-specific authentication أو tenancy أو publishing pipeline أو renderer أو database architecture أو backend. إذا وُجد Requirement حقيقي لا يمكن تمثيله بالـCore، يتوقف التنفيذ وتُجرى Architecture Review، ويُنشأ ويُعتمد ADR قبل التنفيذ إذا كانت القواعد تتطلبه؛ لا يُعتمد الاستثناء ذاتيًا.

### قاعدة

قبل كتابة Backend Feature جديدة لنشاط معين، اسأل: **هل يمكن حلها
بـVariant / Blueprint / Configuration؟**

### Stage Gate

إضافة Niche جديد تجتاز `PB-001` و`PB-002`؛ لا نسخ Backend خاص بالنشاط دون مسار المراجعة المحدد فيهما.

------------------------------------------------------------------------

## Stage 14 --- Production Hardening / Release Candidate

### اقرأ وطبق

كل ملفات الأنظمة ذات الصلة + Production Checklist في `00`.

### ممنوع إضافة Features غير ضرورية هنا

الهدف هو **كسر المشروع واكتشاف المشاكل قبل العملاء**.

### الفحوص

-   Full regression.
-   Cross-tenant full suite.
-   SAST.
-   Dependency vulnerability scan.
-   Secret scan.
-   DAST على Staging.
-   Security manual review.
-   Load/performance tests.
-   DB/query review.
-   Queue failure/retry tests.
-   Backup restore drill.
-   Deployment rollback drill.
-   Publish rollback drill.
-   Domain/TLS E2E.
-   Payment webhook replay/idempotency.
-   Rate limits.
-   WAF.
-   Monitoring/alerts.
-   Privacy/retention/delete flow.
-   Incident runbooks.

### Security Gate

-   **Critical:** ممنوع الإغلاق.
-   **High:** ممنوع الإغلاق.
-   **Medium:** الأصل الإصلاح؛ الاستثناء يحتاج Risk Acceptance مكتوب +
    Owner + Deadline.
-   **Low:** يمكن جدولته بشرط عدم مخالفة MUST وعدم تراكمه بلا إدارة.

### Stage Gate

Release Candidate جاهز فقط بعد وجود Evidence لكل بند أساسي.

------------------------------------------------------------------------

## Stage 15 --- Controlled Commercial Launch

### المطلوب

الإطلاق تدريجي:

`Internal → Pilot Users → Small Production Rollout → Monitor → Expand → Full Launch`

### راقب

-   error rate.
-   latency.
-   CPU/RAM.
-   DB connections/query latency.
-   cache hit ratio.
-   queue lag/failures.
-   AI failures/cost.
-   domain/TLS failures.
-   payment failures.
-   suspicious auth/security events.

### Stage Gate

لا توسع rollout مع Incident مفتوح أو Regression مهم أو مؤشر غير مستقر.

------------------------------------------------------------------------

# 8. Security Baseline --- أشهر فئات المخاطر التي يجب مراجعتها

لا يوجد اختبار يضمن أن البرنامج «خالٍ 100% من الثغرات». المطلوب
Defense-in-Depth وفحص مستمر.

## Broken Access Control / IDOR / BOLA

-   ownership server-side.
-   tenant scope.
-   deny by default.
-   negative cross-tenant tests.

## Injection

-   parameterized queries/ORM safe APIs.
-   لا SQL concatenation.
-   input validation.
-   لا `eval`.

## XSS

-   framework escaping.
-   sanitize للـrich content المسموح فقط.
-   CSP مناسبة.
-   لا custom user JS في MVP.

## CSRF

-   حماية مناسبة لنموذج الـAuth.
-   SameSite/CSRF token عند الحاجة.
-   لا state-changing GET.

## SSRF

-   URL validation/allowlisting حسب الاستخدام.
-   منع private/link-local/metadata targets.
-   timeouts.
-   لا server-side arbitrary fetch غير مقيد.

## Authentication

-   secure session/token lifecycle.
-   expiry/revocation.
-   rate limiting.
-   حماية flows الحساسة.

## Authorization

-   Backend enforcement.
-   ownership/RBAC/entitlements.
-   UI ليس طبقة حماية.

## File Upload

-   size/type/signature checks.
-   generated object keys.
-   no executable path.
-   image processing/re-encoding حيث مناسب.

## Path Traversal

-   لا تستخدم user path مباشرة.
-   storage keys controlled.

## Open Redirect

-   validate/allowlist destinations الحساسة.

## CORS

-   origins محددة.
-   لا wildcard مع credentials.

## Clickjacking

-   `frame-ancestors`/headers المناسبة مع توثيق احتياجات preview.

## Secrets

-   secret manager/env.
-   secret scanning.
-   rotation.
-   لا secrets في Git/logs.

## Webhooks

-   signature verification.
-   replay protection.
-   timestamp عند المزود إن توفر.
-   idempotency.

## Mass Assignment

-   DTO allowlist.
-   لا تمرير body مباشرة إلى ORM.

## Sensitive Data Exposure

-   TLS.
-   PII minimization.
-   log redaction.
-   retention.

## Supply Chain

-   lockfile.
-   dependency scanning.
-   package review.
-   لا dependencies غير ضرورية؛ قبول الاعتماديات وتصنيف Direct/Transitive ومتابعة age/deprecation تحكمه [CORE-002](docs/en/00-PROJECT-RULES.md). لا رفض تلقائي لـTransitive بسبب العمر/deprecation وحدهما، ولا إعفاء من المراجعة أو hard blockers أو Security Gate.

## DoS / Resource Exhaustion

-   body/upload limits.
-   AI limits.
-   rate limits.
-   queue backpressure.
-   worker concurrency limits.
-   network timeouts.

## Business Logic Abuse

اختبر: - plan bypass. - duplicate payment. - duplicate publish. -
duplicate job. - quota bypass. - domain ownership abuse. - lead/form
spam.

------------------------------------------------------------------------

# 9. Code Review Pass بعد كل مرحلة

بعد إنهاء Tasks المرحلة، ينفذ Review pass منفصل على **كل الكود الذي أُضيف أو
عُدل في المرحلة** وفق [CORE-045](docs/en/00-PROJECT-RULES.md#73-pull-requests). في نمط الفريق تُطبق متطلبات المراجعين البشريين؛ وفي نمط المالك المنفرد المعتمد تتطلب التغييرات المؤهلة مراجعة موثقة بمساعدة AI وقبول المالك الصريح. لا تُوصف مراجعة AI أو المراجعة الذاتية بأنها مراجعة بشرية مستقلة. تبقى الحالات التي تشترط إنسانًا مستقلًا BLOCKED دون ذلك المراجع:

1.  Architecture Review.
2.  Security Review.
3.  Tenant/Authorization Review.
4.  Data/DB/Migration Review.
5.  Failure Handling Review.
6.  Performance/N+1/Cache Review.
7.  Privacy/Logging Review.
8.  Tests Review.
9.  Observability/Operations Review.
10. Documentation/Schema/API Review.

المطور لا يراجع فقط أن Happy Path يعمل؛ يجب مراجعة Failure Paths
وNegative Cases.

------------------------------------------------------------------------

# 10. CI/CD Gate لكل Pull Request

يجب أن يحتوي الـPipeline حسب ما ينطبق على:

-   install from lockfile.
-   formatting/lint.
-   TypeScript strict typecheck.
-   unit tests.
-   integration tests.
-   cross-tenant tests.
-   contract/schema checks.
-   secret scanning.
-   dependency vulnerability scanning.
-   SAST.
-   build لكل apps المتأثرة.
-   migration validation.
-   Staging/preview deployment؛ في Stage 00 فقط تُطبق حدود التحقق المحلي الموثقة في قسمها، دون ادعاء نشر حقيقي.
-   smoke/E2E.
-   حفظ Test/Security reports كـEvidence.

------------------------------------------------------------------------

# 11. قواعد الـPull Request

-   `main` protected.
-   لا direct push، باستثناء genesis فارغ واحد وفق CORE-040 وبعد إذن منفصل للفعل.
-   Branches قصيرة العمر.
-   PR صغير وفق CORE-044؛ استثناء الاستيراد الأول أحادي الاستخدام يتطلب حزم مراجعة ≤400 سطر وبوابات CI كاملة، ولا يجيز دمج حزم ناقصة.
-   PR يذكر:
    -   Goal.
    -   Rule IDs.
    -   Systems affected.
    -   Tenant impact.
    -   Security impact.
    -   Tests.
    -   Migration.
    -   Rollback.
    -   Screenshots/Manual test عند الحاجة.
-   التغييرات الحساسة تحتاج تصنيف المخاطر ومستوى المراجعة المحددين في CORE-045؛ لا إعفاء من CI أو security أو متطلبات migration.

------------------------------------------------------------------------

# 12. متى تعتبر المرحلة مغلقة؟

لا تستخدم عبارة "خلصت" قبل تحقق:

-   Acceptance Criteria = PASS.
-   Code Review = PASS.
-   Lint/typecheck = PASS.
-   Unit = PASS.
-   Integration = PASS.
-   Cross-tenant = PASS حيث ينطبق.
-   Security checks = PASS.
-   E2E للأسطح الفعلية = PASS؛ Staging = PASS حيث يلزم، مع تطبيق حدود Stage 00 الصريحة دون تحويل عدم توافر Staging إلى PASS.
-   No open Critical/High vulnerabilities.
-   Logs/Metrics verified.
-   Migration verified.
-   Rollback/Feature Flag verified حيث يلزم.
-   Documentation updated.
-   Evidence محفوظ.
-   Approver أعطى PASS.

بعدها فقط:

`STAGE STATUS = CLOSED`

------------------------------------------------------------------------

# 13. Stage Closure Report --- إلزامي

``` text
STAGE:
VERSION / COMMIT:
DATE:
OWNER:

IMPLEMENTED:

RULE IDS APPLIED:

SYSTEM FILES USED:

SCHEMAS / APIS CHANGED:

MIGRATIONS:

TEST RESULTS:
- lint:
- typecheck:
- unit:
- integration:
- cross-tenant:
- E2E:
- security scans:

SECURITY REVIEW FINDINGS:

PERFORMANCE RESULT:

OBSERVABILITY VERIFIED:

BACKUP / ROLLBACK VERIFIED:

KNOWN LIMITATIONS:

OPEN RISKS:

EVIDENCE:

FINAL DECISION:
PASS / FAIL

APPROVER:
```

------------------------------------------------------------------------

# 14. ممنوعات

-   ممنوع تأجيل Security لنهاية المشروع.
-   ممنوع تأجيل Tenant isolation tests عند وجود سطح قابل للاختبار؛ انطباق N/A في Stage 00 فقط موثق في [ADR-001](docs/adr/ADR-001-stage-00-cross-tenant-test-applicability.md).
-   ممنوع TODO أمني مؤقت يصل إلى `main`.
-   ممنوع bypass مؤقت للـvalidation أو authorization.
-   ممنوع Feature ضخمة في PR واحد بدون ضرورة.
-   ممنوع تغيير Architecture سرًا أثناء التنفيذ.
-   ممنوع DB/Provider/Framework جديد بدون القواعد/ADR المطلوبة.
-   ممنوع Retry غير محدود.
-   ممنوع Network Call بدون timeout.
-   ممنوع destructive migration بلا rollout/rollback strategy.
-   ممنوع استخدام Production PII محليًا بلا سياسة/anonymization.
-   ممنوع اعتبار UI hiding حماية.
-   ممنوع اعتبار Backup صالحًا بدون Restore test.
-   ممنوع اعتبار AI output موثوقًا.
-   ممنوع إطلاق Feature عالية المخاطر دون Feature Flag إذا كانت القواعد
    تتطلب ذلك.

------------------------------------------------------------------------

# 15. أمر جاهز للمبرمج/AI في بداية كل Stage

``` text
نفّذ Stage [XX] فقط من IMPLEMENTATION-PLAYBOOK.md.

قبل كتابة أي كود:
1. اقرأ 00-PROJECT-RULES.md كاملًا.
2. اقرأ جميع ملفات systems المحددة داخل Stage.
3. اكتب Implementation Plan مختصر.
4. حدد schemas/APIs/tenant scope/auth/security risks/tests/migrations/rollback.
5. إذا وجدت تعارضًا مع Binding Rule، توقف ولا تتحايل عليها.

أثناء التنفيذ:
- طبق جميع MUST/MUST NOT ومعرفات القواعد ذات الصلة.
- Server-side validation وauthorization وtenant scoping إلزامية.
- لا Secrets/PII في logs.
- كل slow work async حسب القواعد.
- كل network call له timeout.
- كل job/عملية حساسة قابلة للتكرار بأمان عند الحاجة.
- لا تضف Architecture أو Scope خارج المرحلة دون موافقة.

بعد التنفيذ:
1. راجع كل الكود الذي كتبته أو عدلته في هذه المرحلة.
2. نفذ Architecture/Security/Tenant/Data/Failure/Performance/Privacy review.
3. شغّل lint/typecheck/unit/integration/cross-tenant/E2E/security scans المناسبة.
4. افحص أشهر فئات الثغرات المحددة في هذا Playbook حسب سطح الهجوم.
5. أصلح كل Critical/High ثم أعد الاختبارات.
6. اختبر على Staging؛ في Stage 00 فقط طبق بديل التحقق المحلي الموثق، ولا تسجله Staging PASS.
7. قدّم Stage Closure Report كاملًا بالأدلة.

لا تعتبر Stage منتهية ولا تبدأ التالية حتى تصبح FINAL DECISION = PASS.
```

------------------------------------------------------------------------

# 16. الصورة النهائية لمسار المشروع

``` text
00 Foundation
      ↓
01 Auth + Tenant
      ↓
02 Website + Page Data Model
      ↓
03 Content / Sections / Themes
      ↓
04 Draft + Publishing
      ↓
05 Renderer + Subdomain
      ↓
=== FIRST WORKING WEBSITE ===
      ↓
06 Visual Editor
      ↓
07 Assets / Media
      ↓
08 AI Generation
      ↓
09 Custom Domains / SSL
      ↓
10 Forms / Leads
      ↓
11 Billing / Entitlements
      ↓
12 Analytics
      ↓
13 Templates / Niches Expansion
      ↓
14 Production Hardening
      ↓
15 Controlled Commercial Launch
      ↓
=== MVP IN PRODUCTION ===
```

------------------------------------------------------------------------

# 17. قاعدة ما بعد الإطلاق

بعد الإطلاق، لا ننتقل تلقائيًا إلى Microservices أو بنية أعقد بسبب عدد
العملاء فقط.

التوسع يتم من القياسات الفعلية مثل:

-   CPU/RAM.
-   DB contention.
-   DB query latency.
-   connections.
-   queue lag.
-   cache hit ratio.
-   renderer latency.
-   error rate.
-   blast radius.
-   deploy coupling.
-   team ownership.
-   infrastructure cost.

أي تغيير معماري كبير يتبع قواعد ADR في `00-PROJECT-RULES.md`.

------------------------------------------------------------------------

**END OF IMPLEMENTATION PLAYBOOK v1.0**
