# Checkpoint 00-A: Repository and Toolchain

## Scope and readiness

Owner: engineering platform / infra. This checkpoint implements the root pnpm/Turborepo workspace, strict TypeScript and lint/format configuration, reproducible installation, and local supply-chain/secret checks only. There are no applications, domain contracts, tenant resources, authentication, environment secrets, databases, migrations, queues, containers, or CI workflows.

The root owns tooling. Workspace discovery uses only `apps/*` and `packages/*`, matching [Project Rules](../en/00-PROJECT-RULES.md). No empty application or package manifests are created to make commands pass. Shared application configuration can be introduced in the approved `packages/config` boundary when actual consumers exist; the present root config is the tooling baseline.

Read before implementation: current Project Rules, full Playbook, ADR-001, approved technical decisions, English systems 01, 02, 13 through 23, README and root governing instructions. No governance document or ADR is changed for this checkpoint. Architecture, tenant/auth/entitlements and runtime API schema impact: none. No ADR or feature flag is required for this tooling-only change.

## Prerequisites and setup

- Node.js **24.21.0**, pinned in `.node-version` and `engines`.
- pnpm **10.34.6**, pinned in `packageManager` and `engines`. Use an already installed matching pnpm or Corepack configured for this exact version. Do not use npm/yarn to install this workspace or bypass engine checks.
- Git and **Gitleaks 8.30.1** on PATH. Install Gitleaks from its official release and verify the published checksum. The scanner is an external developer prerequisite, not a JS dependency.

On a fresh clone, from the repository root:

```sh
node --version
pnpm --version
gitleaks version
pnpm install --frozen-lockfile
pnpm hooks:install
pnpm format:check
pnpm lint
pnpm typecheck
pnpm workspace:check
pnpm security:dependencies
pnpm security:secrets
```

No `.env` or `.env.example` is needed for 00-A: there are no required user-supplied toolchain variables or credentials. `.gitignore` excludes real environment files while retaining example files for the later configuration checkpoint.

## Commands and honest evidence

| Command                                              | What it does now                                                                                                                                                                                                                                                                   |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm format` / `pnpm format:check`                  | Format/check checkpoint-owned configs, scripts and checkpoint documents. Imported governance, historical reports and root Markdown are explicitly excluded to prevent unrelated reformatting; they are reviewed manually. The generated lockfile is checked by pnpm, not Prettier. |
| `pnpm lint`                                          | Lint the actual TypeScript tooling/configuration with zero warnings. Reject explicit `any`, `@ts-ignore`, `@ts-nocheck`; an allowed `@ts-expect-error` needs both explanation and ticket.                                                                                          |
| `pnpm typecheck`                                     | Run `tsc --noEmit` on `eslint.config.ts` and `scripts/**/*.ts`, including declaration checks. No empty TypeScript project or fabricated application source.                                                                                                                        |
| `pnpm workspace:check`                               | Ask Turbo to parse the real pnpm workspace and lockfile and list child packages. Zero child packages is expected at 00-A, not a missing application build.                                                                                                                         |
| `pnpm build` / `pnpm test`                           | Dispatch registered workspace tasks. With no child packages, zero tasks run. Application build and runtime/unit suites are **N/A**, not PASS.                                                                                                                                      |
| `pnpm lint:workspaces` / `pnpm typecheck:workspaces` | Dispatch future child-package checks; currently zero tasks. Root tooling lint/typecheck run through their own commands above.                                                                                                                                                      |
| `pnpm security:dependencies`                         | Audit the dependency graph, failing on High/Critical. Registry failure is an error, never a passing scan.                                                                                                                                                                          |
| `pnpm security:secrets`                              | Local Gitleaks directory scan, redacted output, 60-second timeout. Only dependencies and generated local/Git caches are excluded, not project source/docs or environment files.                                                                                                    |
| `pnpm hooks:install`                                 | Set this checkout's `core.hooksPath` to `.githooks`. The hook scans staged changes and fails closed if Gitleaks is missing or fails. No global Git config is changed.                                                                                                              |

Turbo's small TypeScript launcher disables anonymous telemetry, inherits command exit status, and bounds execution to 14 minutes. Remote caching is disabled; task caching stays off until real outputs/environment inputs can be declared with the owning application. This is not a production resource budget. Gitleaks performs no online credential validation. The package audit sends only public dependency metadata to the official registry.

Directory scanning excludes generated/dependency paths through `.gitleaks.toml`. The pre-commit hook deliberately uses `.gitleaks-staged.toml` without path exclusions: even a force-added file inside an ignored cache directory must be scanned.

## Installation discipline

All direct versions are exact; the lockfile must be included in the eventual reviewed commit. Strict engine/peer checks and disabled lifecycle scripts are enforced by `.npmrc`; newly resolved releases must be at least 1440 minutes old. No scripts are silently approved. A dependency needing a build hook requires a separate review before changing this policy. Bounded registry requests use two retries and a 60-second request timeout.

Use `pnpm install --frozen-lockfile` for routine setup and reproducibility checks. Update the lockfile intentionally only after dependency review; a successful frozen install must not change its hash. Clean-install verification uses a separate source copy and empty pnpm store, never deletion of a developer's existing workspace.

## Troubleshooting and boundaries

- Engine/version error: install the pinned runtime/package manager; do not disable checks.
- Missing Gitleaks: install the verified CLI and put it on PATH; do not bypass the hook.
- No Turbo tasks: expected while child packages are absent. Do not add fake builds/tests.
- Missing runtime or browser tests: these belong to later authorized checkpoints; no service is running now.
- ESLint TypeScript loading: jiti is deliberately installed for the documented stable loader path.
- Critical/High finding: stop, report it, and do not close this checkpoint as PASS.

Manual review covers architecture, dependency necessity, security, maintenance, naming, boundaries, configuration, complexity, secret exposure and machine-independent paths. Runtime integrations, migration/restore, performance load, browser/accessibility/visual tests and CI evidence are not applicable to this checkpoint. Cross-tenant runtime N/A also follows [ADR-001](../adr/ADR-001-stage-00-cross-tenant-test-applicability.md).

Rollback before any commit: remove only checkpoint-owned tooling additions and the README status paragraph, preserving the original documentation and any later user changes. There is no runtime or data migration. Do not remove Git history or unrelated work. Next checkpoint is **00-B**, only after explicit owner approval.

Verification results and evidence are recorded separately in [the closure report](00-a-closure-report.md).
