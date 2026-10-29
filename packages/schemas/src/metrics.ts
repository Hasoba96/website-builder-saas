import { z } from 'zod';
import { logSchema } from './operations.js';

export const metricWindowMs = 60_000;
export const metricCountLimit = 65_535;
export const latencyBounds = Object.freeze([
  1, 5, 10, 25, 50, 100, 250, 500, 1000, 5000, 10000, 60000,
]);
const service = logSchema.shape.service;
const route = z.enum(['health', 'ready', 'other']);
const outcome = z.enum([
  'success',
  'redirect',
  'client_error',
  'server_error',
  'aborted',
]);
const gauge = z.enum([
  'rss_bytes',
  'cpu_cores',
  'db_used',
  'db_limit',
  'db_waiting',
  'redis_ready',
]);
const value = z.number().finite().nonnegative().max(Number.MAX_SAFE_INTEGER);
const gaugeFields = { name: gauge, service };
const count = z.int().min(0).max(metricCountLimit);
const histogram = {
  name: z.literal('http_duration_ms'),
  service,
  route,
  outcome,
};
export const metricInputSchema = z.discriminatedUnion('name', [
  z.strictObject({ ...histogram, value }),
  z
    .strictObject({ ...gaugeFields, value })
    .refine(
      (v) =>
        (v.name === 'cpu_cores' || Number.isSafeInteger(v.value)) &&
        (v.name !== 'redis_ready' || v.value <= 1),
    ),
]);
export const metricSeries = Object.freeze(
  service.options
    .flatMap((service) => [
      ...route.options.flatMap((route) =>
        outcome.options.map((outcome) => ({
          name: 'http_duration_ms' as const,
          service,
          route,
          outcome,
        })),
      ),
      ...gauge.options.map((name) => ({ name, service })),
    ])
    .map((row) => Object.freeze(row)),
);
const state = z.enum(['empty', 'stale', 'current']);
const quantile = value.nullable();
const quantiles = { p50Ms: quantile, p95Ms: quantile, p99Ms: quantile };
export const metricSnapshotSchema = z.strictObject({
  windowStartMs: value,
  windowEndMs: value,
  dropped: count,
  series: z
    .array(
      z.discriminatedUnion('name', [
        z.strictObject({
          ...histogram,
          state,
          count,
          overflow: count,
          ...quantiles,
        }),
        z.strictObject({ ...gaugeFields, state, value: value.nullable() }),
      ]),
    )
    .length(metricSeries.length),
});
export type MetricSnapshot = z.output<typeof metricSnapshotSchema>;
