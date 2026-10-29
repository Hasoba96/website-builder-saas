import type { BoundedMetrics } from './metrics.js';
import { metricWindowMs } from '@website-builder/schemas/metrics';

type Readers = {
  clock: () => number;
  cpu: () => NodeJS.CpuUsage;
  rss: () => number;
};
/** Explicit-start fixture component; trusted readers are synchronous, read-only owner interfaces. */
export function createProcessSampler(
  metrics: BoundedMetrics,
  service: 'api' | 'worker',
  options: Partial<Readers> | undefined = {},
) {
  if (!['api', 'worker'].includes(service))
    throw Error('METRIC_SAMPLER_INPUT_INVALID');
  let readers: Readers | undefined;
  try {
    readers = {
      clock: options?.clock ?? (() => performance.now()),
      cpu: options?.cpu ?? (() => process.cpuUsage()),
      rss: options?.rss ?? (() => process.memoryUsage().rss),
    };
  } catch {
    throw Error('METRIC_SAMPLER_INPUT_INVALID');
  }
  if (
    Object.values(readers).some(
      (fn) => fn !== undefined && typeof fn !== 'function',
    )
  )
    throw Error('METRIC_SAMPLER_INPUT_INVALID');
  let timer: ReturnType<typeof setInterval> | undefined,
    previous: { time: number; cpu: number } | undefined,
    last = 0,
    starting = false;
  const valid = (x: unknown): x is number =>
    Number.isSafeInteger(x) && Number(x) >= 0;
  const owned = ['cpu_cores', 'rss_bytes'];
  function clear(name: string) {
    try {
      metrics.invalidateGauge(name, service);
    } catch {
      /* Invalid collector clock stays unavailable. */
    }
  }
  function write(name: string, value: unknown) {
    if (!timer) return false;
    try {
      if (metrics.record({ name, service, value }) && timer) return true;
    } catch {
      /* No reader/collector error escapes. */
    }
    clear(name);
    return false;
  }
  function point() {
    const time = readers?.clock();
    if (
      !readers ||
      time === undefined ||
      !Number.isFinite(time) ||
      time < last ||
      time > Number.MAX_SAFE_INTEGER - metricWindowMs
    )
      return;
    last = time;
    const usage = readers.cpu();
    if (
      !readers ||
      !usage ||
      !valid(usage.user) ||
      !valid(usage.system) ||
      !valid(usage.user + usage.system)
    )
      return;
    return { time, cpu: usage.user + usage.system };
  }
  function tick() {
    if (!timer || !readers) return;
    try {
      const current = point();
      if (!timer) return;
      const elapsed = current && previous ? current.time - previous.time : 0;
      if (
        current &&
        previous &&
        elapsed > 0 &&
        elapsed <= metricWindowMs &&
        current.cpu >= previous.cpu
      )
        write('cpu_cores', (current.cpu - previous.cpu) / (elapsed * 1000));
      else clear('cpu_cores');
      previous = current;
    } catch {
      previous = undefined;
      clear('cpu_cores');
    }
    if (!timer || !readers) return;
    try {
      write('rss_bytes', readers.rss());
    } catch {
      clear('rss_bytes');
    }
  }

  function stop() {
    const active = !!timer;
    clearInterval(timer);
    timer = undefined;
    readers = undefined;
    previous = undefined;
    if (active) owned.forEach(clear);
  }
  return {
    start() {
      if (timer) return true;
      if (!readers || starting) return false;
      starting = true;
      try {
        previous = point();
        if (!previous || !readers) {
          stop();
          return false;
        }
        timer = setInterval(tick, 1000);
        timer.unref();
        return true;
      } catch {
        stop();
        return false;
      } finally {
        starting = false;
      }
    },
    stop,
  };
}
