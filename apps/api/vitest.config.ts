import { defineConfig } from 'vitest/config';
import { testPolicy } from '../../scripts/test-policy.js';
export default defineConfig({
  test: {
    ...testPolicy('api'),
    include: ['tests/**/*.spec.ts'],
    testTimeout: 10000,
  },
});
