import { expect, it } from 'vitest';
import {
  BoundedMetrics,
  MetricClockError,
} from '@website-builder/observability';
import {
  metricInputSchema,
  metricSnapshotSchema,
  metricSeries,
  metricCountLimit,
  metricWindowMs,
} from '@website-builder/schemas/metrics';

const sample = {
  name: 'http_duration_ms',
  service: 'api',
  route: 'other',
  outcome: 'success',
  value: 10,
};
const row = (metrics: BoundedMetrics, name = sample.name, service = 'api') =>
  metrics
    .snapshot()
    .series.find(
      (s) =>
        s.name === name &&
        s.service === service &&
        (!('route' in s) || (s.route === 'other' && s.outcome === 'success')),
    );
it('allocates a finite empty universe and validates every declared input combination', () => {
  const metrics = new BoundedMetrics(() => 100);
  expect(metricSeries).toHaveLength(84);
  expect(metrics.storageBytes).toBe(5460);
  expect(metrics.snapshot().series.every((s) => s.state === 'empty')).toBe(
    true,
  );
  for (const row of metricSeries)
    expect(metrics.record({ ...row, value: 0 })).toBe(true);
  expect(metricSnapshotSchema.safeParse(metrics.snapshot()).success).toBe(true);
  expect(metrics.snapshot().series.every((s) => s.state === 'current')).toBe(
    true,
  );
});
it('computes nearest-rank bucket bounds for p50 p95 p99 rather than an average', () => {
  const metrics = new BoundedMetrics(() => 1);
  for (let n = 1; n <= 100; n++) metrics.record({ ...sample, value: n });
  expect(row(metrics)).toMatchObject({
    count: 100,
    p50Ms: 50,
    p95Ms: 100,
    p99Ms: 100,
    overflow: 0,
  });
});
it('reports overflow honestly and keeps counter and rejection saturation bounded', () => {
  const metrics = new BoundedMetrics(() => 1);
  for (let n = 0; n < metricCountLimit; n++)
    metrics.record({ ...sample, value: 60001 });
  expect(row(metrics)).toMatchObject({
    count: 65535,
    overflow: 65535,
    p50Ms: null,
    p95Ms: null,
    p99Ms: null,
  });
  for (let n = 0; n <= metricCountLimit; n++)
    expect(metrics.record(sample)).toBe(false);
  expect(metrics.snapshot().dropped).toBe(65535);
  expect(row(metrics)).toMatchObject({ count: 65535 });
  expect(metrics.storageBytes).toBe(5460);
});
it('expires at the exact tumbling boundary and distinguishes empty stale and reset', () => {
  let now = 59999;
  const metrics = new BoundedMetrics(() => now);
  metrics.record(sample);
  metrics.record({ name: 'db_used', service: 'api', value: 2 });
  now = metricWindowMs;
  expect(row(metrics)).toMatchObject({
    state: 'stale',
    count: 0,
    p99Ms: null,
  });
  expect(row(metrics, 'db_used')).toMatchObject({
    state: 'stale',
    value: null,
  });
  expect(metrics.snapshot()).toMatchObject({
    windowStartMs: 60000,
    windowEndMs: 120000,
  });
  expect(metrics.snapshot().series.some((s) => s.state === 'empty')).toBe(true);
  metrics.record(sample);
  expect(row(metrics)).toMatchObject({ state: 'current', count: 1 });
  metrics.reset();
  expect(metrics.snapshot().series.every((s) => s.state === 'empty')).toBe(
    true,
  );
  now = 100 * metricWindowMs;
  expect(row(metrics)).toMatchObject({ state: 'empty', count: 0 });
});
it('keeps gauges latest-only independent and rejects fractional integer or Redis values', () => {
  const metrics = new BoundedMetrics(() => 1);
  for (const value of [10, 20])
    expect(
      metrics.record({ name: 'rss_bytes', service: 'worker', value }),
    ).toBe(true);
  expect(
    metrics.record({ name: 'cpu_cores', service: 'worker', value: 1.5 }),
  ).toBe(true);
  expect(
    metrics.record({ name: 'redis_ready', service: 'worker', value: 2 }),
  ).toBe(false);
  expect(metrics.record({ name: 'db_used', service: 'api', value: 1.5 })).toBe(
    false,
  );
  expect(row(metrics, 'rss_bytes', 'worker')).toMatchObject({
    state: 'current',
    value: 20,
  });
  expect(row(metrics)).toMatchObject({ state: 'empty', count: 0 });
});
it('rejects invalid numbers labels and secret-bearing extras without retaining them', () => {
  const metrics = new BoundedMetrics(() => 1);
  for (const input of [
    null,
    [],
    'private-canary',
    ...[NaN, Infinity, -1, Number.MAX_VALUE].map((value) => ({
      ...sample,
      value,
    })),
    { ...sample, service: 'private-canary' },
    { ...sample, name: 'private-canary' },
    { ...sample, route: 'private-canary' },
    { ...sample, outcome: 'private-canary' },
    ...[
      'organizationId',
      'siteId',
      'requestId',
      'userId',
      'body',
      'authorization',
    ].map((key) => ({ ...sample, [key]: 'private-canary' })),
  ]) {
    expect(metricInputSchema.safeParse(input).success).toBe(false);
    expect(metrics.record(input)).toBe(false);
  }
  expect(JSON.stringify(metrics.snapshot())).not.toContain('private-canary');
  expect(row(metrics)).toMatchObject({ count: 0, state: 'empty' });
});
it('refuses high-cardinality attempts and never grows the retained universe', () => {
  const metrics = new BoundedMetrics(() => 1);
  for (let n = 0; n < 2000; n++)
    expect(metrics.record({ ...sample, route: `/secret/${n}` })).toBe(false);
  expect(metrics.snapshot().series).toHaveLength(84);
  expect(metrics.snapshot().dropped).toBe(2000);
  expect(metrics.storageBytes).toBe(5460);
});
it('detaches snapshots and clears rejected observations when a window or reset expires', () => {
  let now = 1;
  const metrics = new BoundedMetrics(() => now);
  metrics.record(sample);
  const snapshot = metrics.snapshot();
  snapshot.series.length = 0;
  expect(row(metrics)).toMatchObject({ count: 1 });
  metrics.record({ ...sample, requestId: 'private-canary' });
  metrics.reset();
  expect(metrics.snapshot().dropped).toBe(0);
  metrics.record(null);
  now = metricWindowMs;
  expect(metrics.snapshot().dropped).toBe(0);
});
it('refuses invalid or backward clocks with a constant sanitized domain error', () => {
  let now = 10;
  const metrics = new BoundedMetrics(() => now);
  for (const invalid of [9, NaN, Infinity, -1, Number.MAX_SAFE_INTEGER]) {
    now = invalid;
    expect(() => metrics.snapshot()).toThrow(MetricClockError);
    expect(() => metrics.record(sample)).toThrow('METRIC_CLOCK_INVALID');
  }
  now = 10;
  expect(metrics.record(sample)).toBe(true);
  expect(() => new BoundedMetrics(() => NaN)).toThrow(MetricClockError);
});
