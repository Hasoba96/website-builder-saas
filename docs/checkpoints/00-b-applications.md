# Checkpoint 00-B: Application Skeletons

This guide supersedes the empty-workspace command applicability in [00-A](00-a-toolchain.md). The [Project Rules](../en/00-PROJECT-RULES.md), [approved decisions](../stage-00-technical-decision-report.md), and [dependency review](00-b-dependency-review.md) remain authoritative. No product or domain behavior is implemented.

## Prerequisites and first run

- Node.js **24.21.0**, pnpm **10.34.6**, Git, and the Gitleaks version/setup recorded in 00-A.
- Network access to the official npm registry and Playwright browser distribution on initial setup.
- No database, Redis, cloud account, credentials, Docker, or application environment file is required in 00-B. Typed runtime configuration is checkpoint 00-C.

```sh
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
pnpm build
pnpm dev
```

Dashboard: http://127.0.0.1:3000/ar and /en. Public Renderer: http://127.0.0.1:3002/ar and /en. Both default to Arabic, with independent message catalogs and UI files. These are foundation-state screens, not product screens.

API binds an OS-assigned loopback port and reports the address on startup; it has no controllers or operational probes yet. Worker is a queue-free Nest application context kept alive until shutdown. Its idle timer performs no job. No runtime configuration contract is implied by these temporary bootstrap defaults.

Stop foreground processes with Ctrl+C. API and worker handle SIGINT/SIGTERM, close Nest resources, and enforce a 10-second shutdown deadline. Tests use Node's parent-only IPC channel for graceful shutdown on Windows as well as POSIX, with stdin disabled; no network control endpoint exists. With the portable Windows pnpm.cmd shim, Turbo can leave batch-shell confirmation prompts after the application processes close. Press Ctrl+C a second time to finish Turbo shell cleanup. Application exit-code-zero is separately tested through IPC; the second press is not claimed as graceful shell termination.

## Commands

```sh
pnpm format:check
pnpm lint
pnpm typecheck
pnpm workspace:check
pnpm build
pnpm test
pnpm security:dependencies
pnpm security:secrets
```

- Build executes the four applications and the shared config package, not an empty task graph.
- Test builds its prerequisites, runs each package's real tests, root architecture/process tests, then eleven Chromium shell checks. Browser tests own ports 3100/3102 and refuse to reuse an existing server.
- Typecheck includes source, tests, and configuration with strict checks and skipLibCheck disabled. Next typegen refreshes canonical production route types before checking; stale generated .next/dev types are excluded to avoid duplicate development/production declarations. Application source is not excluded.
- Lint also enforces application boundaries, shared public exports, and local import-cycle checks.
- Secret scanning includes tracked files even when ignored, plus untracked Git-eligible files. Local Next-generated server keys remain in ignored build artifacts; no secret baseline or new Gitleaks allowlist was added.
- `pnpm --filter @website-builder/api build` (and worker, dashboard-web, public-renderer) runs an individual application build after the shared config package has been built.
- `pnpm --filter @website-builder/dashboard-web start` and the public-renderer equivalent run real production Next servers after build. Container packaging and deployment are later checkpoints.

Backend dev commands compile once and launch. Restart after a source edit. Next dev provides its native hot reload. Shared config changes require its build again. Automatic backend restart orchestration is not added.

Build/check task concurrency defaults to two to limit local memory pressure; an explicit Turbo --concurrency option overrides it. Persistent dev tasks retain Turbo's normal concurrency. Stop development servers before the full verification sequence on a memory-constrained machine. These are toolchain limits, not production sizing or application environment configuration.

## Test and boundary scope

The only shared package is config: strict TypeScript presets plus the actual AR/EN locale/direction contract. App UI and translations stay independent. No schema/type/site-section/dashboard-UI/testing/observability package is fabricated.

Vitest covers Nest module initialization, real listener startup and closure, no business route at the API root, safe loading/error output, translation key parity, locale primitives, cross-app negative checks including path aliases, and compiled process shutdown.

Playwright covers two apps, two locales and 390px/1440px viewports, independent language selection, language switching by keyboard, skip links, no horizontal overflow, axe checks, and eight screenshot comparisons. Each viewport also exercises more than 50% longer text with Arabic, English and numerals in the actual shell layout; stress screenshots are test attachments, not product content. Windows Chromium baselines are committed as evidence; other OS/browser baselines are not claimed verified. Review new platform baselines visually before accepting them; do not update screenshots to hide regressions.

Missing translation keys fail strict compilation through shared catalog shape checks and next-intl message typing. No fake data-empty screen, forbidden-resource screen or fake tenant test is added: those surfaces do not exist. Cross-tenant tests remain N/A under [ADR-001](../adr/ADR-001-stage-00-cross-tenant-test-applicability.md).

## Troubleshooting

- Use the exact pinned toolchain. Never force peer resolution or enable arbitrary dependency install scripts.
- A busy app/test port is an error. Stop its owner or pass another port to the existing Next launcher for manual development; do not silently attach tests to another server.
- SWC verifies native payloads and directory ownership. On a Windows machine with permissive ACLs in its default user cache, it can reject materialization with ERR_SWC_NATIVE_CACHE. Use its documented SWC_NATIVE_BINDING_CACHE setting pointing to a private, user-owned absolute directory whose ancestors also have safe permissions. Turbo passes only this named tool setting through. No machine-specific path is stored in project configuration; do not disable integrity checks, patch node_modules, or broaden directory privileges. The tested machine used a newly created private directory under the user's profile, without changing existing cache ACLs. See the [official carrier guide](https://github.com/swc-project/swc/blob/main/docs/native-addon-carriers.md).
- Native dependencies use reviewed prebuilt platform packages with lifecycle scripts still disabled. A missing compatible binary is a review issue, not permission to enable all scripts.
- Next/Turbo telemetry is disabled by the project launchers. No Sentry transmission or other diagnostics exporter is configured.
- Next's documented agentRules setting is false, so development startup does not generate or modify repository agent instruction files. The bundled version-matched framework docs remain available for technical reference; project governance remains authoritative.
- Keep .next, dist, node_modules, screenshots generated under test-results, and local evidence out of Git. Checked-in visual baselines live only under tests/browser.

No 00-C configuration, DB, queue, probes, production security platform, containers, CI workflow, recovery infrastructure, or Stage 01 implementation is included.
