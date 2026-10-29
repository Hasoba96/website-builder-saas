# L-01 bounded metrics contract

Date: 2026-10-29. Owner: Hasoba96, infrastructure/observability. **Working contract for the owner-authorized inert L-01 packet; merge and runtime consumers pending separate acceptance.** Authority: [L-00](00-l-charter.md), CORE-022/080/082, OB-010–013 and TS-031/060/063. The canonical executable contracts live once in `packages/schemas/src/metrics.ts`; implementation lives in `packages/observability/src/metrics.ts`.

## Names, dimensions and units

- Services reuse the existing operational service enum: `api`, `worker`, `dashboard-web`, `public-renderer`.
- Histogram name: `http_duration_ms`; routes: `health`, `ready`, `other`; outcomes: `success`, `redirect`, `client_error`, `server_error`, `aborted`. Consumers must map a route immediately to these enums and discard its URL; no identifier or arbitrary route template is accepted. An abort before headers is not a successful default-200 response.
- Gauges: `rss_bytes`, `cpu_cores`, `db_used`, `db_limit`, `db_waiting`, `redis_ready`. Gauges have only service/name, no route/outcome. CPU is consumed core equivalents (may exceed one), not a container quota percentage. RSS/pool values are nonnegative safe integers; Redis state is 0 or 1 only after an actual observation. Missing/unobserved is null, never a fabricated healthy zero.
- Input is a strict, flat histogram or gauge record with `value`; unknown fields/labels/names, negatives, NaN/Infinity and values above Number.MAX_SAFE_INTEGER are rejected. No raw request, body, headers, peer, exception, token or PII is retained or emitted. Rejection returns false and increments only a bounded numeric drop counter; it does not echo rejected data.

## Bounds and quantiles

The complete finite universe is 60 histogram series (4×3×5) plus 24 gauges (4×6), allocated up front. There is no dynamic series registry or caller-supplied capacity. Fixed numeric arrays occupy 5460 bytes per instance; bounded descriptors/snapshots add finite object overhead. The contract does not claim that callers retaining arbitrary snapshots have bounded memory.

One synchronous 60000ms tumbling window is aligned to the injected monotonic clock, default `performance.now()`. Histogram upper bounds in milliseconds are 1,5,10,25,50,100,250,500,1000,5000,10000,60000, followed by an overflow bucket. Each histogram caps at65535 samples/window; further samples are rejected, not silently wrapped. Drop count saturates at65535. Gauges retain the latest validated value only.

Quantiles p50/p95/p99 use nearest-rank `ceil(q×count)` and return the containing bucket's upper bound, not an exact sample or average. An overflow rank returns null with a positive overflow count; consumers must not substitute60000 or claim the latency target passed. Bounds/approximation and dropped samples must remain visible when interpreting SLOs. This is not full SLO measurement or production sizing.

## Retention, stale, reset and clock behavior

Only current-window aggregate buckets/counters and latest numeric gauges are available. On the first record/snapshot/reset at or after a boundary, arrays and drop count are cleared synchronously; there is no background expiry timer. Expired values cannot be returned, although idle memory is lazily overwritten. One bounded seen-bit per series distinguishes `empty` (never observed since reset) from `stale` (observed previously, absent now). `current` means an observation in this window, not dependency health or continuous freshness. Data may expire sooner than60s when recorded near a tumbling boundary.

Snapshot exposes window start/end, bounded drops and the finite series. Empty/stale histogram counts are zero with null quantiles; empty/stale gauges are null. Unknown service/name/combination never becomes a new series. Explicit reset clears all numeric data, drops and seen-bits, returning every series to empty without rewinding time. Returned snapshots are detached numeric/enum projections; mutating one cannot modify the collector.

The clock must return finite nonnegative safe-range milliseconds and never move backward. Invalid clock values throw a constant, sanitized domain error without exposing the value; invalid clock values are neither retained nor echoed. The collector retains its trusted injected clock function and last valid time. Default monotonic time is process-relative, not an absolute UTC timestamp. A future owner-approved consumer must contain observer errors and cannot use an unavailable sampler as healthy zero.

## Acceptance and non-goals

Deterministic tests cover full finite input/output contracts, p50/p95/p99/overflow, exact window boundaries, logical expiry/stale/reset, independent series/gauges, invalid values/unknown labels, saturation, hostile high-cardinality attempts, snapshot detachment, monotonic clock refusal and browser-import exclusion. Canonical test ownership and minimum count are increased deliberately; existing suites/assertions/coverage/security policy remain unchanged.

Importing the core starts no timer/listener, retains no external sink and attaches to no application. No application or logger behavior changes, no stdout metric family is introduced, and no queue is registered. L-02/L-03 integrations, exporters/operator view, error tracking, alert delivery, external retention/storage and production activation are outside this packet and remain separately gated.
