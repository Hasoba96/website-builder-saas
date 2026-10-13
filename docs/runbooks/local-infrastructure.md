# Local Infrastructure

Scope: 00-I local development only. PostgreSQL is the system of record; Redis is
disposable infrastructure. Applications remain host-run by default. No hosting,
production orchestration, CI workflow or backup/restore implementation.

## Prerequisites

Use the repository-pinned Node and pnpm, Docker Desktop with Linux containers
(Windows 11/WSL2 supported), and enough free memory for TypeScript/Next builds.
Commands below run from the repository root in PowerShell or another terminal.
Docker must be available to the current account. No native database or WSL-only
shell is required. Docker API access is privileged: only trusted developers get it.
Noninteractive Turbo tasks default to one concurrent task after measured host
memory exhaustion during simultaneous Next builds. An explicit Turbo concurrency
argument remains available on adequately provisioned machines. This changes
scheduling only, not test discovery, assertions or acceptance requirements.

```powershell
pnpm install --frozen-lockfile
$env:APP_ENV = 'local'
pnpm build
pnpm infra init
pnpm infra up
pnpm infra status
pnpm infra migrate status
pnpm infra migrate up
pnpm infra migrate check
```

The web launcher selects production NODE_ENV for build; do not carry a conflicting
NODE_ENV from another task. For POSIX shells the equivalent build is
`APP_ENV=local pnpm build`. Runtime API/Worker commands below use their own validated
local files, not this shell's build configuration.

`init` generates non-production random credentials once under ignored
`.local/infrastructure`. It refuses overwrite. Optional positional ports:
`pnpm infra init 25432 26379`. Defaults: PostgreSQL **127.0.0.1:15432**;
Redis **127.0.0.1:16379**. An occupied port fails, never kills its owner.
`up` waits for actual health (60 seconds), provisions only infrastructure roles,
and never runs application migrations. Failure stops only this local project,
preserving state. Inspect Docker Desktop for health/port/image failures; do not
paste raw service logs or config containing credentials into reports.

## Configuration and Ownership

Existing 00-C schemas/config selectors validate generated API/Worker/operator env
files. No URL shortcuts or second schema system. The helper owns local provisioning
metadata only; ordinary application startup still uses its existing config API.
`api.env` contains runtime DB credentials; `migration.env` contains only migrator
credentials; `worker.env` contains only Redis credentials. Admin credential is a
separate PostgreSQL file secret, never passed to an application. Redis configuration
contains SHA-256 ACL hashes; a separate PING-only health credential serves its probe.
No secrets appear in tracked Compose, command arguments or Docker environment config.

Treat the generated directory as private. POSIX directory mode is 0700; Redis
mounted files are readable by its unprivileged UID inside the container. Windows
inherits filesystem ACLs: use a private checkout/profile, not a shared drive.
Docker administrators can read mounted secrets; local files are not a secret manager.
Do not regenerate credentials against an existing volume. Recover the original
files, or deliberately reset disposable local data before reinitialization.

`pnpm infra run api` and `pnpm infra run worker` start built processes with the
corresponding validated file and strip inherited DB/Redis/operator configuration.
Only keys returned by that role's existing configuration selectors are forwarded;
an extra migration secret in an API file does not become an API environment key.
The local file is authoritative for this explicit local command; normal application
commands retain documented process-over-env-file precedence. For watch development,
copy the appropriate generated file to its existing ignored application `.env`,
only after checking that the destination does not contain needed configuration:

```powershell
Copy-Item .local/infrastructure/api.env apps/api/.env
Copy-Item .local/infrastructure/worker.env apps/worker/.env
```

Do not copy migration/admin credentials into app files. Next apps need only their
existing `.env.example` values. Run `pnpm dev`, or each app's existing dev command.
The public config allowlist stays empty. DB/Redis plaintext is allowed only for
local/CI loopback; deployed/non-loopback consumers still require verified TLS.

## Service Contract

Compose contains only PostgreSQL and Redis on a dedicated project bridge. Project
name is `wb-local-` plus a hash of the checkout path; resource labels record exact
ownership. No host networking, Docker socket, privileged mode or arbitrary device.
The bridge permits normal Docker networking; only published host ports are restricted
to loopback. This is not a hostile-container multi-user isolation boundary.

- PostgreSQL **18.6**, official digest
  `sha256:77f585114c32fbca283dc835b0596f4e52b51b4c6662d7810b2f4084f60a1873`.
  Named volume `<project>_postgres-data` persists through restart/stop/down.
  Runtime role `wb_runtime`: CONNECT, no DDL/metadata/role administration.
  Migrator `wb_migrator`: separate credential, schema creation and metadata owner.
  Neither is superuser/database owner. Later migrations grant only necessary access.
- Redis **7.2.16**, official digest
  `sha256:29e8589c3f9ba699b5f7aa4b3c7733c58852a3626439e619aa0ee78de08c6ca0`.
  Default user disabled; Worker ACL restricted to `website-builder:local:*` keys
  and channels and reviewed BullMQ commands. No persistence, tmpfs data, noeviction.
  Restart discards state. Redis is not authoritative, and no Product Jobs exist.

Versions match D/E; no database/client upgrade or permanent provider decision.
Digest updates require normal image/security review, never floating `latest`.
PostgreSQL health uses pg_isready; Redis health uses authenticated PING. Application
readiness remains separate: API needs PostgreSQL only; Worker needs Redis.
GET `/health` is dependency-independent; `/ready` is bounded and sanitized.

Development bounds, not production sizing: PostgreSQL 512 MiB/1 CPU/128 PIDs;
Redis 256 MiB/1 CPU/64 PIDs, 96 MiB data and 64 clients. Redis is non-root,
read-only, capability-dropped; PostgreSQL retains its official initialization
privileges. Both disable privilege escalation and have bounded stop grace periods.
The current API pool is capped at two connections; Worker and both web apps have
no PostgreSQL pool. One explicit migration connection and one provisioning
connection keep this local workflow well below PostgreSQL's 100-connection default,
with headroom for health checks and operator inspection. Additional application
replicas require a new aggregate pool budget, not copying these limits blindly.

## Stop, Reset and Recovery

Stop apps first (Ctrl+C), then `pnpm infra stop`. `pnpm infra up` resumes services.
`pnpm infra down` removes this project's containers/network, retaining PostgreSQL
data. No command deletes test fixtures, unrelated containers, or unrelated volumes.

**Destructive reset:** `pnpm infra reset --delete-local-data` removes this project's
containers/network and its exact labelled PostgreSQL volume. Configuration and
generated credentials remain; next `up` initializes an empty database. Run migrations
explicitly again. No wildcard cleanup, prune, FLUSHALL or automatic startup reset.
If abruptly interrupted, inspect exact ownership labels before recovery. A label
`website-builder.test=00-d/00-e` identifies independent test fixtures, not local state.

## Verification and Test Isolation

`pnpm test:local` owns a separate UUID Compose project, generated credentials,
ephemeral loopback ports and private temporary directory. It tests parsing, actual
published bindings, health, roles, migrations, ACLs, outages, restart and reset, then
removes only its resources. `pnpm test` includes this suite and all existing guarded
D/E/H suites; it never requires manually started developer services. Run the full
path while local services are up to check isolation. Historical fixtures are unchanged.
No mocked PostgreSQL/Redis or zero-suite acceptance is allowed.

## Application Images

IN-002 requires independently container-buildable services. `infra/Dockerfile` uses
multi-stage builds and the pinned Node **24.21.0-alpine** official digest
`sha256:ebfe2f90462722a7a4de65e91990e97fe0d401c70e0e762c5b53302f905ec1c1`.
Frozen pnpm install, disabled lifecycle scripts, production artifact packaging and
non-root runtime. No runtime secrets enter the build context; `.dockerignore` uses
a source allowlist. Build tools/test files remain outside the final application.

```sh
docker build -f infra/Dockerfile --build-arg APP=api --target runtime -t wbp-local-api:00-i .
docker build -f infra/Dockerfile --build-arg APP=worker --target runtime -t wbp-local-worker:00-i .
docker build -f infra/Dockerfile --build-arg APP=dashboard-web --target web -t wbp-local-dashboard-web:00-i .
docker build -f infra/Dockerfile --build-arg APP=public-renderer --target web -t wbp-local-public-renderer:00-i .
pnpm test:images
```

API/Worker use pnpm's locked production deployment. Workspace injection and
post-build synchronization keep its deployed workspace dependencies built and
lockfile-resolved. No dependency versions changed for this packaging setting.
Next uses its supported standalone output, with existing validated launcher and
sanitized log forwarding preserved. APP_ENV/host/listener/security settings are
runtime inputs; build uses ci, not production secrets. Next static assets are copied
explicitly. Images contain no deployment-provider choice or application Compose
topology. Real deployments must supply verified TLS, trusted ingress configuration,
resource/probe/supervision settings and required secrets before pilot. Hostnames in
a Docker bridge do not qualify for the loopback plaintext exception.

`test:images` runs each prebuilt image as UID 1000 with a read-only root, dropped
capabilities, explicit limits and owned disposable dependencies. API/Worker share
only their respective test dependency's network namespace so loopback remains
literal; this is an acceptance fixture, not a production network design. It checks
probes, locales, installed package versions against the lockfile inventory,
absence of test runners/project fixtures, structured logs and SIGTERM shutdown.
The launcher recognizes Next's documented-in-source post-cleanup signal exit
codes only after forwarding that signal; unrequested nonzero exits remain failures.
Shutdown has a 10-second launcher deadline, below the 15-second container grace.
It removes only its exact owned containers/volume. Framework-vendored internal
code remains covered by the containing framework's reviewed version, not counted
as a separately installed package. Third-party packages may include inert tests.
The Next artifact uses traced standalone files rather than a second full Next
deployment, which otherwise pulls the optional Playwright peer into the image.

No real staging deployment, production HTTPS/HSTS, production sizing, full container
CVE certification, backup or disaster recovery is implied by local checks. 00-J owns
CI; 00-K owns restore smoke. Use the existing migration roll-forward/destructive-change
policy and existing runtime error/redaction boundaries without exceptions.
