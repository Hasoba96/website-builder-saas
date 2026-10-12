import { defineConfig } from 'vitest/config';
import { testPolicy } from './scripts/test-policy.ts';
export default defineConfig({
  test: {
    ...testPolicy('root'),
    include: ['scripts/**/*.spec.ts'],
    testTimeout: 30_000,
  },
});
