# 00-E dependency review

Reviewed 2026-10-01 before workspace installation. Owner: Engineering Platform.

## Direct candidates

| Package | Exact version | Release    | Reason and compatibility                                                                                                             | License |
| ------- | ------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------- |
| bullmq  | 6.3.10        | 2026-09-29 | Approved queue runtime, includes shutdown connection-retry fix; Node >=14.17; optional ioredis peer >=5 satisfied by 6.0.0           | MIT     |
| ioredis | 6.0.0         | 2026-07-31 | Explicitly owned Redis connections for BullMQ; Node >=20 satisfied by pinned Node 24.21.0; bundled types; use supported RESP2 option | MIT     |

Both maintained, stable, not deprecated, older than the 1,440-minute maturity floor. BullMQ 6.3.11 published today is not selected. No direct-age exceptions added. No competing Redis client, queue framework, Nest integration layer, or QueueEvents dependency is needed.

Metadata-only scratch resolution: 24 exact package versions, strict peers, official registry, scripts disabled. Candidate audit: 0 critical/high/moderate/low findings. All 24 downloaded tarballs matched published SHA-512 integrity. Registry source, repositories, engines, peers, licenses, release dates, sizes and hooks recorded in [inventory](00-e-dependency-inventory.json). This is not a guarantee of absence of undisclosed compromise. No evidence of malicious/compromised releases found in inspected registry/upstream advisories.

Licenses: MIT, ISC, Apache-2.0, 0BSD; compatible with this use, notices retained. `msgpackr-extract` has an optional native build install hook; it remains disabled under repository `ignore-scripts`. Prebuilt optional platform binaries remain inventoried. No hook exception, override, patch, peer suppression or force install.

## Transitive dispositions

Age-only: `cluster-key-slot@1.1.1`, `denque@2.1.0`, `ms@2.1.3`, `node-abort-controller@3.1.1`, `node-gyp-build-optional-packages@5.2.2`, `redis-errors@1.2.0`, `standard-as-callback@2.1.0`, `tslib@2.8.1`: **ACCEPT WITH TRACKING**. Runtime exposure except optional native-build helper (install/build, disabled). Stable utilities pulled by maintained direct consumers; no direct project imports, deprecation flags, incompatible engines/licenses or known advisory found. Supported replacement is controlled upstream; do not substitute internals. Residual risk: stale utility maintenance and executable dependency supply chain. Owner: Engineering Platform; next review no later than **2027-03-30** (180 days). Other candidate nodes: ACCEPT, including platform-specific optional binaries after inventory/integrity review.

Re-evaluate immediately on new advisory, High/Critical finding, compromise evidence, consumer update, graph/path change, direct use, shipping or privilege change, support/EOL/deprecation change, integrity concern, or supported replacement. New deprecated/EOL findings require <=90-day tracking. Existing 00-B/C/D findings remain in force; no historical evidence rewritten.

## Redis test image

Redis **7.2.16**, official `redis:7.2.16-alpine`, pinned to `redis@sha256:29e8589c3f9ba699b5f7aa4b3c7733c58852a3626439e619aa0ee78de08c6ca0`. Supported 7.2 branch, latest branch patch released 2026-08-17; BSD-3-Clause. This is a disposable verification version, not a hosting-provider decision. BullMQ supports Redis >=6.2. Redis release notes include the May RESTORE/Lua/unblock security fixes in 7.2.14 and July/August fixes through 7.2.16. Some GitHub advisory metadata still says `TBD`; explicit patched release notes provide fix evidence, not an ACL-only security waiver. No full container OS CVE scan is claimed here.

Sources: [BullMQ release](https://github.com/taskforcesh/bullmq/releases/tag/v6.3.10), [connections](https://docs.bullmq.io/guide/connections), [ioredis release](https://github.com/redis/ioredis/releases/tag/v6.0.0), [Redis support](https://github.com/redis/redis/security), [Redis release](https://github.com/redis/redis/releases/tag/7.2.16), [Redis security fixes](https://github.com/redis/redis/releases/tag/7.2.14), [Redis license](https://github.com/redis/redis/blob/7.2.16/COPYING).

Disposition: accepted for normal pinned installation with scripts disabled, conditional on full-workspace audit, compatibility and real-container verification. Final results recorded in checkpoint closure.

## Post-install evidence, 2026-10-01

Final dependency ownership: `packages/queues` declares both runtime dependencies; root declares `ioredis` only for the real ACL integration test. Worker consumes the queues workspace package. No redundant root BullMQ dependency remains. Against the 00-D lockfile, 19 resolved versions were added and none removed; five of the 24 candidate graph versions were already present. Optional platform packages remain represented in the lockfile even when not installed on Windows.

Final clean installation in an isolated manifest-only workspace: `pnpm install --frozen-lockfile --ignore-scripts`, 370 packages, exit 0. Exact direct pins, strict peers/engines, maturity floor and disabled lifecycle scripts remain unchanged. No overrides, forks, patches or security suppressions. Final lockfile SHA-256: `89e5586fd212f3d16941079c9ff28cb693d9f4ebcccd268714ff6784bcef739e`. Clean installation did not change this hash. Full verification, audit and cleanup results are recorded in [00-E closure](00-e-closure-report.md).
