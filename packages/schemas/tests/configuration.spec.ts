import { expect, it } from 'vitest';
import { environmentSchema, listenerSchema } from '../src/configuration.js';

it.each(['preview', 'staging', 'production'])(
  'requires production mode for %s',
  (APP_ENV) => {
    expect(
      environmentSchema.safeParse({ APP_ENV, NODE_ENV: 'development' }).success,
    ).toBe(false);
    expect(
      environmentSchema.safeParse({ APP_ENV, NODE_ENV: 'production' }).success,
    ).toBe(true);
  },
);
it.each(['0', '65536', '-1', '1.5', '1e3', '', ' 3000', 'NaN'])(
  'rejects malformed port %s',
  (PORT) => {
    expect(listenerSchema.safeParse({ HOST: '127.0.0.1', PORT }).success).toBe(
      false,
    );
  },
);
it('accepts port boundaries and rejects unknown contract keys', () => {
  for (const PORT of ['1', '65535'])
    expect(listenerSchema.parse({ HOST: '::1', PORT }).PORT).toBe(Number(PORT));
  expect(
    listenerSchema.safeParse({
      HOST: 'localhost',
      PORT: '3000',
      secret: 'canary',
    }).success,
  ).toBe(false);
});
