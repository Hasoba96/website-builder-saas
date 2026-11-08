import { Writable } from 'node:stream';
import { vi } from 'vitest';
import { StructuredLogger } from '@website-builder/observability';

export function observerFixture(
  service: 'api' | 'worker' = 'api',
  fail = false,
) {
  const lines: string[] = [];
  const output = new Writable({
    write(bytes, _encoding, done) {
      lines.push(String(bytes));
      done();
    },
  });
  const write = vi.spyOn(output, 'write');
  if (fail)
    write.mockImplementation(() => {
      throw Error('diagnostic-private-canary');
    });
  return {
    logger: new StructuredLogger(service, 'ci', output),
    output,
    write,
    lines,
  };
}
