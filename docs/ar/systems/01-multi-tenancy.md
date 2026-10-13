# 01 — Multi-tenancy ونموذج العزل

> **بادئة القواعد:** `MT-` · **الحالة:** إلزامي · **المالك:** Backend
> **المرجع الأعلى:** [`../../en/00-PROJECT-RULES.md`](../../en/00-PROJECT-RULES.md) · **نسخة النظام الحاكمة:** [`../../en/systems/01-multi-tenancy.md`](../../en/systems/01-multi-tenancy.md) · هذه ترجمة عربية متزامنة.
> **يحقق المبدأ:** `CORE-010` (Multi-tenant by design)

---

## 0. الغرض والنطاق

هذا النظام هو **الطبقة الأمنية الأهم في المنتج كله**. خرق واحد هنا يعني أن عميلًا يرى بيانات عميل آخر — وهذا ليس باقًا عاديًا، بل حادث أمني يوجب إبلاغ العملاء وقد يُنهي المنتج تجاريًا.

**النطاق:** التسلسل الهرمي للملكية · اشتقاق الـ tenant context · تطبيق الـ scope على كل طبقة · عزل قاعدة البيانات والتخزين والـ cache والطوابير والـ logs · اختبارات منع الوصول المتقاطع.

**خارج النطاق:** آليات المصادقة نفسها (في [`12-auth.md`](12-auth.md)) · حدود الخطط (في [`11-billing-entitlements.md`](11-billing-entitlements.md)).

---

## 1. التسلسل الهرمي للملكية

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

**`MT-001` (MUST):** طبقة **Organization/Tenant موجودة من اليوم الأول**، حتى لو كان كل مستخدم في المنتج فردًا واحدًا. المستخدم الفرد = organization بعضو واحد.

> **انطباق Stage 00:** يظل المطلب المعماري إلزاميًا. لا تحتوي Stage 00 على Domain Model أو Tenant entity أو Authentication، ولا تُنشأ هذه العناصر بصورة وهمية لتمكين اختبار العزل. انطباق التنفيذ والاختبارات موضح في [ADR-001](../../adr/ADR-001-stage-00-cross-tenant-test-applicability.md)؛ أول كود قادر على التعامل مع المستأجرين في Stage 01 يجب أن يفرض العزل وأن يصاحبه الاختبار السلبي.

> **لماذا:** إضافة طبقة tenant لاحقًا تعني هجرة كل جدول وكل query وكل سطر كود في المنتج. تكلفتها اليوم صفر تقريبًا؛ تكلفتها بعد سنة هي إعادة كتابة المنتج.

**`MT-002` (MUST):** كل كيان يملكه عميل له **سلسلة ملكية واضحة تنتهي عند `organization_id`**. لا يوجد كيان "يتيم" بلا مالك.

**`MT-003` (MUST):** الجداول التي تُقرأ في مسارات ساخنة **يجب** أن تحمل `organization_id` **مُكرَّرًا (denormalized)** حتى لو أمكن استنتاجه بـ JOIN.

```sql
-- صح: يمكن فرض الـ scope في شرط واحد
SELECT * FROM leads
WHERE organization_id = $1 AND website_id = $2;

-- خطأ: الـ scope يعتمد على JOIN قد ينساه أحدهم
SELECT l.* FROM leads l
JOIN websites w ON w.id = l.website_id
WHERE w.organization_id = $1;
```

**`MT-004` (MUST):** الحقول المُكرَّرة (`organization_id` في `leads`, `assets`, `sections`...) **تُملأ عند الإنشاء ولا تُحدَّث أبدًا**. تغيير مالك كيان يتم عبر عملية نقل صريحة موثَّقة، لا بـ `UPDATE` عابر.

---

## 2. سياق المستأجر (Tenant Context) — من أين يأتي

### `MT-010` (MUST) — مصدر الحقيقة الوحيد

الـ tenant context **يُشتق حصريًا من الجلسة/التوكن الموثوق بعد التحقق من العضوية**.

```ts
// packages/types/tenant-context.ts
export interface TenantContext {
  readonly userId: string;
  readonly organizationId: string;
  readonly role: OrganizationRole;
  readonly requestId: string;
}
```

### `MT-011` (MUST NOT) — القاعدة الأخطر في المشروع

**ممنوع منعًا باتًا** أخذ `organizationId` أو `tenantId` من:
- body الطلب
- query string
- أي header يتحكم فيه العميل
- أي قيمة في الـ frontend

```ts
// ❌ ثغرة أمنية مباشرة — أي عميل يكتب أي id ويقرأ بيانات غيره
async function getLeads(req) {
  return this.repo.findByOrg(req.body.organizationId);
}

// ✅ صحيح
async function getLeads(ctx: TenantContext) {
  return this.repo.findByOrg(ctx.organizationId);
}
```

**`MT-012` (MUST):** لو كان المستخدم عضوًا في أكثر من organization، فاختيار الـ organization النشط يتم عبر **إجراء صريح** (تبديل مساحة عمل) يعيد التحقق من العضوية ويحدّث الجلسة — وليس بمعامل يُرسل مع كل طلب.

**`MT-013` (MUST):** معرّف المورد القادم من العميل (`websiteId` في المسار مثلًا) **يُعامل كمدخل غير موثوق**. الخطوة الأولى دائمًا: **حلّ المورد داخل scope الـ tenant الحالي** والفشل بـ `404` لو لم ينتمِ إليه.

```ts
// كل عملية على موقع تبدأ هكذا — بلا استثناء
const site = await this.websites.findByIdInOrg(websiteId, ctx.organizationId);
if (!site) throw new NotFoundError('WEBSITE_NOT_FOUND');
```

**`MT-014` (MUST):** المورد الذي لا ينتمي للمستأجر يُرجع **`404 Not Found`**، لا `403 Forbidden`.

> **لماذا:** `403` يؤكد للمهاجم أن المورد موجود ويملكه شخص آخر — وهذا تسريب معلومات (enumeration). `404` لا يفرّق بين "غير موجود" و"ليس لك".

---

## 3. فرض الـ Scope على كل طبقة

### 3.1 طبقة المستودع (Repository)

**`MT-020` (MUST):** كل دالة في مستودع يتعامل مع جدول مملوك لمستأجر **تأخذ الـ scope كمعامل أول إلزامي**، ولا يوجد overload بدونه.

```ts
interface LeadRepository {
  findMany(scope: TenantScope, filter: LeadFilter): Promise<Lead[]>;
  findById(scope: TenantScope, id: string): Promise<Lead | null>;
  create(scope: TenantScope, data: NewLead): Promise<Lead>;
  delete(scope: TenantScope, id: string): Promise<void>;
}
```

**`MT-021` (MUST NOT):** ممنوع وجود أي دالة عامة بصيغة `findById(id)` على جدول مملوك لمستأجر. حتى لو بدت مريحة — هي فخ ينتظر أن يقع فيه أحدهم.

**`MT-022` (MUST):** الوصول لقاعدة البيانات يمر عبر **طبقة مستودع واحدة**. ممنوع استدعاء الـ ORM أو SQL مباشرةً من داخل controller أو service خارج هذه الطبقة.

### 3.2 حارس تلقائي

**`MT-023` (SHOULD):** يُفضّل بشدة تطبيق فرض تلقائي للـ scope على مستوى الوصول للبيانات (Row Level Security في Postgres، أو middleware في الـ ORM يحقن شرط `organization_id` إجباريًا)، بحيث يكون **النسيان مستحيلًا تقنيًا** لا مجرد ممنوع بالقاعدة.

**`MT-024` (MUST):** أي مسار يتجاوز الحارس التلقائي عمدًا (مهام صيانة، وظائف خلفية عابرة للمستأجرين) **يجب**:
1. أن يكون معلَّمًا بدالة صريحة الاسم: `unsafeCrossTenantQuery()`.
2. أن يحمل تعليقًا يشرح السبب.
3. أن يُسجَّل في `audit_logs`.
4. أن يكون معدودًا ومراجَعًا — قائمة محصورة يعرفها الفريق.

### 3.3 طبقة الـ API

**`MT-025` (MUST):** كل endpoint غير عام يمر بحارس يبني `TenantContext` قبل تنفيذ أي منطق. الـ endpoint الذي يصل إلى منطق الأعمال بلا context **يفشل بشكل صريح**، لا يكمل بسياق فارغ.

**`MT-026` (MUST):** الاستجابات **لا تحتوي** `organization_id` أو معرّفات داخلية لا يحتاجها العميل. راجع `CORE-033`.

---

## 4. عزل قاعدة البيانات

**`MT-030` (MUST):** نموذج الـ MVP هو **Shared Database + Shared Schema** مع `organization_id` على كل جدول مملوك لمستأجر.

**`MT-031` (MUST NOT):** ممنوع إنشاء قاعدة بيانات أو schema لكل عميل في الـ MVP (`CORE-012`). الانتقال لقواعد مخصصة لعملاء enterprise يحتاج **ADR**.

**`MT-032` (MUST):** كل فهرس على جدول مملوك لمستأجر **يبدأ بـ `organization_id`** (أو `website_id` للجداول المرتبطة بموقع)، لأن هذا هو أول شرط في كل استعلام فعلي.

```sql
CREATE INDEX idx_leads_org_created
  ON leads (organization_id, created_at DESC);
```

**`MT-033` (MUST):** قيود التفرد (Unique) التي يجب أن تكون فريدة **داخل المستأجر** تتضمن `organization_id` في المفتاح:

```sql
-- slug الموقع فريد داخل المنصة كلها (لأنه يظهر في الـ subdomain)
CREATE UNIQUE INDEX uq_websites_slug ON websites (slug);

-- slug الصفحة فريد داخل الموقع فقط
CREATE UNIQUE INDEX uq_pages_website_slug ON pages (website_id, slug);
```

> انتبه للفرق: ما يظهر في عنوان عام يكون فريدًا عالميًا؛ وما هو داخلي يكون فريدًا داخل نطاقه.

---

## 5. العزل خارج قاعدة البيانات

### 5.1 التخزين (Object Storage)

**`MT-040` (MUST):** مفتاح كل ملف **يبدأ بـ scope المستأجر والموقع**:

```
org_<orgId>/site_<siteId>/assets/<assetId>/<variant>.<ext>
```

**`MT-041` (MUST NOT):** ممنوع استخدام اسم الملف الذي رفعه المستخدم كجزء من المسار. الاسم الأصلي يُحفظ في `assets.original_filename` كـ metadata فقط. راجع [`08-assets-media.md`](08-assets-media.md).

### 5.2 الـ Cache

**`MT-042` (MUST):** كل مفتاح cache يحمل الـ scope صراحةً. مفتاح بلا scope = تسريب بيانات بين المستأجرين.

```
✅ org:org_01J:site:site_07:config
✅ site:published:site_07:v42
❌ site:config:07          ← أي 07؟ لأي مستأجر؟
```

**`MT-043` (MUST NOT):** **ممنوع تمامًا** عمل cache لبيانات لوحة التحكم الحساسة بمفتاح قابل للمشاركة بين المستأجرين، أو على مستوى الـ CDN (`Cache-Control: public`) لأي استجابة تحتوي بيانات خاصة.

### 5.3 الطوابير والوظائف الخلفية

**`MT-044` (MUST):** كل job payload يحمل `organizationId` و `siteId` عند الاقتضاء، ويعيد الـ worker **التحقق من الملكية** عند التنفيذ.

> **لماذا:** الـ job قد يُنفَّذ بعد دقائق أو ساعات. قد يكون الموقع حُذف، أو الاشتراك انتهى، أو المورد نُقل. الصلاحية وقت الجدولة ليست صلاحية وقت التنفيذ.

**`MT-045` (MUST):** الوظائف عابرة المستأجرين (تجميعات، تنظيف) **تعالج مستأجرًا واحدًا في كل تكرار** ولا تخلط النتائج في بنية واحدة مشتركة.

### 5.4 السجلات (Logs)

**`MT-046` (MUST):** كل سطر log يحمل `requestId` و `organizationId` و `siteId` (عند وجودهما) — للتحقيق والتشخيص.

**`MT-047` (MUST NOT):** ممنوع تسجيل محتوى المستأجر نفسه (نص section، محتوى lead، بيانات النموذج) أو أي secret. المعرّفات فقط. راجع `CORE-081`.

---

## 6. المسار العام (Public Renderer) — حالة خاصة

الزائر على `example.com` **ليس مصادقًا ولا ينتمي لأي مستأجر**. القواعد هنا مقلوبة: لا يوجد سياق مستخدم، لكن يجب أن يظل العزل محكمًا.

**`MT-050` (MUST):** الـ renderer يحل **hostname → site_id** عبر جدول الدومينات المعتمد فقط. ممنوع الاعتماد على أي header آخر يتحكم فيه العميل.

**`MT-051` (MUST):** الـ renderer يقرأ **النسخة المنشورة فقط** (`published revision`). لا وصول للـ draft من أي مسار عام مهما كان. راجع [`06-renderer-publishing.md`](06-renderer-publishing.md).

**`MT-052` (MUST NOT):** ممنوع أن يكشف الـ HTML المنشور: معرّفات داخلية، `organization_id`، بريد المالك، حالة الاشتراك، أو أي بيانات لوحة تحكم.

**`MT-053` (MUST):** لو كان الموقع غير منشور أو معطّلًا أو الاشتراك موقوفًا، يرد الـ renderer بصفحة حالة مناسبة — **ولا يكشف السبب التفصيلي للزائر**.

---

## 7. الأنماط الممنوعة (Anti-patterns)

| # | النمط الممنوع | لماذا هو خطر | الصحيح |
|---|---|---|---|
| 1 | `findById(id)` بلا scope | أول ثغرة سيجدها أي مختبِر اختراق | `findById(scope, id)` |
| 2 | أخذ `orgId` من الـ body | تجاوز كامل للعزل بسطر واحد | اشتقاقه من الجلسة |
| 3 | `403` لمورد مستأجر آخر | يؤكد وجود المورد (enumeration) | `404` |
| 4 | الاعتماد على JOIN للـ scope | يُنسى بسهولة عند التعديل | `organization_id` مباشر |
| 5 | مفتاح cache بلا scope | تسريب بيانات بين المستأجرين | scope في المفتاح |
| 6 | إخفاء زر في الواجهة كـ "حماية" | الـ API مكشوف مباشرةً | فحص server-side |
| 7 | `SELECT *` في استجابة API | يسرّب أعمدة داخلية عند إضافتها | DTO صريح |
| 8 | worker يثق في صلاحية وقت الجدولة | الحالة تتغير قبل التنفيذ | إعادة تحقق عند التنفيذ |
| 9 | endpoint إداري بلا فحص دور | تصعيد صلاحيات | فحص الدور صراحةً |
| 10 | نسخ الكود بين modules وتعديله | الـ scope ينساه أحدهم في النسخة | مستودع واحد مشترك |

---

## 8. الاختبارات المطلوبة

**`MT-060` (MUST):** توجد مجموعة اختبارات مخصصة `cross-tenant.spec.ts` تعمل في CI، وتفشل الـ build عند أي كسر.

> **Stage 00 فقط:** اختبارات cross-tenant وقت التشغيل هي N/A ما دام لا يوجد سطح Domain قادر على التعامل مع المستأجرين، وفق [ADR-001](../../adr/ADR-001-stage-00-cross-tenant-test-applicability.md). عزل المستأجرين يظل إلزاميًا من اليوم الأول. يُمنع إنشاء Tenant وهمي أو Authentication مبكر أو اختبارات نجاح وهمية أو تخطٍ صامت. أول كود قادر على التعامل مع المستأجرين في Stage 01 يجب أن يصاحبه الاختبار؛ لا يُدمج أي مورد Tenant-scoped في Stage 01 أو بعدها دون اختبارات cross-tenant سلبية. هذا ليس إعفاء دائمًا ولا يشمل أي فئة اختبارات أخرى.

**`MT-061` (MUST):** لكل مورد مملوك لمستأجر، يوجد اختبار بهذا الشكل بالضبط:

```ts
describe('cross-tenant isolation: <resource>', () => {
  it('returns 404 when reading another tenant resource', async () => {
    const a = await createTenantWithResource();
    const b = await createTenant();
    const res = await api.as(b).get(`/api/v1/<resource>/${a.resourceId}`);
    expect(res.status).toBe(404);          // ليس 403
    expect(res.body).not.toContain(a.orgId);
  });

  it('does not include other tenant rows in list endpoints', async () => { /* ... */ });
  it('rejects update on another tenant resource', async () => { /* ... */ });
  it('rejects delete on another tenant resource', async () => { /* ... */ });
  it('ignores organizationId sent in the request body', async () => { /* ... */ });
});
```

**`MT-062` (MUST):** الاختبارات تغطي **كل الأفعال**: قراءة مفردة، قائمة، إنشاء، تعديل، حذف، ورفع ملف. الاكتفاء بالقراءة **غير مقبول**.

**`MT-063` (MUST):** اختبار خاص يثبت أن **إرسال `organizationId` في الـ body لا يؤثر على النتيجة إطلاقًا**.

**`MT-064` (MUST):** أي جدول جديد مملوك لمستأجر **لا يُدمج PR إنشائه** قبل إضافة اختباراته في هذه المجموعة.

---

## 9. Definition of Done — Multi-tenancy

لا يُدمج أي PR يلمس بيانات مستأجر قبل أن يتحقق كل ما يلي:

- [ ] كل جدول جديد يحمل `organization_id` (و `website_id` عند الحاجة).
- [ ] فهارس الجداول الجديدة تبدأ بعمود الـ scope.
- [ ] كل دالة مستودع جديدة تأخذ scope إلزاميًا.
- [ ] لا وجود لـ `findById(id)` بلا scope في التغيير.
- [ ] `organizationId` مشتق من الجلسة حصريًا، ولا يُقرأ من مدخلات العميل.
- [ ] المورد غير المملوك يرد `404` لا `403`.
- [ ] مفاتيح الـ cache الجديدة تحمل scope.
- [ ] مفاتيح التخزين الجديدة تبدأ بـ `org_/site_`.
- [ ] job payloads الجديدة تحمل الـ scope، والـ worker يعيد التحقق.
- [ ] اختبارات cross-tenant مضافة لكل الأفعال.
- [ ] الـ logs تحمل المعرّفات ولا تحمل المحتوى.
- [ ] استجابات الـ API لا تسرّب حقولًا داخلية.

---

## 10. ما يحتاج ADR

- الانتقال لقاعدة بيانات أو schema مخصصة لأي فئة عملاء.
- إضافة أي طبقة ملكية جديدة (مثل Workspace بين Organization والموقع).
- السماح بمشاركة أي مورد بين مستأجرين (templates مشتركة، وكالات، white-label).
- تغيير مصدر اشتقاق الـ tenant context.
- أي استثناء دائم من `MT-011` أو `MT-020`.

---

## 11. مراجع متقاطعة

[`02-data-model.md`](02-data-model.md) الجداول والقيود · [`06-renderer-publishing.md`](06-renderer-publishing.md) عزل المسار العام · [`08-assets-media.md`](08-assets-media.md) مفاتيح التخزين · [`12-auth.md`](12-auth.md) الأدوار والصلاحيات · [`13-queues-jobs-cache.md`](13-queues-jobs-cache.md) الطوابير والـ cache · [`14-security.md`](14-security.md) نموذج التهديدات · [`22-testing.md`](22-testing.md) استراتيجية الاختبار
