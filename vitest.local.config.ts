import { defineConfig } from 'vitest/config';
import { testPolicy } from './scripts/test-policy.ts';
export default defineConfig({
  test: {
    ...testPolicy('local'),
    include: ['tests/local/**/*.spec.ts'],
    fileParallelism: false,
    testTimeout: 120000,
    hookTimeout: 120000,
  },
});
