# Checkpoint 00-D dependency review

Reviewed 2026-10-01 before workspace installation. CORE-002 applies to the full resolved graph. This is not an ORM decision.

## Direct additions

| Package         | Exact version | Release    | Purpose / compatibility                                      | License | Disposition |
| --------------- | ------------- | ---------- | ------------------------------------------------------------ | ------- | ----------- |
| pg              | 8.23.0        | 2026-08-08 | PostgreSQL runtime driver; Node >=16, Node 24.21 supported   | MIT     | ACCEPT      |
| node-pg-migrate | 9.0.0         | 2026-07-17 | Explicit operator migrations only; Node >=20.11, pg >=4.3 <9 | MIT     | ACCEPT      |
| @types/pg       | 8.23.1        | 2026-08-17 | Build-time PostgreSQL declarations; compatible pg 8 API      | MIT     | ACCEPT      |

The existing @types/node 24.19.0 and jiti 2.7.0 are reused. No install lifecycle scripts occur in the 39-package candidate graph. pg-native is an optional peer and is not installed. pg 8.23.1 was published 2026-09-30 15:39 UTC and is inside the existing 24-hour minimumReleaseAge at review time; it is not selected. All selected direct releases are stable, maintained, and younger than 18 months. No new direct-age exceptions.

## Graph gate

An isolated metadata-only pnpm resolution used the repository's strict peer, age, source and lifecycle policies. All 39 resolved tarballs were checked against registry SHA-512 integrity. The fresh registry bulk advisory query and pnpm audit returned no known vulnerabilities. Registry sources are registry.npmjs.org with upstream package repositories; no git dependencies, substitutions, overrides, forks or patches. No known malicious/compromised release or incompatible engine/peer was identified. This records available evidence, not a guarantee against undisclosed compromise.

Licenses are MIT, ISC and BlueOak-1.0.0: permissive use, retaining required notices. Registry metadata reports no deprecated packages in this graph. Upstream node-postgres and node-pg-migrate are maintained approved-stack consumers; old leaf versions are not treated as abandonment merely from age. The full inventory is retained in `evidence/00-d-candidate-inventory.json`.

## Transitive age findings

ACCEPT WITH TRACKING, owner: Engineering Platform. Review by **2027-03-30** (180 days maximum). These packages are not imported/invoked directly by project code.

- Runtime parser path through pg/pg-types: pg-types 2.2.0, pg-int8 1.0.1, postgres-array 2.0.0, postgres-date 1.0.7, postgres-interval 1.2.0, xtend 4.0.2. Stable parsing APIs, maintained direct consumer, compatible versions, no known advisory. Runtime exposure warrants continued advisory and graph monitoring.
- Runtime credential helper path through pg/pgpass: pgpass 1.0.5, split2 4.2.0. Explicit validated credentials prevent relying on ambient password files. No lifecycle hooks; no known advisory.
- Operator migration CLI path through node-pg-migrate/yargs: cliui 9.0.1, escalade 3.2.0, get-caller-file 2.0.5, string-width 7.2.0, y18n 5.0.8. Operator/build/test exposure, not part of the API runtime dependency graph. No hooks or known advisory; replacement remains the supported upstream consumer's responsibility.

Immediate re-evaluation: new advisory; High/Critical finding; malware/compromise; consumer update; graph/path change; direct use; production shipping; privileges/execution context; support/EOL/deprecation; integrity/provenance concern; supported upstream replacement. A deprecated/EOL finding shortens the maximum interval to 90 days and requires a new disposition. Tracking never waives hard blockers.

## PostgreSQL test image

PostgreSQL **18.6**, official image digest `postgres@sha256:77f585114c32fbca283dc835b0596f4e52b51b4c6662d7810b2f4084f60a1873`. No binding major pin exists. Version 18 is supported; current 18.6 includes the published PostgreSQL security fixes. This selects a disposable test baseline, not a permanent hosting platform. Docker Scout requires an authenticated account here; no account or service was introduced. Do not claim a Scout image scan.

Sources: [PostgreSQL support](https://www.postgresql.org/support/versioning/), [PostgreSQL 18 security](https://www.postgresql.org/support/security/18/), [node-postgres](https://github.com/brianc/node-postgres), [migration release](https://github.com/salsita/node-pg-migrate/releases/tag/v9.0.0), [pool lifecycle](https://node-postgres.com/apis/pool), exact-version manifests and tarballs from the official npm registry.

The full workspace lockfile/audit must be checked again after installation. Candidate acceptance does not replace that gate.

## Post-install verification

The final workspace audit returned no known vulnerabilities. Lockfile comparison against the pre-00-D snapshot found 32 added external package versions, all present in the reviewed 39-package candidate inventory; existing external versions were not replaced or removed. Strict peer validation and install-script restrictions remained enabled. A fresh-directory frozen installation succeeded with 356 installed packages and unchanged lockfile SHA-256 `3b80e974cca3c55bca9e090488b163d7f4984aa1ba4f9c34c240324747b6ce20`.

The API's declared production dependency graph includes pg and excludes node-pg-migrate and Vitest. This is graph evidence, not a claim that a future deployment artifact has been pruned; deployment packaging belongs to its later checkpoint. PostgreSQL at the pinned image digest returned `postgres (PostgreSQL) 18.6`; its base identifies itself as Alpine 3.24.2. No OS-wide CVE scan is claimed.
