# STAGE 00 TECHNICAL DECISION REPORT

**التاريخ:** 2026-09-30

**الحالة:** القرارات في قسم APPROVED DECISIONS معتمدة صراحةً من مالك المشروع بتاريخ 2026-09-30. هذا اعتماد وثائقي فقط، وليس تصريحًا ببدء Stage 00. لم تُثبّت أي dependency، ولم يُكتب Foundation/Product code. المقارنات المرقمة 1 إلى 10 أدناه محفوظة كتقييم سابق للاعتماد، وليست قرارات مفتوحة أو نتائج benchmark أو dependency audit مكتمل؛ سجل الاعتماد يحدد ما اختير وما أُجّل.

**المرجعية:** [Project Rules](en/00-PROJECT-RULES.md)، ثم ADRs المعتمدة والمنطبقة، ثم ملفات systems الإنجليزية ذات الصلة، ثم Architecture Reference، ثم تعليمات المرحلة/المهمة. [ADR-001](adr/ADR-001-stage-00-cross-tenant-test-applicability.md) معتمد ولم يتغير؛ لا يعفي من أي فئة اختبار أخرى. هذا التقرير لا يتجاوز تلك المراجع.

## APPROVED DECISIONS

1. **Database:** `pg` (node-postgres) في Stage 00، دون ORM. يعاد تقييم ORM عند أول Domain Repository حقيقي؛ لا Domain Model الآن. PostgreSQL يبقى System of Record الوحيد.
2. **Migrations:** `node-pg-migrate` مع migrations versioned، وفصل migration/runtime DB privileges حيث ينطبق، دون schema synchronization عند startup. لا destructive migration بلا rollback/rollout strategy. تبقى اختبارات up/down في CI وفق `DM-053`. توضيح `DM-003` يستثني metadata التي تملكها الأداة من إلزام حقلي `created_at/updated_at`؛ لا تعديل لـinternals الأداة.
3. **Testing:** Vitest مع `@nestjs/testing`؛ Playwright محدود للأسطح الفعلية فقط، دون Browser Test Platform كبيرة. تنطبق N/A لاختبارات Cross-tenant runtime وفق ADR-001 فقط. بقية checks المنطبقة لا تُعطّل.
4. **i18n:** `next-intl` لتطبيقي Next.js، مع Foundation strings الفعلية فقط. لا Domain translations أو CMS translation system.
5. **CI:** GitHub Actions هو الهدف المعتمد. منطق build/test/lint/typecheck في root scripts قدر الإمكان؛ workflow للتنسيق وليس لحبس المنطق لدى المزود. الاعتماد لا يعني وجود remote أو نجاح CI فعلي حتى الآن.
6. **Runtime/dependencies:** stable supported Node.js LTS؛ لا رقم إصدار أو dependency مثبتة في هذه الخطوة. قبل أي install تُراجع compatibility matrix وmaintenance status وknown Critical/High vulnerabilities وlicense وpeer dependencies، إلى جانب سبب الإضافة وآخر تحديث وbundle size وفق `CORE-002`. تُثبت إصدارات محددة؛ لا floating `latest`. فشل المراجعة يوقف تثبيت الاختيار المتأثر، ولا يُتجاوز لإخراج CI أخضر.
7. **Probes:** فقط `/health` و`/ready` خارج `/api/v1` وفق `API-010` و`IN-004`، بعقد JSON محدود و`requestId` وفق standards. `/health` لعملية التطبيق نفسها، مستقل عن DB/Redis؛ `/ready` يفحص dependencies اللازمة فعلًا للتطبيق المعني. لا hosts أو credentials أو topology أو dependency versions أو connection strings في الاستجابة. لا endpoints إضافية. لا schema fields جديدة معتمدة ضمن المقارنات القديمة؛ يوثق العقد الواحد وفق `CORE-022` قبل كود مستهلكيه.
8. **Error tracking:** Sentry هو المرشح المعتمد. يُمنع external diagnostic transmission في Stage 00 قبل إنشاء واعتماد ADR المطلوب في [19-observability §10](en/systems/19-observability.md#10-what-requires-an-adr). يُسمح بحد محلي/config عند الحاجة فقط؛ لا إرسال خارجي ولا ADR جديد في هذه الخطوة. التجهيز المحلي ليس دليل تشغيل `OB-021`، ولا يُسجّل PASS لهذا المتطلب.
9. **Operational limits:** حدود local/CI محافظة، typed وdocumented وtestable وconfigurable. لا infinite retry أو infinite wait أو unbounded connection pool. تُوثق قيم التنفيذ ووحداتها وحدودها واختبارات failure/recovery؛ ليست Production sizing ولا تعديلًا لأهداف SLO.
10. **BullMQ/Redis:** توضيح [QJ-011/QJ-012](en/systems/13-queues-jobs-cache.md) معتمد: TTL وtenant/application ownership للبيانات التي يملكها التطبيق؛ internal keys تتبع lifecycle المكتبة. environment/queue namespace عبر BullMQ supported prefix، وحدود retention/resources، وسياسات producer failure وworker reconnect، وgraceful shutdown وحد كلي للانقطاع/التعافي. لا `ioredis.keyPrefix` غير المتوافق، ولا تعديل للمفاتيح الداخلية أو `FLUSHALL` أو infinite producer retries. لا Redis كمصدر حقيقة ولا critical business state في BullMQ وحده. لا Product Jobs؛ technical queue lifecycle test فقط عند الحاجة. هذا توضيح ضمن الاستراتيجية الحالية، وليس تغيير broker/cache strategy يستدعي ADR.
11. **Logging identity:** [OB-002](en/systems/19-observability.md) يسمح بـ`null` أو absence وفق logging schema عندما يغيب السياق بطبيعته في startup/shutdown/probes/infrastructure lifecycle؛ لا synthetic tenantId/userId. الحقول الحقيقية إلزامية عندما يوجد سياقها. لا إعفاء من `requestId` أو privacy/redaction.
12. **Stage boundaries:** [Playbook](../IMPLEMENTATION-PLAYBOOK.md) يوثق authority وترابط ADR-001، وR2 boundary دون Full Integration حتى Stage 07، وبديل Stage 00 المحلي دون الادعاء بنشر Staging. Staging الحقيقي إلزامي قبل Pilot/Production وفور اعتماد hosting environment. `PB-001` يجمد Niche expansion حتى البوابات الثماني؛ `PB-002` يفرض إعادة استخدام Core ويرفض بنية مستقلة لكل Niche دون مسار Architecture Review/ADR المنطبق.

**حدود الاعتماد:** لا Application code أو install أو accounts/providers جديدة. لا تغيير للـstack الأساسي أو tenancy أو publishing/rendering. لا ADR إضافي لاختيار مكتبة لأول مرة أو لتوضيح lifecycle لا يغير المبادئ؛ يبقى ADR إرسال diagnostics شرطًا سابقًا لذلك الفعل. فحص الإصدارات والقيم الرقمية والعقود التفصيلية مهام تحقق قبل استهلاكها في التنفيذ، وليست إذنًا بالتخمين أو ادعاء أنها اختُبرت.

## APPROVED SOLO GOVERNANCE — 2026-10-11

اعتمد المالك تسوية CORE-040/044/045: genesis واحد بشجرة فارغة، وPR استيراد foundation واحد باستثناء الحجم الإجمالي مع حزم مراجعة لا تتجاوز 400 سطر كود، ونمط مراجعة المالك المنفرد للتغييرات المؤهلة بمراجعة موثقة بمساعدة AI وقبول المالك. هذا ليس مراجعة بشرية مستقلة؛ تبقى حالات المراجع البشري المستقل وDM-034 إلزامية. يسجل [الاعتماد](checkpoints/00-j-solo-governance-adoption.md) المالك وتاريخ السريان 2026-10-11 ومراجعة 2027-01-09 وحدود الانتهاء أحادية الاستخدام. اعتماد السياسة لا يأذن بإنشاء commit أو branch أو push أو تعديل GitHub settings؛ كل فعل يحتاج الإذن المحدد في خطة النشر. لا تغيير للـstack أو Security/CI/Testing gates أو قبول A-I؛ يبقى 00-J BLOCKED حتى جميع بواباته الفعلية. لا ADR لهذا النطاق وفق triggers المعاد فحصها في سجل الاعتماد.

## APPROVED SUPPLY-CHAIN POLICY — 2026-10-01

اعتمد المالك سياسة Risk-Based Supply Chain في [CORE-002](en/00-PROJECT-RULES.md)، كتحديث لمرجع القرار #6 دون تغيير الـstack أو قرار Testing #3. تبقى Direct تحت مراجعة قوية وDEFAULT REJECT بعد 18 شهرًا مع documented direct-age exception؛ وDirect deprecated/EOL/abandoned لا تستخدم هذا الاستثناء. تبقى كل Transitive ضمن inventory والفحوص الأمنية ومراجعات license وintegrity/source وgraph؛ age/deprecation/EOL إشارات تُحسم وفق التعرض الفعلي، وليست رفضًا تلقائيًا بمفردها. لا تخفيف لأي hard blocker أو High/Critical.

مدد Transitive المعتمدة: deprecated/EOL بحد أقصى **90 يومًا**، وage-only بلا إشارة خطر جوهرية أخرى بحد أقصى **180 يومًا**، مع إعادة تقييم فورية عند triggers المحددة في CORE-002؛ الموعد الدوري لا يستبدلها. هذه المدد تحل محل مقترحات 30/90 يومًا في [تقرير الحوكمة التاريخي](checkpoints/00-b-supply-chain-governance-review.md) دون تعديل التقرير أو جعله مصدرًا حاكمًا.

`estree-walker@3.0.3` مرشح ACCEPT WITH TRACKING كـTransitive deprecated ضمن test/dev tooling، وليس قبولًا فعليًا أو PASS للـVitest graph. يلزم تقييم graph كاملًا بأدلة حديثة قبل أي install، وفق [POLICY RE-EVALUATION PENDING](checkpoints/00-b-dependency-review.md#policy-re-evaluation-pending). يبقى `reflect-metadata@0.2.2` و`rxjs@7.8.2` Direct mandatory peers باعتمادات direct-age السابقة المشروطة بـcomplete graph gate. نتائج BLOCK التاريخية تبقى صحيحة وفق السياسة وقتها، ولا تتحول بأثر رجعي إلى PASS.

أُعيد فحص triggers: لا ADR مطلوب وفق CORE-090 و14-security §12 و18-infrastructure-cicd §9 و22-testing §11، لأن كل dependency تظل مراجَعة دون تجاوز ضابط أمني أو تغيير معماري/Framework/فئة اختبار. هذا اعتماد وتسوية وثائق فقط؛ لا إعادة تقييم graph منفذة ولا install ولا استئناف 00-B أو بدء 00-C.

## المقارنات السابقة للاعتماد

الأقسام العشرة التالية سجل تاريخي للخيارات وأسباب التوصية. عبارة «يحتاج حسمًا» أو «لم يُعدّل» فيها تصف وقت التقييم السابق؛ الحالة الحالية هي سجل الاعتماد أعلاه والوثائق الحاكمة المحدثة.

## 1. DB driver / ORM

1. **موعد الحسم:** نحتاج driver قبل DB connectivity في Stage 00. يمكن تأجيل ORM حتى تصميم أول repository حقيقي في Stage 01؛ لا يوجد Domain Model الآن.
2. **الخيارات:** `pg` (node-postgres) مباشرة؛ أو Drizzle فوق `pg`؛ أو Prisma مع أدواته. جميعها مرشحة ضمن Node.js/TypeScript/PostgreSQL، دون تغيير قاعدة البيانات، وبعد مراجعة dependencies.
3. **Advantages:** `pg` يوفر اتصالًا وSQL مباشرًا بأقل طبقات. Drizzle يضيف query/schema typing قريبًا من SQL. Prisma يوفر نمذجة وعميلًا مولّدًا. يدعم `pg` الاستعلامات ذات المعاملات وpooling. [node-postgres](https://node-postgres.com/features/queries)، [pooling](https://node-postgres.com/features/pooling).
4. **Disadvantages:** `pg` يحتاج mapping وvalidation صريحين، ولا يثبت صحة SQL بمجرد TypeScript. Drizzle يضيف DSL يجب تنظيمه مع العقود المشتركة. Prisma يربط سير العمل بنمذجته وتوليده، قبل وجود حاجة Domain في هذه المرحلة. [Drizzle](https://orm.drizzle.team/docs/migrations)، [Prisma migrations](https://www.prisma.io/docs/orm/migrations/how-migrations-work).
5. **Security implications:** لا ORM يثبت tenant isolation تلقائيًا. الاستعلامات parameterized، TLS حين يلزم، runtime role محدود، واتصال migration بصلاحيات منفصلة. لا SQL في controllers ولا تسريب DB rows.
6. **Operational implications:** pool محدود، timeout، وإرجاع الاتصالات وإغلاقها. لا ORM synchronization أو schema push عند startup. تغيير ORM لاحقًا يحتاج مراجعة migration history، لا إعادة كتابة تاريخ DB بصمت.
7. **Lock-in implications:** `pg` أقل ارتباطًا بمكتبة؛ Drizzle يربط query API وschema DSL؛ Prisma يربط نموذجًا وعميلًا مولّدًا. الارتباط بـPostgreSQL نفسه معتمد أصلًا.
8. **Recommendation:** `pg` للـFoundation، وتأجيل ORM حتى Stage 01. لا generic repository ولا abstraction تتوقع Domain غير موجود.
9. **ADR:** لا يلزم لاختيار driver/ORM أول مرة وفق `CORE-090` ما دام لا يغيّر datastore أو tenancy أو المبادئ. توثيق القرار ومراجعة `CORE-002` لازمان.
10. **أثر التأجيل:** تأجيل driver يعطل DB integration/readiness/tests؛ تأجيل ORM وحده لا يعطل Stage 00.

## 2. Migration tool

1. **موعد الحسم:** قبل إثبات migration pipeline في Stage 00.
2. **الخيارات:** `node-pg-migrate` مستقل مع PostgreSQL؛ أو أداة migrations التابعة لـORM إذا اعتُمد الآن. لا migration engine مخصص ولا أوامر SQL يدوية غير متتبعة.
3. **Advantages:** الأداة المستقلة تفصل تاريخ DB عن اختيار ORM وتتيح up/down وSQL قابلًا للمراجعة. الأداة المرتبطة بـORM تقلل ازدواجية tooling عندما يكون ORM محسومًا. [node-pg-migrate](https://salsita.github.io/node-pg-migrate/).
4. **Disadvantages:** migrations المكتوبة تحتاج مراجعة دقيقة؛ rollback المولّد لا يثبت استعادة البيانات. توليد migration من ORM قد يحتاج SQL مخصصًا أو خطة rollback إضافية لتلبية `DM-053`؛ يجب التحقق من الإصدار المختار، لا افتراض دعم down.
5. **Security implications:** DDL role منفصل عن runtime، لا credentials في الملفات، ولا destructive rollback تلقائي على بيانات حقيقية. metadata الخاصة بالأداة تُعرض للمراجعة قبل إنشائها.
6. **Operational implications:** تنفيذ واحد للمهاجرات مع locking/order checks، ومهلات lock/statement، واختبار up/down/reapply على DB نظيفة. PostgreSQL واحد للمشروع؛ قواعد الاختبار المعزولة ليست مصدر حقيقة ثانيًا.
7. **Lock-in implications:** الأداة المستقلة تربط صيغة الملفات وجدول التاريخ؛ أدوات ORM تزيد الارتباط بالـDSL وسير توليد التغييرات. يمكن تغيير الأداة لاحقًا لكن يلزم حفظ التاريخ والتحقق منه.
8. **Recommendation:** `node-pg-migrate` مع migrations صريحة قابلة للمراجعة. في Stage 00 إثبات تقني محدود دون Domain tables؛ لا نعدّ migration فارغة وحدها اختبارًا كافيًا لصلاحيات DDL أو rollback.
9. **ADR:** اختيار الأداة الأول لا يستدعي `CORE-090`. أي تغيير لاحق في datastore أو tenancy يقيّم منفصلًا. migrations نفسها تخضع لـ`DM-030` إلى `DM-036` و`CORE-045`.
10. **أثر التأجيل:** يعطل migration commands واختبار `DM-053` وإغلاق Foundation.

## 3. Testing framework

1. **موعد الحسم:** قبل أول اختبارات Stage 00. يمكن تأجيل توسيع browser matrix واختبارات الرحلات غير الموجودة، دون تعطيل الفئات المنطبقة.
2. **الخيارات:** Vitest مع `@nestjs/testing`؛ أو Jest مع `@nestjs/testing`. Playwright مكمّل محدود لاختبار التطبيقين في المتصفح، وليس بديلًا لاختبارات unit/integration.
3. **Advantages:** Vitest مناسب لمسار TypeScript/ESM، وتوثيق Nest الحالي يعرض تكامله. Jest بديل يدعمه نموذج testing المستقل في Nest وله mocks/assertions مألوفة. [Nest testing](https://docs.nestjs.com/fundamentals/testing).
4. **Disadvantages:** يلزم اختبار decorators/DI/module resolution في الإصدار المختار؛ لا نفترض تطابق transforms مع production. Vitest لا يغطي async Server Components مباشرة وفق توثيق Next الحالي؛ تُختبر هذه المسارات عبر المتصفح. [Next testing](https://nextjs.org/docs/app/guides/testing/vitest).
5. **Security implications:** لا production secrets أو بيانات عملاء في fixtures أو artifacts. DB/Redis حقيقيان ومعزولان في integration؛ redaction وheaders وحدود المدخلات اختبارات سلبية فعلية.
6. **Operational implications:** أوامر root واحدة وrunner أساسي واحد؛ timeout لكل suite، تنظيف الموارد، وتشغيل browser smoke على build فعلي. لا test platform منفصلة.
7. **Lock-in implications:** منخفض إلى متوسط في mocks/config/snapshots؛ كتابة behavior tests تقلل تكلفة التغيير.
8. **Recommendation:** Vitest + `@nestjs/testing` بعد التحقق من version matrix؛ Playwright لفحوص الشاشتين فقط، مع accessibility وفروق screenshots المطلوبة. لا اختبار tenant runtime في Stage 00 وفق ADR-001.
9. **ADR:** اختيار framework لأول مرة لا يستدعي `CORE-090`. تغيير framework معتمد لاحقًا أو إسقاط فئة CI له شرط صريح في `22-testing §11`؛ لا نُنشئ ADR لاختيار مكتبة صغيرة تلقائيًا.
10. **أثر التأجيل:** يعطل unit/integration وCI. تأجيل browser smoke بالكامل يمنع إثبات boot والـRTL/LTR المنطبقين.

## 4. CI host

1. **موعد الحسم:** قبل إنشاء CI وPR gates. إعدادات workspace المحلية لا تتطلب حسمه أولًا، لكن إغلاق Stage 00 يتطلب CI فعليًا.
2. **الخيارات:** GitHub Actions إذا كان مستودع الفريق على GitHub؛ GitLab CI إذا كان على GitLab. لا يوجد `.git` أو remote حاليًا لتحديد المنصة. تشغيل محلي فقط ليس بديلًا مكافئًا للـCI.
3. **Advantages:** كلاهما يدعم pipeline مع tests وartifacts وخدمات اختبار. إبقاء CI مع Git host يقلل الإدارة وربط الصلاحيات. [GitLab services](https://docs.gitlab.com/ci/services/).
4. **Disadvantages:** لكل منهما صيغة workflow وصلاحيات وحصص تشغيل؛ runners المستضافة ذاتيًا تضيف صيانة وعزلًا يجب تشغيلهما فعليًا. لا أفترض خطة اشتراك أو توافر SAST خاص دون التحقق.
5. **Security implications:** أقل token permissions، pin للمكونات الخارجية، عزل PRs غير الموثوقة عن الأسرار، وعدم نشر credentials في artifacts. [GitHub secure use](https://docs.github.com/en/actions/reference/security/secure-use).
6. **Operational implications:** scripts في root تحمل المنطق، وworkflow ينسّقها؛ build واحد، DB/Redis للاختبارات، logs/reports محدودة الاحتفاظ. اختيار منصة staging يظل قرارًا منفصلًا غير محسوم.
7. **Lock-in implications:** منخفض إذا بقيت الأوامر مستقلة عن المزود؛ workflows والسياسات فقط تحتاج نقلًا.
8. **Recommendation:** استخدام CI الخاص بمنصة Git التي يحددها المالك. عند عدم وجود تفضيل، GitHub Actions مرشح؛ لا أنشئ حسابًا أو remote أو CI الآن.
9. **ADR:** أول CI host لا يغيّر hosting/CDN أو datastore، فلا يلزم `CORE-090`. تغيير hosting/deployment strategy لاحقًا له متطلبات `18-infrastructure-cicd §9`.
10. **أثر التأجيل:** لا يمكن إثبات PR gates أو branch protection أو stage closure بالـCI؛ يستمر التخطيط المحلي فقط.

## 5. i18n library

1. **موعد الحسم:** قبل نصوص shell وerror/loading UI في Stage 00؛ `CORE-069` و`IL-020` يمنعان hardcoded user-facing strings.
2. **الخيارات:** `next-intl`؛ أو `i18next` مع `react-i18next`. كلاهما مرشح بعد مراجعة التوافق. قاموس ad hoc يصبح عبئًا عند plurals والتنسيق ولا أوصي ببناء محرك ترجمة.
3. **Advantages:** `next-intl` يتكامل مع Server/Client Components. `i18next` أكثر عمومية عبر بيئات React وخارجها. [next-intl](https://next-intl.dev/docs/environments/server-client-components)، [react-i18next](https://react.i18next.com/).
4. **Disadvantages:** `next-intl` أكثر ارتباطًا بـNext؛ `i18next` يحتاج ترتيبًا إضافيًا لـSSR/hydration وحدود server/client. كلاهما يحتاج اختبار completeness وplurals؛ إضافة المكتبة وحدها لا تثبت RTL.
5. **Security implications:** لا HTML مترجم غير موثوق ولا أسرار في client messages. تمرير الرسائل اللازمة فقط للمتصفح، وتحديد locale من مجموعة مسموحة.
6. **Operational implications:** ملفات AR/EN صغيرة محلية، `lang/dir` صحيحان وCSS logical؛ لا translation SaaS ولا language detection service. لغة Dashboard مستقلة عن Renderer.
7. **Lock-in implications:** متوسط في API وصيغة الرسائل؛ مفاتيح مستقرة وملفات منفصلة تقلل الكلفة، دون إنشاء wrapper واسع غير مطلوب.
8. **Recommendation:** `next-intl` لتطبيقي Next، بنصوص Foundation فقط. لا ترجمة محتوى مواقع أو CMS أو routing متعدد اللغات للمنتج الآن.
9. **ADR:** أول اختيار لا يقع ضمن `CORE-090`. تغيير المكتبة لاحقًا أو numeral preference له شرط `23-i18n-rtl §9`، وليس مبررًا لفرض ADR الآن على أول اختيار.
10. **أثر التأجيل:** يعطل تنفيذ shell متوافق مع القواعد؛ يمكن تأجيل ترجمة Domain content لعدم وجوده.

## 6. Error tracking

1. **موعد الحسم:** يلزم قبل إثبات `OB-021` وإغلاق Stage 00. منصة monitoring كاملة وdistributed tracing للرحلات المستقبلية يمكن تأجيلهما.
2. **الخيارات:** Sentry مستضاف؛ أو error tracker مكافئ موجود لدى الفريق ويغطي frontend/backend. استضافة منصة جديدة ذاتيًا غير موصى بها لهذه المرحلة؛ logs فقط ليست بديلًا يحقق `OB-021`.
3. **Advantages:** خدمة مستضافة تقلل صيانة التخزين والتجميع؛ منصة موجودة بالفعل تقلل عدد المزودين والصلاحيات الجديدة.
4. **Disadvantages:** الخدمة الخارجية لها تكلفة وسياسة احتفاظ وموقع تخزين؛ المنصة الذاتية تضيف تشغيلًا وترقيات ونسخًا احتياطية. لا أفترض أن SDK defaults تحقق سياسة الخصوصية.
5. **Security implications:** منع PII/secrets قبل الإرسال وعند التخزين، فحص URLs/headers/breadcrumbs/exception messages، وعدم تشغيل session replay أو attachments افتراضيًا. لدى Sentry إعدادات scrubbers ومنع تخزين IP؛ يجب اختبارها ولا تكفي وحدها. [Sentry privacy settings](https://docs.sentry.io/api/organizations/update-an-organization/).
6. **Operational implications:** التقاط خطأ اصطناعي من الواجهة والخلفية مع service/environment/requestId والتحقق من وصوله وتنقيحه. timeout وخروج لا يتعطلان بسبب tracker. لا Grafana/Prometheus cluster ولا OpenTelemetry platform جديدة.
7. **Lock-in implications:** متوسط في SDK وgrouping/history؛ استخدام محدود من نقاط error handling يقلل الانتشار دون إطار adapters كبير.
8. **Recommendation:** Sentry مستضاف إن لم توجد خدمة معتمدة، بعد قرار بيانات diagnostics والاحتفاظ. لا إرسال خارجي ولا مفاتيح الآن؛ الاقتصار على dry-run محلي لاحقًا لا يثبت وحده تشغيل error tracking النهائي.
9. **ADR:** اسم مكتبة SDK وحده لا يستدعي `CORE-090`. لكن `19-observability §10` يطلب ADR صراحة قبل إرسال diagnostics لطرف ثالث جديد؛ هذا شرط موجود وليس ADR اختياريًا اخترعناه. إن كان المقصود قصر شروط ADR على `CORE-090` وإلغاء الشروط الإضافية في systems، فذلك اختلاف حوكمة يجب حسمه؛ لم نعدلها أو نُنشئ ADR لهذا المزود في هذه الخطوة.
10. **أثر التأجيل:** يمكن تنفيذ structured logging لاحقًا بعد الإذن، لكن لا ادعاء اجتياز `OB-021` أو Stage Gate الخاص بالـerror tracking.

## 7. Exact dependency versions

1. **موعد الحسم:** قبل أول install وlockfile في Stage 00، بعد اختيار الأدوات؛ لا يلزم اختراع أرقام الآن.
2. **الخيارات:** إصدارات مستقرة ومدعومة متوافقة مع Node LTS؛ أو إصدار مستقر أقدم ما زال مدعومًا عند تعارض مثبت. الإصدارات التجريبية وEOL وfloating `latest` ليست baseline مناسبًا.
3. **Advantages:** matrix محددة تجعل local/CI/containers قابلة للتكرار؛ patch حديث مدعوم يتيح إصلاحات الأمان دون تغيير معماري. توصي Node بالإصدارات Active/Maintenance LTS للإنتاج. [Node releases](https://nodejs.org/en/about/previous-releases).
4. **Disadvantages:** أحدث major قد لا يتوافق مع peer dependencies؛ أقدم major مدعوم قد يقصر عمر الدعم المتبقي. pinning لا يغني عن تحديثات أمنية لاحقة.
5. **Security implications:** توثيق licenses/release dates/advisories، فحص transitive dependencies وinstall scripts، منع Critical/High المعروف، والتحقق من مصدر كل package/image.
6. **Operational implications:** matrix تشمل Node/pnpm/Turborepo/TypeScript/Nest/Next/React/Zod/pg/migration tool/Redis/BullMQ/test/i18n/tracker، وتوافق PostgreSQL وcontainer images. تثبيت pins وlockfile ثم clean install/build/test بعد التصريح فقط.
7. **Lock-in implications:** منخفض؛ كلفة major upgrade قد تشمل toolchain أو generated files. الالتزام بعمر الدعم أهم من الادعاء بأن إصدارًا هو الأحدث دائمًا.
8. **Recommendation:** Node 24 LTS مرشح وفق جدول الدعم المقروء بتاريخ التقرير؛ اختيار patch وبقية الإصدارات بعد dependency review وcompatibility checks. لا نسخة نهائية معتمدة ولا lockfile في هذه الخطوة.
9. **ADR:** pin أو تحديث patch لا يحتاج `CORE-090`. تحديث يغيّر framework/runtime المعتمد أو أحد المبادئ يقيّم وفق أثره؛ رقم الإصدار وحده لا يفرض ADR.
10. **أثر التأجيل:** يعطل install قابلًا للتكرار وCI/build موثوقين؛ لا يعطل تسوية الوثائق أو مقارنة الخيارات.

## 8. Operational budgets / limits

1. **موعد الحسم:** الحدود المحلية اللازمة لمنع التعليق واستنزاف الموارد قبل تشغيل Stage 00. capacity للإنتاج وSLO measurement تحت حمل العملاء لاحقًا؛ لا نغيّر أهداف `OB-030`.
2. **الخيارات:** حدود local/CI محافظة وموثقة ثم قياسها؛ أو مزيد من tuning بعد وجود workload فعلي. ترك defaults غير محدودة غير مقبول.
3. **Advantages:** سقوف واضحة تكشف leaks/failures وتمنع tests معلقة. القياس اللاحق يعطي قيمًا مناسبة للبيئة بدل sizing خيالي للإنتاج.
4. **Disadvantages:** الحدود المنخفضة جدًا تفشل على جهاز بطيء؛ العالية جدًا تؤخر كشف الفشل. لا رقم واحد مناسب لكل service/environment.
5. **Security implications:** connection/request/body limits دفاع ضد DoS؛ لا logging غير محدود ولا retries بلا نهاية. حدود client لا تغني عن server enforcement.
6. **Operational implications:** جمع أحجام pools أقل من حد DB مع حصة migrations/tests والإدارة؛ caps للـCPU/RAM، deadline للإغلاق، وCI أقل من 15 دقيقة وفق `IN-033`. لا نعيد محاولة operation غير idempotent تلقائيًا.
7. **Lock-in implications:** منخفض؛ قيم typed env قابلة للتغيير مع اختبارات. تغيير SLO رسمي يختلف عن تعديل timeout محلي.
8. **Recommendation:** نقطة بداية مقترحة للاختبار المحلي فقط: DB pool للـAPI حتى 5، connect timeout حتى 5s، probe dependency check حتى 1s، graceful shutdown حتى 30s، وفترة انقطاع Redis كلية محدودة قبل إيقاف Worker. القيم ليست معتمدة أو benchmark؛ تُضبط في compatibility/failure tests. حدود الذاكرة وحجم bundle تُشتق من build/boot مقاس، ثم تُثبت؛ لا نفترضها الآن.
9. **ADR:** قيم تنفيذ أولية لا تستدعي `CORE-090`. تغيير SLO أو RPO/RTO رسمي له قواعد systems المنفصلة؛ لا نقترح تغييرها.
10. **أثر التأجيل:** يعطل production-safe startup/shutdown واختبارات الفشل. تأجيل production capacity planning لا يعطل Foundation محلية.

## 9. Probe contracts

1. **موعد الحسم:** قبل probes واختباراتها في Stage 00. المساران `/health` و`/ready` محسومان؛ body/status/dependency policy لا تزال مقترحات.
2. **الخيارات:** (أ) إعادة استخدام JSON envelope وrequestId مع status تقني محدود؛ (ب) status-only دون body. كلاهما يمكن أن يمثل probes، لكن الثاني يحتاج توضيح انطباق `API-020/021/023`؛ استثناء الـprefix وحده لا يعفي من بقية القواعد.
3. **Advantages:** (أ) يسهل contract tests والتشخيص عبر requestId؛ (ب) أبسط للموازن ويقلل البيانات، لكنه يضيف convention مختلفًا.
4. **Disadvantages:** فحص dependencies مع كل probe قد يزيد الحمل؛ caching لمدة محدودة قد يعطي readiness قديمة. الـbody التفصيلي قد يكشف topology؛ لا حاجة له.
5. **Security implications:** مقترح allowlist للمسارين العامين فقط، rate limits/headers، `no-store`، دون credentials/versions/connection strings أو أسماء hosts. trust proxy وrequestId القادم من العميل لا يُوثق بهما دون validation وسياسة edge.
6. **Operational implications:** liveness يختبر قدرة العملية على الاستجابة دون DB/Redis؛ readiness يتوقف عند startup/shutdown أو فشل dependency مطلوبة. API يتحقق من DB؛ Worker من Redis؛ الواجهتان من readiness المحلية ما دام لا توجد تبعيات runtime لازمة. فشل Redis لا يُسقط واجهات لا تستخدمه.
7. **Lock-in implications:** منخفض في المسارات، متوسط في body إذا اعتمدت عليه أدوات؛ الحفاظ على minimal contract يمنع ربط probes بالمنتج.
8. **Recommendation:** (أ)، مع مقترح success `data.status = "ok"` و`requestId`، و503 مع error envelope وcode ثابت عند عدم الجاهزية، وrequestId header. توثيق schema مرة واحدة بعد الاعتماد وفق `CORE-131`. لا `/metrics` أو endpoint إضافي. سياق tenant/user الغائب في logs يُمثّل بصورة موحدة مقترحة كـnull، دون اختراع IDs؛ يحتاج توضيحًا في عقد logging قبل الكود.
9. **ADR:** اختيار عقد تقني جديد لا يستدعي `CORE-090`؛ يتطلب اعتماد الحقول وفق `CORE-131`. تغيير error envelope يستدعي شرط `15-api-standards §12`؛ التوصية تحافظ عليه.
10. **أثر التأجيل:** يعطل readiness وhealth tests وcontainer health checks، وبالتالي إغلاق Stage 00.

## 10. BullMQ technical key context / TTL / retries

1. **موعد الحسم:** قبل أي BullMQ runtime حقيقي؛ لا يمكن اعتباره تفصيلًا مؤجلًا مع طلب Queue foundation.
2. **الخيارات:** (أ) توضيح أن قواعد TTL/tenant scope تنطبق على application data/cache keys وأن مفاتيح BullMQ الداخلية لها lifecycle خاص تديره المكتبة، مع عزل environment/queue والتحقق من نطاق كل Job؛ (ب) فرض TTL وtenant prefix على كل مفتاح داخلي حرفيًا. الخيار (ب) ليس خيار تنفيذ موصى به: قد يحذف queue structures أو يغيّر طبولوجيا queues. لا نبدّل BullMQ أو Redis لتجاوز المشكلة.
3. **Advantages:** (أ) يحافظ على BullMQ المعتمد، ويستخدم job retention وحدود الموارد بدل العبث بالمفاتيح. (ب) يبدو مطابقًا للنص العام، لكنه لا يثبت صحة نظام queue.
4. **Disadvantages:** (أ) يحتاج تسوية صريحة لـ`QJ-011/012` وتوثيق ownership/lifecycle للمفاتيح التقنية؛ لا يجوز اعتماده ضمنيًا. إزالة completed/failed jobs بالـage/count تكون lazy في BullMQ ولا تعني TTL فعليًا لكل مفتاح؛ إزالة Job قد تزيل أثر jobId الخاص بمنع التكرار. [BullMQ retention](https://docs.bullmq.io/guide/queues/auto-removal-of-jobs).
5. **Security implications:** namespace بيئي لا يعوض tenant authorization. عند وجود Jobs حقيقية يلزم scope في payload والتحقق من ownership وقت التنفيذ. لا `FLUSHALL` أو تعديل مفاتيح داخلية أو payload يحتوي أسرارًا. critical state تبقى في PostgreSQL عند تنفيذها.
6. **Operational implications:** BullMQ يوصي بـ`noeviction` ويوفر prefix خاصًا به؛ `ioredis.keyPrefix` غير متوافق معه. Worker باستخدام ioredis يتطلب `maxRetriesPerRequest: null`، بخلاف producer الذي يجب أن يفشل سريعًا. هذا يوجب فصل command retry عن Job attempts ووضع حد كلي لعمر الاتصال أثناء الانقطاع، لا الاكتفاء بعدّ attempts. [BullMQ connections](https://docs.bullmq.io/guide/connections).
7. **Lock-in implications:** ارتباط بتمثيل BullMQ الداخلي المعتمد أصلًا؛ تجنب قراءة/تغيير internals يقلل الارتباط. لا adapter أو broker جديد في Stage 00.
8. **Recommendation:** (أ) بعد اعتماد توضيح القاعدة. bootstrap بلا Product Jobs؛ اختبار دورة queue ببيانات تقنية داخل بيئة الاختبار فقط، لا queue مستقبلية دائمة. Producer بمهلة قصيرة؛ Worker بفترة reconnect كلية محدودة ثم shutdown/exit، مع سياسة restart محدودة معلنة. يجب اختبار هذا الحد وإغلاق الاتصالات المكررة؛ `worker.close()` لا يملك timeout ذاتيًا. [BullMQ shutdown](https://docs.bullmq.io/guide/workers/graceful-shutdown).
9. **ADR:** ضبط lifecycle لا يحتاج `CORE-090` إذا حافظ على tenancy وRedis غير مصدر حقيقة. يحتاج قرارًا وتحديثًا صريحًا لـ`QJ-011/012` قبل التنفيذ. إذا نتج تغيير جوهري في cache strategy أو استثناء من المبادئ، يُطبّق شرط ADR الحقيقي؛ لا ADR تلقائي لكل Redis option. لم تُعدل هذه القواعد ولم يُنشأ ADR إضافي الآن.
10. **أثر التأجيل:** يمنع إثبات BullMQ foundation متوافقة بالكامل؛ فحص Redis PING وحده ليس اختبار Queue/Worker كافيًا. لا ننشئ Tenant أو Domain Job لتجاوز التعارض.

## مراجعة حجم Stage 00 السابقة للاعتماد

| البند | الحد الأدنى المقترح | ما لا ننشئه تلقائيًا |
|---|---|---|
| Observability | JSON/redaction/requestId، startup/shutdown، metrics للسطح الموجود، وتجربة error tracking بعد الحسم | Monitoring platform جديدة، full tracing، dashboards لأنظمة لم تُبنَ |
| Visual regression | screenshots للشاشتين الفعليتين في RTL/LTR وmobile/desktop، داخل browser tests نفسها (`FE-093`, `IN-030`) | خدمة snapshots خارجية أو مكتبة variants غير موجودة |
| Accessibility | فحص آلي محدود لكل شاشة موجودة مع keyboard/focus checks (`FE-091`, `TS-053`) | suite لجميع رحلات المنتج المستقبلية أو ادعاء شهادة WCAG كاملة |
| Bundle budget | قياس build وتثبيت threshold صغير أو warning صريح كما يسمح `FE-074` | منصة تحليل تاريخي أو budgets لكل section غير موجود |
| Pre-commit security | hook صغير يستدعي نفس scanner المستخدم في CI (`SE-041`) | خدمة أمن مستقلة أو منظومة hooks واسعة؛ حذف الفحص كله ليس تبسيطًا متوافقًا |
| R2 | حسم معنى skeleton الوارد في Playbook أولًا؛ لا full integration أو uploads | SDK/credentials/presigned URLs أو محاكٍ جديد بلا حاجة معتمدة |
| Backup | smoke restore معزول ببيانات اختبارية وقياس الزمن والسلامة | Production DR/PITR أو ادعاء RPO/RTO مثبتين |
| Deployment | containers قابلة للبناء؛ حسم متطلب staging الصريح قبل closure | Kubernetes، microservices، multi-region، hosting account جديد بلا قرار |
| Shared code | ما يستخدمه التطبيقان أو يحتاجه عقد واضح الآن | generic repositories، event bus خارجي، future provider adapters |

هذه مراجعة لحجم الخطة وليست إعفاءات جديدة. القواعد المنطبقة لا تُحذف للحصول على CI أخضر؛ القواعد الخاصة بسطح منتج غير موجود لا تبرر بناء ذلك السطح مبكرًا.

## PLAYBOOK REVIEW التاريخي: CONFLICT FOUND قبل الاعتماد

قُرئ [IMPLEMENTATION-PLAYBOOK.md](../IMPLEMENTATION-PLAYBOOK.md) بالكامل، ولم يُعدّل وفق تعليمات المالك.

- **تعارض أولوية فعلي:** `Priority` في السطر 6 يجعله بعد الدستور مباشرة من ناحية التنفيذ؛ §2 يضعه رابعًا ولا يدرج Architecture Reference. القرار الجديد يضع Architecture Reference رابعًا وتعليمات المراحل/المهام خامسًا. المطلوب اعتماد تصحيح هذين الموضعين؛ لم نطبقه تلقائيًا.
- **مرجع اختبارات غير متزامن:** §14 يمنع تأجيل Tenant isolation tests عمومًا. ADR-001 الأعلى أولوية يحدد N/A الخاصة بـStage 00 دون تأجيل العزل. إضافة reference في Playbook تحتاج إذن تعديل الملف؛ لا نعتمد النص العام لإلغاء ADR.
- **اختلاف نطاق يحتاج قرارًا، وليس تناقضًا تقنيًا مثبتًا:** Stage 00 يطلب `R2 integration skeleton` و`Staging` و`Staging deploy` كشرط PASS. طلب Foundation المحلي لا يثبت هذه البنود، ولا يسمح بافتراض حذفها. يلزم تعريف الحد الأدنى للـskeleton، وتحديد staging/provider أو اعتماد تعديل Stage Gate. لم نفترض أن skeleton تعني full R2 integration.
- **نطاقات متوافقة:** فصل Auth + Tenant إلى Stage 01، تطبيقات Foundation الأربعة، strict/config/DB/Redis/migrations/logging/error tracking/backup smoke، ومنع الانتقال قبل Gate. قيود المنتج والمراحل اللاحقة بقيت كما هي.

## مسائل لم تُسوَّ في خطوة التقييم السابقة

- `QJ-011/012` وWorker retry lifecycle تحتاج قرارًا منفصلًا كما في البند 10؛ لم تُحل بتعديل غير مصرح به.
- `OB-002` يسرد حقول tenant/user إلزامية، بينما startup/probes بلا هويات؛ مقترح null يحتاج توثيقًا قبل الكود، دون synthetic identities.
- migration metadata التي ينشئها tool تحتاج مراجعة انطباق `DM-003` (كل جدول له `created_at/updated_at`) قبل اعتماد tool schema؛ ليست إذنًا لتعديل internals أو اختراع جداول Domain.
- لا Git remote أو CI host أو staging credentials مثبتة في المستودع. لا نجزم بجاهزية provisioning أو external services.
- لم يُجر dependency audit أو اختبار compatibility/boot؛ توصيات الأدوات لا تعني أنها معتمدة أو اجتازت الفحوص.

**STOP:** حُسمت الاختيارات والتوضيحات في APPROVED DECISIONS. لا يبدأ Stage 00 قبل أمر تنفيذ صريح جديد. لم تثبت جاهزية runtime أو CI أو staging أو telemetry بمجرد اعتماد الوثائق، ولا يبدأ Stage 01 ضمن هذه المهمة.
