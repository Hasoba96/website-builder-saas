# 02 — Domain Model وقاعدة البيانات

> **بادئة القواعد:** `DM-` · **الحالة:** إلزامي · **المالك:** Backend
> **المرجع الأعلى:** [`../../en/00-PROJECT-RULES.md`](../../en/00-PROJECT-RULES.md) · **نسخة النظام الحاكمة:** [`../../en/systems/02-data-model.md`](../../en/systems/02-data-model.md) · هذه ترجمة عربية متزامنة.

---

## 0. الغرض والنطاق

تعريف الجداول الأساسية، قواعد التصميم، متى نستخدم JSONB ومتى لا، وقواعد الـ migrations الآمنة.

**قاعدة حاكمة:** PostgreSQL هو **مصدر الحقيقة الوحيد**. Redis وObject Storage والـ CDN كلها مشتقات يمكن إعادة بنائها. إذا فُقد Redis نعيد بناءه؛ إذا فُقد Postgres فقدنا المنتج.

---

## 1. الجداول الأساسية

### 1.1 الهوية والمستأجرون

| الجدول | الغرض | أعمدة أساسية |
|---|---|---|
| `users` | هوية المستخدم | `id`, `email`, `email_verified_at`, `password_hash`, `status`, `created_at` |
| `organizations` | المستأجر / مالك الفوترة | `id`, `name`, `owner_user_id`, `status`, `created_at` |
| `organization_members` | العضويات والأدوار | `organization_id`, `user_id`, `role`, `invited_at`, `joined_at` |

### 1.2 المواقع والمحتوى

| الجدول | الغرض | أعمدة أساسية |
|---|---|---|
| `websites` | تعريف الموقع | `id`, `organization_id`, `slug`, `status`, `locale`, `default_direction`, `theme_id`, `published_revision_id` |
| `pages` | صفحات الموقع | `id`, `website_id`, `organization_id`, `slug`, `title`, `status`, `sort_order` |
| `sections` | كتل المحتوى | `id`, `page_id`, `website_id`, `organization_id`, `type`, `variant`, `schema_version`, `data_json`, `settings_json`, `sort_order` |
| `themes` | قيم التصميم | `id`, `website_id`, `organization_id`, `tokens_json`, `base_theme_code` |
| `templates` | blueprints قابلة لإعادة الاستخدام | `id`, `category`, `schema_version`, `blueprint_json`, `is_active` |
| `site_revisions` | نسخ draft/published | `id`, `website_id`, `organization_id`, `version`, `status`, `snapshot_json`, `published_at`, `created_by` |

### 1.3 التوزيع والوسائط

| الجدول | الغرض | أعمدة أساسية |
|---|---|---|
| `domains` | الدومينات وربطها | `id`, `website_id`, `organization_id`, `hostname`, `status`, `verification_method`, `verification_token`, `verified_at`, `is_primary` |
| `assets` | metadata الملفات | `id`, `website_id`, `organization_id`, `object_key`, `mime`, `bytes`, `width`, `height`, `original_filename`, `status`, `variants_json` |

### 1.4 التفاعل والأعمال

| الجدول | الغرض | أعمدة أساسية |
|---|---|---|
| `forms` | تعريف النماذج | `id`, `website_id`, `organization_id`, `schema_json`, `notification_config_json` |
| `leads` | إرسالات النماذج | `id`, `form_id`, `website_id`, `organization_id`, `payload_json`, `source_json`, `status`, `created_at` |
| `plans` | الخطط | `id`, `code`, `price_minor`, `currency`, `interval`, `is_active` |
| `subscriptions` | حالة الاشتراك | `id`, `organization_id`, `plan_id`, `status`, `current_period_end`, `grace_until`, `provider_ref` |
| `entitlements` | صلاحيات الخطة | `plan_id`, `feature_key`, `limit_value` |
| `ai_generations` | طلبات AI | `id`, `website_id`, `organization_id`, `type`, `provider`, `model`, `prompt_version`, `status`, `tokens_in`, `tokens_out`, `cost_minor` |
| `analytics_events` | أحداث خام / buffer | `site_id`, `organization_id`, `event_type`, `schema_version`, `occurred_at`, `properties_json` |
| `audit_logs` | أحداث إدارية حساسة | `id`, `actor_user_id`, `organization_id`, `action`, `target_type`, `target_id`, `metadata_json`, `created_at` |

---

## 2. قواعد تصميم الجداول

**`DM-001` (MUST):** المعرّفات **ULID** (أو UUIDv7) مسبوقة بنوعها في التمثيل العام: `site_01J...`, `lead_01J...`.

> **لماذا ULID لا UUIDv4:** قابل للترتيب زمنيًا، فلا يفتّت الفهارس عند الإدخال بكثافة.
> **لماذا ليس عددًا متسلسلًا:** المعرّف المتسلسل في عنوان عام يكشف حجم النشاط ويسمح بالتخمين (enumeration).

**`DM-002` (MUST):** كل جدول مملوك لمستأجر يحمل `organization_id` مباشرةً (`MT-003`)، وكل جدول مرتبط بموقع يحمل `website_id` مباشرةً.

**`DM-003` (MUST):** تحمل جداول التطبيق/الدومين `created_at` و `updated_at` من نوع `timestamptz` بتوقيت UTC حيث تنطبق الدلالة (`CORE-030`). جداول metadata الداخلية التي تملكها أداة migrations ولا يملك التطبيق دلالتها الدومينية خارج هذا الشرط؛ لا تُعدّل internals الخاصة بـ`node-pg-migrate` لإضافة هذين العمودين.

**`DM-004` (MUST):** حقول الحالة (`status`) قيمها **مجموعة محصورة موثَّقة**، تُفرض بـ `CHECK constraint` أو enum على مستوى قاعدة البيانات. ممنوع نص حر.

```sql
ALTER TABLE domains ADD CONSTRAINT ck_domains_status CHECK (
  status IN ('pending_dns','verifying','tls_pending','active','failed','disconnected')
);
```

**`DM-005` (MUST):** الحذف للكيانات المهمة (websites, organizations, leads) هو **soft delete** عبر `deleted_at`، ويليه حذف نهائي مجدول. راجع [`21-backup-dr-retention.md`](21-backup-dr-retention.md).

**`DM-006` (MUST NOT):** ممنوع `ON DELETE CASCADE` على أي علاقة تحمل بيانات عميل. الحذف المتسلسل يجعل خطأً صغيرًا يمحو بيانات لا تُسترد.

**`DM-007` (MUST):** المبالغ المالية: عدد صحيح بأصغر وحدة + عمود عملة منفصل (`CORE-068`). اسم العمود ينتهي بـ `_minor`.

---

## 3. متى نستخدم JSONB — ومتى لا

هذه أكثر نقطة يُخطئ فيها الفريق. القاعدة بسيطة:

> **JSONB للمحتوى المتغيّر الشكل الذي نقرأه ككتلة واحدة.
> أعمدة عادية لكل ما نبحث به، أو نصفّي عليه، أو نحاسب عليه، أو نطبّق عليه قاعدة عمل.**

**`DM-010` (MUST):** JSONB مسموح ومناسب في:
- `sections.data_json` — شكل المحتوى يختلف بين كل نوع section.
- `sections.settings_json` — إعدادات العرض.
- `themes.tokens_json` — قيم التصميم.
- `templates.blueprint_json` — تركيبة الـ sections.
- `site_revisions.snapshot_json` — اللقطة الكاملة للموقع.
- `leads.payload_json` — حقول النموذج تختلف بين موقع وآخر.
- `analytics_events.properties_json` — خصائص الحدث.

**`DM-011` (MUST NOT):** **ممنوع** وضع هذه في JSONB — لكل منها عمود حقيقي:
- أي حالة (`status`) أو علاقة (`*_id`).
- أي شيء يخص الفوترة أو الصلاحيات أو الحدود.
- أي شيء نصفّي أو نرتّب أو نجمّع عليه في استعلام.
- أي تاريخ نبحث بمدى زمني عليه.
- أي علَم أمني (تحقق، ملكية، صلاحية).

```sql
-- ❌ خطأ: الحالة والخطة داخل JSON = لا فهارس، لا قيود، استعلامات هشة
subscriptions (id, organization_id, data_json)
  data_json = {"plan":"pro","status":"active","renewsAt":"..."}

-- ✅ صحيح
subscriptions (
  id, organization_id, plan_id, status,
  current_period_end timestamptz, grace_until timestamptz,
  provider_ref text, metadata_json jsonb   -- JSON للإضافي غير الحرِج فقط
)
```

**`DM-012` (MUST):** كل عمود JSONB له **schema معرَّف في `packages/schemas`** ويُتحقق منه قبل الكتابة. JSONB ليس رخصة لتخزين أي شكل.

**`DM-013` (MUST):** كل بنية JSONB متطوّرة تحمل `schemaVersion` — داخل الـ JSON أو في عمود منفصل. راجع [`03-content-engine.md`](03-content-engine.md).

**`DM-014` (SHOULD):** عند الحاجة للبحث داخل JSONB، يُضاف **generated column** أو فهرس GIN مدروس — لا فحص كامل للجدول.

---

## 4. الفهارس والقيود

**`DM-020` (MUST):** الفهرس يبدأ بعمود الـ scope (`MT-032`).

**`DM-021` (MUST):** الفهارس المطلوبة كحد أدنى:

```sql
-- حل الدومين: أسخن استعلام في المنتج كله
CREATE UNIQUE INDEX uq_domains_hostname ON domains (hostname) WHERE deleted_at IS NULL;
CREATE INDEX idx_domains_website ON domains (website_id, status);

-- حل الـ slug للـ subdomain
CREATE UNIQUE INDEX uq_websites_slug ON websites (slug) WHERE deleted_at IS NULL;

-- قراءة الموقع في الـ renderer
CREATE INDEX idx_pages_website_sort ON pages (website_id, sort_order);
CREATE INDEX idx_sections_page_sort ON sections (page_id, sort_order);

-- النسخة المنشورة
CREATE INDEX idx_revisions_website_status ON site_revisions (website_id, status, version DESC);

-- قوائم لوحة التحكم
CREATE INDEX idx_leads_org_created ON leads (organization_id, created_at DESC);
CREATE INDEX idx_websites_org ON websites (organization_id, status);

-- العضويات
CREATE UNIQUE INDEX uq_members_org_user ON organization_members (organization_id, user_id);
```

**`DM-022` (MUST):** الـ unique index على أعمدة قابلة للـ soft delete يكون **جزئيًا** (`WHERE deleted_at IS NULL`)، وإلا امتنع إعادة استخدام slug أو hostname بعد الحذف.

**`DM-023` (MUST NOT):** ممنوع إضافة فهرس بلا سبب مقاس. كل فهرس يبطّئ الكتابة ويستهلك مساحة. الفهرس يُضاف لاستعلام حقيقي موجود، لا لاحتمال.

**`DM-024` (MUST):** كل مفتاح خارجي له قيد `FOREIGN KEY` فعلي في قاعدة البيانات. سلامة البيانات ليست مسؤولية طبقة التطبيق وحدها.

---

## 5. الـ Migrations

**`DM-030` (MUST):** كل تغيير في الـ schema عبر ملف migration مُراجَع في Git. **ممنوع** أي تعديل يدوي على schema الإنتاج.

**`DM-031` (MUST):** كل migration **قابلة للتشغيل أثناء الخدمة (online)**. النظام لا يتوقف لتطبيق تغيير.

**`DM-032` (MUST NOT):** ممنوع في migration واحدة:
- إضافة عمود `NOT NULL` بلا `DEFAULT` على جدول كبير.
- إعادة تسمية أو حذف عمود ما زال الكود القديم يستخدمه.
- قفل جدول كبير لمدة طويلة.

**`DM-033` (MUST):** التغييرات الكاسرة تتم على **ثلاث مراحل (expand → migrate → contract)**:

```
1) Expand   : أضف العمود/الجدول الجديد. اكتب في القديم والجديد معًا. انشر.
2) Migrate  : املأ البيانات التاريخية على دفعات. حوّل القراءة للجديد. انشر.
3) Contract : بعد التأكد، احذف العمود القديم في migration منفصلة لاحقة.
```

**`DM-034` (MUST):** كل migration لها **خطة رجوع مكتوبة**. لو كان الرجوع مستحيلًا (حذف بيانات)، يُذكر ذلك صراحةً في الـ PR وتحتاج موافقة ثانية.

**`DM-035` (MUST):** تعبئة البيانات التاريخية (backfill) للجداول الكبيرة تتم في **وظيفة خلفية على دفعات**، لا داخل الـ migration نفسها.

**`DM-036` (MUST):** كل migration تُختبر على **نسخة من بيانات شبيهة بالإنتاج حجمًا** قبل النشر. migration مرّت على جدول فيه 10 صفوف لا تقول شيئًا عن جدول فيه 10 ملايين.

---

## 6. الأداء والاستعلامات

**`DM-040` (MUST NOT):** ممنوع N+1 في أي مسار ساخن — وأشدها خطرًا الـ renderer (`CORE-066`).

**`DM-041` (MUST):** كل استعلام يرجع قائمة له **حد أقصى (limit) مفروض في الكود**، حتى لو لم يطلبه العميل.

**`DM-042` (MUST):** الترقيم (pagination) للقوائم الكبيرة **cursor-based** لا `OFFSET`. راجع [`15-api-standards.md`](15-api-standards.md).

**`DM-043` (MUST):** أي استعلام جديد على مسار ساخن يُراجَع بـ `EXPLAIN ANALYZE` قبل الدمج، ويُرفق الناتج في الـ PR عند الشك.

**`DM-044` (MUST NOT):** ممنوع `SELECT *` في كود الإنتاج. حدّد الأعمدة صراحةً — وإلا سرّبت كل عمود يُضاف مستقبلًا.

---

## 7. الأنماط الممنوعة

| # | النمط | لماذا هو خطر |
|---|---|---|
| 1 | حالة أو علاقة داخل JSONB | لا فهارس، لا قيود، استعلامات هشة |
| 2 | `float` للمبالغ المالية | أخطاء تقريب في الفوترة |
| 3 | `timestamp` بلا timezone | كوابيس عند اختلاف المناطق الزمنية |
| 4 | `ON DELETE CASCADE` على بيانات عميل | خطأ صغير يمحو بيانات لا تُسترد |
| 5 | نص حر لحقل حالة | قيم غير متوقعة تكسر المنطق |
| 6 | فهرس بلا عمود scope أولًا | فحص كامل على جدول متعدد المستأجرين |
| 7 | migration تقفل جدولًا كبيرًا | توقف خدمة |
| 8 | backfill داخل الـ migration | انتهاء مهلة النشر وحالة نصف مطبَّقة |
| 9 | `SELECT *` في استجابة | تسريب أعمدة داخلية |
| 10 | صف قاعدة بيانات كـ API response | نفس الشيء + تشابك الطبقات (`CORE-033`) |

---

## 8. الاختبارات المطلوبة

**`DM-050` (MUST):** اختبار تكامل لكل مستودع يثبت أن الـ scope مفروض (يكمّل `MT-061`).

**`DM-051` (MUST):** اختبار يثبت أن كل قيد `CHECK` و `UNIQUE` يرفض القيم غير الصالحة فعليًا.

**`DM-052` (MUST):** اختبار لكل schema من schemas الـ JSONB: يقبل الصحيح، ويرفض الناقص، ويرفض الزائد.

**`DM-053` (MUST):** كل migration تُختبر صعودًا ونزولًا (up/down) في CI على قاعدة بيانات نظيفة.

---

## 9. Definition of Done — Data Model

- [ ] جدول التطبيق/الدومين الجديد يحمل scope وtimestamps حيث تنطبق `DM-002` و`DM-003`؛ metadata التي تملكها أداة migrations ليست جدول Domain.
- [ ] كل حقل حالة له `CHECK constraint` وقيم موثَّقة.
- [ ] الفهارس تبدأ بعمود الـ scope، والـ unique جزئي عند وجود soft delete.
- [ ] لا يوجد `ON DELETE CASCADE` على بيانات عميل.
- [ ] كل عمود JSONB له schema في `packages/schemas` + `schemaVersion`.
- [ ] لا توجد حالة/علاقة/بيانات فوترة داخل JSONB.
- [ ] الـ migration online وقابلة للرجوع، وخطة الرجوع مكتوبة.
- [ ] الـ backfill في وظيفة خلفية على دفعات، لا في الـ migration.
- [ ] `EXPLAIN ANALYZE` مراجَع لأي استعلام على مسار ساخن.
- [ ] لا `SELECT *` ولا تمرير صف DB إلى الـ API.
- [ ] `.env.example` والوثائق محدَّثة لو تغيّر عقد.

---

## 10. ما يحتاج ADR

- تغيير قاعدة البيانات الأساسية أو إضافة مخزن بيانات جديد.
- اعتماد تقسيم (partitioning) أو sharding.
- نقل الـ analytics لمخزن منفصل (ClickHouse مثلًا).
- تغيير استراتيجية المعرّفات (ULID → غيره).
- السماح بـ JSONB لأي بيانات فوترة أو صلاحيات.

---

## 11. مراجع متقاطعة

[`01-multi-tenancy.md`](01-multi-tenancy.md) · [`03-content-engine.md`](03-content-engine.md) schemas المحتوى · [`06-renderer-publishing.md`](06-renderer-publishing.md) الـ revisions · [`11-billing-entitlements.md`](11-billing-entitlements.md) · [`20-performance-caching.md`](20-performance-caching.md) · [`21-backup-dr-retention.md`](21-backup-dr-retention.md)
