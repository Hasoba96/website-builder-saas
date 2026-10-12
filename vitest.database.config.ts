import { defineConfig } from 'vitest/config';
import { testPolicy } from './scripts/test-policy.ts';
export default defineConfig({
  test: {
    ...testPolicy('database'),
    include: ['tests/database/**/*.spec.ts'],
    testTimeout: 30000,
    hookTimeout: 10000,
    fileParallelism: false,
  },
});
