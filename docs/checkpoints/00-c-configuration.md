# Checkpoint 00-C: Typed Configuration and Environment

This contract extends the existing foundation under CORE-016/022/071/072,
IN-010/011/012/013, and SE-040/043/045. It supersedes only the temporary 00-B
configuration defaults, not its historical reports. No domain, database, queue,
provider integration, logging platform, or 00-D functionality is introduced.

## Ownership and contracts

- `packages/schemas/configuration` is the single Zod schema/type source.
- Existing `packages/config` owns projection, validation, safe errors, defaults,
  and separate public exports. There is no second configuration system.
- API imports `@website-builder/config/api`; worker imports `/worker`.
- Next configuration/bootstrap imports `/web-server`. UI may import `/public`,
  never a server entrypoint. Server entrypoints are unavailable under the
  `browser` package condition and use a Node-only environment reader.
- Existing locale primitives remain independent of environment and hydration.
- No schemas or config object is forwarded through page props or Next's `env`
  option. Application-specific ownership is checked by the boundary tool.

## Environment names

`NODE_ENV` is the execution mode: **development**, **test**, **production**.
`APP_ENV` is deployment identity, following IN-012/section 3:
**local**, **ci**, **preview**, **staging**, **production**.
These are configuration labels, not newly provisioned environments.

Both values are validated. `APP_ENV` never defaults. Unknown, empty, malformed,
or missing values fail; they never silently become local/production.
Preview/staging/production require `NODE_ENV=production`. Local and CI may use
production mode to verify the same production artifact before promotion.
Tests use test mode with local/CI identity. Never use `NODE_ENV=staging`.

The Next launcher follows the framework's documented mode default only when
`NODE_ENV` is absent: development for `dev`, production otherwise. An explicitly
incompatible mode for `dev`, `build`, or `start` fails. Nest requires `NODE_ENV`
explicitly. This framework bootstrap exception is not a deployment-env fallback.

## Current variables

| Key                 | Consumers                    | Validation / default                                                                                                                 |
| ------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| NODE_ENV            | All                          | Enum above; required except documented Next command default                                                                          |
| APP_ENV             | All                          | Deployment enum above; required, no default                                                                                          |
| HOST                | API; Next dev/start launcher | IPv4, IPv6, or literal localhost; required, no default                                                                               |
| PORT                | API; Next dev/start launcher | Decimal integer string, 1 through 65535; required, no default                                                                        |
| SHUTDOWN_TIMEOUT_MS | API and worker only          | Decimal integer string, 100 through 30000 ms; default 10000 only outside production mode; explicit value required in production mode |

Worker has no listener and receives no host/port properties. Web config contains
only deployment/mode; listener settings are consumed separately by its launcher.
Next build/typegen do not need a listener. Arbitrary OS/environment keys are not
forwarded to returned configuration objects. Selected contract objects are strict,
typed, and frozen. No DB/Redis/provider placeholders are added.

HOST is a bind address, not a destination URL. Loopback values in examples are
intentional local-only values. Binding a production/container interface requires
an explicit operator choice. These limits are foundation safety bounds, not
production sizing.

## Server and public separation

The current public allowlist is **empty**. `getPublicConfig()` returns a frozen
empty object, reads no environment, and imports no runtime schema/Node module.
There is no current shell requirement for public environment configuration.
Any `NEXT_PUBLIC_*` variable is rejected before build/start; private arbitrary
variables never become public config. This avoids disguising a secret by merely
renaming it with Next's public prefix.

Future browser settings must be intentionally public, explicitly allowlisted,
validated, and read through Next's supported static `NEXT_PUBLIC_NAME` mechanism.
Such values are build-time constants and must be invariant across artifact
promotion (IN-034). Do not expose an environment-dependent service secret or
introduce runtime injection to avoid that constraint. No current public setting
requires a provider, architecture decision, or runtime-client workaround.

## Loading and precedence

### API / worker

Production `start` reads process environment only. No implicit production dotenv
loading. `dev` uses Node's built-in `--env-file-if-exists=.env`, relative to the
application directory. Existing process variables win over that single local
file. There is no custom dotenv parser, interpolation engine, or cascade.
Parsing completes before Nest initialization/listening. Invalid config exits 1,
with known invalid key names but never supplied values or a serialized env.

### Next applications

The existing launcher uses version-matched official `@next/env`. Native order is:
process environment; `.env.$NODE_ENV.local`; `.env.local` (not test mode);
`.env.$NODE_ENV`; `.env`. All files are app-relative. Validation follows loading
and precedes the Next child process. Each `next.config.ts` also validates when
Next loads it, covering normal framework build/start evaluation. No `.env.staging`
convention is invented. Next mode and deployment identity remain separate.

Use repository scripts for hosting: validated HOST/PORT are passed to the native
Next CLI. Direct port/hostname CLI overrides are rejected by the wrapper. This
preserves a single documented environment path rather than two competing values.
It does not introduce a custom Next server. Deployment packaging in 00-I must
preserve this validation boundary; generated standalone-server behavior is not
claimed verified in 00-C.

Turbo explicitly forwards owned env keys (including rejected public-prefixed
keys so invalid configuration cannot disappear at the task boundary). Its cache
remains disabled. Tool-level telemetry suppression, SWC cache selection, process
launchers, test fixtures and scanner environment handling are documented tooling
exceptions, not application configuration consumers. App source env access is
lint-restricted; business code must consume validated config.

## Local setup

Use Node/pnpm prerequisites from [00-A](00-a-toolchain.md). Install from the
lockfile. Copy each application's `.env.example` to its own `.env`, without
overwriting an existing local file. No root dotenv file is loaded automatically.
Do not copy production credentials locally. Real env files stay Git-ignored;
examples contain only safe settings. Secret scanning rules are unchanged.

From the root, PowerShell:

```powershell
pnpm install --frozen-lockfile
foreach ($app in 'api','worker','dashboard-web','public-renderer') {
  if (-not (Test-Path "apps/$app/.env")) {
    Copy-Item "apps/$app/.env.example" "apps/$app/.env"
  }
}
pnpm build
pnpm dev
```

API uses localhost:3001; dashboard localhost:3000; renderer localhost:3002.
Worker remains queue-free. Do not export one root HOST/PORT for all apps when
running them together; use per-app files or per-process environment.
For production-like API/worker starts, supply NODE_ENV=production, APP_ENV,
SHUTDOWN_TIMEOUT_MS and API HOST/PORT explicitly; `start` does not load local files.

For environment-file-free build/verification in CI, set `APP_ENV=ci` before root
commands. Next selects production mode; tests supply their own isolated settings.
No credentials are required. Browser harness owns ports 3100/3102; API tests use
3301/3303. A busy port fails visibly rather than attaching to another process.

## Extending and recovering

Add a key only with a current consumer. Update its shared schema once, the
owning config projection/export, app example, Turbo forwarding if needed, this
contract, and positive/negative tests. Secret keys remain server-only. Never log
config values, even when validation fails. Do not export an application's entire
environment or add client config merely to prove a package exists.

A configuration failure is not retried: correct the named setting and restart.
Do not disable validation. Rollback is code/config rollback to the previous
approved checkpoint; there is no database migration or external state change.
Existing secrets, if introduced in later checkpoints, require their own rotation
and deployment handling. Local labels alone do not prove production isolation.
