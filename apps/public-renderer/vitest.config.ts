import { defineConfig } from 'vitest/config';
import { testPolicy } from '../../scripts/test-policy.js';
export default defineConfig({
  oxc: { jsx: { runtime: 'automatic' } },
  test: {
    ...testPolicy('public-renderer'),
    include: ['tests/**/*.spec.ts'],
    testTimeout: 10_000,
  },
});
