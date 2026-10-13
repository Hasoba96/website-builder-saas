# 00-B Post-Closure Hydration Verification

Date: 2026-10-01

## Result

**EXTERNAL EXTENSION.** The evidence satisfies the owner's Case A criteria.
The browser's root DOM was modified outside the application before hydration.
The specific extension has not been identified; no extension identity is claimed.
No application source, dependencies, lockfile, or architecture rules were changed.
No hydration suppression or client-side cleanup was added. Checkpoint 00-C was
not started.

## Source Trace

- Searched project source for `rtl-enabled`, `document.documentElement`,
  `document.body`, `classList`, `setAttribute`, root markup, and locale/direction
  handling. Inspected both locale layouts, next-intl request configuration,
  routing, middleware, client error boundaries, and shared locale helpers.
- Both layouts render `<html lang={locale} dir={direction(locale)}>` and an
  unmodified `<body>`. Arabic maps to RTL; English maps to LTR. No application
  code mutates those elements or adds `rtl-enabled`.
- Searched generated application output, including source maps, outside
  dependency directories and development logs: no `rtl-enabled` match.
- The only pre-existing matches were in both `.next/dev/logs/next-development.log`
  files. These are captured **Browser** hydration diagnostics and their **Server**
  forwarding copies, not generated application code. The reported extra
  attributes included `className="rtl-enabled"` and `cz-shortcut-listen="true"`.
- This report and the new negative class assertion now intentionally contain the
  search term; neither can add it to application markup.

## Clean Chromium Evidence

Used the existing Playwright Chromium installation, launched with
`--disable-extensions`, without a persistent profile. Each development-route
check used a fresh browser context. Console error/warning and pageerror listeners
were attached before navigation. Observation continued through network idle and
an additional two-second window for late hydration diagnostics.

| Development route             | HTTP | SSR and browser root            | Console errors/warnings | Page errors |
| ----------------------------- | ---- | ------------------------------- | ----------------------- | ----------- |
| Dashboard `127.0.0.1:3000/ar` | 200  | `lang="ar" dir="rtl"`, no class | 0 / 0                   | 0           |
| Dashboard `127.0.0.1:3000/en` | 200  | `lang="en" dir="ltr"`, no class | 0 / 0                   | 0           |
| Renderer `127.0.0.1:3002/ar`  | 200  | `lang="ar" dir="rtl"`, no class | 0 / 0                   | 0           |
| Renderer `127.0.0.1:3002/en`  | 200  | `lang="en" dir="ltr"`, no class | 0 / 0                   | 0           |

A separate disposable context used an init-script MutationObserver to add
`rtl-enabled` to the root before hydration on Dashboard `/ar`. React emitted
the same attribute-mismatch diagnostic, captured by the console listener.
This control demonstrates that diagnostics were active. The mutation existed
only inside that discarded test context, never in application files.

## Regression Coverage

Added [hydration.spec.ts](../../tests/browser/hydration.spec.ts) to the existing
Playwright suite. Four tests cover both applications and both locales in fresh,
extension-disabled contexts against real production builds on ports 3100/3102.
Each test asserts:

- HTTP 200, expected translated heading, correct root `lang` and `dir`.
- No unexpected `rtl-enabled` root class.
- Zero console errors, zero hydration-related console warnings, zero page errors.
- Diagnostic arrays are attached as JSON even when an assertion fails.

The tests observe actual browser diagnostics; HTTP success or screenshots alone
cannot make them pass. The existing shell suite continues to check responsive
layout, accessibility, screenshots, language switching, and locale independence.

## Verification

Commands were run from the repository root using the existing pinned toolchain.

| Check                    | Command / scope                                                                               | Result                                       |
| ------------------------ | --------------------------------------------------------------------------------------------- | -------------------------------------------- |
| Format                   | Prettier write/check on the new test and this report                                          | PASS                                         |
| Lint                     | ESLint on the new browser test, zero warnings                                                 | PASS                                         |
| Typecheck                | `pnpm exec tsc --noEmit`; both Next builds also typecheck                                     | PASS                                         |
| Unit tests               | `pnpm --filter @website-builder/dashboard-web --filter @website-builder/public-renderer test` | 8 passed                                     |
| Dashboard build          | `pnpm --filter @website-builder/dashboard-web build`                                          | PASS                                         |
| Renderer build           | `pnpm --filter @website-builder/public-renderer build`                                        | PASS                                         |
| Browser tests            | `pnpm test:browser`                                                                           | 15 passed, including 4 hydration regressions |
| Development reproduction | Four clean-context routes listed above                                                        | PASS                                         |

Browser tests produced no hydration failures. The harness emitted Node's
`NO_COLOR` / `FORCE_COLOR` warning outside the browser; this is not a page or
hydration diagnostic.

## Change Review

Only two files were added: this report and the focused browser regression test.
No production code was modified. Manual review checked listener registration
before navigation, error assertions, locale expectations, clean browser context,
diagnostic attachment, and the bounded observation window. No secrets, unsafe
HTML, suppression, dependency additions, or environment exposure were introduced.
Existing historical closure reports remain unchanged.

The lockfile SHA-256 remains:

`30d36d2bcba1384e18066c941b3bb7b879bacfb3242fd3d8259e36f8daeb5fd5`

## Closure

00-B final status: **PASS**. Ready for 00-C: **YES**, subject to the owner's
explicit next instruction. This verification does not begin 00-C or identify
which browser extension performed the external mutation.
