import { expect, it, vi } from 'vitest';
import {
  ObserverInputError,
  processReaders,
} from '@website-builder/observability';

it('exposes a sanitized expected domain error without retaining supplied input', () => {
  const error = new ObserverInputError();
  expect(error).toBeInstanceOf(Error);
  expect(error).toMatchObject({
    name: 'ObserverInputError',
    code: 'VALIDATION_FAILED',
  });
  expect(error.message).toBe('METRIC_OBSERVER_INPUT_INVALID');
  expect(Object.hasOwn(error, 'cause')).toBe(false);
});
it('validates trusted reader adapters without invoking them or retaining their container', () => {
  const cpu = vi.fn(() => ({ user: 0, system: 0 }));
  const options = { cpu },
    readers = processReaders(options);
  expect(readers.cpu).toBe(cpu);
  expect(cpu).not.toHaveBeenCalled();
  options.cpu = vi.fn(() => ({ user: 5, system: 5 }));
  expect(readers.cpu).toBe(cpu);
  expect(processReaders().rss()).toBeGreaterThan(0);
  expect(processReaders().clock()).toBeGreaterThanOrEqual(0);
});
it('rejects invalid reader types and hostile getters as domain failures', () => {
  for (const key of ['clock', 'cpu', 'rss']) {
    expect(() => processReaders({ [key]: 1 })).toThrow(ObserverInputError);
    const hostile = Object.defineProperty({}, key, {
      get() {
        throw Error('reader-private-canary');
      },
    });
    expect(() => processReaders(hostile)).toThrow(ObserverInputError);
  }
});
