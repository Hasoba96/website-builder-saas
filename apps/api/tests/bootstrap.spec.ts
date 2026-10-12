import { Test } from '@nestjs/testing';
import { expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { bootstrap } from '../src/bootstrap.js';
import { readApiConfig } from '@website-builder/config/api';

it('initializes the real Nest module and closes its context', async () => {
  const module = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  try {
    await module.init();
    expect(module.get(AppModule)).toBeInstanceOf(AppModule);
  } finally {
    await module.close();
  }
});
it('boots the real application and releases its resources', async () => {
  const app = await bootstrap(
    readApiConfig({
      NODE_ENV: 'test',
      APP_ENV: 'ci',
      HOST: '127.0.0.1',
      PORT: '3301',
    }),
  );
  const address = await app.getUrl();
  try {
    expect(app.get(AppModule)).toBeInstanceOf(AppModule);
    const response = await fetch(address, {
      signal: AbortSignal.timeout(5_000),
    });
    expect(response.status).toBe(404);
    expect(response.headers.has('x-powered-by')).toBe(false);
    expect(await response.text()).not.toMatch(/stack|node_modules|NestJS/);
  } finally {
    await app.close();
  }
  await expect(
    fetch(address, { signal: AbortSignal.timeout(2_000) }),
  ).rejects.toThrow();
});
