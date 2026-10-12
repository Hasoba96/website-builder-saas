# 00 — دستور المشروع الهندسي (Project Engineering Rules)

> **AI Website Builder SaaS** — منصة متعددة المستأجرين لإنشاء ونشر المواقع
> **الإصدار:** 1.0 · **الحالة:** إلزامي (Binding) · **آخر تحديث:** 2026-09-15
> **مشتق من:** `docs/reference/architecture-reference-v1.0.md`
> **النسخة الإنجليزية:** [`../en/00-PROJECT-RULES.md`](../en/00-PROJECT-RULES.md)

---

## 0. كيف تستخدم هذا الملف

`docs/en/00-PROJECT-RULES.md` هو **أعلى مرجع هندسي إلزامي** لأي شخص أو أداة تكتب كودًا في هذا المشروع. ترتيب أولوية المراجع النهائي هو:

1. `docs/en/00-PROJECT-RULES.md`.
2. الـADRs المعتمدة والمنطبقة على القرار.
3. ملفات `docs/en/systems/*` المتعلقة بالقرار.
4. `docs/reference/architecture-reference-v1.0.md`.
5. تعليمات المرحلة/المهمة، بما فيها أدلة التنفيذ ومعايير القبول.

الوثائق العربية ترجمات متزامنة وليست مرجعية مستقلة. لا يتجاوز ADR هذا الدستور ضمنيًا؛ أي تغيير معتمد يمس قواعده يجب أن يحدّث القاعدة الحاكمة أيضًا. عند تعارض المراجع، يتوقف التنفيذ ويُعرض التعارض دون اختراع تسوية.

| أنت | اقرأ |
|---|---|
| مطوّر جديد (أي تخصص) | هذا الملف كاملًا + `01` + `02` + `17` قبل أول سطر كود |
| Backend | + `02`, `05`, `06`, `11`, `12`, `13`, `15`, `17` |
| Frontend / Editor | + `03`, `04`, `16`, `23` |
| DevOps / SRE | + `18`, `19`, `20`, `21` |
| QA | + `22` + قسم الاختبارات في كل ملف نظام |
| Security review | + `14` + قسم "القواعد الإلزامية" في كل ملف |
| وكيل AI يكتب كودًا | هذا الملف + ملف النظام المعني + القسم 16 أدناه |

### مستويات الإلزام (نستخدمها في كل الملفات)

| الكلمة | المعنى |
|---|---|
| **MUST** / **يجب** | إلزامي. مخالفته تُرفض في الـ Code Review بلا نقاش. |
| **MUST NOT** / **ممنوع** | محظور تمامًا. أي كود يخالفه لا يدخل `main`. |
| **SHOULD** / **يُفضّل** | الافتراضي الصحيح. المخالفة تحتاج تبريرًا مكتوبًا في وصف الـ PR. |
| **MAY** / **يجوز** | مسموح، قرار الفريق المنفّذ. |

### ترقيم القواعد

كل قاعدة لها معرّف ثابت بصيغة `PREFIX-NNN` (مثال: `CORE-012`, `MT-003`). **لا يُعاد استخدام رقم بعد حذفه** — يُكتب بدلًا منه `(ملغاة — انظر ADR-00X)`. استخدم المعرّف في الـ PR والـ Code Review: «هذا يخالف `MT-004`» أوضح وأسرع من شرح طويل.

---

## 1. هوية المشروع والـ Stack المعتمد

### 1.1 الهدف في جملة واحدة

المستخدم يختار نشاطه أو يصفه → النظام ينشئ **Website Blueprint + محتوى + Theme** → يعدّل عبر **Visual Editor** → **Publish** → الموقع يعمل فورًا على Subdomain أو Custom Domain مع CDN و SSL.

### 1.2 الـ Stack (معتمد — تغييره يحتاج ADR)

| الطبقة | التقنية | ملاحظة إلزامية |
|---|---|---|
| Backend API | **NestJS** / Node.js / TypeScript | Modular Monolith — موديولات داخل تطبيق واحد |
| Dashboard + Renderer | **Next.js** / React / TypeScript | `strict: true` إلزامي |
| قاعدة البيانات | **PostgreSQL** | System of record الوحيد |
| Cache / Queue | **Redis + BullMQ** | لا يُستخدم كـ system of record أبدًا |
| Object Storage | **Cloudflare R2** (S3-compatible) | كل الملفات والصور |
| CDN / Edge / WAF / TLS | **Cloudflare** (+ Cloudflare for SaaS) | للدومينات المخصصة |
| اللغة | **TypeScript** في كل مكان | `any` ممنوع (انظر `CORE-030`) |
| Monorepo | pnpm + Turborepo (أو Nx) | مشاركة الـ schemas والـ components |

**`CORE-001` (MUST NOT):** ممنوع إدخال قاعدة بيانات أساسية ثانية، أو لغة backend ثانية، أو framework frontend ثانٍ **بدون ADR معتمد**.

**`CORE-002` (MUST NOT):** ممنوع إضافة أو تحديث dependency خارجية دون Dependency Review موثقة قائمة على المخاطر. تبقى كل dependency مباشرة أو عابرة ضمن inventory، والفحص الأمني، ومراجعة الترخيص، ومراجعة integrity/source، ومراجعة graph، بما فيها runtime وbuild وCI وtest وoptional/platform-specific dependencies. يجوز أن تغطي أدوات الجرد والفحوص الآلية المراجعة الروتينية للـtransitive؛ لكن findings تحتاج disposition صريحة. لا تُعفى أي فئة من بوابات الأمن أدناه.

**التصنيف ومراجعة Direct.** تُعد dependency مباشرة إذا أعلنها المشروع صراحةً، أو استوردها، أو استدعاها كود المشروع أو أدواته مباشرةً، بما فيها mandatory peer يضيفها المشروع صراحة. أما Transitive فتأتي فقط عبر dependency path ولا يستخدمها المشروع مباشرة. الاستخدام المباشر غير المعلن ليس إعفاءً باعتبارها Transitive. تُسجل الضرورة، والإصدار stable المحدد، والمصدر، والتزامات الترخيص، وحالة الصيانة والدعم، وتاريخ أحدث stable وتاريخ الإصدار المختار، والتوافق، وadvisories، وأثر حجم الحزمة/bundle حيث ينطبق. عند إضافة runtime dependency، يُذكر سببها في وصف PR ويُفحص الترخيص وآخر تحديث وحجم bundle قبل الإضافة. تُراجع البدائل عند وجود إشارة خطر. تصنيف التعرض مستقل: production runtime أو build أو CI أو test-only أو optional/platform. يُصنف التنفيذ والصلاحيات والشحن الفعلي داخل artifacts عبر جميع targets المدعومة، لا موضع التصريح في manifest وحده؛ ويُطبق أعلى exposure فعلي. لا تُعد devDependency منخفضة المخاطر تلقائيًا.

**قاعدة عمر Direct.** أي dependency مباشرة جديدة آخر stable release لها أقدم من 18 شهرًا تُرفض افتراضيًا. العمر مؤشر لمخاطر الصيانة، وليس إثباتًا للهجر. يُسمح باستثناء direct-age خاص بالـdependency **فقط عند تحقق جميع الشروط التالية**:

1. تكون مطلوبة مباشرة أو كـmandatory peer/runtime requirement لمكوّن ضمن الـstack المعتمد.
2. لا يوجد بديل عملي supported وcompatible يحقق الحاجة دون تغيير ذلك الـstack أو إدخال مخاطرة أكبر.
3. لا تكون dependency مثبتة كـdeprecated أو abandoned أو EOL.
4. يكون الإصدار المختار supported/compatible مع متطلبات الـframework المعتمد.
5. يكون الترخيص والتزاماته المنطبقة مقبولين.
6. لا توجد known Critical/High vulnerability غير محلولة أو أي hard blocker أدناه في الإصدار المختار أو graph الناتج.
7. تُراجع الصيانة، ونشاط repository حيث ينطبق، وتوافق framework، وملاحظات release/support، وadvisories، وأثر transitive.
8. يُسجل السبب والأدلة وموافقة المالك وموعد إعادة التقييم في Dependency Review.
9. يكون القبول خاصًا بالـdependency؛ الشعبية أو استثناءات العمر العامة لا تكفي.
10. ظهور EOL أو abandonment أو Critical/High غير محلولة أو تغير exposure أو supported replacement مطلوب من framework يوجب إعادة التقييم.

تُرفض Direct dependencies المثبتة كـdeprecated أو abandoned أو EOL افتراضيًا، ولا يجوز قبولها عبر مسار استثناء العمر هذا. لا تمنح هذه القاعدة استثناءً جديدًا لها.

**إشارات Transitive.** عمر الإصدار الذي يتجاوز 18 شهرًا وupstream deprecation/EOL إشارات خطر تُسجل، وليسا رفضًا تلقائيًا بمفردهما. يأخذ disposition في الاعتبار التعرض الفعلي، وسياق التنفيذ، وصيانة consumer، والتوافق، وsecurity findings، والشحن، والصلاحيات، والمعالجة المدعومة المتاحة، والمخاطر المتبقية. يتطلب القبول مع tracking مسارًا معروفًا من Direct component ضمن الـstack المعتمد اجتاز مراجعة ضرورته وصيانته ودعمه وتوافقه؛ وتوافق consumer/target runtime؛ وغياب hard blockers؛ وتوثيق أسباب الإشارة والتعرض الفعلي؛ ومخاطر متبقية مقبولة. تُراجع أولًا ترقيات upstream المدعومة والمتوافقة أو إمكانية الإزالة. إذا لم يوجد إجراء مدعوم ومتناسب تحت سيطرة المشروع، فلا يُفرض fork أو patch أو unsupported override/substitution أو تغيير framework بلا مبرر لمجرد إزالة الإشارة. صيانة consumer لا تثبت صيانة leaf dependencies التابعة له. هذا المسار غير متاح لـdependency يستخدمها المشروع مباشرة.

**Hard blockers لكل الفئات.** تُرفض packages المعروفة بأنها malicious، والإصدارات المعروفة بأنها compromised، وثغرات Critical/High غير المحلولة، والظروف المثبتة القابلة للاستغلال في استخدامنا مهما كانت severity، والتراخيص غير المتوافقة، وفشل تحقق integrity/provenance، وdependency confusion أو المصادر المشبوهة غير المحسومة، وعدم توافق runtime/peer/platform غير المدعوم، وDirect frameworks غير المدعومة، والأثر الأمني/runtime غير المقبول الناتج عن abandonment، وسلوك privileged lifecycle/build غير المقبول. لا تعفي صفة dev-only أو optional أو ادعاء عدم الوصول من هذه الموانع. غياب optional provenance نقص في الأدلة، وليس تلقائيًا فشل تحقق؛ غياب دليل مطلوب يمنع القبول. لا تنشئ هذه القاعدة waiver ضمنيًا أو آلية risk acceptance لـHigh/Critical.

**الأدلة والمتابعة.** يُسجل package/version والمسارات المنطبقة، وconsumer، والسياق/targets، وfindings ومصادرها، وتواريخ ونتائج الفحوص، والبدائل، والمخاطر المتبقية وضوابطها، وowner، وreviewer/approval، وموعد المراجعة التالية، وexit/re-evaluation triggers. حالات disposition هي ACCEPT أو ACCEPT WITH TRACKING أو BLOCK. المراجعة المطلوبة غير المحسومة ليست PASS. تبقى مراقبة عمر Transitive إلزامية دون استثناء عمر منفصل لكل leaf. لا يجوز للقبول مع tracking كتم findings لاحقة أو اعتماد إصدارات/مسارات غير مشمولة.

**مواعيد المتابعة.** الحد الأقصى للفاصل بين مراجعات deprecated/EOL transitive finding هو **90 يومًا**. ولـage-only transitive finding دون أي إشارة خطر جوهرية أخرى، الحد الأقصى **180 يومًا**. يُسجل موعد المراجعة التالية من تاريخ المراجعة المكتملة؛ هذه حدود قصوى وليست مهلة لتأجيل hard blockers. تجب إعادة التقييم فورًا، قبل الموعد الدوري، عند حدوث أي مما يلي:

- security advisory جديدة أو High/Critical finding.
- دليل malware/compromise.
- تحديث consumer/framework يؤثر في dependency path، أو تغير dependency graph/path.
- تغير direct-use أو production shipping.
- تغير privilege/execution-context.
- تغير support/EOL/deprecation status.
- concern متعلق بـintegrity/provenance.
- توفر supported upstream replacement.

المراجعة الدورية لا تستبدل event-driven re-evaluation. سجل tracking المنتهي أو الذي لم يعد منطبقًا يمنع قبول graph جديد/merge حتى إعادة التقييم؛ ولا يوجب بذاته إيقاف production تلقائيًا.

**الضوابط والاعتمادات القائمة.** تبقى committed/frozen lockfiles، وتثبيت إصدارات Direct بدقة، وstrict peer/engine validation، والحد المضبوط لنضج الإصدارات الجديدة، والفحص الكامل للاعتماديات، ومراجعة أو تعطيل lifecycle scripts وفق SE-060 إلى SE-064. في checkpoint 00-B، يبقى `reflect-metadata@0.2.2` و`rxjs@7.8.2` Direct mandatory peers؛ وتبقى اعتمادات direct-age المشروطة من المالك خاضعة لشروطها المسجلة وcomplete graph gate. لا يُعاد تصنيف أي منهما Transitive، ولا يصبح الاعتماد عامًا. لا يمنح هذا التغيير للسياسة بذاته إذنًا بتثبيت أي package أو استئناف checkpoint.

---

## 2. المبادئ المعمارية السبعة — غير قابلة للتفاوض

هذه هي العمود الفقري. **أي كود يخالف واحدًا منها لا يدخل `main` مهما كان مبرره العملي.** التغيير يتم عبر ADR فقط.

### `CORE-010` — Multi-tenant by design
كل Website وكل Query وكل Asset وكل Event **يجب** أن يحمل `tenant/site scope` واضحًا.
**ممنوع** الاعتماد على معرّف (ID) وحده بدون فحص ملكية (ownership check).
→ التفاصيل: [`systems/01-multi-tenancy.md`](systems/01-multi-tenancy.md)

### `CORE-011` — Content ≠ Presentation
المحتوى يُخزَّن كـ **Structured Data** والتصميم كـ **variant/theme منفصل**.
**ممنوع** تخزين الصفحة كـ HTML خام — لا من الـ AI ولا من المستخدم.
→ التفاصيل: [`systems/03-content-engine.md`](systems/03-content-engine.md)

### `CORE-012` — One platform, many sites
لا Database لكل عميل. لا VM لكل موقع. لا WordPress لكل عميل. لا Container لكل tenant.
**ممنوع** أي حل يجعل تكلفة البنية التحتية تنمو خطيًا مع عدد العملاء.

### `CORE-013` — Modular Monolith first
Backend واحد منظَّم إلى Modules بحدود واضحة.
**ممنوع** فصل أي module إلى Microservice بدون قياس فعلي (ضغط / استقلالية / blast radius) موثَّق في ADR. الموضة ليست سببًا.
→ التفاصيل: [`systems/17-backend-modules.md`](systems/17-backend-modules.md)

### `CORE-014` — Edge/cache first for published traffic
الزيارات العامة للمواقع المنشورة **يجب ألا** تضرب PostgreSQL في كل Request.
→ التفاصيل: [`systems/20-performance-caching.md`](systems/20-performance-caching.md)

### `CORE-015` — Async for slow work
AI، معالجة الصور، البريد، التحقق من الدومينات، تجميع الـ analytics — كلها **يجب** أن تمر عبر Queue/Workers.
**ممنوع** تنفيذ عمل بطيء أو معتمد على طرف ثالث داخل دورة request/response.
→ التفاصيل: [`systems/13-queues-jobs-cache.md`](systems/13-queues-jobs-cache.md)

### `CORE-016` — Least privilege
كل Service وكل User وكل Token يملك **أقل** صلاحيات لازمة فقط.
→ التفاصيل: [`systems/12-auth.md`](systems/12-auth.md) و [`systems/14-security.md`](systems/14-security.md)

---

## 3. القواعد الذهبية العشر (اطبعها وعلّقها)

| # | القاعدة | الملف |
|---|---|---|
| 1 | كل query على بيانات مستأجر **بدون** scope = باق أمني حرج | `01` |
| 2 | الـ AI يُخرج **JSON مُتحقَّق منه**، لا HTML ولا كود | `05` |
| 3 | النشر يُنتج **revision غير قابلة للتعديل**؛ الـ draft لا يظهر للزوار أبدًا | `06` |
| 4 | إخفاء زر في الواجهة **ليس** Authorization | `12` |
| 5 | كل مدخل من العميل يُتحقق منه **server-side** مهما تحقق منه الـ frontend | `15` |
| 6 | لا `secrets` ولا `PII` في الـ logs. أبدًا | `14`, `19` |
| 7 | الاعتماد على Redis كمصدر حقيقة = فقدان بيانات | `13` |
| 8 | كل Job لازم يكون **idempotent** أو يحمل idempotency key | `13` |
| 9 | نسخة احتياطية لم تُختبر استعادتها = **لا توجد** نسخة احتياطية | `21` |
| 10 | أي مخالفة لمبادئ القسم 2 تحتاج **ADR معتمد** قبل الكود، لا بعده | `32` |

---

## 4. خريطة الأنظمة — أين أجد القاعدة التي أحتاجها

| # | النظام | الملف | بادئة القواعد | المالك |
|---|---|---|---|---|
| 01 | Multi-tenancy والعزل | [`01-multi-tenancy.md`](systems/01-multi-tenancy.md) | `MT-` | Backend |
| 02 | Domain Model وقاعدة البيانات | [`02-data-model.md`](systems/02-data-model.md) | `DM-` | Backend |
| 03 | Section / Template / Theme Engine | [`03-content-engine.md`](systems/03-content-engine.md) | `CE-` | Full-stack |
| 04 | Visual Editor | [`04-visual-editor.md`](systems/04-visual-editor.md) | `VE-` | Frontend |
| 05 | AI Generation | [`05-ai-generation.md`](systems/05-ai-generation.md) | `AI-` | Backend |
| 06 | Renderer & Publishing | [`06-renderer-publishing.md`](systems/06-renderer-publishing.md) | `RP-` | Full-stack |
| 07 | Domains & SSL | [`07-domains-ssl.md`](systems/07-domains-ssl.md) | `DN-` | Backend/DevOps |
| 08 | Assets & Media Pipeline | [`08-assets-media.md`](systems/08-assets-media.md) | `AS-` | Backend |
| 09 | Forms, Leads & Notifications | [`09-forms-leads.md`](systems/09-forms-leads.md) | `FL-` | Backend |
| 10 | Analytics | [`10-analytics.md`](systems/10-analytics.md) | `AN-` | Backend/Data |
| 11 | Billing & Entitlements | [`11-billing-entitlements.md`](systems/11-billing-entitlements.md) | `BE-` | Backend |
| 12 | Authentication & Authorization | [`12-auth.md`](systems/12-auth.md) | `AU-` | Backend/Security |
| 13 | Cache, Queues & Jobs | [`13-queues-jobs-cache.md`](systems/13-queues-jobs-cache.md) | `QJ-` | Backend |
| 14 | Security Engineering | [`14-security.md`](systems/14-security.md) | `SE-` | Security |
| 15 | API Standards | [`15-api-standards.md`](systems/15-api-standards.md) | `API-` | Backend |
| 16 | Frontend Standards | [`16-frontend-standards.md`](systems/16-frontend-standards.md) | `FE-` | Frontend |
| 17 | Backend Module Boundaries | [`17-backend-modules.md`](systems/17-backend-modules.md) | `BM-` | Backend |
| 18 | Infrastructure & CI/CD | [`18-infrastructure-cicd.md`](systems/18-infrastructure-cicd.md) | `IN-` | DevOps |
| 19 | Observability & Operations | [`19-observability.md`](systems/19-observability.md) | `OB-` | DevOps/SRE |
| 20 | Performance & Caching | [`20-performance-caching.md`](systems/20-performance-caching.md) | `PF-` | Full-stack |
| 21 | Backup / DR / Retention | [`21-backup-dr-retention.md`](systems/21-backup-dr-retention.md) | `BR-` | DevOps |
| 22 | Testing Strategy | [`22-testing.md`](systems/22-testing.md) | `TS-` | QA/All |
| 23 | i18n / RTL / Localization | [`23-i18n-rtl.md`](systems/23-i18n-rtl.md) | `IL-` | Frontend |

---

## 5. هيكل الريبو وملكية الكود

```
/apps
  /api                 → NestJS — منطق الأعمال كله
  /dashboard-web       → Next.js — لوحة التحكم + Visual Editor
  /public-renderer     → Next.js — عرض المواقع المنشورة للزوار
  /worker              → BullMQ workers
/packages
  /schemas             → Zod/JSON schemas مشتركة (مصدر الحقيقة للعقود)
  /types               → TypeScript types مشتركة
  /site-sections       → مكوّنات الـ sections (تُستخدم في Renderer + Editor preview)
  /ui-dashboard        → Design System للوحة التحكم فقط
  /config              → إعدادات مشتركة (eslint, tsconfig, tailwind)
  /testing             → أدوات وfixtures للاختبارات
  /observability       → logger, metrics, tracing helpers
/infra                 → IaC، إعدادات النشر
/docs
  /ar, /en             → هذه الوثائق
  /adr                 → Architecture Decision Records
  /api                 → OpenAPI specs
  /runbooks            → إجراءات التشغيل والحوادث
```

**`CORE-020` (MUST):** `packages/site-sections` **يجب** أن تظل قابلة للاستخدام من `public-renderer` و `dashboard-web` معًا. ممنوع أن تعتمد على كود خاص بلوحة التحكم.

**`CORE-021` (MUST NOT):** ممنوع أن يستورد `packages/ui-dashboard` أي شيء من `site-sections` أو العكس. هما نظامان بصريان منفصلان بالكامل.

**`CORE-022` (MUST):** أي عقد بيانات (section schema, API DTO, event payload) **يجب** أن يُعرَّف مرة واحدة في `packages/schemas` ويُستورد من هناك. ممنوع تكرار تعريف نفس الشكل في أكثر من مكان.

**`CORE-023` (MUST NOT):** ممنوع الاستيراد من المسارات الداخلية لموديول آخر (`modules/billing/repositories/...`). التواصل عبر الـ public service interface أو domain events فقط.

---

## 6. أعراف التسمية (Naming Conventions)

### 6.1 قاعدة البيانات

| العنصر | القاعدة | مثال |
|---|---|---|
| اسم الجدول | `snake_case`، **جمع** | `site_revisions` |
| العمود | `snake_case`، **مفرد** | `published_at` |
| المفتاح الأساسي | `id` | — |
| المفتاح الخارجي | `<singular_table>_id` | `website_id` |
| التاريخ/الوقت | ينتهي بـ `_at`، نوعه `timestamptz` | `created_at` |
| Boolean | يبدأ بـ `is_` أو `has_` | `is_active` |
| JSONB | ينتهي بـ `_json` | `data_json` |
| Index | `idx_<table>_<cols>` | `idx_sections_page_id_sort_order` |
| Unique | `uq_<table>_<cols>` | `uq_domains_hostname` |
| Foreign key | `fk_<table>_<ref_table>` | `fk_pages_websites` |

**`CORE-030` (MUST):** كل عمود زمني نوعه `timestamptz` ويُخزَّن **UTC**. ممنوع `timestamp` بدون timezone.

### 6.2 TypeScript

| العنصر | القاعدة |
|---|---|
| ملف | `kebab-case.ts` — `website-publish.service.ts` |
| Class / Interface / Type | `PascalCase` |
| Function / variable | `camelCase` |
| Constant حقيقي | `SCREAMING_SNAKE_CASE` |
| مجلد | `kebab-case` |
| Component (React) | `PascalCase.tsx` |
| Hook | `use-<name>.ts` يصدّر `useName` |
| نوع الـ props | `<ComponentName>Props` |

**`CORE-031` (MUST NOT):** `any` ممنوع في كود الإنتاج. استخدم `unknown` + narrowing، أو عرّف النوع. الاستثناء الوحيد: تعريفات لمكتبة خارجية بلا types، مع `// eslint-disable-next-line` وتعليق يشرح السبب.

**`CORE-032` (MUST NOT):** `@ts-ignore` ممنوع. `@ts-expect-error` مسموح **فقط** مع تعليق يشرح السبب ورقم تذكرة للإصلاح.

**`CORE-033` (MUST):** التحويلات بين الطبقات صريحة: `DbRow → DomainEntity → ApiDto`. ممنوع تمرير صف قاعدة البيانات كما هو إلى الـ API response — هذا أشهر سبب لتسريب حقول داخلية.

### 6.3 API

| العنصر | القاعدة | مثال |
|---|---|---|
| المسار | `kebab-case`، **جمع** | `/api/v1/websites/{websiteId}/site-revisions` |
| حقول الـ JSON | `camelCase` | `publishedAt` |
| كود الخطأ | `SCREAMING_SNAKE_CASE` | `DOMAIN_NOT_VERIFIED` |
| معرّف عام | مسبوق بنوعه | `site_01J...`, `lead_01J...` |

### 6.4 Queues والـ Events

| العنصر | القاعدة | مثال |
|---|---|---|
| اسم الـ Queue | `kebab-case` مفرد | `media`, `domains` |
| اسم الـ Job | `<domain>.<action>` | `media.generate-variants` |
| اسم الـ Domain Event | `PascalCase` بصيغة الماضي | `WebsitePublished` |
| مفتاح الـ Cache | `<scope>:<entity>:<id>[:<qualifier>]` | `site:config:site_01J:v42` |

---

## 7. Git — الفروع، الـ Commits، الـ Pull Requests

### 7.1 الفروع

```
main                    ← محمي. Production. لا push مباشر إلا genesis الفارغ في CORE-040.
feat/<scope>-<short>    ← ميزة جديدة
fix/<scope>-<short>     ← إصلاح
chore/<scope>-<short>   ← صيانة/أدوات
docs/<scope>-<short>    ← وثائق
```

**`CORE-040` (MUST NOT):** ممنوع الـ push المباشر على `main`. كل تغيير يمر بـ PR ومراجعة. استثناء التأسيس الوحيد هو root commit واحد بشجرة فارغة، بإذن صريح من المالك، لإنشاء `main` في مستودع `Hasoba96/website-builder-saas` الفارغ. لا يحتوي ملفات أو كودًا أو workflow أو configuration أو credentials، ولا يُعد baseline تطبيق مُتحققًا منه. يُسجل الفعل المعتمد وهوية الـcommit/tree الناتج. ينتهي الاستثناء فور إنشاء هذا المرجع ولا يسمح بأي direct push لاحق. تُفعّل الحماية المعتمدة لـmain قبل نشر مرشح الكود. كل تغيير لاحق على main يحتاج PR مُراجعًا ونجاح جميع بوابات CI المنطبقة.

**`CORE-041` (MUST):** الفرع قصير العمر — **أقل من 5 أيام عمل**. الفرع الأطول من ذلك يُقسَّم أو يُدمج خلف feature flag.

### 7.2 صيغة الـ Commit (Conventional Commits — إلزامية)

```
<type>(<scope>): <وصف قصير بصيغة الأمر>

[جسم اختياري — لماذا، وليس ماذا]

Refs: WBP-123
```

الأنواع المسموحة: `feat` · `fix` · `refactor` · `perf` · `test` · `docs` · `chore` · `build` · `ci` · `revert`

الـ scopes المعتمدة تطابق أسماء الموديولات: `auth`, `websites`, `sections`, `revisions`, `domains`, `assets`, `forms`, `leads`, `billing`, `entitlements`, `analytics`, `ai`, `notifications`, `audit`, `renderer`, `editor`, `infra`, `docs`.

```
feat(domains): add background DNS verification job
fix(revisions): prevent draft leakage when publish job fails midway
```

**`CORE-042` (MUST):** أي تغيير يكسر التوافق يحمل `BREAKING CHANGE:` في جسم الـ commit مع خطة الترحيل.

### 7.3 الـ Pull Request

**`CORE-043` (MUST):** وصف الـ PR يحتوي على:
1. **ماذا ولماذا** — لا تكتفِ بسرد الملفات.
2. **الموديول المالك** لهذا التغيير.
3. **أثر Multi-tenancy** — هل لمست query على بيانات مستأجر؟ كيف تحققت من الـ scope؟
4. **أثر قاعدة البيانات** — أي migration؟ هل هي آمنة للتشغيل أثناء الخدمة؟
5. **كيف تُختبر يدويًا** — خطوات مرقّمة.
6. **خطة الرجوع (Rollback)** — كيف نلغي هذا لو ساء الوضع في الإنتاج؟
7. **لقطات شاشة** لأي تغيير في الواجهة (Desktop + Mobile + RTL + LTR).

**`CORE-044` (MUST):** حجم الـ PR **≤ 400 سطر تغيير فعلي** (باستثناء الملفات المولّدة والـ lockfiles). الأكبر من ذلك يُقسَّم. يجوز لـPR واحد لاستيراد الـfoundation لأول مرة، بإذن المالك، إلى قاعدة `main` ذات الشجرة الفارغة في `Hasoba96/website-builder-saas` تجاوز الحد الإجمالي فقط بعد تقسيم كامل الـdiff إلى حزم مرتبة حسب الاعتماديات، كل منها مُراجعة منفردة ولا تتجاوز 400 سطر تغيير فعلي. يحدد الـmanifest كل ملف/hunk وحزمة وcommit، وعدد أسطر الكود، والاستبعادات، ونتيجة المراجعة، والشجرة النهائية المعتمدة. لا تُستبعد security configuration أو scripts أو tests لمجرد أنها infrastructure. تبقى التغييرات غير البرمجية والملفات المولّدة/binary المستبعدة محصورة ومُراجعة. لا يُستورد كود التطبيق عبر direct push إلى main، ولا تُدمج حزمة ناقصة بتخفيف CI. يجب نجاح جميع البوابات المستضافة الإلزامية للـPR الكامل على مرشح الدمج الحالي، والحصول على موافقة دمج صريحة من المالك. يقتصر الإذن على foundation الحالية المعتمدة A-I/J، وتسوية الحوكمة المعتمدة، وإصلاحات/baselines J اللازمة والمُراجعة؛ ولا يشمل 00-K أو عمل المنتج. ينتهي عند أول دمج للاستيراد أو الموعد النهائي المسجل للتأسيس، أيهما أسبق. أي تغيير للمرشح يتطلب تحديث المراجعة والموافقة. بعد الاستيراد يعود الحد المعتاد دون استثناء.

**`CORE-045` (MUST):** في نمط الفريق، يلزم مراجع بشري واحد على الأقل غير المنفذ؛ والتغييرات التي تمس **multi-tenancy، auth، billing، publishing، أو migrations** تحتاج **مراجعَيْن بشريين**، أحدهما مالك الموديول. في نمط المالك المنفرد المعتمد صراحة، يجوز للتغييرات المؤهلة اتباع مراجعة تقنية موثقة بمساعدة AI ثم قبول صريح من المالك وفق الإجراء أدناه. هذا مسار حوكمة بديل، وليس مراجعة بشرية مستقلة أو استيفاءً لمطلب شخصين. ممنوع اختلاق الموافقات أو احتساب هويات متعددة يتحكم بها المالك أو AI كمراجعين بشريين مختلفين.

**اعتماد النمط والأدلة.** يحدد الاعتماد المالك المسؤول والمستودع وتاريخ السريان وموعد إعادة التقييم خلال 90 يومًا كحد أقصى. تُعاد المراجعة عند كل checkpoint، وفور انضمام maintainer آخر أو أول بيانات عملاء حقيقية أو حادث جوهري أو حد ثقة إنتاجي جديد. انتهاء الاعتماد يمنع عمليات دمج جديدة حتى التجديد. يسجل كل تغيير المخاطر والتعرض الفعليين، وملكية الموديول، وهوية الكود المُراجع، وpass منفصل للمراجعة بمساعدة AI وحدوده، والنتائج وحلها، واختبارات الفشل/الحالات السلبية، وخطة الرجوع، وأدلة CI المطلوبة. يلزم إذن صريح من المالك للنشر وآخر منفصل للدمج، مرتبطان بالمحتوى والفعل المُراجعين تحديدًا؛ تغيير head/base يُبطل القبول المتأثر. تظل CORE-043/046 وكل متطلبات الأنظمة المنطبقة إلزامية. يسجل [سجل الاعتماد المؤرخ](../checkpoints/00-j-solo-governance-adoption.md) المالك الحالي ومواعيد الاستثناءات أحادية الاستخدام، ولا يمنح سلطة إعفاء عامة.

**تصنيف المخاطر.** يجوز استخدام المراجعة المنفردة للتغييرات الروتينية والتغييرات الحساسة المعزولة غير الإنتاجية القابلة للرجوع. تتطلب التغييرات الحساسة مراجعة صريحة للتهديدات والفشل وقرارًا من المالك بشأن المخاطر المتبقية. لا تُصنف الحوكمة أو CI أو ضوابط الأمن أو supply chain أو credentials أو صلاحيات infrastructure أو الفئات الحساسة الخمس أعلاه كروتينية لمجرد أنها أدوات أو وثائق. لا تتأهل التغييرات قبل الإنتاج في تلك الفئات الخمس إلا دون مستخدمين حقيقيين أو بيانات عملاء أو credentials إنتاجية أو مدفوعات حقيقية، مع حدود مُختبرة ومنع النشر/التفعيل المبكر.

**حالات تتطلب إنسانًا مستقلًا.** تلزم المراجعة البشرية المستقلة قبل أول تفعيل pilot/production لتلك الأسطح الحساسة، وللتغييرات اللاحقة على حدود الأمن الإنتاجية الفعالة. تتطلب migrations غير القابلة للرجوع وفق DM-034، وعمليات بيانات الإنتاج غير القابلة للرجوع، وتصميمات التشفير الخاصة/أمن تنفيذ الكود غير الموثوق، ومقترحات تخفيف الضوابط الإلزامية إنسانًا مستقلًا مؤهلًا بالإضافة إلى قرار المالك/مالك الموديول. تظل المحظورات الملزمة ومتطلبات ADR الأخرى نافذة؛ المراجعة لا تعفي منها. يُمنع التغيير إذا غاب المراجع المستقل المطلوب أو لم يُحسم التصنيف/التعرض. لا يُنشأ استثناء بقرار المالك وحده لهذه الحالات. لا يجيز هذا الإجراء أي مرحلة أو deployment لاحق.

**`CORE-046` (MUST NOT):** ممنوع دمج PR وفيه CI أحمر، أو نقاش مراجعة مفتوح بلا رد.

---

## 8. Definition of Ready / Definition of Done

### 8.1 Definition of Ready (قبل بدء التنفيذ)

المهمة **لا تبدأ** قبل أن يتحقق كل ما يلي:

- [ ] معايير القبول (Acceptance criteria) مكتوبة وقابلة للاختبار.
- [ ] **الموديول المالك** محدَّد، وحدود المسؤولية واضحة.
- [ ] عقد البيانات (schema / API / event) متفق عليه ومكتوب في `packages/schemas`.
- [ ] أثر Multi-tenancy مفهوم: ما هي الـ scopes المطلوبة؟
- [ ] أثر الـ Entitlements مفهوم: هل الميزة محدودة بخطة؟ ما الـ `feature_key`؟
- [ ] هل يحتاج ADR؟ (راجع القسم 12)
- [ ] هل يحتاج Feature Flag؟ (عالي المخاطر = نعم)

### 8.2 Definition of Done (قبل دمج الـ PR) — إلزامي بالكامل

- [ ] معايير القبول محققة فعليًا.
- [ ] **Authorization و tenant scope** تمت مراجعتهما صراحةً.
- [ ] **Validation موجودة server-side** لكل مدخل.
- [ ] Unit / Integration tests مضافة للمسارات الجديدة.
- [ ] **اختبار cross-tenant** مضاف إذا لمس التغيير بيانات مستأجر.
- [ ] لا أخطاء lint/type حرجة. `tsc --noEmit` نظيف.
- [ ] Logs و Metrics للأجزاء التشغيلية المهمة.
- [ ] حالات الخطأ والتحميل والفراغ (error/loading/empty) معالَجة في الواجهة.
- [ ] Migrations آمنة ومراجَعة، مع خطة forward/rollback.
- [ ] OpenAPI / schema docs محدَّثة.
- [ ] **لا secrets ولا PII غير لازمة في الـ logs.**
- [ ] الميزة قابلة للرجوع أو التعطيل (flag) إذا كانت عالية المخاطر.
- [ ] الواجهة مختبَرة في **RTL و LTR** معًا إذا لمست الواجهة.
- [ ] **ملف الوثائق المعني في `docs/` محدَّث** إذا تغيّرت قاعدة أو عقد.

---

## 9. دورة حياة الميزة

```
متطلب منتج
    ↓
تصميم تقني مختصر (صفحة واحدة تكفي)
    ↓
قرار الـ API / الـ schema  ←── يحتاج ADR؟ ── نعم ──→ اكتب ADR واعتمده أولًا
    ↓
تنفيذ خلف Feature Flag (لو عالي المخاطر)
    ↓
اختبارات (unit + integration + cross-tenant)
    ↓
مراجعة الكود
    ↓
Staging + فحص Observability فعلي (logs/metrics/traces)
    ↓
إطلاق تدريجي + مراقبة
    ↓
إزالة الـ Flag بعد الاستقرار
```

**`CORE-050` (MUST):** أي ميزة عالية المخاطر (تمس النشر، الدومينات، الفوترة، الـ auth، أو هجرة بيانات) **تُطلق خلف Feature Flag** وتُراقَب قبل التعميم.

**`CORE-051` (MUST):** الـ Feature Flag ليس دائمًا. كل flag له **تاريخ إزالة** وتذكرة مرتبطة. الـ flags الميتة دَين تقني يُنظَّف كل sprint.

---

## 10. قواعد الكود العامة

### 10.1 معالجة الأخطاء

**`CORE-060` (MUST NOT):** ممنوع `catch` فارغ أو `catch` يبتلع الخطأ بلا تسجيل ولا إعادة رمي.

**`CORE-061` (MUST):** الأخطاء المتوقعة (فشل validation، مورد غير موجود، صلاحية ناقصة) تُمثَّل بأنواع خطأ خاصة بالنطاق (domain error types)، لا برمي `Error` عام.

**`CORE-062` (MUST NOT):** ممنوع تسريب رسائل الاستثناءات الداخلية أو الـ stack traces إلى استجابة الـ API. الشكل الموحّد للخطأ في [`systems/15-api-standards.md`](systems/15-api-standards.md).

**`CORE-063` (MUST):** كل استدعاء لطرف ثالث (AI، دفع، DNS، بريد) يحمل **timeout صريح** و **سياسة retry محدودة**. لا استدعاء شبكي بلا timeout.

### 10.2 قاعدة البيانات

**`CORE-064` (MUST NOT):** ممنوع كتابة SQL خام بتجميع نصوص (string concatenation) من مدخلات المستخدم. استخدم parameterized queries أو الـ ORM.

**`CORE-065` (MUST):** كل عملية تكتب في أكثر من جدول وتحتاج اتساقًا تُنفَّذ داخل **transaction** واحدة.

**`CORE-066` (MUST NOT):** ممنوع N+1 queries في أي مسار ساخن — وخصوصًا الـ Renderer. راجع `PF-`.

### 10.3 الوقت والأرقام والنصوص

**`CORE-067` (MUST):** كل الأوقات داخليًا **UTC**. التحويل للتوقيت المحلي يحدث في طبقة العرض فقط.

**`CORE-068` (MUST):** المبالغ المالية تُخزَّن كـ **أعداد صحيحة بأصغر وحدة** (قروش/سنتات) مع رمز العملة. **ممنوع** `float` للفلوس.

**`CORE-069` (MUST):** كل النصوص المعروضة للمستخدم تمر بطبقة الترجمة. **ممنوع** نص مكتوب مباشرة في المكوّن. راجع [`systems/23-i18n-rtl.md`](systems/23-i18n-rtl.md).

### 10.4 الأسرار والتهيئة

**`CORE-070` (MUST NOT):** **ممنوع نهائيًا** كتابة أي secret أو مفتاح أو كلمة مرور في الكود أو في ملف يدخل Git — بما في ذلك ملفات الاختبار والأمثلة.

**`CORE-071` (MUST):** كل إعداد يأتي من متغيرات البيئة، ويُتحقق منه **عند إقلاع التطبيق** بـ schema. التطبيق **يفشل بصوت عالٍ عند الإقلاع** لو نقص إعداد مطلوب — لا يبدأ ثم ينهار لاحقًا.

**`CORE-072` (MUST):** `.env.example` محدَّث دائمًا بكل مفتاح مطلوب (بقيم وهمية). نقص مفتاح فيه = PR ناقص.

---

## 11. التعامل مع بيانات المستخدمين والـ PII

**`CORE-080` (MUST):** جمع الحد الأدنى. لا نطلب ولا نخزّن بيانات شخصية بلا حاجة منتجية واضحة.

**`CORE-081` (MUST NOT):** ممنوع تسجيل الـ PII (بريد، هاتف، اسم، عنوان، محتوى lead) في الـ logs. سجّل المعرّفات فقط: `leadId`, `siteId`, `tenantId`.

**`CORE-082` (MUST):** كل نوع بيانات له **سياسة احتفاظ (retention)** موثَّقة في [`systems/21-backup-dr-retention.md`](systems/21-backup-dr-retention.md).

**`CORE-083` (MUST):** حذف الحساب يفرّق بين **soft-delete + مهلة سماح** و **الحذف النهائي المجدول**، ويُنفَّذ على كل الأنظمة (DB، التخزين، الـ analytics، الـ cache).

---

## 12. ADR — قرارات المعمارية

قرار المعمارية يُسجَّل في ملف Markdown واحد داخل `docs/adr/` بصيغة `ADR-NNN-<slug>.md`. القالب في [`../adr/ADR-TEMPLATE.md`](adr/ADR-TEMPLATE.md).

**`CORE-090` (MUST):** يحتاج ADR **قبل** كتابة الكود:
- تغيير قاعدة البيانات الأساسية أو إضافة مخزن بيانات جديد.
- فصل موديول إلى Microservice.
- تغيير نموذج الـ Multi-tenancy.
- تغيير آلية الـ Rendering أو الـ Publishing الأساسية.
- السماح بتنفيذ كود مخصص من المستخدم (custom code execution).
- تغيير مزوّد أساسي (الدومينات/TLS/الدفع/الـ AI) بأثر معماري.
- أي مخالفة لمبادئ القسم 2.

**`CORE-091` (MUST NOT):** ممنوع تعديل ADR معتمد. القرار الجديد يُكتب في ADR جديد ويُعلَّم القديم `Superseded by ADR-NNN`.

---

## 13. حارس نطاق الـ MVP

### داخل الـ MVP
10 فئات نشاط · 5 themes · 10–15 نوع section (~80–100 variant) · توليد AI للـ blueprint والمحتوى · Visual editor (نص/صور/ترتيب/variant/theme) · Draft + Publish + rollback أساسي · Subdomain · Custom domain + SSL · نماذج تواصل + leads · WhatsApp CTA · analytics أساسي · عربي/إنجليزي + RTL/LTR · خطط وفوترة وentitlements.

### خارج الـ MVP (ممنوع البدء فيه)
متجر إلكتروني كامل · سوق حجوزات معقّد · منصة تسويق بريدي · JavaScript مخصص من المستخدم · multi-region active-active · أسطول microservices · سوق إضافات · أتمتة CRM متقدمة.

**`CORE-100` (MUST NOT):** أي ميزة خارج القائمة **لا تدخل الـ MVP** إلا إذا كانت لازمة لإثبات Product-Market Fit أو لإيراد مباشر — وبقرار مكتوب.

**`CORE-101` (MUST):** عند اقتراح ميزة جديدة، اسأل أولًا: «هل يمكن تحقيقها بـ section variant أو إعداد جديد بدل كود جديد؟» في هذا المنتج، **معظم الطلبات يجب أن تُحَل في طبقة المحتوى لا في طبقة الكود**.

---

## 14. متى نغيّر المعمارية (Scaling Roadmap)

| المرحلة | الحجم التقريبي | التغييرات المحتملة |
|---|---|---|
| **A** | 0–5K مشترك | Modular monolith · Postgres/Redis مُدارة · CDN caching |
| **B** | 5K–50K | توسيع أفقي للـ API/Renderer · read replicas · طوابير أقوى · مخزن analytics منفصل |
| **C** | 50K–200K | تقسيم DB عند القياس · ingestion مخصص · workers متخصصة |
| **D** | 200K+ | قراءات multi-region · استخراج خدمات للنطاقات الساخنة · توجيه متقدم |

**`CORE-110` (MUST NOT):** الأرقام أعلاه **إرشادية وليست triggers**. ممنوع القفز لمرحلة لاحقًا بناءً على التوقع.
الـ triggers الحقيقية هي **قياسات**: تنافس على CPU/DB · تأخر الطوابير (queue lag) · اتساع دائرة الأثر (blast radius) · تشابك النشر (deploy coupling) · ملكية الفرق · التكلفة.

---

## 15. المصطلحات الموحدة (Glossary)

استخدم هذه الكلمات بهذه المعاني بالضبط — في الكود، وفي قاعدة البيانات، وفي النقاش، وفي الواجهة.

| المصطلح | المعنى الدقيق |
|---|---|
| **Tenant / Organization** | وحدة العزل والملكية والفوترة. كل شيء ينتمي لـ tenant. |
| **Website / Site** | موقع واحد يملكه tenant. له slug وthemeودومينات. |
| **Page** | صفحة داخل موقع، لها slug خاص بها. |
| **Section** | كتلة محتوى داخل صفحة. لها `type` و`variant` و`data`. |
| **Section Type** | نوع الكتلة وظيفيًا (`hero`, `services`, `contact`). |
| **Variant** | الشكل البصري لنفس الـ type (`hero-07`). **لا يغيّر شكل البيانات.** |
| **Theme Tokens** | قيم التصميم العامة (ألوان، خطوط، أنصاف أقطار، تباعد). |
| **Template / Blueprint** | تركيبة sections جاهزة لفئة نشاط. |
| **Draft Revision** | النسخة قيد التحرير. **لا يراها الزائر أبدًا.** |
| **Published Revision** | لقطة غير قابلة للتعديل يقرأ منها الـ Renderer. |
| **Publish** | العملية التي تُنشئ Published Revision من الـ Draft. |
| **Renderer** | الطبقة التي تحوّل Published Revision إلى HTML للزوار. |
| **Entitlement** | إجابة مركزية على «هل يملك هذا الـ tenant هذه الميزة/الحد؟» |
| **Lead** | إرسال نموذج من زائر موقع منشور. |
| **Asset** | ملف يرفعه المستخدم + الـ metadata والنسخ المحسّنة. |
| **Idempotency Key** | مفتاح يضمن أن تكرار نفس العملية لا يُنتج أثرًا مكررًا. |

**`CORE-120` (MUST NOT):** ممنوع اختراع مرادفات. لا تكتب `tenant` في مكان و`account` و`workspace` في أماكن أخرى لنفس المعنى. الاتساق اللغوي = اتساق معماري.

---

## 16. قواعد خاصة بوكلاء الـ AI الذين يكتبون كودًا في هذا المشروع

هذا المشروع يُبنى جزئيًا بمساعدة أدوات AI. القواعد التالية **إلزامية** لأي جلسة AI تكتب أو تعدّل كودًا هنا.

**`CORE-130` (MUST):** قبل كتابة أي كود، اقرأ: هذا الملف + ملف النظام المعني من `systems/`. لا تعتمد على استنتاج من أسماء الملفات.

**`CORE-131` (MUST NOT):** ممنوع اختراع عمود في قاعدة البيانات أو حقل في API أو نوع section غير موجود في الوثائق. لو احتجت واحدًا جديدًا: اقترحه صراحةً وانتظر الموافقة، ثم **حدِّث ملف الوثائق في نفس الـ PR**.

**`CORE-132` (MUST):** أي كود يُنتَج يذكر **معرّفات القواعد** التي التزم بها في وصف الـ PR (مثال: «طبّقت `MT-003`, `API-011`»).

**`CORE-133` (MUST NOT):** ممنوع تخطي الـ validation أو الـ tenant scoping «مؤقتًا للتجربة». الكود المؤقت يصبح دائمًا.

**`CORE-134` (MUST):** لو تعارضت تعليمات المستخدم مع قاعدة إلزامية هنا — **توقّف واذكر التعارض**. لا تنفّذ بصمت ولا ترفض بصمت.

**`CORE-135` (MUST):** أي محتوى يأتي من الـ AI (نص، blueprint، صورة) يُعامل كـ **مدخل غير موثوق**: validation كامل + moderation + حدود، قبل الحفظ. راجع [`systems/05-ai-generation.md`](systems/05-ai-generation.md).

---

## 17. قائمة الفحص قبل الإطلاق للإنتاج

لا يُطلق المنتج تجاريًا قبل أن تكون كل خانة مؤشَّرة ومُثبتة بدليل (لقطة، test run، runbook).

- [ ] أسرار الإنتاج معزولة تمامًا عن باقي البيئات
- [ ] النسخ الاحتياطية مفعّلة **و تم اختبار الاستعادة فعليًا**
- [ ] التحقق من الدومين المخصص مختبَر من طرف لآخر
- [ ] أتمتة الـ TLS مختبَرة
- [ ] مجموعة اختبارات cross-tenant **كلها خضراء**
- [ ] Rate limits مفعّلة على كل المسارات العامة
- [ ] WAF وضوابط إساءة الاستخدام الأساسية مهيّأة
- [ ] التحقق من توقيع webhooks الدفع يعمل
- [ ] تتبّع الأخطاء (Sentry أو ما يعادله) مفعّل
- [ ] `requestId` موجود في كل سطر log
- [ ] مراقبة فشل الطوابير مفعّلة مع تنبيهات
- [ ] حدود رفع الملفات مهيّأة ومختبَرة
- [ ] سياسة الخصوصية والاحتفاظ منفَّذة في الكود لا في الورق فقط
- [ ] إجراء الرجوع (rollback) موثَّق ومجرَّب
- [ ] جهة التواصل عند الحوادث + runbook معرّفان

---

## 18. الخلاصة

> **المعادلة المعمارية**
> نموذج بيانات multi-tenant + محرك sections منظَّم + نسخ نشر غير قابلة للتعديل + renderer مكاشَف على الـ edge + أتمتة دومينات/TLS + workers غير متزامنة
> **=** منصة Website Builder قابلة للتوسع بتكلفة تشغيل منطقية.

هذه الوثيقة هي Baseline v1.0. **عند تغيّر افتراض رئيسي، لا نعدّل الكود فقط** — نحدّث المرجع و/أو نضيف ADR، حتى يظل الفريق كله متفقًا على طريقة البناء.

---

### سجل التغييرات

| الإصدار | التاريخ | التغيير |
|---|---|---|
| 1.0 | 2026-09-15 | الإصدار الأول — مشتق من Architecture Engineering Reference v1.0 |
