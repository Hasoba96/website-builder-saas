# 00-I Image and Packaging Review

Reviewed 2026-10-03, before application image installation/build. No new npm
package/version is requested. Existing frozen lockfile, strict peers, maturity
floor and disabled lifecycle hooks remain binding. Full workspace audit rerun:
no known vulnerabilities. Existing transitive tracking deadlines remain unchanged.

| Image               | Selection and evidence                                                                                                                       | Intended execution                                                  |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| PostgreSQL 18.6     | Exact official digest already reviewed/tested in 00-D; no upgrade                                                                            | Local persistent database and unchanged disposable test fixture     |
| Redis 7.2.16 Alpine | Exact official digest already reviewed/tested in 00-E; no upgrade, BSD branch                                                                | Local authenticated ephemeral infrastructure and unchanged fixtures |
| Node 24.21.0 Alpine | Existing approved supported LTS patch; official image index digest `sha256:ebfe2f90462722a7a4de65e91990e97fe0d401c70e0e762c5b53302f905ec1c1` | Build and non-root application runtime                              |

`docker buildx imagetools inspect node:24.21.0-alpine` returned that index,
linux/amd64 manifest `sha256:83f1c388c31fb2e51f7cbd4dea949b96260798c98f206e8e4696bc93bd964e3a`,
official source revision `93a7bafc324a85ac1ee461604cff87cffacb6d7a`, built
2026-09-17, Alpine 3.24. Also publishes arm64; only amd64 is verified here.
Digest resolution/download supplies registry content integrity, not a universal
provenance or absence-of-malware certification. Node/MIT and existing image licenses
remain compatible; no new infrastructure provider or license exception.

The supported [Next standalone output](https://nextjs.org/docs/app/api-reference/config/next-config-js/output)
and [pnpm production deployment](https://pnpm.io/cli/deploy) package current apps.
The existing exact `@next/env` package is copied for the already-existing launcher;
no new validation/logging stack. Deployment must not resolve a new unchecked graph:
API/Worker injected-workspace deployment uses the frozen lockfile/store. Next uses
its traced standalone artifact plus the existing launcher's config/observability,
schema, Zod and @next/env runtime files from the same frozen install. A duplicate
full Next deployment was rejected because its optional peer path included
Playwright. Final installed package inventory is checked against repository
lockfile versions; framework-vendored code belongs to the reviewed framework
artifact. No install-script exception.

Compose uses the [documented service model](https://docs.docker.com/reference/compose-file/services/).
Official source: [Node Docker project](https://github.com/nodejs/docker-node).
No floating latest image, arbitrary registry, privileged build container, host
Docker socket, runtime production credential, cloud account or SaaS scanner added.
OS-wide image CVE verification and deployed TLS/ingress remain explicit limitations
unless separately demonstrated in closure evidence; npm audit is not an OS scan.

## 2026-10-07 Security Re-evaluation

The resumed audit identified High GHSA-68fv-2mgg-jv7q in source-map-js 1.2.1.
The October 3 audit above is historical, not current clearance. The approved
in-scope remediation is the official stable 1.2.2 patch, published September 30,
which exceeds the 1,440-minute maturity floor. Both PostCSS and magicast accept
`^1.2.1`; 1.2.2 requires Node >=0.10.0, has no runtime dependencies or install
hooks, and retains BSD-3-Clause. No direct dependency or override is introduced.

Sources: [upstream release](https://github.com/7rulnik/source-map-js/releases/tag/v1.2.2),
[reviewed advisory](https://github.com/advisories/GHSA-68fv-2mgg-jv7q), and exact
npm registry version metadata. Registry integrity is
`sha512-KGj/8Y43x35aZVDtt+J4mK1hoLGHULMYfSkODJNQjNDC3oW1PqPoxMwo0pLUsWM/UEGzON/NxeHywEfNXNP3Vw==`.
No deprecation or compromise evidence was found in these sources; this is not
a universal malware certification. Exposure includes Next/PostCSS build tooling
and Vitest coverage tooling, not just isolated tests. Final artifact inventory,
frozen install, complete audit and regressions must validate the resulting graph.
Disposition: accept the compatible security patch, conditional on those gates.
No unrelated version update or security suppression is authorized.

## 2026-10-08 Final Acceptance

The compatible source-map-js patch was applied through normal pnpm resolution;
the graph delta contains no other package version change. Fresh frozen install,
strict peer/engine validation, full vulnerability audit, 158 guarded tests and
all four production image builds/smoke checks passed. No install hooks, override,
fork, patch-package or audit suppression. Final application package identities
match the lockfile inventory. Test tooling is excluded from the final application
images; Next/framework vendored internals remain part of their parent artifact.

Existing transitive dispositions remain ACCEPT WITH TRACKING under their prior
owner (project maintainer), reviewer and deadlines: estree-walker by 2026-12-30,
existing age-only findings by their recorded dates including 2027-03-30, and
@bcoe/v8-coverage by 2027-04-01. Runtime/build paths retain their higher exposure;
container packaging does not reclassify them as test-only. No deadline is reset.
Immediate re-evaluation remains required for advisory/compromise, path/consumer,
direct-use/shipping/privilege, support/deprecation/EOL, integrity/source or supported
replacement changes. Direct Nest peer age approvals remain unchanged. No new
license, runtime compatibility or lifecycle-script exception was introduced.

Final artifacts and concrete limitations are recorded in the
[closure report](00-i-closure-report.md) and
[verification record](evidence/00-i-verification.json).
