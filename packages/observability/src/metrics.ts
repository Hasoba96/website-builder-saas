import {
  metricInputSchema,
  metricSeries,
  metricWindowMs,
  metricCountLimit,
  latencyBounds,
  type MetricSnapshot,
} from '@website-builder/schemas/metrics';

export class MetricClockError extends Error {
  constructor() {
    super('METRIC_CLOCK_INVALID');
  }
}
/** Inert, process-local aggregates only; no raw observations are retained. */
export class BoundedMetrics {
  readonly #stride = latencyBounds.length + 2;
  readonly #counts = new Uint32Array(metricSeries.length * this.#stride);
  readonly #values = new Float64Array(metricSeries.length).fill(NaN);
  readonly #seen = new Uint8Array(metricSeries.length);
  #epoch = -1;
  #last = 0;
  #dropped = 0;
  constructor(readonly clock: () => number = () => performance.now()) {
    this.#advance();
  }
  get storageBytes() {
    return (
      this.#counts.byteLength + this.#values.byteLength + this.#seen.byteLength
    );
  }
  #clear() {
    this.#counts.fill(0);
    this.#values.fill(NaN);
    this.#dropped = 0;
  }
  #advance() {
    const now = this.clock();
    if (
      !Number.isFinite(now) ||
      now < this.#last ||
      now > Number.MAX_SAFE_INTEGER - metricWindowMs
    )
      throw new MetricClockError();
    this.#last = now;
    const epoch = Math.floor(now / metricWindowMs);
    if (epoch !== this.#epoch) {
      this.#clear();
      this.#epoch = epoch;
    }
  }
  #drop() {
    this.#dropped = Math.min(metricCountLimit, this.#dropped + 1);
    return false;
  }
  record(input: unknown): boolean {
    this.#advance();
    const parsed = metricInputSchema.safeParse(input);
    if (!parsed.success) return this.#drop();
    const data = parsed.data;
    const index = metricSeries.findIndex(
      (s) =>
        s.name === data.name &&
        s.service === data.service &&
        (data.name !== 'http_duration_ms' ||
          (s.name === 'http_duration_ms' &&
            s.route === data.route &&
            s.outcome === data.outcome)),
    );
    const offset = index * this.#stride;
    if (data.name === 'http_duration_ms') {
      if (this.#counts[offset]! >= metricCountLimit) return this.#drop();
      const bucket = latencyBounds.findIndex((bound) => data.value <= bound);
      this.#counts[offset]!++;
      this.#counts[
        offset + 1 + (bucket < 0 ? latencyBounds.length : bucket)
      ]!++;
    } else this.#values[index] = data.value;
    this.#seen[index] = 1;
    return true;
  }
  reset() {
    this.#advance();
    this.#clear();
    this.#seen.fill(0);
  }
  snapshot(): MetricSnapshot {
    this.#advance();
    return {
      windowStartMs: this.#epoch * metricWindowMs,
      windowEndMs: (this.#epoch + 1) * metricWindowMs,
      dropped: this.#dropped,
      series: metricSeries.map((s, index) => {
        const offset = index * this.#stride,
          count = this.#counts[offset]!;
        const current =
          s.name === 'http_duration_ms'
            ? count > 0
            : !Number.isNaN(this.#values[index]);
        const state = current
          ? 'current'
          : this.#seen[index]
            ? 'stale'
            : 'empty';
        if (s.name !== 'http_duration_ms')
          return { ...s, state, value: current ? this.#values[index]! : null };
        const quantile = (fraction: number) => {
          if (!count) return null;
          let accumulated = 0;
          for (let b = 0; b < latencyBounds.length; b++) {
            accumulated += this.#counts[offset + 1 + b]!;
            if (accumulated >= Math.ceil(fraction * count))
              return latencyBounds[b]!;
          }
          return null;
        };
        return {
          ...s,
          state,
          count,
          overflow: this.#counts[offset + 1 + latencyBounds.length]!,
          p50Ms: quantile(0.5),
          p95Ms: quantile(0.95),
          p99Ms: quantile(0.99),
        };
      }),
    };
  }
}
