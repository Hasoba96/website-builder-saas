import { Test } from '@nestjs/testing';
import { afterEach, expect, it, vi } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { bootstrap } from '../src/bootstrap.js';
afterEach(() => vi.unstubAllEnvs());

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
  vi.stubEnv('NODE_ENV', 'test');
  vi.stubEnv('APP_ENV', 'ci');
  const app = await bootstrap();
  try {
    expect(app.get(AppModule)).toBeInstanceOf(AppModule);
  } finally {
    await app.close();
  }
});
