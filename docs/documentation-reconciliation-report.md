# DOCUMENTATION RECONCILIATION REPORT

**التاريخ:** 2026-09-30

**سجل تاريخي:** هذا التقرير يصف جولة التسوية السابقة فقط، بما فيها عدد ملفاتها والتعارضات التي كانت مفتوحة حينها. عولجت تلك القرارات لاحقًا باعتماد المالك في [APPROVED DECISIONS](stage-00-technical-decision-report.md#approved-decisions) وتحديث [Playbook](../IMPLEMENTATION-PLAYBOOK.md) والقواعد المتأثرة؛ لا تُقرأ حالات CONFLICT أدناه كحالة الجاهزية الحالية. بقي ADR-001 دون تعديل، ولم يبدأ Implementation.

**النطاق:** تنفيذ القرارات الثلاثة المعتمدة وتحديث مراجعها المباشرة فقط، مع التقرير التقني المطلوب. لا تصريح ببدء Stage 00، ولا Foundation/Product code.

## FILES CHANGED

33 ملفًا موجودًا عُدّل، و3 ملفات وثائق أُنشئت، منها هذا التقرير. لا ملفات محذوفة. كثرة الملفات ناتجة أساسًا عن تصحيح سطر مرجعية واحد في ملفات الأنظمة العربية الـ23؛ في 18 منها لا يوجد أي تعديل آخر.

### ملفات موجودة معدلة

| الملف | سبب التعديل |
|---|---|
| [README.md](../README.md) | الإشارة إلى الدستور الإنجليزي كأعلى مرجع، والعربية كترجمة |
| [القواعد الحاكمة.md](<../القواعد الحاكمة.md>) | مرجع ADR-001 لانطباق اختبارات cross-tenant فقط |
| [docs/en/00-PROJECT-RULES.md](en/00-PROJECT-RULES.md) | ترتيب أولوية المراجع المعتمد |
| [docs/ar/00-PROJECT-RULES.md](ar/00-PROJECT-RULES.md) | مطابقة ترجمة قرار المرجعية |
| [docs/reference/architecture-reference-v1.0.md](reference/architecture-reference-v1.0.md) | تصحيح نص السلطة فقط دون تغيير التصميم |
| [docs/en/systems/01-multi-tenancy.md](en/systems/01-multi-tenancy.md) | توضيح MT-001 وربط MT-060 بـADR-001 |
| [docs/en/systems/14-security.md](en/systems/14-security.md) | مرجع ADR-001 بجانب SE-080 |
| [docs/en/systems/15-api-standards.md](en/systems/15-api-standards.md) | استثناء probes من prefix وتحديث تسمية المسارات وDoD المرتبطين |
| [docs/en/systems/18-infrastructure-cicd.md](en/systems/18-infrastructure-cicd.md) | توضيح IN-004 ومرجع انطباق cross-tenant في IN-030 |
| [docs/en/systems/22-testing.md](en/systems/22-testing.md) | انطباق TS-010/011/061 مع مرجع ADR-001 |
| [docs/ar/systems/01-multi-tenancy.md](ar/systems/01-multi-tenancy.md) | مرجعية إنجليزية وترجمة التوضيح المتعلق بـADR |
| [docs/ar/systems/02-data-model.md](ar/systems/02-data-model.md) | سطر المرجعية فقط |
| [docs/ar/systems/03-content-engine.md](ar/systems/03-content-engine.md) | سطر المرجعية فقط |
| [docs/ar/systems/04-visual-editor.md](ar/systems/04-visual-editor.md) | سطر المرجعية فقط |
| [docs/ar/systems/05-ai-generation.md](ar/systems/05-ai-generation.md) | سطر المرجعية فقط |
| [docs/ar/systems/06-renderer-publishing.md](ar/systems/06-renderer-publishing.md) | سطر المرجعية فقط |
| [docs/ar/systems/07-domains-ssl.md](ar/systems/07-domains-ssl.md) | سطر المرجعية فقط |
| [docs/ar/systems/08-assets-media.md](ar/systems/08-assets-media.md) | سطر المرجعية فقط |
| [docs/ar/systems/09-forms-leads.md](ar/systems/09-forms-leads.md) | سطر المرجعية فقط |
| [docs/ar/systems/10-analytics.md](ar/systems/10-analytics.md) | سطر المرجعية فقط |
| [docs/ar/systems/11-billing-entitlements.md](ar/systems/11-billing-entitlements.md) | سطر المرجعية فقط |
| [docs/ar/systems/12-auth.md](ar/systems/12-auth.md) | سطر المرجعية فقط |
| [docs/ar/systems/13-queues-jobs-cache.md](ar/systems/13-queues-jobs-cache.md) | سطر المرجعية فقط؛ QJ-011/012 لم يتغيرا |
| [docs/ar/systems/14-security.md](ar/systems/14-security.md) | مرجعية إنجليزية ومرجع ADR |
| [docs/ar/systems/15-api-standards.md](ar/systems/15-api-standards.md) | مرجعية إنجليزية وترجمة استثناء probes |
| [docs/ar/systems/16-frontend-standards.md](ar/systems/16-frontend-standards.md) | سطر المرجعية فقط |
| [docs/ar/systems/17-backend-modules.md](ar/systems/17-backend-modules.md) | سطر المرجعية فقط |
| [docs/ar/systems/18-infrastructure-cicd.md](ar/systems/18-infrastructure-cicd.md) | مرجعية إنجليزية وترجمة توضيح probes وCI |
| [docs/ar/systems/19-observability.md](ar/systems/19-observability.md) | سطر المرجعية فقط |
| [docs/ar/systems/20-performance-caching.md](ar/systems/20-performance-caching.md) | سطر المرجعية فقط |
| [docs/ar/systems/21-backup-dr-retention.md](ar/systems/21-backup-dr-retention.md) | سطر المرجعية فقط |
| [docs/ar/systems/22-testing.md](ar/systems/22-testing.md) | مرجعية إنجليزية وترجمة انطباق الاختبارات |
| [docs/ar/systems/23-i18n-rtl.md](ar/systems/23-i18n-rtl.md) | سطر المرجعية فقط |

### ملفات جديدة

- [ADR-001-stage-00-cross-tenant-test-applicability.md](adr/ADR-001-stage-00-cross-tenant-test-applicability.md).
- [stage-00-technical-decision-report.md](stage-00-technical-decision-report.md).
- [documentation-reconciliation-report.md](documentation-reconciliation-report.md).

## CONFLICT 1 RESOLUTION

سُجّل الترتيب المعتمد في الدستور بالإنجليزية والعربية: الدستور الإنجليزي، ثم ADRs المعتمدة والمنطبقة، ثم systems الإنجليزية ذات الصلة، ثم Architecture Reference، ثم Stage/Task instructions بما فيها Playbook.

عُدّل نص Architecture Reference الذي كان يرفع الوثيقة الأصلية فوق الدستور. صُححت إشارات README والمرجع الأعلى في الوثائق العربية. لم تتغير مصادر الحقيقة الخاصة بالبيانات والعقود، مثل PostgreSQL وpackages/schemas، لأنها ليست ترتيب سلطة الوثائق.

البحث شمل جميع ملفات Markdown الحالية. بقي تعارض Priority/§2 داخل Playbook دون تعديل، تنفيذًا لطلب المالك إبلاغه أولًا؛ لذلك لا يُدّعى اكتمال تسوية جميع نصوص المرجعية في المستودع.

## CONFLICT 2 RESOLUTION

`API-010` أصبح خاصًا بـProduct/Business APIs تحت `/api/v1/`. `/health` و`/ready` probes تشغيلية غير versioned وفق `IN-004`. جرى تحديث `API-011` وAPI DoD مباشرة لتجنب بقاء شرط الجمع/prefix على هذين المسارين.

لم تُضف endpoints أو schema fields أو response contracts جديدة إلى القواعد. المقترحات المتعلقة بالـbody/status موجودة في التقرير التقني فقط وتنتظر الاعتماد. التعديلات متطابقة دلاليًا في AR/EN.

## ADR CREATED

[ADR-001](adr/ADR-001-stage-00-cross-tenant-test-applicability.md) بحالة **Accepted**، بناءً على اعتماد المالك الصريح للقرار 3 بتاريخ 2026-09-30، وليس اعتمادًا معماريًا مستقلًا من الوكيل.

يوضح غياب Tenant-capable domain surface في Stage 00، وعدم تأجيل Tenant isolation، ومنع fake tenants/auth/tests وsilent skips. النتيجة N/A معللة وليست PASS. أول Tenant-capable code في Stage 01 يجب أن يصاحبه الاختبار الحقيقي، ولا يُدمج مورد Tenant-scoped في Stage 01+ دون negative cross-tenant tests. لا إعفاء دائم ولا إعفاء لفئات أخرى.

## PLAYBOOK REVIEW

**CONFLICT FOUND**

قُرئ [IMPLEMENTATION-PLAYBOOK.md](../IMPLEMENTATION-PLAYBOOK.md) بالكامل. أثبتت مقارنة SHA-256 أنه لم يتغير عن النسخة الموجودة قبل بدء التعديلات.

- السطر 6 يصفه بأنه يلي الدستور مباشرة؛ §2 يضعه رابعًا ويغفل Architecture Reference. يلزم تصحيح معتمد ليتبع ترتيب القرار 1؛ لم يُعدّل تلقائيًا.
- §14 يحتوي منعًا عامًا لتأجيل Tenant isolation tests؛ ينطبق ADR-001 الأعلى أولوية، لكن إضافة مرجعه في Playbook متوقفة على إذن تعديل الملف.
- Stage 00 يطلب R2 integration skeleton وStaging deploy ناجحًا. هذان بندا scope/gate صريحان يحتاجان تعريف الحد الأدنى وقرار بيئة staging أو تعديل gate. ليست عبارة skeleton إلزامًا تلقائيًا ببناء full R2 integration، ولا يجوز إعلان PASS محلي بوصفه staging مثبتًا.
- تقسيم Stage 00 Foundation ثم Stage 01 Auth + Tenant، والـstack الأساسي، وconfig/logging/migrations/backup smoke متسقة مع الاتجاه المعتمد.

## UNEXPECTED DOCUMENTATION CONFLICTS

لم نُسوِّ خارج القرارات الثلاثة أي تعارض أو غموض جديد:

- QJ-011/012 بصياغة «كل مفتاح» تحتاج حسم تطبيقها على مفاتيح BullMQ الداخلية والـtenant scope، مع تحديد worker reconnect deadline؛ التفاصيل والبدائل في القرار التقني 10.
- OB-002 يحتاج تمثيلًا محددًا لحقول tenant/user الغائبة في startup/probes؛ لا synthetic IDs.
- DM-003 يحتاج مراجعة انطباق قاعدة timestamps على migration metadata الخاصة بالأداة المختارة؛ لا schema change الآن.
- شرط ADR قبل إرسال diagnostics لطرف ثالث موجود في `19-observability §10`. اختيار SDK أول مرة لا يُنشئ وحده موجب `CORE-090`؛ لم يُنشأ ADR إضافي أو يُرسل diagnostic data.

طلب Foundation صغيرة قابل للتطبيق مع checks محدودة، لكنه لا يحذف MUST قائمة: pre-commit scan في SE-041، accessibility في FE-091، visual RTL/LTR في FE-093، budget بسيط في FE-074، وerror tracking في OB-021. التقرير يقترح أصغر تطبيق مفيد لهذه القواعد، دون منصات مستقلة.

## FILE DIFF REVIEW

- المجلد ليس Git repository؛ لم نُنشئ `.git`. استُخدم `git diff --no-index` مقابل نسخة للوثائق أُخذت قبل التعديل خارج المشروع.
- روجعت الفروق النصية، بما فيها التغييرات ذات السطر الواحد في الملفات العربية. نطاق تغييرات الوثائق الحاكمة هو القرارات الثلاثة ومراجعها المباشرة فقط.
- `git diff --no-index --check` لم يُظهر أخطاء whitespace. exit code الخاص بالمقارنة يشير إلى وجود فروق، وليس نتيجة اختبار تطبيق.
- تسلسل Rule IDs الأصلي محفوظ؛ لا حذف أو إعادة ترقيم للقواعد.
- فُحصت الروابط المحلية المضافة؛ لا روابط جديدة مكسورة. لا يُدّعى أن جميع الروابط القديمة أو الروابط الخارجية خضعت لفحص شامل.
- التقرير التقني يتضمن 10 قرارات، ولكل قرار البنود العشرة المطلوبة.
- لم تُنشأ apps/packages/infra أو package.json أو lockfile أو CI أو DB، ولم يُشغّل install. كل الملفات المضافة/المعدلة Markdown.
- لا runtime tests أو builds أو dependency scans في مهمة وثائق فقط؛ لا تُعرض نتائجها كـPASS.

## STAGE 00 TECHNICAL DECISION REPORT

التقرير الكامل: [STAGE 00 TECHNICAL DECISION REPORT](stage-00-technical-decision-report.md). جميع توصياته غير معتمدة، ويتضمن المصادر الرسمية ومراجعة تقليص الخطة وحدود الأدلة المتاحة.

**STOP:** التعديلات المصرح بها مكتملة، لكن Playbook يحتاج القرار المذكور. لم يبدأ Stage 00 Implementation، ولن يبدأ دون موافقة صريحة.
