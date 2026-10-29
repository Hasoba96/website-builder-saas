import assert from 'node:assert/strict';
import { readdirSync, mkdirSync, unlinkSync, existsSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import type { JsonTestResults } from 'vitest/node';
import type { JSONReport, JSONReportSuite } from '@playwright/test/reporter';
import { evidenceDirectory, repository } from './test-policy.ts';

export const suites = {
  root: [
    'scripts/metrics-node.spec.ts',
    'scripts/metrics.spec.ts',
    'scripts/backup-scope.spec.ts',
    'scripts/ci.spec.ts',
    'scripts/local-infrastructure.spec.ts',
    'scripts/check-boundaries.spec.ts',
    'scripts/configuration.spec.ts',
    'scripts/observability.spec.ts',
    'scripts/process-lifecycle.spec.ts',
    'scripts/scan-secrets.spec.ts',
    'scripts/security.spec.ts',
    'scripts/test-evidence.spec.ts',
  ],
  api: [
    'apps/api/tests/bootstrap.spec.ts',
    'apps/api/tests/operations.spec.ts',
    'apps/api/tests/security.spec.ts',
  ],
  worker: ['apps/worker/tests/bootstrap.spec.ts'],
  config: [
    'packages/config/tests/environment.spec.ts',
    'packages/config/tests/database.spec.ts',
    'packages/config/tests/queues.spec.ts',
    'packages/config/tests/locales.spec.ts',
  ],
  schemas: ['packages/schemas/tests/configuration.spec.ts'],
  'dashboard-web': [
    'apps/dashboard-web/tests/states.spec.ts',
    'apps/dashboard-web/tests/translations.spec.ts',
  ],
  'public-renderer': [
    'apps/public-renderer/tests/states.spec.ts',
    'apps/public-renderer/tests/translations.spec.ts',
  ],
  database: [
    'tests/database/backup.spec.ts',
    'tests/database/foundation.spec.ts',
    'tests/database/operations.spec.ts',
  ],
  redis: ['tests/redis/foundation.spec.ts'],
  local: ['tests/local/foundation.spec.ts'],
  browser: [
    'tests/browser/configuration.spec.ts',
    'tests/browser/hydration.spec.ts',
    'tests/browser/operations.spec.ts',
    'tests/browser/security.spec.ts',
    'tests/browser/shell.spec.ts',
  ],
};
const normalize = (path: string) => path.replaceAll('\\', '/');

export const minimumTests: Record<keyof typeof suites, number> = {
  root: 79,
  local: 7,
  api: 7,
  worker: 2,
  config: 29,
  schemas: 12,
  'dashboard-web': 4,
  'public-renderer': 4,
  database: 17,
  redis: 15,
  browser: 25,
};

export function validateVitest(report: JsonTestResults, expected: string[]) {
  assert.equal(report.success, true, 'Runner did not succeed');
  assert.ok(report.numTotalTests > 0, 'Zero tests');
  assert.equal(
    report.numPassedTests,
    report.numTotalTests,
    'Incomplete/skip/todo tests',
  );
  assert.equal(
    report.numPendingTests + report.numTodoTests + report.numFailedTests,
    0,
  );
  for (const file of expected) {
    const result = report.testResults.find(
      (r) => normalize(relative(repository, r.name)) === file,
    );
    assert.ok(result, `Missing suite: ${file}`);
    assert.equal(result.status, 'passed', `Failed suite: ${file}`);
    assert.ok(result.assertionResults.length > 0, `Empty suite: ${file}`);
  }
  for (const file of report.testResults)
    for (const test of file.assertionResults)
      assert.equal(test.status, 'passed', 'Non-passing test');
  return report.numPassedTests;
}

export function validateCoverage(report: unknown) {
  const value = report as
    { total?: { statements?: { total?: number } } } | undefined;
  assert.ok(
    typeof value?.total?.statements?.total === 'number' &&
      value.total.statements.total > 0,
    'Missing or empty coverage',
  );
}

export function validateBrowser(report: JSONReport, expected: string[]) {
  assert.equal(report.errors.length, 0, 'Browser runner errors');
  assert.ok(report.stats.expected > 0, 'Zero browser tests');
  assert.equal(
    report.stats.unexpected + report.stats.skipped + report.stats.flaky,
    0,
  );
  const found = new Set<string>();
  function visit(suite: JSONReportSuite) {
    for (const spec of suite.specs) {
      assert.ok(spec.tests.length > 0, 'Empty browser spec');
      for (const test of spec.tests) {
        assert.equal(
          test.expectedStatus,
          'passed',
          'Expected failures are not closure evidence',
        );
        assert.equal(test.results.length, 1, 'Missing/retried browser test');
        assert.equal(
          test.results[0]?.status,
          'passed',
          'Skipped/failed browser test',
        );
      }
      found.add(
        normalize(
          relative(repository, resolve(report.config.rootDir, spec.file)),
        ),
      );
    }
    for (const child of suite.suites ?? []) visit(child);
  }
  report.suites.forEach(visit);
  for (const file of expected)
    assert.ok(found.has(file), `Missing browser suite: ${file}`);
  return report.stats.expected;
}

export function prepareEvidence() {
  mkdirSync(evidenceDirectory, { recursive: true });
  for (const name of [...Object.keys(suites), 'summary']) {
    const path = resolve(evidenceDirectory, `${name}.json`);
    if (existsSync(path)) unlinkSync(path);
    if (name !== 'browser' && name !== 'summary') {
      const coverage = resolve(
        repository,
        'coverage',
        name,
        'coverage-summary.json',
      );
      if (existsSync(coverage)) unlinkSync(coverage);
    }
  }
  // A newly added suite must acquire explicit ownership, never fall outside discovery silently.
  function walk(directory: string): string[] {
    return readdirSync(resolve(repository, directory), {
      withFileTypes: true,
    }).flatMap((entry) => {
      if (['node_modules', 'dist', '.next', '.turbo'].includes(entry.name))
        return [];
      const path = `${directory}/${entry.name}`;
      return entry.isDirectory()
        ? walk(path)
        : /\.(spec|test)\.[cm]?[jt]sx?$/.test(path)
          ? [path]
          : [];
    });
  }
  assert.deepEqual(
    ['apps', 'packages', 'scripts', 'tests'].flatMap(walk).sort(),
    Object.values(suites).flat().sort(),
    'Test inventory changed: update ownership deliberately',
  );
}
