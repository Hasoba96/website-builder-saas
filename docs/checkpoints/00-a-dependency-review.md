# Checkpoint 00-A: Pre-install Dependency Review

Reviewed on 2026-09-30, before the first checkpoint installation. Scope: repository tooling only. Owner: engineering platform / infra. This is not authorization for 00-B or a claim that runtime services exist.

## Selection and compatibility

All npm versions below are exact, stable releases without a registry deprecation marker. Registry metadata was retrieved over HTTPS with a 30-second timeout. Release dates are UTC. Size is the registry's unpacked distribution size, not a browser bundle; none of these tools ships to end users.

| Dependency          | Version | Release date | License    | Unpacked bytes | Purpose and need in 00-A                                                                        | Compatibility                                                                        |
| ------------------- | ------- | ------------ | ---------- | -------------: | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `turbo`             | 2.11.5  | 2026-09-28   | MIT        |         739847 | Approved workspace task runner and package graph inspection                                     | No declared Node engine or peers; verify Windows binary and pnpm graph locally       |
| `typescript`        | 6.0.3   | 2026-04-16   | Apache-2.0 |       24346827 | Strict checking of actual tooling TypeScript and base configuration                             | Node >=14.17; satisfies typescript-eslint >=4.8.4 <6.1.0                             |
| `eslint`            | 10.11.0 | 2026-09-18   | MIT        |        2946272 | Lint the actual tool configuration and runner                                                   | Node ^20.19.0 or ^22.13.0 or >=24; optional jiti peer                                |
| `@eslint/js`        | 10.0.1  | 2026-02-06   | MIT        |          15687 | Standard recommended ESLint rules                                                               | Optional ESLint ^10.0.0 peer is satisfied                                            |
| `typescript-eslint` | 8.71.0  | 2026-09-28   | MIT        |          42688 | TypeScript linting, explicit-any and directive controls                                         | ESLint ^8.57.0 / ^9 / ^10; TypeScript >=4.8.4 <6.1.0; selected Node satisfies engine |
| `prettier`          | 3.9.9   | 2026-09-23   | MIT        |        9958979 | Deterministic formatting of checkpoint-owned files                                              | Node >=14; no peers                                                                  |
| `jiti`              | 2.7.0   | 2026-05-05   | MIT        |        1751293 | Load eslint.config.ts through ESLint's documented Node support, without an unstable ESLint flag | ESLint requires jiti >=2.2.0 for this path; no declared engine or peers              |
| `@types/node`       | 24.19.0 | 2026-09-25   | MIT        |        2613291 | Types for the real Node tooling runner and config declarations                                  | Node 24 type line; no peers; transitive undici-types reviewed by full lockfile audit |

TypeScript 7.0.2 was considered but not selected: it is outside the parser's supported peer range. TypeScript 6.0.3 is the stable compatible compiler, not a floating downgrade or a disabled peer check. All selected packages show maintenance within the project's 18-month threshold. They are devDependencies only; no runtime dependencies are planned.

## Bootstrap tools

- **Node.js 24.21.0:** official Node 24 LTS, distribution dated 2026-09-07 (release article dated 2026-09-08), MIT with bundled third-party notices. Use the official portable distribution with SHA-256 verification, without replacing the machine's global Node. All selected engine ranges accept it. The initial machine runtime was 24.18.0; it is not the pinned verification runtime.
- **pnpm 10.34.6:** stable, actively maintained 10.x release dated 2026-09-28, MIT, Node >=18.12, no peers; unpacked size 19940259 bytes. Official pnpm 10 matrix includes Node 24. Exact packageManager pin; official npm tarball integrity checked before bootstrap. This supported branch avoids introducing a newer package-manager major without a need.
- **Gitleaks 8.30.1:** external local secret-scanning CLI, not a JS dependency. Stable official release dated 2026-03-21, MIT; Windows archive SHA-256 verified against the publisher. No Node peers. Scans locally with redacted findings; no credential validation or repository upload. CI wiring remains 00-J.

## Security review before install

The official npm bulk advisories endpoint was queried for all eight direct dependencies plus pnpm at the exact versions above. Response: `{}` (no reported advisories, including no Critical/High). This is a point-in-time direct-package check, not proof about unresolved transitive dependencies or malicious packages. Full lockfile and installed dependency scans remain mandatory; any Critical/High finding stops the checkpoint.

Registry metadata shows no install lifecycle hook for the selected direct packages. Dependency lifecycle scripts will be disabled globally for this baseline (`SE-064`). Version resolution will require strict peers and engines; no peer overrides, audit exceptions, or security suppressions. Public registry requests disclose package names/versions only, never repository content or credentials. Turbo diagnostics/telemetry and remote caching will be disabled for project commands.

Node's official release and support status were checked. npm audit does not audit Node itself or the Gitleaks executable; binary checksums prove download integrity, not the absence of vulnerabilities. Record any scanner coverage limit in closure evidence rather than claim universal security assurance.

## Primary sources

- [npm registry](https://registry.npmjs.org/): per-package version, time, engines, peers, scripts, license, integrity and size metadata.
- [npm bulk advisory endpoint](https://registry.npmjs.org/-/npm/v1/security/advisories/bulk): exact-version public-package advisory query.
- [Node release](https://nodejs.org/en/blog/release/v24.21.0), [support lifecycle](https://nodejs.org/en/about/previous-releases), [distribution checksums](https://nodejs.org/dist/v24.21.0/SHASUMS256.txt).
- [pnpm 10 compatibility](https://pnpm.io/10.x/installation), [pnpm settings](https://pnpm.io/10.x/settings).
- [typescript-eslint compatibility](https://typescript-eslint.io/users/dependency-versions/).
- [ESLint TypeScript configuration](https://eslint.org/docs/latest/use/configure/configuration-files#typescript-configuration-files).
- [Gitleaks release](https://github.com/gitleaks/gitleaks/releases/tag/v8.30.1), [license](https://github.com/gitleaks/gitleaks/blob/v8.30.1/LICENSE).

Rules: `CORE-001`, `CORE-002`, `CORE-016`, `CORE-031`, `CORE-032`, `CORE-063`, `CORE-070`, `SE-040`, `SE-060` through `SE-064`. No architecture change, ADR, product dependency, or provider provisioning is involved.
