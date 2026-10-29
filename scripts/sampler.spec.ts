import { afterEach, expect, it, vi } from 'vitest';
import { spawnSync } from 'node:child_process';
import {
  BoundedMetrics,
  createProcessSampler,
} from '@website-builder/observability';
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});
function fixture(service: 'api' | 'worker' = 'api', native = false) {
  vi.useFakeTimers();
  const data = {
    time: 0,
    cpu: 0,
    rss: 1024,
    logical: 0,
  };
  const metrics = new BoundedMetrics(() => data.logical);
  const readers = {
    clock: vi.fn(() => data.time),
    cpu: vi.fn(() => ({ user: data.cpu, system: 0 })),
    rss: vi.fn(() => data.rss),
  };
  const sampler = createProcessSampler(
    metrics,
    service,
    native ? { clock: readers.clock } : readers,
  );
  const tick = (elapsed = 1000, cpu = 0) => {
    data.time += elapsed;
    data.cpu += cpu;
    vi.advanceTimersByTime(1000);
  };
  return { service, data, metrics, readers, sampler, tick };
}
const row = (f: ReturnType<typeof fixture>, name: string) =>
  f.metrics
    .snapshot()
    .series.find((s) => s.name === name && s.service === f.service);
const check = (
  f: ReturnType<typeof fixture>,
  name: string,
  value: number | null,
  state = value === null ? 'stale' : 'current',
) => expect(row(f, name)).toMatchObject({ state, value });
it('samples CPU core units and native RSS bytes', () => {
  const f = fixture();
  expect(vi.getTimerCount()).toBe(0);
  expect(f.readers.cpu).not.toHaveBeenCalled();
  expect(f.sampler.start()).toBe(true);
  expect(f.sampler.start()).toBe(true);
  expect(vi.getTimerCount()).toBe(1);
  expect(f.readers.cpu).toHaveBeenCalledTimes(1);
  f.tick(1000, 2_000_000);
  for (const [name, value] of Object.entries({
    cpu_cores: 2,
    rss_bytes: 1024,
  }))
    check(f, name, value);
  f.tick();
  check(f, 'cpu_cores', 0);
  f.sampler.stop();
});
it('rejects invalid CPU pairs and recovers without clamps', () => {
  for (const [time, cpu] of [
    [1000, 2_000_000],
    [999, 2_000_000],
    [NaN, 2_000_000],
    [Infinity, 2_000_000],
    [62000, 2_000_000],
    [2000, 1],
    [2000, Number.MAX_SAFE_INTEGER + 1],
  ]) {
    const f = fixture();
    f.sampler.start();
    f.tick(1000, 2_000_000);
    f.data.time = time!;
    f.data.cpu = cpu!;
    vi.advanceTimersByTime(1000);
    check(f, 'cpu_cores', null);
    f.data.time = Number.isFinite(time) && time! > 1000 ? time! + 1000 : 2000;
    f.data.cpu = 3_000_000;
    vi.advanceTimersByTime(1000);
    f.tick(1000, 1_000_000);
    check(f, 'cpu_cores', 1);
    f.sampler.stop();
  }
});
it('invalidates bad RSS and contains reader failures', () => {
  const f = fixture();
  f.sampler.start();
  f.tick(1000, 1000);
  for (const value of [NaN, Infinity, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    f.data.rss = value;
    f.tick();
    check(f, 'rss_bytes', null);
  }
  expect(f.metrics.snapshot().dropped).toBeGreaterThan(0);
  f.readers.rss.mockImplementationOnce(() => {
    throw Error('l02b-private');
  });
  expect(() => f.tick()).not.toThrow();
  check(f, 'rss_bytes', null);
  f.data.rss = 2048;
  f.tick();
  check(f, 'rss_bytes', 2048);
  expect(JSON.stringify(f.metrics.snapshot())).not.toContain('l02b-private');
  f.sampler.stop();
});
it('disposes only owned gauges and refuses unsafe targets', () => {
  const f = fixture();
  f.sampler.start();
  f.tick(1000, 1000);
  f.metrics.record({ name: 'rss_bytes', service: 'worker', value: 7 });
  f.metrics.record({
    name: 'http_duration_ms',
    service: 'api',
    route: 'other',
    outcome: 'success',
    value: 10,
  });
  f.sampler.stop();
  f.sampler.stop();
  expect(vi.getTimerCount()).toBe(0);
  f.tick();
  expect(f.readers.rss).toHaveBeenCalledTimes(1);
  expect(f.sampler.start()).toBe(false);
  check(f, 'rss_bytes', null);
  const snapshot = f.metrics.snapshot();
  expect(snapshot.series).toContainEqual(
    expect.objectContaining({ name: 'rss_bytes', service: 'worker', value: 7 }),
  );
  expect(snapshot.series).toContainEqual(
    expect.objectContaining({
      name: 'http_duration_ms',
      service: 'api',
      route: 'other',
      outcome: 'success',
      count: 1,
    }),
  );
  expect(f.metrics.invalidateGauge('http_duration_ms', 'api')).toBe(false);
  expect(f.metrics.invalidateGauge('rss_bytes', 'l02b-private')).toBe(false);
  expect(f.metrics.snapshot().series).toEqual(snapshot.series);
});
it('contains invalid startup and reentrant early shutdown', () => {
  for (const time of [-1, NaN, Infinity, Number.MAX_SAFE_INTEGER]) {
    const f = fixture();
    f.data.time = time;
    expect(f.sampler.start()).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  }
  const f = fixture();
  f.readers.cpu.mockImplementationOnce(() => {
    throw Error('l02b-private');
  });
  expect(f.sampler.start()).toBe(false);
  expect(f.sampler.start()).toBe(false);
  const reentrant = fixture();
  reentrant.readers.clock.mockImplementationOnce(() => {
    expect(reentrant.sampler.start()).toBe(false);
    return 0;
  });
  expect(reentrant.sampler.start()).toBe(true);
  expect(vi.getTimerCount()).toBe(1);
  reentrant.sampler.stop();
  expect(vi.getTimerCount()).toBe(0);
  const g = fixture();
  g.readers.clock.mockImplementation(() => {
    g.sampler.stop();
    return 0;
  });
  expect(g.sampler.start()).toBe(false);
  expect(g.readers.cpu).not.toHaveBeenCalled();
  const h = fixture();
  h.sampler.start();
  h.readers.cpu.mockImplementation(() => {
    h.sampler.stop();
    return { user: 0, system: 0 };
  });
  expect(() => h.tick()).not.toThrow();
  expect(h.readers.rss).not.toHaveBeenCalled();
  expect(vi.getTimerCount()).toBe(0);
  expect(() =>
    createProcessSampler(h.metrics, 'l02b-private' as 'api'),
  ).toThrow('METRIC_SAMPLER_INPUT_INVALID');
});
it('rejects rate overflow and contains collector errors', () => {
  const f = fixture();
  f.sampler.start();
  f.data.time = Number.MIN_VALUE;
  f.data.cpu = 1;
  vi.advanceTimersByTime(1000);
  check(f, 'cpu_cores', null, 'empty');
  expect(f.metrics.snapshot().dropped).toBeGreaterThan(0);
  vi.spyOn(f.metrics, 'record').mockImplementation(() => {
    throw Error('l02b-private');
  });
  expect(() => f.tick()).not.toThrow();
  f.sampler.stop();
});
it('reads native RSS and unrefs timers in real children', () => {
  const f = fixture('worker', true);
  f.sampler.start();
  f.tick();
  const rss = row(f, 'rss_bytes');
  expect(rss).toMatchObject({ state: 'current' });
  expect(rss && 'value' in rss && rss.value! > 0).toBe(true);
  f.sampler.stop();
  vi.useRealTimers();
  for (const fail of [false, true]) {
    const code = `import {BoundedMetrics,createProcessSampler} from '@website-builder/observability';
const s=createProcessSampler(new BoundedMetrics(),'worker');
if(!s.start())process.exit(2);
${fail ? 'try{throw Error()}catch{}finally{s.stop();s.stop()}' : ''}`;
    const child = spawnSync(
      process.execPath,
      ['--input-type=module', '-e', code],
      { encoding: 'utf8', timeout: 5000 },
    );
    expect(child.error).toBeUndefined();
    expect(child.status).toBe(0);
  }
});
