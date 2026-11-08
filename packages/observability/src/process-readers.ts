import { ObserverInputError } from './observer-errors.js';

export type ProcessReaders = {
  clock: () => number;
  cpu: () => NodeJS.CpuUsage;
  rss: () => number;
};
/** Validates trusted owner adapters without reading CPU/RSS or retaining input objects. */
export function processReaders(
  options: Partial<ProcessReaders> = {},
): ProcessReaders {
  try {
    const readers = {
      clock: options?.clock ?? (() => performance.now()),
      cpu: options?.cpu ?? (() => process.cpuUsage()),
      rss: options?.rss ?? (() => process.memoryUsage().rss),
    };
    if (Object.values(readers).some((reader) => typeof reader !== 'function'))
      throw new ObserverInputError();
    return readers;
  } catch {
    throw new ObserverInputError();
  }
}
