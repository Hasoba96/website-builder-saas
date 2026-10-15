import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import type { InlineConfig } from 'vitest/node';

export const repository = fileURLToPath(new URL('../', import.meta.url));
export const evidenceDirectory = resolve(repository, '.local/test-evidence');

// Test configuration only. Each runner owns a distinct report/coverage directory.
export function testPolicy(name: string): InlineConfig {
  return {
    allowOnly: false,
    passWithNoTests: false,
    retry: 0,
    expect: { requireAssertions: true },
    reporters: [
      'default',
      ['json', { outputFile: resolve(evidenceDirectory, `${name}.json`) }],
    ],
    coverage: {
      enabled: true,
      provider: 'v8',
      reportsDirectory: resolve(repository, 'coverage', name),
      reporter: ['text-summary', 'json-summary', 'html'],
      include: ['root', 'database', 'redis', 'local'].includes(name)
        ? [
            'packages/*/dist/**/*.js',
            'scripts/**/*.ts',
            'tests/database/backup-smoke.ts',
          ]
        : ['src/**/*.{ts,tsx}'],
      exclude: ['**/*.spec.ts', '**/*.d.ts', '**/test-*.ts'],
    },
  };
}
