import { defineConfig } from '@playwright/test';
import { evidenceDirectory } from './scripts/test-policy.ts';
import { resolve } from 'node:path';
export default defineConfig({
  captureGitInfo: { commit: false, diff: false },
  testDir: './tests/browser',
  forbidOnly: true,
  reporter: [
    ['list'],
    ['json', { outputFile: resolve(evidenceDirectory, 'browser.json') }],
  ],
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  preserveOutput: 'always',
  use: {
    browserName: 'chromium',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'en-US',
    timezoneId: 'UTC',
  },
  webServer: [
    {
      command: 'node ../../scripts/next.ts start',
      env: {
        APP_ENV: 'ci',
        NODE_ENV: 'production',
        HOST: '127.0.0.1',
        PORT: '3100',
        CONFIG_PRIVATE_CANARY: '00c-server-only-canary-not-a-credential',
        REDIS_PASSWORD: '00e-server-only-canary-not-a-credential',
      },
      cwd: './apps/dashboard-web',
      url: 'http://127.0.0.1:3100/ar',
      timeout: 60_000,
      reuseExistingServer: false,
    },
    {
      command: 'node ../../scripts/next.ts start',
      env: {
        APP_ENV: 'ci',
        NODE_ENV: 'production',
        HOST: '127.0.0.1',
        PORT: '3102',
        CONFIG_PRIVATE_CANARY: '00c-server-only-canary-not-a-credential',
        REDIS_PASSWORD: '00e-server-only-canary-not-a-credential',
      },
      cwd: './apps/public-renderer',
      url: 'http://127.0.0.1:3102/ar',
      timeout: 60_000,
      reuseExistingServer: false,
    },
  ],
});
