# 03 — Section / Template / Theme Engine

> **بادئة القواعد:** `CE-` · **الحالة:** إلزامي · **المالك:** Full-stack
> **المرجع الأعلى:** [`../../en/00-PROJECT-RULES.md`](../../en/00-PROJECT-RULES.md) · **نسخة النظام الحاكمة:** [`../../en/systems/03-content-engine.md`](../../en/systems/03-content-engine.md) · هذه ترجمة عربية متزامنة.
> **يحقق المبدأ:** `CORE-011` (Content ≠ Presentation)

---

## 0. الغرض والنطاق

هذا هو **قلب المنتج**. جودة تصميم هذا النظام تحدد سقف ما يمكن للمنتج تقديمه، وسرعة إضافة قوالب جديدة، وتكلفة صيانته على مدى سنوات.

المبدأ الحاكم في جملة: **المحتوى بيانات، والتصميم اختيار منفصل، ولا يعرف أحدهما تفاصيل الآخر.**

```
Section Type   →  ما هي هذه الكتلة وظيفيًا؟      (hero, services, contact)
Variant        →  كيف تبدو بصريًا؟               (hero-07)
Data           →  ما المحتوى الفعلي؟             (العنوان، النص، الصورة)
Theme Tokens   →  ما هوية الموقع البصرية؟        (الألوان، الخطوط، الأنصاف)
Template       →  أي تركيبة sections لهذا النشاط؟
```

---

## 1. عقد الـ Section

### 1.1 الشكل المعياري

```json
{
  "id": "sec_01J...",
  "type": "hero",
  "variant": "hero-07",
  "schemaVersion": 1,
  "data": {
    "title": "محمد أحمد",
    "subtitle": "Performance Marketing Specialist",
    "cta": { "label": "تواصل معي", "href": "#contact" },
    "image": { "assetId": "ast_01J...", "alt": "صورة شخصية" }
  },
  "settings": {
    "visibility": { "mobile": true, "desktop": true },
    "spacing": "default",
    "background": "surface"
  }
}
```

### 1.2 القواعد الجوهرية

**`CE-001` (MUST):** كل section له `type` و `variant` و `schemaVersion` و `data` و `settings`. لا يوجد section بلا واحد منها.

**`CE-002` (MUST NOT):** **ممنوع تخزين HTML خام** في `data` — لا من الـ AI، ولا من الـ editor، ولا من أي مصدر. هذه القاعدة هي `CORE-011` وهي غير قابلة للتفاوض.

> **لماذا:** HTML خام يعني: (أ) ثغرة XSS دائمة، (ب) استحالة تغيير التصميم لاحقًا، (ج) استحالة الترجمة، (د) استحالة إعادة استخدام المحتوى، (هـ) استحالة تغيير الـ variant. المنتج كله يفقد قيمته.

**`CE-003` (MUST):** الحقل النصي البسيط نص عادي (plain text). النص الغني — إن وُجد — يُخزَّن بتمثيل منظَّم (portable text / AST) لا HTML، ويُحوَّل للعرض عند الرندر مع sanitization.

**`CE-004` (MUST):** **الـ variant لا يغيّر شكل البيانات أبدًا.**

> هذه أهم قاعدة في الملف كله. كل variants الـ `hero` تستهلك **نفس** `HeroData` بالضبط. التبديل من `hero-03` إلى `hero-07` **يجب أن يعمل فورًا بلا أي فقد للبيانات وبلا أي هجرة**.

```ts
// ✅ صحيح: schema واحد للنوع، والـ variants تختلف بصريًا فقط
type HeroData = {
  title: string;
  subtitle?: string;
  cta?: CtaLink;
  image?: AssetRef;
};
// hero-01 ... hero-12 كلها تستهلك HeroData

// ❌ خطأ: variant له حقول خاصة
type Hero07Data = { title: string; badgeText: string; };  // ممنوع
```

**`CE-005` (MUST):** لو احتاج variant حقلًا غير موجود، فالخياران **فقط**:
1. أضف الحقل **اختياريًا** لـ schema النوع كله (والـ variants التي لا تستخدمه تتجاهله).
2. أنشئ **نوع section جديدًا**.

ممنوع الحل الثالث (حقول خاصة بـ variant).

**`CE-006` (MUST):** الصور تُشار إليها بـ `assetId` لا برابط مباشر. الرابط النهائي يُحل وقت الرندر.

> **لماذا:** الروابط المباشرة تكسر عند تغيير الـ CDN، ولا تسمح بخدمة نسخة محسّنة حسب الجهاز، ولا تُحدَّث عند إعادة معالجة الصورة.

**`CE-007` (MUST):** كل رابط خارجي في `data` يُتحقق منه: بروتوكول من قائمة بيضاء (`https`, `mailto`, `tel`, `#anchor`) فقط. `javascript:` و `data:` **ممنوعان مطلقًا**.

---

## 2. الـ Schemas ومصدر الحقيقة

**`CE-010` (MUST):** كل نوع section له schema واحد معرَّف في `packages/schemas/sections/<type>.ts` باستخدام Zod، وهو **المصدر الوحيد للحقيقة** لهذا النوع.

```ts
// packages/schemas/sections/hero.ts
export const heroDataV1 = z.object({
  title: z.string().min(1).max(120),
  subtitle: z.string().max(240).optional(),
  cta: ctaLinkSchema.optional(),
  image: assetRefSchema.optional(),
}).strict();

export const heroVariants = ['hero-01','hero-02','hero-07'] as const;

export const heroSection = z.object({
  type: z.literal('hero'),
  variant: z.enum(heroVariants),
  schemaVersion: z.literal(1),
  data: heroDataV1,
  settings: sectionSettingsSchema,
});
```

**`CE-011` (MUST):** الـ schema يُستخدم في **كل** المواضع: التحقق من مخرجات الـ AI، التحقق من حفظ الـ editor، أنواع TypeScript للمكوّنات، وتوليد وثائق الـ API. **ممنوع** إعادة تعريف نفس الشكل في مكان آخر (`CORE-022`).

**`CE-012` (MUST):** كل schema يستخدم `.strict()` — الحقول غير المعروفة **تُرفض** ولا تُمرَّر بصمت.

> **لماذا:** الحقل الزائد اليوم يصبح بيانات فاسدة غدًا، وقد يكون محاولة حقن.

**`CE-013` (MUST):** كل حقل نصي له **حد أقصى للطول**. حقل بلا حد = ثغرة تعطيل خدمة (DoS) وكسر للتصميم.

**`CE-014` (MUST):** أي بيانات section تُكتب في قاعدة البيانات **تمر بالـ validation أولًا**، أيًا كان مصدرها — AI، editor، استيراد، أو template.

---

## 3. إصدارات الـ Schema

**`CE-020` (MUST):** الـ `schemaVersion` عدد صحيح يبدأ من `1` ويزيد **فقط** عند تغيير كاسر لشكل البيانات.

**`CE-021` (MUST):** إضافة حقل **اختياري** ليست تغييرًا كاسرًا ولا ترفع الإصدار.

**`CE-022` (MUST):** التغيير الكاسر (حذف حقل، تغيير نوعه، جعل اختياري إلزاميًا) يتطلب:
1. `schemaVersion` جديد.
2. **دالة ترقية** `migrateHeroV1ToV2(data)` في `packages/schemas`.
3. الاحتفاظ بقدرة **قراءة** الإصدار القديم لفترة انتقالية موثَّقة.

**`CE-023` (MUST):** الـ Renderer **يجب** أن يعرف كيف يعرض كل إصدار ما زال موجودًا في قاعدة البيانات. ممنوع نشر تغيير يجعل مواقع منشورة غير قابلة للعرض.

**`CE-024` (MUST):** ترقية البيانات القديمة تتم في **وظيفة خلفية على دفعات**، لا بتعديل جماعي فوري، ولا عند القراءة في مسار ساخن.

---

## 4. الـ Theme Tokens

### 4.1 الشكل

```json
{
  "colors": {
    "primary": "#111827",
    "accent": "#2563EB",
    "background": "#FFFFFF",
    "surface": "#F9FAFB",
    "text": "#111827",
    "textMuted": "#6B7280",
    "border": "#E5E7EB"
  },
  "typography": {
    "heading": "Alexandria",
    "body": "Tajawal",
    "scale": "default"
  },
  "radius": { "sm": 8, "md": 16, "lg": 24 },
  "layout": { "container": 1200, "sectionGap": 96 }
}
```

### 4.2 القواعد

**`CE-030` (MUST):** المكوّنات تقرأ **tokens فقط**. ممنوع لون أو خط أو مقاس مكتوب مباشرةً داخل مكوّن section.

```tsx
// ❌ ممنوع
<h1 className="text-[#2563EB] font-[Tajawal]">

// ✅ صحيح
<h1 className="text-accent font-body">
```

**`CE-031` (MUST):** الـ tokens تُطبَّق كـ **CSS custom properties** على جذر الموقع المنشور، فتغيير الهوية البصرية كاملة لا يتطلب إعادة بناء.

**`CE-032` (MUST):** مجموعة الـ tokens **مغلقة وموثَّقة**. إضافة token جديد تعني تحديث كل الـ themes الخمسة والتأكد من عدم كسر أي variant.

**`CE-033` (MUST):** كل theme جاهز **يجب** أن يحقق تباينًا كافيًا (WCAG AA: 4.5:1 للنص العادي) بين `text` و `background`، وبين `primary` وخلفيته. هذا يُختبر آليًا.

**`CE-034` (SHOULD):** الـ override على مستوى section يكون من **مجموعة محصورة** (خلفية بديلة، تباعد أكبر)، لا حرية كاملة في الـ CSS.

> **لماذا:** الحرية الكاملة تعني أن كل موقع يصبح حالة خاصة، فيستحيل تحسين المنتج أو تغيير الهوية لاحقًا.

---

## 5. الـ Templates والـ Blueprints

```json
{
  "category": "media_buyer",
  "schemaVersion": 1,
  "locale": "ar",
  "sections": [
    { "type": "hero",         "variant": "hero-07" },
    { "type": "stats",        "variant": "stats-03" },
    { "type": "case_studies", "variant": "case-study-04" },
    { "type": "services",     "variant": "services-06" },
    { "type": "contact",      "variant": "contact-02" }
  ],
  "defaultTheme": "midnight"
}
```

**`CE-040` (MUST):** الـ template يعرّف **التركيبة والـ variants فقط**. المحتوى يأتي من الـ AI أو من قيم افتراضية منفصلة.

**`CE-041` (MUST):** كل template يُتحقق منه عند التحميل: كل `type` موجود، وكل `variant` مسجَّل لهذا الـ `type`.

**`CE-042` (MUST):** الـ templates **بيانات لا كود**. إضافة قالب جديد لا تتطلب نشر إصدار جديد من التطبيق.

**`CE-043` (MUST):** كل template يحدد اللغة والاتجاه الافتراضيين. راجع [`23-i18n-rtl.md`](23-i18n-rtl.md).

---

## 6. سجل الـ Sections (Registry)

**`CE-050` (MUST):** يوجد **سجل مركزي واحد** يربط `type` و `variant` بالمكوّن والـ schema:

```ts
// packages/site-sections/registry.ts
export const sectionRegistry = {
  hero: {
    schema: heroSection,
    variants: {
      'hero-01': { component: Hero01, preview: '/previews/hero-01.webp' },
      'hero-07': { component: Hero07, preview: '/previews/hero-07.webp' },
    },
  },
} as const satisfies SectionRegistry;
```

**`CE-051` (MUST):** الـ Renderer والـ Editor يقرآن من **نفس السجل**. ممنوع وجود قائمتين.

**`CE-052` (MUST):** `type`/`variant` غير معروف **لا يُسقط الصفحة**. الـ renderer يتخطاه بصمت ويسجّل تحذيرًا؛ الـ editor يعرض حالة "نوع غير مدعوم" قابلة للحذف.

> **لماذا:** موقع منشور يجب ألا ينهار بسبب خطأ بيانات أو رجوع إصدار.

**`CE-053` (MUST):** كل variant له **صورة معاينة** في السجل تُعرض في الـ editor.

**`CE-054` (MUST):** كل variant جديد يُختبر في: عربي (RTL) وإنجليزي (LTR) × موبايل وديسكتوب × محتوى قصير وطويل × مع صورة وبدونها.

---

## 7. قواعد بناء مكوّنات الـ Sections

**`CE-060` (MUST):** مكوّن الـ section **دالة عرض خالصة** من `(data, settings, tokens)` إلى HTML. ممنوع أن يجلب بيانات، أو يقرأ سياق المستخدم، أو يعرف شيئًا عن لوحة التحكم.

**`CE-061` (MUST NOT):** ممنوع `dangerouslySetInnerHTML` داخل أي مكوّن section إلا عبر مُطهِّر (sanitizer) معتمد وموثَّق مركزيًا.

**`CE-062` (MUST):** كل مكوّن يتعامل بأمان مع الحقول الاختصارية الناقصة: لا صورة، لا زر، نص قصير جدًا، نص طويل جدًا. **لا يوجد انهيار ولا تصميم مكسور.**

**`CE-063` (MUST):** الـ HTML دلالي: `<section>`, `<h1>`–`<h6>` بترتيب صحيح, `<nav>`, `<button>` مقابل `<a>` حسب الوظيفة. راجع [`16-frontend-standards.md`](16-frontend-standards.md).

**`CE-064` (MUST):** كل صورة لها `alt` (يأتي من `data`)، وأبعاد صريحة أو `aspect-ratio` لمنع قفز التخطيط (CLS).

**`CE-065` (MUST NOT):** ممنوع JavaScript على مستوى العميل داخل مكوّن section إلا للضرورة الوظيفية (سلايدر، أكورديون)، وبأقل حجم ممكن. الـ sections الثابتة تُرندَر بلا JS.

---

## 8. الأنماط الممنوعة

| # | النمط | لماذا هو خطر |
|---|---|---|
| 1 | HTML خام في `data` | XSS + استحالة تغيير التصميم لاحقًا |
| 2 | حقول خاصة بـ variant | التبديل بين الـ variants يفقد بيانات |
| 3 | لون/خط مكتوب في المكوّن | كسر الاتساق واستحالة تغيير الهوية |
| 4 | رابط صورة مباشر بدل `assetId` | يكسر عند تغيير CDN، ولا تحسين للصور |
| 5 | schema بلا `.strict()` | حقول زائدة تصبح بيانات فاسدة |
| 6 | حقل نصي بلا حد أقصى | DoS وكسر التصميم |
| 7 | قائمة variants في الـ editor غير السجل | الـ editor يعرض ما لا يرندره الـ renderer |
| 8 | `type` غير معروف يُسقط الصفحة | موقع عميل ينهار بسبب خطأ بيانات |
| 9 | مكوّن section يجلب بيانات | كسر الـ caching والأداء والعزل |
| 10 | ترقية schema عند القراءة | حمل على المسار الساخن + سلوك غير متوقع |

---

## 9. الاختبارات المطلوبة

**`CE-070` (MUST):** لكل نوع section: اختبار schema يقبل الصحيح ويرفض (حقل ناقص، نوع خاطئ، حقل زائد، نص يتجاوز الحد، رابط `javascript:`).

**`CE-071` (MUST):** **اختبار تبادل الـ Variants** — إلزامي لكل نوع:

```ts
it('every variant renders the same data without loss', () => {
  const data = validHeroFixture();
  for (const variant of heroVariants) {
    const html = renderSection({ type: 'hero', variant, data, settings });
    expect(html).toContain(data.title);     // لا فقد للمحتوى
    expect(() => heroSection.parse({ type:'hero', variant, data, ... })).not.toThrow();
  }
});
```

**`CE-072` (MUST):** اختبار انحدار بصري (visual regression) لكل variant عبر: RTL/LTR × موبايل/ديسكتوب.

**`CE-073` (MUST):** اختبار "الحقول الناقصة": كل variant يُرندَر بأقل بيانات ممكنة (الحقول الإلزامية فقط) بلا انهيار.

**`CE-074` (MUST):** اختبار XSS: محتوى يحوي `<script>` و `javascript:` و `onerror=` يُرفض عند الـ validation أو يُطهَّر عند الرندر — ولا يُنفَّذ أبدًا.

**`CE-075` (MUST):** اختبار تباين الألوان الآلي لكل theme جاهز (`CE-033`).

---

## 10. Definition of Done — Content Engine

عند إضافة **نوع section جديد**:
- [ ] schema في `packages/schemas/sections/` مع `.strict()` وحدود طول.
- [ ] مسجَّل في `sectionRegistry` مع كل الـ variants.
- [ ] صورة معاينة لكل variant.
- [ ] كل الـ variants تستهلك نفس الـ data schema (`CE-004`).
- [ ] اختبار تبادل الـ variants يمر.
- [ ] اختبار الحقول الناقصة يمر.
- [ ] اختبار انحدار بصري في RTL و LTR.
- [ ] لا ألوان/خطوط مكتوبة مباشرةً — tokens فقط.
- [ ] الصور بـ `assetId` مع `alt` وأبعاد.
- [ ] HTML دلالي ويجتاز فحص الوصولية الأساسي.
- [ ] موثَّق في كتالوج الـ sections.

عند إضافة **variant لنوع قائم**:
- [ ] لا حقول جديدة إلزامية (`CE-005`).
- [ ] مسجَّل + صورة معاينة.
- [ ] اختبار بصري + اختبار حقول ناقصة.

عند **تغيير schema قائم**:
- [ ] هل التغيير كاسر؟ لو نعم: `schemaVersion` جديد + دالة ترقية.
- [ ] الـ renderer يقرأ الإصدارين.
- [ ] وظيفة ترقية على دفعات مجدولة.
- [ ] لا موقع منشور يصبح غير قابل للعرض.

---

## 11. ما يحتاج ADR

- السماح بـ HTML أو CSS أو JS مخصص من المستخدم.
- تغيير تمثيل النص الغني.
- السماح بحقول خاصة بـ variant (مخالفة `CE-004`).
- تغيير آلية إصدارات الـ schema.
- نقل تعريف الـ sections خارج `packages/schemas`.

---

## 12. مراجع متقاطعة

[`02-data-model.md`](02-data-model.md) تخزين JSONB · [`04-visual-editor.md`](04-visual-editor.md) واجهة التحرير · [`05-ai-generation.md`](05-ai-generation.md) التحقق من مخرجات الـ AI · [`06-renderer-publishing.md`](06-renderer-publishing.md) الرندر · [`08-assets-media.md`](08-assets-media.md) الصور · [`14-security.md`](14-security.md) XSS · [`23-i18n-rtl.md`](23-i18n-rtl.md) RTL
