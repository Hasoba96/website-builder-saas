# VITEST RESOLUTION INVESTIGATION REPORT

**تاريخ المراجعة:** 2026-09-30. التحقيق فقط؛ ليس اعتمادًا لـdependency أو تغييرًا لإطار الاختبار أو إغلاقًا لـ00-B.

## RESULT

**NO COMPLIANT VITEST FOUND** ضمن الإصدارات الرسمية المستقرة والمدعومة وقت المراجعة.

السبب الحاسم: جميع manifests المنشورة لسلسلتي Vitest المدعومتين `5.0` و`4.1` تحتوي dependency إلزامية على `@vitest/mocker`، والذي يحتوي `estree-walker: ^3.0.3`. الإصدار المستقر المتاح المطابق هو `3.0.3`، ومشروعه يعلن deprecation صراحةً. هذا يخالف [CORE-002](../en/00-PROJECT-RULES.md) ورفض المالك الصريح. لا تمنح نتيجة audit خالية من الثغرات استثناءً لهذا المنع.

تبقى [حالة 00-B السابقة](00-b-closure-report.md) **BLOCKED**. لا توصية نهائية بتغيير Testing Framework، ولا استئناف للتنفيذ.

## نطاق الأدلة والمنهج

- قرئت القواعد الحالية، [22-testing](../en/systems/22-testing.md)، [Approved Decisions](../stage-00-technical-decision-report.md)، و[Dependency Review السابق](00-b-dependency-review.md). لم تُعدّل.
- تمت قراءة npm registry metadata الرسمية، manifests المنشورة، سياسة الدعم، releases، وGitHub issue/PR search، مع فحص upstream README للمكتبة المرفوضة.
- أُنشئت candidate manifests وlockfiles مؤقتة خارج المستودع فقط. استُخدم Node `24.21.0` وpnpm `10.34.6` الموجودان من 00-A، دون تثبيت أدوات جديدة.
- نُسخت إعدادات `.npmrc` و`pnpm-workspace.yaml` الحالية كما هي إلى كل candidate: strict peers، عدم auto-install للـpeers، ignore scripts، و`minimumReleaseAge: 1440`.
- العمليات الوحيدة على graphs كانت `pnpm install --lockfile-only --ignore-scripts`، ثم `pnpm list --lockfile-only --depth Infinity --json` و`pnpm audit --json`. لم تُنزّل حزم تنفيذية، ولم تُشغّل lifecycle scripts. لا `node_modules` في أي candidate directory.
- عولجت aliases وفق `from` الفعلي في graph، لا باسم alias. مراجعة registry النهائية لا تحتوي missing package metadata.
- نتائج التوافق أدناه تميز بين توافق engines/peers المعلن وبين runtime compatibility غير المختبر. لم تُنفذ اختبارات Nest/Next أو اختبارات تطبيقات، ولم تُثبت dependencies في المشروع.

## VERSIONS INVESTIGATED

[سياسة Vitest الرسمية](https://vitest.dev/releases) تحدد `5.0` للإصلاحات المعتادة و`4.1` للـimportant/security backports. ما قبلهما غير مدعوم؛ وجود dist-tag مثل `V3` ليس سياسة دعم.

### المرشحون الفعليون

| البند                               | Vitest 5.0.3                                             | Vitest 5.0.2                                       | Vitest 4.1.11                                  |
| ----------------------------------- | -------------------------------------------------------- | -------------------------------------------------- | ---------------------------------------------- |
| تاريخ npm publish، UTC              | 2026-09-30 11:30:42                                      | 2026-09-25 09:00:46                                | 2026-08-18 14:27:07                            |
| حالة الدعم                          | أحدث stable؛ فرع الإصلاحات الحالي                        | patch سابق في الفرع الحالي؛ فُحص بسبب حاجز 24 ساعة | أحدث stable في فرع backports المدعوم           |
| Node engine                         | `^22.12.0 \|\| ^24.0.0 \|\| >=26.0.0`                    | نفس النطاق                                         | `^20.0.0 \|\| ^22.0.0 \|\| >=24.0.0`           |
| Node 24.21.0                        | يطابق engine                                             | يطابق engine                                       | يطابق engine                                   |
| Vite peer                           | `^6.4.0 \|\| ^7.0.0 \|\| ^8.0.0`                         | نفس النطاق                                         | `^6.0.0 \|\| ^7.0.0 \|\| ^8.0.0`               |
| Vite المختار للتحقيق                | `8.3.1` يطابق النطاق                                     | `8.3.1`؛ resolution ناجح                           | `8.3.1`؛ resolution ناجح                       |
| TypeScript 6.0.3                    | لا TypeScript peer range يمنعه؛ لا إثبات compile/runtime | نفس القيد                                          | نفس القيد                                      |
| `@vitest/mocker`                    | `5.0.3` إلزامي                                           | `5.0.2` إلزامي                                     | `4.1.11` إلزامي                                |
| `estree-walker`                     | manifest يفرض `^3.0.3`                                   | graph يحل `3.0.3`                                  | graph يحل `3.0.3`                              |
| registry deprecation flags في graph | غير مكتمل، resolution مرفوض                              | صفر؛ upstream deprecation مثبت لـestree-walker     | صفر؛ upstream deprecation مثبت لـestree-walker |
| High / Critical عبر audit           | N/A: لا graph مكتمل                                      | `0 / 0`                                            | `0 / 0`                                        |
| CORE-002 age review                 | غير مكتمل؛ يوجد مانع قطعي مسبقًا                         | 7 package/version entries تحتاج مراجعة عمر         | 10 entries تحتاج مراجعة عمر                    |
| الحكم                               | مرفوض                                                    | مرفوض                                              | مرفوض                                          |

`5.0.3` رُفض أيضًا بواسطة pnpm برسالة `ERR_PNPM_NO_MATURE_MATCHING_VERSION`: نُشر قبل نحو 9 ساعات وقت resolution. لم يُضف `minimumReleaseAgeExclude` ولم يُخفّض الحاجز. انقضاء 24 ساعة لن يزيل dependency المرفوضة.

غياب TypeScript peer restriction ليس شهادة توافق مع TypeScript `6.0.3` أو Nest decorator metadata. لو زال blocker لاحقًا، يلزم typecheck واختبار compilation الفعلي قبل القبول. Vitest يصرح بإمكان تغييرات types بين minor releases؛ لذلك لا يكفي أن package manager يقبل graph.

المصادر: [registry Vitest](https://registry.npmjs.org/vitest)، [registry mocker](https://registry.npmjs.org/@vitest%2fmocker)، [5.0.3 release](https://github.com/vitest-dev/vitest/releases/tag/v5.0.3)، [5.0.2 release](https://github.com/vitest-dev/vitest/releases/tag/v5.0.2)، [4.1.11 release](https://github.com/vitest-dev/vitest/releases/tag/v4.1.11).

### حدود الرجوع للخلف

فحص manifest للمجالين `5.0.0` إلى `5.0.3` و`4.1.0` إلى `4.1.11` أظهر الحافة الإلزامية نفسها في الإصدارات الـ16. لم تُنشأ graphs كاملة لكل patch قديم؛ لا فائدة من downgrade يشترك في المانع نفسه. لم تُقترح prereleases أو إصدارات غير مدعومة.

## UPSTREAM STATUS

**التصنيف: D، لا يوجد مسار upstream واضح مثبت في المصادر المفحوصة حاليًا.** هذا وصف لنتيجة البحث، وليس ادعاءً بمعرفة كل عمل غير منشور أو كل تعليق غير مفهرس.

- **A، إزالة في stable رسمي:** لا. manifests المنشورة لجميع patches في الفرعين المدعومين ما زالت تعتمد على الحزمة.
- **B، fix merged لم يصدر stable:** لم يُعثر على دليل. [main mocker manifest](https://github.com/vitest-dev/vitest/blob/main/packages/mocker/package.json) المقروء مباشرةً ما زال يحتوي الحزمة، وversion فيه `5.0.3`.
- **C، issue/PR مفتوحة للاستبدال:** لم تُعثر عليها في البحث المحدد أدناه. [Dependency Dashboard #957](https://github.com/vitest-dev/vitest/issues/957) مفتوح، لكنه جرد dependencies وليس قرارًا لاستبدالها.
- نتائج GitHub search الرسمية لـ`repo:vitest-dev/vitest estree-walker`: أربع نتائج، `incomplete_results: false`: #957 و#3726 و#1528 و#1556. البحث عن `repo:vitest-dev/vitest zimmerframe`: صفر نتائج، `incomplete_results: false`.
- [PR #3726](https://github.com/vitest-dev/vitest/pull/3726) merged في 2023-07-11، يتعلق بعدم inline لبعض dependencies في browser، وليس إزالة estree-walker. #1556 تحديث dependencies عام merged في 2022-07-16؛ #1528 متعلق بامتدادات config.
- تمت مراجعة release notes للمرشحين الثلاثة بوصفها changelog الرسمي المرتبط بسياسة releases. لا إزالة للمكتبة فيها. `5.0.3` يتضمن تعديل pin لـ`why-is-node-running` بسبب `ERR_PNPM_TRUST_DOWNGRADE`، وليس حلًا لمشكلتنا؛ هذا سبب إضافي لعدم اعتبار audit وحده supply-chain approval.
- GitHub releases API أعاد rate-limit `403`؛ استُخدمت صفحات releases الرسمية المقروءة بنجاح بدلًا منه. محاولتا مساري `CHANGELOG.md` في root و`packages/vitest` أعادتا `404`؛ لا نعتبر ذلك غيابًا لـrelease history.

## @vitest/mocker STATUS

`@vitest/mocker` وارد تحت `dependencies` في Vitest، وليس optional dependency أو optional peer. نوع environment، تعطيل browser mode، وعدم استخدام `vi.mock` لا يغير dependencies المنشورة التي يحلها pnpm.

الـminimal graphs المختبرة لا تتضمن UI أو browser provider أو DOM environment أو coverage plugin؛ ومع ذلك احتوت mocker وestree-walker. لا يوجد official supported minimal installation مثبت يتجاوزهما ويظل Vitest runner. استيراد subpath مثل `vitest/node` لا يغير package graph. تصدير توزيع مخصص ليس خيارًا.

```text
vitest@5.0.3 dependencies["@vitest/mocker"] = "5.0.3"
@vitest/mocker@5.0.3 dependencies["estree-walker"] = "^3.0.3"

vitest@5.0.2 / @vitest/mocker@5.0.2 / estree-walker@3.0.3
vitest@4.1.11 / @vitest/mocker@4.1.11 / estree-walker@3.0.3
```

المصدر: [Vitest manifest](https://github.com/vitest-dev/vitest/blob/v5.0.3/packages/vitest/package.json)، [mocker manifest](https://github.com/vitest-dev/vitest/blob/v5.0.3/packages/mocker/package.json)، وgraphs المعزولة.

## estree-walker STATUS

آخر stable هو `3.0.3` بتاريخ 2023-01-20، بترخيص MIT. npm metadata لا تحمل deprecated flag، لكن [upstream README](https://github.com/Rich-Harris/estree-walker) يقول: **“This package is deprecated. Use zimmerframe instead”**.

إذًا هو مرفوض بسبب deprecation الصريح، وليس بسبب العمر فقط. [zimmerframe](https://github.com/sveltejs/zimmerframe) بديل يقترحه مؤلف المكتبة، وليس إذنًا لاستبداله داخل Vitest خارج إصدارات upstream الرسمية.

## SECURITY

| Graph metadata-only                              | Unique package/version entries | pnpm audit totalDependencies | Info / Low / Moderate / High / Critical |
| ------------------------------------------------ | ------------------------------ | ---------------------------- | --------------------------------------- |
| Vitest 5.0.2 + Vite 8.3.1 + @types/node 24.19.0  | 62                             | 63                           | 0 / 0 / 0 / 0 / 0                       |
| Vitest 4.1.11 + Vite 8.3.1 + @types/node 24.19.0 | 71                             | 72                           | 0 / 0 / 0 / 0 / 0                       |
| Jest 30.5.2 + @types/node 24.19.0                | 310                            | 305                          | 0 / 0 / 0 / 0 / 0                       |

هذه أعداد بمقياسين مختلفين: traversal للـgraph بعد توحيد aliases، مقابل الحقل الذي يعيده audit. لا تُستخدم كأرقام قابلة للمقارنة مباشرة. metadata inventory يتضمن optional/platform entries الظاهرة في graph، لا Windows runtime فقط.

الفحص نقطة زمنية ضد advisories المتاحة عبر pnpm/npm، وليس إثبات عدم وجود vulnerabilities أو packages مهجورة أو شيفرة خبيثة. لم تُستخدم suppressions. الـgraph الكامل للتطبيقات الأربعة لم يُعَد بناؤه، ونتائج runner graphs ليست قبولًا له.

Vitest graphs: لا npm deprecation flags إضافية؛ إثبات upstream لـestree-walker كافٍ للرفض. لم تُمنح بقية dependencies شهادة خلو من upstream-only deprecation/EOL؛ مراجعة قبولها الكاملة غير مستكملة بعد مانع قطعي.

Jest graph: [glob@10.5.0](https://registry.npmjs.org/glob/10.5.0) يحمل إعلانًا صريحًا بأن الإصدارات القديمة غير مدعومة، مع تحذير أمني عام. لا نمحو التحذير لأن audit رجع صفرًا، ولا نخترع CVE أو severity محددة من النص العام وحده. المانع هنا مثبت حتى دون advisory مطابق في audit.

### License review

- Vitest نفسه وmocker وestree-walker: MIT. graph يحتوي MIT، ISC، Apache-2.0، BSD-3-Clause، وMPL-2.0؛ الأخير في tooling الخاص بـVite/lightningcss، مع التزامات license notices وfile-level copyleft عند انطباق التوزيع. لا يُشحن runner ضمن تطبيق العميل المقترح.
- Jest نفسه: MIT. graph يحتوي أيضًا ISC، Apache-2.0، BSD-2-Clause، BSD-3-Clause، 0BSD، BlueOak-1.0.0، CC-BY-4.0، و`MIT OR CC0-1.0`. توجد التزامات attribution تستلزم مراجعة قبل التوزيع. لم يظهر حقل license مفقود بعد حل aliases؛ لم تُراجع tarball license files، لذلك لا يوجد legal/distribution PASS شامل.
- Node runner لا يضيف npm package؛ يظل ضمن Node المعتمد وترخيصه وإشعارات third-party المضمنة. لا تعني هذه المراجعة إعفاء runtime من تحديثات الأمن.

## CORE-002

قاعدة العمر لم تتغير. cutoff المستخدم للمراجعة هو 2025-03-30؛ الحساب بحسب أحدث stable للمكتبة، لا عمر النسخة المحددة وحده. flags التالية تعني **review required، غير مقبولة تلقائيًا**:

| Package                 | نسخة graph 5.0.2 | نسخة graph 4.1.11 | تاريخ أحدث stable                        |
| ----------------------- | ---------------- | ----------------- | ---------------------------------------- |
| fsevents                | 2.3.3            | 2.3.3             | 2023-08-21                               |
| picocolors              | 1.1.1            | 1.1.1             | 2024-10-16                               |
| why-is-node-running     | 3.2.2            | 2.3.0             | 2025-01-08، أحدث stable هو 3.2.2         |
| @types/deep-eql         | 4.0.2            | 4.0.2             | 2023-11-07                               |
| assertion-error         | 2.0.1            | 2.0.1             | 2023-10-18                               |
| @jridgewell/resolve-uri | 3.1.2            | غير موجود         | 2024-02-14                               |
| estree-walker           | 3.0.3            | 3.0.3             | 2023-01-20؛ مرفوض أيضًا بسبب deprecation |
| pathe                   | غير flagged      | 2.0.3             | 2025-02-11                               |
| siginfo                 | غير موجود        | 2.0.0             | 2020-06-16                               |
| stackback               | غير موجود        | 0.0.2             | 2012-10-20                               |
| convert-source-map      | غير موجود        | 2.0.0             | 2022-10-17                               |

Jest graph يحتوي 94 package/version entries تحتاج age review، منها `import-local@3.2.0` و`graceful-fs@4.2.11` و`node-int64@0.4.0` و`esprima@4.0.1`. هذا ليس حكم abandonment على هذه الأسماء، وليس 94 طلب استثناء معتمدًا. بعض الحزم مشتركة مع tooling قائم؛ العدد inventory إجمالي وليس net-new dependency count للمشروع. يتضمن graph كذلك `gensync@1.0.0-beta.2` كـupstream transitive؛ لم يتم اختياره كحل ولا اعتباره baseline مقبولًا.

لا استثناء جديد مستخدم، ولا موافقة ضمنية على أي age flag. رفض estree-walker وglob لا يحتاج انتظار استكمال باقي المراجعات. الاستثناءان السابقان الخاصان بـNest لا ينتقلان إلى runner dependencies.

## WORKAROUNDS REJECTED

لم تُستخدم overrides أو patch-package أو fork أو تعديل node_modules أو custom Vitest distribution. لا suppression، ولا تجاهل deprecation، ولا `--force`، ولا `--legacy-peer-deps`، ولا تعطيل strict peers، ولا إزالة age floor، ولا prerelease/RC/nightly baseline. لم تُغيّر CORE-002 أو Approved Stack.

## TEST FRAMEWORK DECISION REPORT

هذه مقارنة خيارات، وليست قرارًا أو توصية نهائية. Vitest يبقى الاختيار المسجل حتى يعتمد المالك تغييرًا وفق ADR. Jest المقارن هو أحدث stable وقت البحث: `30.5.2`، منشور 2026-09-18، MIT، وNode engine يشمل `>=24.0.0`. Vite ليس dependency مطلوبًا لـJest أو Node runner.

| محور القرار                    | Vitest الحالي                                                          | Node.js built-in runner على 24.21.0                                                                                   | Jest 30.5.2                                                                                        |
| ------------------------------ | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| 1. Fit with NestJS             | متوافق مفاهيميًا مع @nestjs/testing؛ يلزم حل compilation/metadata صحيح | @nestjs/testing غير مرتبط بـrunner؛ يمكن compile بـtsc ثم استخدام Test.createTestingModule                            | قابل للاستخدام مع @nestjs/testing؛ يلزم compilation يحفظ decorator metadata                        |
| 2. Fit with Next.js            | له دليل رسمي؛ ليس runtime لـasync Server Components                    | لا Next transformer/DOM environment مدمج؛ pure modules وHTTP/process tests ممكنة، browser surfaces عبر Playwright     | next/jest يوفر مسارًا رسميًا؛ async Server Components تحتاج E2E                                    |
| 3. TypeScript                  | transformation لا يعوض tsc strict؛ TS 6.0.3 لم يختبر فعليًا            | native stripping لا يدعم decorators/TSX أو tsconfig paths؛ compile مسبق بـtsc، وtypecheck مستقل                       | Babel لا يعمل typecheck؛ tsc قبل الاختبار أو next/jest عند انطباقه؛ لا نفترض توافق ts-jest مع TS 6 |
| 4. ESM                         | ملائم لـVite/ESM، مع semantics التحويل الخاصة به                       | ESM أصلي في Node؛ imports يجب أن تكون قابلة للحل بعد emit                                                             | ESM موثق كـexperimental وله flags وقيود mocks                                                      |
| 5. Mocking                     | spies، timers، module mocks متكاملة؛ mocker إلزامي                     | functions/methods/timers؛ module mocks تجريبية؛ provider overrides مناسبة لـNest دون mock runtime مخصص                | functions/timers وCJS mocks ناضجة؛ ESM mock API لها قيود                                           |
| 6. Unit tests                  | مناسب، لكنه ممنوع بهذا graph                                           | مناسب للمنطق النقي والمكتبات Node؛ ليس DOM runner جاهزًا                                                              | مناسب، لكنه ممنوع بهذا graph                                                                       |
| 7. Integration tests           | async hooks واختبارات موارد حقيقية                                     | async tests وhooks/cleanup؛ يختبر DB/queues لاحقًا مع الموارد الحقيقية، لا mock DB                                    | مناسب؛ الموارد الحقيقية لا تزال مطلوبة                                                             |
| 8. Package-boundary tests      | يشغل assertions وnegative fixtures                                     | يشغل assertions وnegative import/lint subprocess fixtures                                                             | يشغل assertions وnegative fixtures                                                                 |
| 9. Performance                 | parallelism وwatch؛ لا benchmark محلي                                  | لا Vite transform server؛ تكلفة compilation/process isolation تُقاس لاحقًا                                            | workers/cache؛ لا benchmark محلي ولا حكم أبطأ/أسرع غير مقاس                                        |
| 10. Maintenance                | 5.0 current، 4.1 backports                                             | lifecycle يتبع Node 24 LTS المعتمد                                                                                    | إصدار stable حديث ونشاط releases؛ لا ادعاء LTS لكل major قديم                                      |
| 11. Dependency graph quality   | minimal graph 62 أو 71 entries، مع blocker إلزامي                      | صفر npm runner dependencies جديدة؛ لا يمحو dependencies التطبيقات وPlaywright                                         | 310 entries في المقارنة الأساسية قبل DOM/TS adapters؛ عبء مراجعة أكبر                              |
| 12. Deprecated/EOL             | estree-walker upstream-deprecated                                      | لا package npm جديدة من runner؛ ليس ضمانًا لكل npm graph أو لكل component داخل Node                                   | glob@10.5.0 معلن deprecated/unsupported                                                            |
| 13. High/Critical advisories   | 0/0 في graph 5.0.2 و4.1.11؛ 5.0.3 غير مكتمل                            | لا npm runner audit ينطبق؛ راجعت Node security releases، دون ادعاء scan شامل للـbinary                                | 0/0 عبر audit، مع تحذير glob العام الذي لا يجوز تجاهله                                             |
| 14. Operational complexity     | Vite config وtransforms ونسخ plugins                                   | compile ثم test، reports وcoverage يحتاجان قرارًا؛ لا framework مخصص                                                  | transform/resolution config وتوافق ESM، إضافة إلى graph review                                     |
| 15. Lock-in                    | vi/expect/config وVite plugins                                         | node:test/node:assert، ارتباط أقل بطرف ثالث لكن واجهات مختلفة                                                         | jest/expect/config وsnapshots؛ ارتباط بواجهات Jest                                                 |
| 16. Migration/maintenance cost | انتظار upstream ثم إعادة graph review                                  | لا application tests موجودة لترحيلها؛ تغيير القرار والـscripts والتوثيق مطلوب، وتجربة تكامل لاحقة                     | لا tests قديمة لترحيلها؛ تكلفة graph أكبر دون إزالة المانع الحالي                                  |
| 17. Playwright strategy        | يبقى runner منفصلًا للمتصفح؛ لا يلزم Vitest browser provider           | Playwright محدود للشاشتين وAR/EN/RTL/LTR/a11y؛ لا تحويل كل unit logic إلى E2E                                         | Playwright يبقى مكمّلًا منفصلًا، لا بديلًا عن unit/integration                                     |
| 18. 22-testing compliance      | قدرات مناسبة لكن CORE-002 يمنع الاستخدام                               | قادر مبدئيًا على الفئات المنطبقة مع Playwright؛ TS-063 coverage وCI/reporting يجب إثباتها، وتغيير framework يتطلب ADR | قدرات مناسبة لكن graph الحالي مرفوض؛ تغيير framework يتطلب ADR أيضًا                               |

المصادر الداعمة للمقارنة: [Nest testing](https://docs.nestjs.com/fundamentals/testing)، [Next Vitest](https://nextjs.org/docs/app/guides/testing/vitest)، [Next Jest](https://nextjs.org/docs/app/guides/testing/jest)، [Node 24.21 test runner](https://nodejs.org/download/release/v24.21.0/docs/api/test.html)، [Node TypeScript](https://nodejs.org/download/release/v24.21.0/docs/api/typescript.html)، [Node ESM](https://nodejs.org/download/release/v24.21.0/docs/api/esm.html)، [Jest ESM](https://jestjs.io/docs/ecmascript-modules)، [Jest TypeScript setup](https://jestjs.io/docs/getting-started#using-typescript)، [Jest registry](https://registry.npmjs.org/jest).

### Node runner: حدود القابلية الفعلية

`@nestjs/testing@12.1.1` لا يفرض Vitest أو Jest كـdependency/peer؛ فُحص manifest الرسمي. لذلك لا يوجد مانع graph من هذه الجهة. compilation بـTypeScript الموجود ليس كتابة test framework؛ أما اختراع mocking/DOM/coverage engine فليس مسارًا مقبولًا.

`node:test` نفسه stable. `mock.module` يحتاج `--experimental-test-module-mocks`، والـbuilt-in coverage يحتاج `--experimental-test-coverage`؛ لا يصح وصف كل قدراته بأنها stable لمجرد استقرار runner. اختيار reporting/coverage واستيفاء `TS-063` يجب توثيقه وإثباته قبل اعتماده الكامل؛ أي أداة إضافية لها مراجعة dependencies مستقلة. لا يُقترح استعمال module mocking التجريبي لحل متطلب غير موجود في 00-B.

Node `24.21.0` هو runtime المعتمد وLatest LTS في المصادر المقروءة. أحدث [security bulletin](https://nodejs.org/en/blog/vulnerability/july-2026-security-releases) ظاهر في الفهرس أصلح ثغرات حتى High في `24.18.1`؛ النسخة المعتمدة لاحقة له. لم يظهر في الفهرس تنبيه أحدث يجعل `24.21.0` مصابًا بثغرة High/Critical غير محلولة. هذه مراجعة bulletin، وليست binary vulnerability scan أو إثباتًا ضد ثغرات غير منشورة.

### Jest: الحافة المرفوضة

```text
jest@30.5.2
  @jest/core@30.5.2
    @jest/reporters@30.5.2
      @jest/transform@30.5.2
        babel-plugin-istanbul@8.0.0
          test-exclude@7.0.2
            glob@10.5.0
```

هذه dependency مثبتة بالـgraph حتى دون إضافة ts-jest أو jsdom. تعطيل coverage وقت التشغيل لا يزيل dependency من manifests. لم يُستخدم override لاستبدال glob، ولم تُحلل كل إصدارات Jest التاريخية أو تُعلن كلها مرفوضة؛ الحكم خاص بالمرشح المقاس.

### COMPLIANT OPTIONS

- **لا خيار بديل حاصل على اعتماد كامل للتنفيذ الآن.** Node built-in runner هو خيار قابل للنظر من ناحية عدم إضافة npm runner graph، مع توافق وظيفي مبدئي للنطاق الحالي. يظل مشروطًا بقرار المالك وADR وإثبات compilation/coverage والتكامل لاحقًا. ليس PASS للـ00-B أو لكل منظومة الاختبارات المستقبلية.
- انتظار إصدار Vitest stable مدعوم يزيل الحافة المرفوضة ثم إعادة مراجعة graph كاملًا يحافظ على القرار الحالي، لكنه لا يتيح التنفيذ الآن ولا توجد له مهلة upstream مثبتة.

### NON-COMPLIANT OPTIONS

- Vitest `5.0.3` و`5.0.2` و`4.1.11`؛ بقية patches المدعومة تشترك في estree-walker نفسه.
- Vitest الأقدم من الفروع المدعومة؛ الدعم مفقود، دون حاجة إلى downgrade تجريبي.
- Jest `30.5.2` بالـgraph المقاس بسبب glob deprecated، بصرف النظر عن صفر audit findings.
- أي workaround مرفوض أو prerelease baseline لإخفاء المشكلة.

### TRADEOFFS

الإبقاء على Vitest يحافظ على واجهات الاختبار المعتمدة لكنه ينتظر upstream غير محدد الموعد. Node runner يقلل graph الخاص بالـrunner، لكنه ينقل بعض العمل إلى compilation/reporting واضحين، ولا يوفر تكامل DOM/Next مماثلًا جاهزًا. Jest غني بالميزات، لكنه لم يزل مشكلة policy في المرشح الحالي. لا سبب تقني قوي هنا لإضافة بديل رابع قبل حسم هذه الخيارات.

### ADR REQUIRED

**YES لتغيير core testing framework:** الشرط الصريح في [22-testing §11](../en/systems/22-testing.md#11-what-requires-an-adr)، وليس ادعاء أن اختيار أي Library يحقق `CORE-090` تلقائيًا. يلزم Owner Decision ثم ADR معتمد قبل كود يعتمد التغيير. لا ADR مطلوب لهذا التحقيق أو لتحديث patch ضمن Vitest إن أصبح compliant دون تغيير architecture. لا تعديل لـADR-001، ولا اعتماد ADR جديد في هذه الخطوة.

## GOVERNANCE OBSERVATIONS

1. توجد صعوبة عملية مثبتة في مرشحين كبيرين: Vitest وJest كلاهما يحمل dependency غير مقبولة رغم استمرار صيانة framework نفسه. لا يكفي الاعتماد على npm deprecated flag أو audit؛ estree-walker يوضح فرق upstream status عن registry metadata.
2. فحص العمر عبر graph يفتح 7/10 entries في Vitest و94 في Jest للمراجعة الفردية، بعضها أدوات صغيرة أو optional/platform packages. هذا عبء حوكمة قابل للقياس، لا دليل أن كل مكتبة قديمة مهجورة أو غير مؤثرة. dev tooling نفسه يعمل بصلاحيات CI والمطور.
3. لا نستنتج من مرشحين أن كل ecosystem غير عملي، ولا نعدل القاعدة. يمكن للمالك مراجعة تعريف نطاق graph والأدلة المطلوبة وتكرار المراجعة كموضوع منفصل؛ هذا التقرير لا يمنح استثناء deprecation ولا يقترح تجاوز المنع.
4. اختيار Node runner لمجرد تقليل dependencies غير كافٍ؛ ملاءمة Nest/Next، اختبار tenant isolation لاحقًا، وcoverage/reporting تبقى متطلبات. لا test framework مخصص، ولا fork، ولا abstraction بديلة.

## EVIDENCE

الأدلة الخام بقيت في مجلد التحقيق المؤقت خارج المستودع. هذا التقرير يحفظ القرارات والأرقام والحواف الحاسمة والمصادر دون إدخال machine-specific paths إلى ملف مشترك.

- `registry.json`: manifests وrelease times لـVitest/mocker/Jest/Vite/estree-walker/zimmerframe.
- `candidates.json`: فحص الحافة الإلزامية للإصدارات الـ16 في الفرعين المدعومين.
- `upstream.json`: نتائج issue/PR search، main manifests، README، وأخطاء الوصول المسجلة صراحةً.
- لكل candidate مكتمل: `pnpm-lock.yaml`، `graph.json`، `audit.json`، `metadata-review.json`، و`resolution.txt`.
- `graph-metadata.json`: licenses وage-review entries وregistry deprecation flags، دون alias lookup gaps.
- candidate `5.0.3`: `resolution.txt` يسجل رفض maturity floor؛ لا audit PASS مصطنع.
- `workspace-before.json` و`git-status-before.txt`: baseline للتحقق من عدم تعديل الملفات الموجودة.

### Lockfile SHA-256

```text
Vitest 5.0.2: cf8394f9cd0e7c977ae4e19824a9771b621a8e7ecf9eae9ff582b8b4fb3a03ef
Vitest 4.1.11: a461aa6a41206cfd369a015a45f658251607bdd0a5ae507706c2cf27f8e991eb
Jest 30.5.2: 0df862bbe68dd1794a8ee750d1cea3962cad2153f8b7ac2e43e987690722cbb7
Real workspace: 9207c172b2ec3c5ecef4e7af95516a863c5c11260ed94594fd8b7a76016918b6
```

لإعادة التحقيق بعد اعتماد مناسب: أنشئ مجلدًا معزولًا خارج المشروع، استخدم pins المبينة أعلاه وإعدادات pnpm الحالية دون تعديل، ثم أوامر metadata-only المذكورة. النتائج مستقبلًا قد تختلف بسبب advisories/metadata؛ الـhash يحدد snapshot الذي قيس هنا، لا وعدًا بأن resolution جديد سيطابقه بعد تغير registry.

## FILES MODIFIED

لا ملف قائم عُدّل. أُنشئ هذا التقرير فقط داخل `docs/checkpoints` وفق الاستثناء المسموح. لم تُعدّل Rules أو ADRs أو Playbook أو Approved Decisions أو تقارير الإغلاق السابقة.

## REAL WORKSPACE CHANGES

**NONE في application code أو configuration أو manifests أو lockfile أو installed dependencies.** الاستثناء الوثائقي الوحيد هو هذا التقرير الجديد. لا install في الـreal workspace، ولا apps/packages/infra جديدة، ولا تنفيذ لـ00-B أو 00-C.

**STOP:** ينتظر المشروع قرار المالك. لا استئناف 00-B ولا اختيار Framework أو تعديل CORE-002 ضمنيًا.
