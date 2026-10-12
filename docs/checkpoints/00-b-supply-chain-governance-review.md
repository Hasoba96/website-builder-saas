# SUPPLY-CHAIN GOVERNANCE REVIEW

**التاريخ:** 2026-10-01، وفق تاريخ العميل في Africa/Cairo.

**الحالة:** PROPOSED ONLY. لا تعديل لـCORE-002 أو لأي وثيقة حاكمة. لا قبول فعلي لـestree-walker، ولا تغيير Testing Framework، ولا إلغاء لاعتمادات Nest السابقة. يبقى 00-B محجوبًا؛ لا install أو Application Code أو 00-C.

## CURRENT POLICY PROBLEM

[CORE-002](../en/00-PROJECT-RULES.md) يبدأ بـruntime dependency، ثم يطبق رفض العمر الافتراضي على «أي dependency جديدة». الاستثناء تراكمي، ويحظر deprecated/abandoned/EOL. [SE-062](../en/systems/14-security.md#7-dependencies-and-supply-chain) يلزم مراجعة كل dependency جديدة. التطبيق الحالي لا يميز القرار الذي نملكه مباشرةً عن leaf dependency يحددها framework مصان.

نتيجة [التحقيق المعتمد](00-b-vitest-resolution-investigation.md): Vitest مصان، لكن حافة إلزامية إلى estree-walker المعلن deprecated تمنع قبوله. وجود package قديمة ليس إثبات abandonment، وdeprecation ليست بمفردها advisory؛ لكنها إشارات يجب ألا تضيع. npm يسمح باستخدام رسالة deprecation لتوجيه المستخدم إلى نسخة أو مكتبة أخرى، وليس فقط للإبلاغ عن ثغرة. [npm deprecation](https://docs.npmjs.com/deprecating-and-undeprecating-packages-or-package-versions/)

التعديل المحدود المقترح: إبقاء مراجعة Direct قوية، وفصل مسار قبول Transitive على أساس المخاطر، دون إسقاط graph inventory أو المراجعة أو بوابات الأمن. لا تغيير stack، ولا منح كل leaf استثناءً شكليًا، ولا قبول framework مشهور لمجرد شهرته.

**الفرق المقصود عن القاعدة الحالية تغيير حوكمة مقترح، وليس تفسيرًا نافذًا لها.** تقييم المخاطر أدناه لا يجعل نتيجة التحقيق السابقة خاطئة ولا يحولها إلى PASS بأثر رجعي.

## THREAT MODEL

الأصول المعرضة: بيانات العملاء وقت التشغيل، source code، أسرار المطور وCI، صلاحيات النشر، سلامة artifacts، وموثوقية الاختبارات. مسارات الهجوم تشمل package takeover، dependency confusion، tarball tampering، lifecycle scripts، codegen/plugins، تنفيذ اختبارات من PR غير موثوق، وإدخال كود خبيث إلى bundle أثناء build.

نصنف على محورين مستقلين:

- **الاختيار:** Direct أو Transitive. الحزمة التي نعلنها صراحةً، أو نستوردها، أو نستدعي CLI/plugin API لها مباشرةً، تعامل كـDirect. الـmandatory peer الذي نضيفه بأنفسنا Direct حتى لو استهلكه framework فقط. الاستيراد من حزمة غير معلنة لا يجعلها Transitive مقبولة؛ هو عيب يجب تصحيحه.
- **التعرض:** production runtime، build، CI، test-only، optional/platform. يمكن للحزمة أن تقع في أكثر من سياق؛ يطبق أعلى خطر فعلي، لا أقل label في package.json.

لا تمثل devDependencies حدًا أمنيًا، وقد يساوي build قادر على توقيع artifacts خطر runtime أو يفوقه. تعطيل install scripts لا يمنع كود compiler أو test runner من التنفيذ لاحقًا. أما optional package غير المثبتة على Windows فقد تعمل في Linux CI أو macOS؛ الحكم يشمل كل targets المعتمدة. [OWASP CI/CD security](https://cheatsheetseries.owasp.org/cheatsheets/CI_CD_Security_Cheat_Sheet.html)

## DIRECT DEPENDENCY POLICY

1. ضرورة فعلية، نطاق الاستهلاك، exact stable version، مصدر رسمي/مراجع، license والتزاماتها، maintenance/support، advisories، engines/peers، release dates، حجم الحزمة وأثر bundle حيث ينطبق، وبدائل عملية عند وجود إشارة خطر.
2. أوصي بإبقاء **أكثر من 18 شهرًا: DEFAULT REJECT pending documented age exception** للـDirect، بما فيها dev tools. هذا أقل تغييرًا ويحافظ على شروط المالك الحالية. تحويله إلى مجرد REVIEW ممكن كخيار آخر، لكنه غير مطلوب لحل مشكلة transitive.
3. Deprecated/EOL/abandoned Direct: default reject. **لا يوجد حاليًا مسار استثناء يجيز هذه الحالات**؛ شرط 3 في CORE-002 يمنعها. لا أقترح فتحه هنا.
4. الاستثناء القائم للعمر فقط يبقى خاصًا بالحزمة، ومقيدًا بالحاجة إلى Approved Stack، وعدم وجود بديل عملي مدعوم، واستمرار الدعم والتوافق، وlicense مقبولة، وغياب hard blockers، والأدلة والمتابعة.
5. لا نقل dependency من dependencies إلى devDependencies أو حذف إعلان peer أو إضافة wrapper لتخفيف تصنيفها. pinning وحده لا يكفي للقبول، واسم framework المعتمد لا يعتمد كل إصدار منه تلقائيًا.

## TRANSITIVE DEPENDENCY POLICY

كل node جديد يدخل inventory والمراجعة. يمكن للجزء الآلي أن يغطي الحالات الروتينية؛ الـfindings تحتاج disposition بشريًا موثقًا، وليس تقريرًا صامتًا أو إلغاء warning.

العمر أو deprecation/EOL وحدهما لا ينتجان رفضًا آليًا، بشرط تحقق جميع ما يلي:

1. وجود dependency path معروف إلى Direct component من Approved Stack اجتاز مراجعة الضرورة والصيانة والدعم والتوافق الخاصة به. لا تعني هذه المراجعة الجزئية تصريحًا بالـinstall قبل إغلاق graph gate؛ بذلك لا يصبح القبول دائريًا.
2. لا malicious/compromised evidence، ولا High/Critical غير محلولة، ولا أي hard blocker آخر أدناه.
3. النسخة المطلوبة متوافقة مع consumer ومع runtime/targets الفعلية. استمرار صيانة consumer لا يثبت أن leaf نفسها مدعومة؛ يسجل الفرق صراحةً.
4. لا استيراد أو استعمال مباشر منا؛ وإلا تطبق Direct policy.
5. سبب deprecation أو EOL والتعرض والأثر مفهوم. لا يكفي غياب npm flag أو عدم صدور CVE.
6. لا supported compatible upgrade/removal ضمن نطاقنا يعالج finding دون مخاطرة أكبر. عند وجوده، يُراجع ويُختبر بدل طلب قبول دائم للنسخة القديمة. لا نفترض أن تغيير framework بأكمله أو fork أو patch أو override أو unsupported substitution إصلاح متناسب وآمن.
7. المخاطر المتبقية مقبولة ومحدودة ضمن السياق الموثق، مع owner وreview deadline وtriggers. عند فقد دليل لازم، تكون الحالة REVIEW وتمنع إغلاق acceptance gate حتى يُحسم النقص؛ لا تُسجل PASS.

يمكن جمع findings المتشابهة في سجل واحد مرتبط بالـconsumer، مع صف يحدد كل package/version/path وسببها. لا blanket allowlist باسم framework، ولا استثناء لكل الحزم المستقبلية، ولا اعتماد كامل للـgraph لأن أحد leaves قُبل.

## RUNTIME VS DEV RISK MATRIX

هذا تقدير سياقي للمخاطر المتبقية، وليس إعادة تصنيف CVSS أو تخفيض advisory High إلى Medium.

| السياق             | التعرض المحتمل                                                 | الحد الأدنى للمراجعة                                                           | حكم age/deprecation وحدهما                                                            |
| ------------------ | -------------------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| Production runtime | طلبات غير موثوقة، أسرار خدمة، بيانات tenants، استمرارية الخدمة | المدخلات، حدود الموارد، APIs الحساسة، دعم consumer، ما يدخل image/bundle فعلًا | REVIEW مشدد؛ BLOCK إن نتج أثر أمني/runtime غير مقبول؛ tracking مقيد إن لم يوجد        |
| Build-time         | source/codegen، ملفات output، إمكانية تلويث كل deployments     | scripts/plugins، artifacts، input trust، صلاحيات الكتابة والشبكة               | REVIEW؛ يرتفع إلى BLOCK عند سلوك privileged غير مقبول، حتى دون شحن المكتبة            |
| CI dependency      | PR غير موثوق، tokens، caches وrelease permissions              | فصل jobs غير الموثوقة عن الأسرار، least privilege، مصدر الحزمة، حدود التنفيذ   | لا تصنيف منخفض افتراضي؛ يلزم reviewer أمني للحالات الحساسة                            |
| Test-only          | شيفرة اختبار ومستودع المطور، network/FS، احتمال إخفاء failures | source trust، credentials، timers/resources، فصل الإنتاج، سلامة runner         | WARN/REVIEW ممكن؛ عدم الشحن لا يلغي execution risk                                    |
| Optional/platform  | native binaries أو hooks على بعض OS/CPU                        | target matrix لكل local/CI/build/runtime؛ هل تُجلب/تُنفذ/تُشحن؟                | عدم التنفيذ المثبت يخفض exposure فقط؛ تبقى inventory والفحوص، وhard blockers لا تُعفى |

الحزمة متعددة المسارات لا تُصنف test-only إذا وجد لها path آخر إلى production. حين يكون التصنيف مجهولًا لا نمنح تخفيضًا احترازيًا للخطر.

## AGE POLICY

- **Direct:** أحدث stable أقدم من 18 شهرًا يفعل default rejection ومسار الاستثناء الصارم الحالي. يراجع أيضًا support line للنسخة المختارة؛ نشر major جديد لا يجعل إصدارًا قديمًا EOL مقبولًا تلقائيًا.
- **Transitive:** أكثر من 18 شهرًا SIGNAL / INVENTORY trigger، لا automatic exception process. يسجل selected-version publish date وlatest-stable date وحالة الفرع المستخدم ونشاط upstream حيث يلزم. لا نساوي قلة الإصدارات بقلة الصيانة.
- **New release maturity:** حد `minimumReleaseAge: 1440` الحالي مستقل عن شرط 18 شهرًا، ولا يتغير بهذا المقترح.
- يعاد التقييم عند تغير graph أو المصدر أو support/deprecation/advisories أو targets أو privileges. مراجعة دورية للأجزاء غير المتغيرة تمنع نسيانها؛ لا تعتمد السياسة على مرور PR dependency جديد فقط.

## DEPRECATION POLICY

يجب التمييز بين package-level deprecation، version-only deprecation، انتهاء دعم release line، API deprecation، وتوقف مشروع كامل. لا يساوي انتقال proposal خارج مسار standardization نهاية دعم حزمة تستعمل legacy semantics.

- **Direct deprecated/EOL:** مرفوض افتراضيًا؛ لا يستخدم استثناء العمر الحالي لتجاوز ذلك.
- **Transitive deprecated/EOL:** finding واجب التسجيل، مع النص والمصدر والتاريخ والسبب والنسخة المتأثرة. النتيجة REVIEW، ثم ACCEPT WITH TRACKING أو BLOCK وفق أثره.
- إعلان deprecation بسبب compromise أو vulnerability أو عدم توافق runtime يفعّل blocker المناسب؛ ليس مجرد warning.
- archival/no recent commits إشارة تستلزم تحققًا، لا verdict آليًا. abandonment الذي يترك مخاطرة فعلية غير قابلة للمعالجة في security/runtime يوقف القبول.
- غياب npm deprecated flag لا يلغي إعلان upstream؛ وabsence of advisory لا يثبت الأمان.

## HARD BLOCKERS

تطبق على Direct وTransitive، بما فيها dev/test/optional في graph محل المراجعة، دون إسقاطها بسبب عدم الوصول المتوقع:

1. Package معروفة بأنها malicious أو release معروفة بأنها compromised.
2. Critical أو High غير محلولة وفق [SE-061](../en/systems/14-security.md#7-dependencies-and-supply-chain). **لم يُعثر على documented High/Critical risk-acceptance mechanism**؛ لا يُنشأ واحد ضمنيًا.
3. شرط exploitable مثبت في استخدامنا، بصرف النظر عن severity المسجلة أو كونها أدنى من High.
4. License غير متوافقة مع الاستخدام/التوزيع، أو التزامات لا نستطيع الوفاء بها. license مجهولة: pending legal review، لا قبول ضمني ولا حكم incompatibility مختلق.
5. Integrity mismatch، أو provenance/signature invalid أو لا تطابق هوية المصدر المطلوبة، أو dependency confusion أو مصدر مشبوه غير محسوم.
6. Runtime/peer/platform incompatibility غير مدعومة تؤثر في أحد targets المعتمدة؛ لا تخفيض strict peer/engine validation.
7. Direct upstream framework غير supported، أو abandonment/EOL في leaf يولد أثرًا أمنيًا أو تشغيليًا غير مقبول في استخدامنا.
8. Privileged lifecycle/build behavior أو وصول للأسرار/outputs بمخاطرة غير مقبولة؛ كون الحزمة dev-only لا يتجاوز ذلك.

**تمييز provenance:** عدم وجود optional attestation في حزمة قديمة ليس فشل تحقق تلقائيًا، لكنه evidence gap يسجل. إن كان الدليل مطلوبًا للسياق فلا قبول بدونه. mismatch أو validation failure لا يُعاد وصفه بأنه «غير متاح» لتجاوز البوابة. provenance الصحيحة تربط الحزمة بمصدر/build، ولا تضمن خلو الكود من malware. [npm provenance limitations](https://docs.npmjs.com/generating-provenance-statements/#provenance-limitations)

**Medium/Low:** Playbook، Stage 14 / Security Gate، يطلب إصلاح Medium أو Risk Acceptance مكتوبًا مع Owner وDeadline، وجدولة Low دون مخالفة MUST. هذا ليس إعفاءً لـHigh ولا مسارًا جديدًا عامًا لكل المراحل. exploit مثبت في استخدامنا يبقى BLOCK وفق المقترح.

## WARN / REVIEW CONDITIONS

إصدار قديم مع API ثابتة، deprecated leaf بلا advisory معروف، EOL leaf تحت consumer مصان، أو optional package غير مستخدمة على كل targets بعد الإثبات: أسباب للمراجعة المتناسبة، لا قبول تلقائي. test-only دون production shipping قد يخفض بعض التعرض، لكنه لا يعفي من مخاطر المطور وCI.

الحالات النهائية المقترحة:

- **ACCEPT:** الفحوص والمراجعة مكتملة ولا finding مفتوح يستدعي متابعة.
- **ACCEPT WITH TRACKING:** finding age/deprecation/EOL غير حاجب بعد المراجعة؛ سجل نشط محدود النطاق والمدة، بلا hard blocker.
- **BLOCK:** hard blocker مثبت، أو متطلب قبول/دليل لازم غير محسوم. في الحالة الثانية يوضح التقرير أنها pending evidence وليست ثغرة مكتشفة.

WARN/REVIEW حالات عمل، لا substitute لـPASS. سجل منتهي أو تغير سياق غير مراجع يمنع قبول graph جديد/merge حتى إعادة disposition؛ لا نعطل خدمة production تلقائيًا لمجرد انتهاء تاريخ متابعة.

## EXCEPTION PROCESS

**Direct age exception:** يبقى المسار الحالي وشروطه التراكمية؛ يوافق المالك على القبول المحدد، ويظل subject to graph security gate. لا إلغاء لـreflect-metadata/rxjs approvals ولا توسيع لها. لا exception جديد لـDirect deprecated/EOL/abandoned أو لأي hard blocker.

**Transitive tracked acceptance:** مسار عادي جديد مقترح، وليس waiver من vulnerability scan أو استثناء عمر لكل leaf. السجل يتضمن package/version، كل paths المؤثرة، consumer/version، context/targets، سبب finding ومصدره، تاريخ الأدلة، نتائج الفحوص، البدائل المدروسة، residual risk، ضوابطه، approver، owner، review deadline، وtriggers/exit action. يمكن إعادة استخدام مراجعة لم تتغير مدخلاتها؛ لا copy/paste لنتيجة قديمة على graph مختلف.

**المسؤولية المقترحة:** owning dependency maintainer مع reviewer مستقل وفق CORE-045؛ owner يقر قبول المخاطر في المرحلة الحالية. الحالات production أو CI/build الحساسة تحتاج reviewer ذا اختصاص Security. هذا توزيع مقترح للموافقة، وليس دورًا جديدًا معتمدًا بالفعل أو خدمة جديدة.

**المواعيد المقترحة للاعتماد:** إعادة مراجعة age-only منخفض التعرض خلال 90 يومًا كحد أقصى؛ deprecated/EOL أو production/privileged exposure خلال 30 يومًا، وقبل أي تحديث/تغير خطر ذي صلة أيهما أسبق. يُحدد owner وتاريخ فعلي عند القبول، لا «سنتابع لاحقًا». هذه مدد governance مقترحة وليست متطلبات حالية أو مهلة لتأجيل hard blocker. تجديد القبول يحتاج أدلة محدثة، لا تمديدًا تلقائيًا.

## CI ENFORCEMENT MODEL

تصميم مستقبلي فقط، باستخدام CI target المعتمد وroot scripts قدر الإمكان؛ لا tooling أو workflow أو SaaS أو schedule أُنشئ الآن.

| الفحص                     | التغطية                                                                                                                       | سلوك البوابة المقترح                                                                                          |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Graph inventory/diff      | كل direct/transitive، aliases، peers، optional/platform، وكل مسار runtime أو dev؛ bundled code حيث يظهر في artifact inventory | unknown scope أو dependency/source change بلا review يمنع القبول؛ عرض سبب وصول كل finding                     |
| Vulnerability audit       | graph كامل، لا production-only scan بدل full scan                                                                             | High/Critical يفشل؛ لا suppression بسبب dev/optional أو ادعاء عدم الوصول                                      |
| License inventory         | licenses والالتزامات حسب الشحن/التوزيع الفعلي                                                                                 | incompatibility يفشل؛ unknown يوقف الموافقة للمراجعة                                                          |
| Deprecation/support       | registry flags ومصادر upstream وsupport notes المسجلة                                                                         | Direct reject؛ Transitive finding يحتاج disposition؛ لا ادعاء أن metadata تكشف كل abandonment                 |
| Age                       | آخر stable وselected release/support line                                                                                     | Direct أكثر من 18 شهرًا يحتاج الاستثناء؛ Transitive يسجل ويصنف دون blanket rejection                          |
| Lockfile/source integrity | frozen lockfile، reviewed registries، hashes والتوقيعات/provenance عند توفرها وانطباقها                                       | mismatch أو suspicious origin يفشل؛ unavailable ليس PASS                                                      |
| Execution behavior        | install scripts، native build، plugins، source/maintainer changes                                                             | default-disabled lifecycle scripts يبقى؛ أي تشغيل إضافي يحتاج review محدد، وprivileged unacceptable risk يفشل |
| Tracking validity         | owner/deadline/version/context/change triggers                                                                                | record منتهي/غير منطبق أو finding جديد غير مراجع يمنع merge                                                   |
| Production shipping       | runtime image، server/client bundles، build artifacts وكل target                                                              | لا نستنتج عدم الشحن من devDependencies؛ تسريب runner للـartifact يعيد التصنيف والمراجعة                       |

فحص graph وتوثيق مساراته يخدم التحقق من العبور إلى production ومراجعة التحديثات؛ لا يتطلب منصة SBOM جديدة الآن. [OWASP Dependency Graph & SBOM](https://cheatsheetseries.owasp.org/cheatsheets/Dependency_Graph_SBOM_Cheat_Sheet.html)

فشل scanner أو انقطاع مصدر أساسي ينتج UNKNOWN/FAIL للبوابة، وليس scan نظيفًا. مراجعة خطأ إيجابي مثبت تخص تصحيح انطباق advisory/هوية النسخة بأدلة ومراجعة مستقلة، لا حذف warning لمجرد الحاجة إلى merge. أي نتيجة High/Critical صحيحة تبقى حاجبة.

لـCI الصلاحيات الدنيا، فصل untrusted PR tests عن production/release credentials، وضبط صلاحيات artifact/cache. لا تجعل deadline-only finding سببًا لإيقاف production تلقائيًا؛ malware أو compromise يتبع containment/incident response وفق SE-073. لا automatic audit fix أو forced upgrades أو blanket override.

## VITEST SIMULATION

**المحاكاة محصورة في الحافة المعروفة، لا إعادة اختيار نسخة أو اعتماد graph كامل:**

```text
vitest@5.0.2
  @vitest/mocker@5.0.2
    estree-walker@3.0.3
```

| السؤال                | نتيجة المحاكاة                                                                                                                                                                                      |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Direct/Transitive     | Vitest Direct مقترح؛ mocker وestree-walker Transitive إلزاميان في manifest                                                                                                                          |
| Runtime/dev           | test/dev tooling بالنسبة إلى المنتج؛ مكتبة walker تنفذ ضمن runtime الخاص بالـtest tool، لا تعني runtime الخاص بالـSaaS                                                                              |
| Production shipping   | المقصود ألا تُشحن في server/client production artifacts؛ لا artifact موجود لإثبات ذلك بعد، فيبقى شرط تحقق قبل القبول الفعلي                                                                         |
| Known vulnerabilities | استعلام npm bulk advisory للأسماء والإصدارات المحددة في 2026-10-01 أعاد `{}`؛ audit graph السابق في 2026-09-30 صفر High/Critical. لم يُشغّل full graph scan جديد اليوم                              |
| Deprecation           | upstream-deprecated؛ لا npm flag. يبقى finding موثقًا لا يُحذف                                                                                                                                      |
| Consumer maintenance  | Vitest 5.0 فرع maintained وفق التحقيق؛ mocker جزء من نفس upstream. لا نستنتج استمرار صيانة estree-walker نفسها                                                                                      |
| Direct imports        | لا Application Code حاليًا، ولا استيراد مباشر مقرر لـwalker/mocker؛ أي import/CLI usage مباشر لاحق يعيد Direct classification                                                                       |
| Supported replacement | zimmerframe ليس تبديلًا نملكه داخل Vitest بلا تعديل consumer؛ التحقيق لم يجد stable مدعومة تزيل الحافة. لا override/fork/patch                                                                      |
| Actual risk           | قلق صيانة واستجابة لإصلاح مستقبلي، وتنفيذ على جهاز المطور وCI ومعالجة AST؛ لا دليل حالي على exploitable condition في الاستخدام المخطط. zero advisories لا يثبت غياب malware أو الثغرات غير المنشورة |
| Proposed disposition  | **ACCEPT WITH TRACKING للحافة بسبب age/deprecation فقط، مشروط باستيفاء بقية البوابات**؛ ليس ACCEPT للـVitest graph أو permission to install                                                         |
| Tracking/exit         | سجل محدد بالإصدار/consumer، مراجعة خلال 30 يومًا مقترحة، وفور advisory أو compromise أو تغير shipping/privileges/imports أو صدور حل upstream مدعوم                                                  |

مصادر الحالة: [التحقيق المحلي](00-b-vitest-resolution-investigation.md)، [upstream walker](https://github.com/Rich-Harris/estree-walker)، [mocker manifest](https://registry.npmjs.org/@vitest%2fmocker/5.0.2). registry metadata المقروءة اليوم لا تحتوي preinstall/install/postinstall للـwalker؛ هذا لا يمنع تنفيذه عندما يستعمله runner، ولا يثبت سلامة tarball.

**القرار الفعلي اليوم: BLOCK، كما هو.** المالك لم يعتمد السياسة أو استثناء الحزمة؛ لا تستخدم المحاكاة لإبطال تعليماته. بعد أي اعتماد لاحق يلزم تحديث evidence للـgraph كاملًا، والتحقق من integrity والتوافق والضوابط المنطبقة في checkpoints المناسبة. لا نعطي checks مؤجلة قيمة PASS.

## NEST DEPENDENCY SIMULATION

| البند                       | reflect-metadata@0.2.2                                                                                   | rxjs@7.8.2                                                                                          |
| --------------------------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| التصنيف                     | Direct mandatory peer في الإعداد المخطط، حتى لو بدأ استهلاكه بسبب Nest                                   | Direct mandatory peer كذلك؛ ليس leaf Transitive لمجرد أن Nest طلبه                                  |
| التعرض                      | Production runtime للـAPI/worker، واختباراتهما                                                           | Production runtime للـAPI/worker، واختباراتهما                                                      |
| العمر                       | stable بتاريخ 2024-03-29، يتجاوز 18 شهرًا                                                                | stable بتاريخ 2025-02-22، يتجاوز 18 شهرًا                                                           |
| الدعم                       | upstream يصرح باستمرار دعم legacy TypeScript decorators؛ توقف proposal عن standardization ليس EOL للحزمة | upstream يصرح أن RxJS 7 maintained production line؛ تطوير جيل تالٍ لا يجعل 7 EOL                    |
| التوافق                     | Nest 12.1.1 يطلب reflect peer ضمن 0.1/0.2؛ boot/metadata tests لم تنفذ                                   | Nest 12.1.1 يطلب RxJS 7؛ boot/async lifecycle tests لم تنفذ                                         |
| license/security            | Apache-2.0؛ لا advisory راجع في الاستعلام المحدد اليوم                                                   | Apache-2.0؛ لا advisory راجع في الاستعلام المحدد اليوم؛ tslib في graph لا يرث قبولًا تلقائيًا       |
| الخطر المتبقي               | اعتماد Nest على metadata وتعديل Reflect؛ compatibility/runtime exposure أعلى من test-only leaf           | runtime async/resource lifecycle؛ تقييم cleanup/limits والتوافق، دون ادعاء وجود vulnerability محددة |
| البديل                      | لا replacement مثبت يحافظ على Nest legacy semantics                                                      | لا reactive library أخرى أو prerelease تحقق peer contract نفسه تلقائيًا                             |
| المقترح                     | **ACCEPT WITH TRACKING عبر direct-age exception الحالي، مشروط ببقية البوابات**                           | **ACCEPT WITH TRACKING عبر direct-age exception الحالي، مشروط ببقية البوابات**                      |
| هل الاستثناء ما زال لازمًا؟ | نعم، لأن المقترح يبقي Direct default rejection بعد 18 شهرًا                                              | نعم للسبب نفسه؛ لا إعادة تصنيف للتحايل                                                              |

لا Application Code يستورد أيًا منهما الآن؛ التصنيف مبني على احتياج manifest والـmandatory peers المخطط، لا ادعاء وجود تنفيذ. راجع [مراجعة Nest السابقة](00-b-dependency-review.md#age-exceptions-under-review)، [reflect-metadata upstream](https://github.com/microsoft/reflect-metadata)، و[RxJS upstream](https://github.com/ReactiveX/rxjs).

اعتمادات المالك المشروطة السابقة تبقى كما هي. لو اختار المالك لاحقًا Direct age REVIEW-only بدل المقترح المحافظ، يتغير اسم مسار العمر، لكن ذلك قرار إضافي لم أوصِ بدمجه في هذا التعديل ولا يزيل مراجعة المخاطر.

## SECURITY IMPACT

**ما يبقى:** رفض High/Critical، compromise/malware، unsafe usage، مشاكل المصدر/integrity/license، strict peers/engines، least privilege، review/disable للـscripts، full graph scanning، ومنع bypass غير موثق.

**ما يتحسن:** التمييز بين سبب warning والخطر المثبت، وتسجيل context/paths/expiry يجعل متابعة deprecated leaf قابلة للتدقيق بدل استثناء شكلي لكل تاريخ publish قديم.

**ما يزداد:** نسمح نظريًا ببقاء leaf deprecated لا تملك دعمًا مباشرًا؛ قد يتأخر إصلاح ثغرة مستقبلية، وقد تخطئ مراجعة exposure. الضوابط تخفف هذا الخطر ولا تزيله: متابعة محددة، أقل صلاحيات، إعادة تقييم فورية عند إشارات جديدة، وعدم الخلط بين scan نظيف وضمان أمان. قبول ذلك اختيار حوكمة صريح للمالك، لا حقيقة تقنية محسومة.

## OPERATIONAL IMPACT

مراجعة آلية لكل graph node مع مراجعة بشرية للـdirect choices والـfindings المؤثرة، وإعادة استخدام الأدلة غير المتغيرة، تقلل عبء استثناء العمر الفردي. لا تلغي effort المراجعة أو تحديث supported upstream. لا fork أو framework change أو SaaS أو test framework مخصص لمعالجة policy friction.

الحزم المقبولة مع tracking تحتاج owner ووقت مراجعة، وانتهاء السجل يمنع merges جديدة حتى حسمه. بيانات policy تبقى بسيطة داخل Dependency Review مرتبطة بالإصدارات؛ لا قاعدة بيانات أو منصة امتثال جديدة. rollback المقترح يعيد سياسة القبول القديمة للمراجعات الجديدة ويعيد تقييم الحزم المتأثرة، ولا يمحو evidence أو يبدل lockfile تلقائيًا.

## PROPOSED CORE-002 TEXT

**النص التالي بديل كامل مقترح باللغة الإنجليزية للموضع الإنجليزي، وليس تعديلًا مطبقًا.** يبقي Rule ID نفسه، واستثناءات Nest السابقة، ويجعل نطاق استثناء العمر Direct، مع مسار Transitive مستقل. بقية القواعد لا تتغير.

> **`CORE-002` (MUST NOT):** Do not add or update a third-party dependency without a recorded, risk-based Dependency Review. Every direct and transitive dependency remains in scope, including runtime, build, CI, test, and optional/platform-specific dependencies. Automated inventory and checks may cover routine transitive review; findings require an explicit disposition. No dependency class is exempt from the security gates below.
>
> **Classification and direct review.** A dependency explicitly declared, directly imported, or directly invoked by project code/tooling is direct, including a mandatory peer explicitly supplied by the project. Undeclared direct use is not a transitive exemption. Record necessity, exact stable version, source, license obligations, maintenance/support status, latest stable and selected-version release dates, compatibility, advisories, and package/bundle impact where applicable. For a runtime dependency, state its reason in the PR description and check its license, last-update date, and bundle size before addition. Review alternatives when a risk signal exists. Classify exposure by actual execution and artifact shipping across all supported targets, not solely by manifest placement; use the highest applicable exposure.
>
> **Direct age rule.** A new direct dependency whose latest stable release is older than 18 months is rejected by default. Age is a maintenance-risk signal, not proof of abandonment. A dependency-specific age exception is permitted only when all of the following hold:
>
> 1. It is required directly or as a mandatory peer/runtime requirement by a component in the approved stack.
> 2. No practical supported, compatible replacement meets the need without changing that stack or introducing greater risk.
> 3. The dependency is not established as deprecated, abandoned, or EOL.
> 4. The selected version is supported/compatible with the approved framework requirement.
> 5. Its license and applicable obligations are acceptable.
> 6. Neither the selected version nor the resulting graph has an unresolved known Critical/High vulnerability or another hard blocker below.
> 7. Maintenance, repository activity where applicable, framework compatibility, release/support notes, advisories, and transitive impact are reviewed.
> 8. The reason, evidence, owner approval, and reassessment date are recorded in the Dependency Review.
> 9. Acceptance is dependency-specific; popularity or blanket age exemptions are insufficient.
> 10. EOL, abandonment, unresolved Critical/High, changed exposure, or a supported replacement required by the framework triggers re-evaluation.
>
> Deprecated, abandoned, or EOL direct dependencies are rejected by default and cannot use this age-exception procedure. No new exception for them is granted by this rule.
>
> **Transitive signals.** For dependencies not used directly, release age over 18 months and upstream deprecation/EOL are recorded review signals, not automatic rejection. Acceptance with tracking requires a known path from an approved-stack direct component whose own necessity, maintenance, support, and compatibility have been reviewed; a compatible consumer/target runtime; no hard blocker; documented reasons for the signal and actual exposure; and acceptable residual risk. Check for supported, compatible upstream upgrades or removal first. If no proportionate supported action is available under project control, do not require a fork, patch, unsupported override/substitution, or an unjustified framework change merely to remove the signal. A maintained consumer does not prove that its leaf dependencies are maintained. This route is not available to a dependency directly used by the project.
>
> **Hard blockers, all dependency classes.** Reject known malicious packages, known compromised releases, unresolved Critical/High vulnerabilities, known exploitable conditions in our usage regardless of severity, incompatible licenses, integrity/provenance verification failures, dependency confusion or unresolved suspicious sources, unsupported runtime/peer/platform incompatibility, unsupported direct frameworks, and abandonment or privileged lifecycle/build behavior with unacceptable runtime/security impact. Dev-only, optional, or claimed non-reachability does not waive these blockers. Missing optional provenance is an evidence gap, not automatically a verification failure; missing required evidence prevents acceptance. This rule creates no High/Critical risk-acceptance mechanism.
>
> **Evidence and follow-up.** Record package/version and relevant paths, consumer, context/targets, findings and sources, scan dates/results, alternatives, residual risk and controls, owner, reviewer/approval, next review date, and exit/re-evaluation triggers. Dispositions are ACCEPT, ACCEPT WITH TRACKING, or BLOCK. Unresolved required review is not PASS. Reassess on affected version/path/source, support, advisory, direct-use, privilege, or shipping changes and at the recorded deadline. Age monitoring remains mandatory for transitive dependencies without requiring a separate age exception for each leaf. A tracked acceptance must not suppress future findings or authorize unrelated versions/paths.
>
> **Existing controls and approvals.** Preserve committed/frozen lockfiles, exact direct version pins, strict peer/engine validation, the configured new-release maturity floor, full dependency scanning, and reviewed or disabled lifecycle scripts under SE-060 through SE-064. For checkpoint 00-B, the owner's conditional direct-age approvals for `reflect-metadata@0.2.2` and `rxjs@7.8.2` remain subject to their recorded conditions and the complete graph gate; neither is converted into a blanket approval. This policy change does not itself approve any package installation or resume a checkpoint.

## FILES/SYSTEM RULES THAT WOULD NEED UPDATE

**فقط بعد موافقة صريحة على النص والنطاق:**

- `docs/en/00-PROJECT-RULES.md`: استبدال CORE-002 فقط بالنص المعتمد؛ لا إعادة ترقيم، مع سجل تغيير دقيق.
- `docs/ar/00-PROJECT-RULES.md`: ترجمة متزامنة للتعديل نفسه، دون سلطة مختلفة.
- `docs/en/systems/14-security.md` ونسخته العربية: إضافة توضيح موجز بجوار SE-062 أن كل node يُراجع وفق classification في CORE-002، وأن findings تُحسم وتُتبع؛ إبقاء SE-060/061/063/064 كما هي. لا إنشاء سياسة مكررة مستقلة أو allowlist عامة.
- `docs/en/systems/18-infrastructure-cicd.md` ونسخته العربية: توضيح evidence المطلوبة لخطوة dependency scanning في IN-030 عند اعتماد نموذج CI، دون حذف check أو تخفيف بوابة merge. لا يلزم تغيير topology/deployment.
- `IMPLEMENTATION-PLAYBOOK.md`، Supply Chain: reference قصير للسياسة المعتمدة يزيل احتمال قراءة «تجنب المهجورة» كإعفاء أو كرفض آلي غير مصنف. Security Gate للـHigh/Critical لا يتغير.
- `docs/stage-00-technical-decision-report.md`، Approved Decisions #6: reference مؤرخ لقرار السياسة عند اعتماده؛ لا تغيير #3 الخاص بـVitest أو أسماء التقنيات الأخرى.
- `docs/checkpoints/00-b-dependency-review.md`: لاحقًا إضافة reevaluation مؤرخة للحالات المعنية بموجب النسخة الجديدة، دون مسح نتائج 2026-09-30 أو تحويل BLOCKED التاريخية إلى PASS. تقارير التحقيق والإغلاق السابقة تبقى سجلًا تاريخيًا.

لا تعديل مطلوب لـArchitecture Reference أو ADR-001 أو 22-testing لهذه السياسة المحدودة؛ لا framework change، ولا category skip. لا تعدّل أدوات 00-A أو lockfile ضمن خطوة اعتماد الوثائق تلقائيًا.

## ADR REQUIRED

**NO للمقترح المحدود كما صيغ هنا؛ يلزم Owner approval صريح وتحديث الوثائق المتأثرة وPR review، وليس approval للتنفيذ.**

- `CORE-090` / §12: لا تغيير datastore أو tenancy أو rendering/publishing أو core provider أو مبادئ §2. `CORE-016` least privilege باقٍ.
- `14-security §12`: يتطلب ADR عند permanent bypass لأي control في هذا الملف. المقترح **لا يتجاوز** SE-062: كل dependency تبقى مراجَعة؛ يتغير أسلوب التصنيف وdisposition فقط، مع إبقاء SE-061 وسائر الضوابط. لا استثناء دائم من review/scanning/scripts control.
- `18-infrastructure-cicd §9`: لا hosting/CDN/orchestration/environment/deployment change.
- `22-testing §11`: لا تغيير framework أو إسقاط فئة اختبار أو تخفيف متطلبات الاختبارات؛ لا trigger من هذه الجهة.
- `CORE-091`: ADR-001 المعتمد لا يتغير. قالب ADR يشرح طريقة تسجيل قرار يحتاج ADR؛ لا يضيف trigger يجعل كل تعديل Rule ADR تلقائيًا.

**حد هذا الحكم:** لو عُدّل المقترح ليعفي transitive من المراجعة أو يعطل scan/High gate دائمًا، ينطبق `14-security §12`، وعند تغيير framework ينطبق `22-testing §11`. هذا ليس المقترح الحالي، ولا يمكن تسميته classification لتجاوز شرط ADR. والموافقة على سياسة جديدة لا تمنح استثناءً شخصيًا لـestree-walker دون reevaluation.

## UNRESOLVED QUESTIONS

1. هل يعتمد المالك Direct DEFAULT REJECT بعد 18 شهرًا كما أوصي، أم يريد REVIEW-only؟ النص المقترح يستخدم الأول، ولا ينفذ الثاني بصمت.
2. اعتماد owner/reviewer المسؤولين و30/90 يومًا كحدود مراجعة مقترحة، أو بدائل محددة، قبل إنشاء أي قبول فعلي مع tracking.
3. تحديد targets/privileges وproduction artifact exclusion فعليًا عند التنفيذ اللاحق؛ عدم وجود تطبيقات الآن يمنع ادعاء أن شروط الشحن/التوافق اختُبرت.
4. طريقة التحقق العملية من licenses/provenance وبيانات graph في CI تختار داخل checkpoint المناسب بعد مراجعة الأدوات. لا SaaS أو اعتماد جديد هنا. النقص في دليل مطلوب سيظل يمنع acceptance.

لا تحتاج هذه الأسئلة إلى اختيار Node test runner أو Jest، ولا إلى إعادة التحقيق في كل تاريخ Vitest في هذه الخطوة.

## RECOMMENDATION

اعتماد اتجاه Risk-Based محدود: **Direct قوي كما هو، Transitive review حسب المخاطر مع tracking، hard blockers للجميع دون تخفيف**. إبقاء Direct age DEFAULT REJECT وشروط الاستثناء يجعل التعديل مركزًا على المشكلة الفعلية، ويحافظ على Nest approvals بدل إعادة تعريفها.

بعد قرار المالك فقط: تسوية الوثائق المتأثرة، ثم reevaluation للحافة المعروفة والـgraph الكامل بأدلة حديثة، ثم قرار مستقل لاستئناف 00-B. لا أوصي بتغيير Testing Framework في هذه الخطوة، ولا أستنتج أن حل finding estree-walker يثبت قبول كل graph.

## EVIDENCE AND CHANGE BOUNDARY

- الأدلة المحلية: [Project Rules](../en/00-PROJECT-RULES.md)، [Security](../en/systems/14-security.md)، [Infrastructure](../en/systems/18-infrastructure-cicd.md)، [Testing](../en/systems/22-testing.md)، [Playbook](../../IMPLEMENTATION-PLAYBOOK.md)، [Approved Decisions](../stage-00-technical-decision-report.md)، ومراجعتا 00-B المرتبطتان أعلاه.
- refreshed metadata وnpm bulk advisory query بتاريخ `2026-10-01T03:46:22.2196742Z` للأسماء/الإصدارات فقط: Vitest 5.0.2، mocker 5.0.2، estree-walker 3.0.3، reflect-metadata 0.2.2، rxjs 7.8.2، Nest common/core 12.1.1. الاستجابة `{}` تعني لا advisories راجعة لهذا الاستعلام، لا full graph/security PASS. لم تُرسل ملفات المشروع أو credentials.
- لا graph resolution أو install جديد، ولا tarball execution أو compatibility tests. مصادر README قُرئت مجددًا؛ العمر وgraph audits التاريخية محددة بتاريخها وليست قياسات جديدة.
- **الملف الجديد الوحيد المسموح:** هذا التقرير. لا تعديل لملف قائم، ولا ADR أو workflow أو policy tooling. المصطلحات والأرقام والمدد والنص المقترح أعلاه ليست Binding قبل اعتمادها.

**STOP.** CORE-002 الحالية نافذة، و00-B محجوب. ينتظر أي تعديل أو تنفيذ موافقة المالك التالية.
