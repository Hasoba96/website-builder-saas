# AI Website Builder — Engineering Documentation

منصة SaaS متعددة المستأجرين لإنشاء ونشر المواقع · **Version 1.0**

## حالة التنفيذ

00-I يضيف بيئة PostgreSQL/Redis محلية منفصلة عن test fixtures. الإعداد والتشغيل والترحيلات والإيقاف وإعادة الضبط وapplication images في [Local Infrastructure](docs/runbooks/local-infrastructure.md). لا CI أو Backup أو Product Features.

00-H معتمد PASS. الأوامر والتصنيف وfalse-pass guards وسياسة visual/manual acceptance في [Testing Baseline](docs/checkpoints/00-h-testing-baseline.md). `pnpm test` يتحقق من التنفيذ الفعلي لكل suite ويحفظ التقارير.

00-G معتمد PASS: HTTP security headers وnonce CSP وCORS وHost allowlists وحدود المدخلات والاستهلاك للأسطح الحالية فقط. الإعداد وحدود الإثبات وOWASP applicability في [Security Baseline](docs/checkpoints/00-g-security-baseline.md). لا Auth/Tenant أو Product Features.

00-F معتمد PASS: structured logs وrequestId وsafe errors و`/health` و`/ready`. العقود في [دليل التشغيل](docs/checkpoints/00-f-operations.md)، وإجراءات انقطاع الاعتماد في [Runbook](docs/runbooks/foundation-dependency-outage.md). لا إرسال diagnostics خارجي.

00-E معتمد PASS: الإعداد والملكية والحدود والتنظيف في [دليل Redis/BullMQ](docs/checkpoints/00-e-redis-bullmq.md). `pnpm test:redis` للاختبارات المعزولة، و`pnpm test` يشمل Redis وPostgreSQL واختبارات التطبيقات والمتصفح، ويتطلب Docker Linux. Worker يحتاج إعداد Redis صالحًا؛ API يبقى مستقلًا عنه.

00-D معتمد PASS: PostgreSQL pool وmigrations صريحة، دون Domain Schema. الإعداد والصلاحيات في [دليل PostgreSQL](docs/checkpoints/00-d-postgresql.md)، وإعداد التطبيقات العام في [دليل Configuration](docs/checkpoints/00-c-configuration.md). ملفات البيئة المحلية ignored؛ `.env.migration` خاص بالمشغل فقط. [دليل 00-A](docs/checkpoints/00-a-toolchain.md) مرجع الأدوات؛ [دليل 00-B](docs/checkpoints/00-b-applications.md) سجل الـSkeletons.

نتيجة 00-B الحالية: **PASS**. التفاصيل والقيود والأدلة في [تقرير الإغلاق الجديد](docs/checkpoints/00-b-completion-report.md). تقارير BLOCKED السابقة محفوظة كسجل تاريخي.

نتيجة 00-C: **PASS**. العقود والاختبارات والقيود في [تقرير إغلاق 00-C](docs/checkpoints/00-c-closure-report.md). `pnpm test:database` يشغّل اختبارات قاعدة البيانات فقط؛ `pnpm test` يتطلب Docker ويشمل اختبارات المرحلة السابقة.

> **ابدأ من هنا:** [`docs/en/00-PROJECT-RULES.md`](docs/en/00-PROJECT-RULES.md) — أعلى مرجع هندسي إلزامي، ويحدد ترتيب أولوية الوثائق في §0.
> **الترجمة العربية:** [`docs/ar/00-PROJECT-RULES.md`](docs/ar/00-PROJECT-RULES.md) — ترجمة متزامنة؛ المرجعية الحاكمة هي النسخة الإنجليزية.

---

## ما هذه الوثائق

مجموعة قواعد **تنفيذية ومُلزِمة** — لا توثيق وصفي. كل قاعدة لها معرّف ثابت (`CORE-012`, `MT-003`, `CE-004`...) يُستخدم مباشرةً في مراجعة الكود:

> «هذا يخالف `MT-011`» — أوضح وأسرع من فقرة شرح.

كل ملف نظام يحتوي على البنية نفسها: الغرض · القواعد الإلزامية · العقود والأمثلة · الأنماط الممنوعة (ولماذا) · الاختبارات المطلوبة · Definition of Done · ما يحتاج ADR.

---

## البنية

```
docs/
├── ar/                          ← الترجمة العربية المتزامنة
│   ├── 00-PROJECT-RULES.md      ← ابدأ هنا
│   ├── systems/01..23           ← قواعد كل نظام
│   └── adr/ADR-TEMPLATE.md
├── en/                          ← Authoritative engineering rules (same rule IDs)
│   ├── 00-PROJECT-RULES.md
│   ├── systems/01..23
│   └── adr/ADR-TEMPLATE.md
└── reference/
    └── architecture-reference-v1.0.md   ← الوثيقة الأصلية (تحويل أمين)
```

---

## خريطة الأنظمة

| # | النظام | البادئة | AR | EN |
|---|---|---|---|---|
| 01 | Multi-tenancy والعزل | `MT-` | [ar](docs/ar/systems/01-multi-tenancy.md) | [en](docs/en/systems/01-multi-tenancy.md) |
| 02 | Domain Model وقاعدة البيانات | `DM-` | [ar](docs/ar/systems/02-data-model.md) | [en](docs/en/systems/02-data-model.md) |
| 03 | Section / Template / Theme Engine | `CE-` | [ar](docs/ar/systems/03-content-engine.md) | [en](docs/en/systems/03-content-engine.md) |
| 04 | Visual Editor | `VE-` | [ar](docs/ar/systems/04-visual-editor.md) | [en](docs/en/systems/04-visual-editor.md) |
| 05 | AI Generation | `AI-` | [ar](docs/ar/systems/05-ai-generation.md) | [en](docs/en/systems/05-ai-generation.md) |
| 06 | Renderer & Publishing | `RP-` | [ar](docs/ar/systems/06-renderer-publishing.md) | [en](docs/en/systems/06-renderer-publishing.md) |
| 07 | Domains & SSL | `DN-` | [ar](docs/ar/systems/07-domains-ssl.md) | [en](docs/en/systems/07-domains-ssl.md) |
| 08 | Assets & Media | `AS-` | [ar](docs/ar/systems/08-assets-media.md) | [en](docs/en/systems/08-assets-media.md) |
| 09 | Forms, Leads & Notifications | `FL-` | [ar](docs/ar/systems/09-forms-leads.md) | [en](docs/en/systems/09-forms-leads.md) |
| 10 | Analytics | `AN-` | [ar](docs/ar/systems/10-analytics.md) | [en](docs/en/systems/10-analytics.md) |
| 11 | Billing & Entitlements | `BE-` | [ar](docs/ar/systems/11-billing-entitlements.md) | [en](docs/en/systems/11-billing-entitlements.md) |
| 12 | Authentication & Authorization | `AU-` | [ar](docs/ar/systems/12-auth.md) | [en](docs/en/systems/12-auth.md) |
| 13 | Cache, Queues & Jobs | `QJ-` | [ar](docs/ar/systems/13-queues-jobs-cache.md) | [en](docs/en/systems/13-queues-jobs-cache.md) |
| 14 | Security Engineering | `SE-` | [ar](docs/ar/systems/14-security.md) | [en](docs/en/systems/14-security.md) |
| 15 | API Standards | `API-` | [ar](docs/ar/systems/15-api-standards.md) | [en](docs/en/systems/15-api-standards.md) |
| 16 | Frontend Standards | `FE-` | [ar](docs/ar/systems/16-frontend-standards.md) | [en](docs/en/systems/16-frontend-standards.md) |
| 17 | Backend Module Boundaries | `BM-` | [ar](docs/ar/systems/17-backend-modules.md) | [en](docs/en/systems/17-backend-modules.md) |
| 18 | Infrastructure & CI/CD | `IN-` | [ar](docs/ar/systems/18-infrastructure-cicd.md) | [en](docs/en/systems/18-infrastructure-cicd.md) |
| 19 | Observability & Operations | `OB-` | [ar](docs/ar/systems/19-observability.md) | [en](docs/en/systems/19-observability.md) |
| 20 | Performance & Caching | `PF-` | [ar](docs/ar/systems/20-performance-caching.md) | [en](docs/en/systems/20-performance-caching.md) |
| 21 | Backup / DR / Retention | `BR-` | [ar](docs/ar/systems/21-backup-dr-retention.md) | [en](docs/en/systems/21-backup-dr-retention.md) |
| 22 | Testing Strategy | `TS-` | [ar](docs/ar/systems/22-testing.md) | [en](docs/en/systems/22-testing.md) |
| 23 | i18n / RTL / Localization | `IL-` | [ar](docs/ar/systems/23-i18n-rtl.md) | [en](docs/en/systems/23-i18n-rtl.md) |

---

## مسارات القراءة

| أنت | اقرأ بالترتيب |
|---|---|
| **مطوّر جديد (أي تخصص)** | `00` كاملًا → `01` → `02` → `17` — قبل أول سطر كود |
| **Backend** | + `05` · `06` · `11` · `12` · `13` · `15` |
| **Frontend / Editor** | + `03` · `04` · `16` · `23` |
| **DevOps / SRE** | + `18` · `19` · `20` · `21` |
| **QA** | + `22` + قسم الاختبارات في كل ملف |
| **مراجعة أمنية** | + `14` + قسم القواعد الإلزامية في كل ملف |
| **وكيل AI يكتب كودًا** | `00` (وخصوصًا §16) + ملف النظام المعني |

---

## المبادئ السبعة — غير قابلة للتفاوض

| # | المبدأ | التفاصيل |
|---|---|---|
| `CORE-010` | **Multi-tenant by design** — كل query يحمل scope | `01` |
| `CORE-011` | **Content ≠ Presentation** — لا HTML خام أبدًا | `03` |
| `CORE-012` | **One platform, many sites** — لا بنية تحتية لكل عميل | `18` |
| `CORE-013` | **Modular Monolith first** — الفصل بقياس لا بموضة | `17` |
| `CORE-014` | **Edge/cache first** — الزوار لا يضربون قاعدة البيانات | `20` |
| `CORE-015` | **Async for slow work** — لا عمل بطيء في دورة الطلب | `13` |
| `CORE-016` | **Least privilege** — أقل صلاحيات لازمة دائمًا | `12` · `14` |

أي مخالفة لهذه المبادئ تحتاج **ADR معتمدًا قبل الكود، لا بعده**.

---

## القواعد الذهبية العشر

1. كل query على بيانات مستأجر **بدون** scope = باق أمني حرج
2. الـ AI يُخرج **JSON مُتحقَّقًا منه**، لا HTML ولا كود
3. النشر يُنتج **revision غير قابلة للتعديل**؛ الـ draft لا يظهر للزوار أبدًا
4. إخفاء زر في الواجهة **ليس** Authorization
5. كل مدخل من العميل يُتحقق منه **server-side**
6. لا `secrets` ولا `PII` في الـ logs. أبدًا
7. الاعتماد على Redis كمصدر حقيقة = فقدان بيانات
8. كل Job لازم يكون **idempotent**
9. نسخة احتياطية لم تُختبر استعادتها = **لا توجد** نسخة احتياطية
10. أي مخالفة للمبادئ تحتاج **ADR قبل الكود**

---

## الـ Stack المعتمد

**Backend** NestJS · **Frontend** Next.js · **DB** PostgreSQL · **Cache/Queue** Redis + BullMQ · **Storage** Cloudflare R2 · **CDN/TLS** Cloudflare · **Language** TypeScript

تغيير أي منها يحتاج ADR (`CORE-001`).

---

## المساهمة في هذه الوثائق

- تغيير قاعدة = تحديث النسختين العربية والإنجليزية **في نفس الـ PR**.
- قاعدة جديدة = رقم جديد. **الأرقام المحذوفة لا يُعاد استخدامها** — تُعلَّم `(ملغاة — انظر ADR-00X)`.
- تغيير سلوك في الكود يخالف قاعدة = **ADR أولًا**، ثم تحديث الوثيقة، ثم الكود.
- الوثائق جزء من `Definition of Done`، لا مهمة لاحقة.
