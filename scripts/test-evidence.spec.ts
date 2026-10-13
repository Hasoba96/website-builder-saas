import { spawnSync } from 'node:child_process';
import {
  mkdtempSync,
  writeFileSync,
  rmSync,
  mkdirSync,
  readFileSync,
} from 'node:fs';
import { resolve, dirname } from 'node:path';
import { expect, it } from 'vitest';
import type { JsonTestResults } from 'vitest/node';
import type { JSONReport } from '@playwright/test/reporter';
import { validateVitest, validateBrowser, suites } from './test-evidence.js';
import { testPolicy, repository } from './test-policy.js';

const green = () =>
  ({
    success: true,
    numTotalTests: 1,
    numPassedTests: 1,
    numPendingTests: 0,
    numTodoTests: 0,
    numFailedTests: 0,
    testResults: [
      {
        name: resolve('scripts/example.spec.ts'),
        status: 'passed',
        assertionResults: [{ status: 'passed' }],
      },
    ],
  }) as JsonTestResults;

it('rejects missing, zero, skipped, todo, failed and empty Vitest evidence', () => {
  const expected = ['scripts/example.spec.ts'];
  expect(validateVitest(green(), expected)).toBe(1);
  for (const change of [
    { success: false },
    { numTotalTests: 0 },
    { testResults: [] },
    { numPendingTests: 1 },
    { numTodoTests: 1 },
    { numFailedTests: 1 },
    { testResults: [{ ...green().testResults[0], assertionResults: [] }] },
  ])
    expect(() =>
      validateVitest({ ...green(), ...change } as JsonTestResults, expected),
    ).toThrow();
});

it('rejects missing browser execution, skipped or expected-failing tests and runner errors', () => {
  const report = {
    config: { rootDir: resolve('tests/browser') },
    errors: [],
    stats: { expected: 1, unexpected: 0, skipped: 0, flaky: 0 },
    suites: [
      {
        specs: [
          {
            file: 'shell.spec.ts',
            tests: [
              { expectedStatus: 'passed', results: [{ status: 'passed' }] },
            ],
          },
        ],
        suites: [],
      },
    ],
  } as unknown as JSONReport;
  const expected = ['tests/browser/shell.spec.ts'];
  expect(validateBrowser(report, expected)).toBe(1);
  for (const change of [
    { suites: [] },
    { errors: [{ message: 'failed' }] },
    { stats: { ...report.stats, expected: 0 } },
    { stats: { ...report.stats, skipped: 1 } },
    { stats: { ...report.stats, flaky: 1 } },
  ])
    expect(() => validateBrowser({ ...report, ...change }, expected)).toThrow();
  report.suites[0]!.specs[0]!.tests[0]!.expectedStatus = 'failed';
  expect(() => validateBrowser(report, expected)).toThrow();
});

it('keeps all current categories wired through the real harness and uncached Turbo tasks', () => {
  const read = (path: string) => readFileSync(path, 'utf8');
  const root = JSON.parse(read('package.json')) as {
    scripts: Record<string, string>;
  };
  expect(root.scripts['test']).toBe('node scripts/test-all.ts');
  expect(read('scripts/test-all.ts')).toContain(
    "'scripts/test-redis.ts', '--all'",
  );
  expect(read('scripts/test-redis.ts')).toContain(
    "'scripts/test-database.ts', '--all'",
  );
  const database = read('scripts/test-database.ts');
  for (const required of [
    'vitest.database.config.ts',
    "'run', 'test'",
    '@playwright/test/cli.js',
  ])
    expect(database).toContain(required);
  for (const path of ['scripts/test-database.ts', 'scripts/test-redis.ts']) {
    const harness = read(path);
    expect(harness).toMatch(/@sha256:[a-f0-9]{64}/);
    expect(harness).toContain("'127.0.0.1::");
    expect(harness).toContain('finally');
    expect(harness).toContain("['rm', '--force', '--volumes', name]");
  }
  expect(
    (JSON.parse(read('turbo.json')) as { tasks: { test: { cache: boolean } } })
      .tasks.test.cache,
  ).toBe(false);
  for (const app of [
    'api',
    'worker',
    'dashboard-web',
    'public-renderer',
    'config',
    'schemas',
  ]) {
    const folder = ['config', 'schemas'].includes(app) ? 'packages' : 'apps';
    expect(
      (
        JSON.parse(read(`${folder}/${app}/package.json`)) as {
          scripts: { test: string };
        }
      ).scripts.test,
    ).toBe('vitest run');
    expect(read(`${folder}/${app}/vitest.config.ts`)).toContain(
      `testPolicy('${app}')`,
    );
  }
  expect(Object.keys(suites)).toHaveLength(11);
  expect(read('scripts/test-all.ts')).toContain("'scripts/test-local.ts'");
  expect(read('scripts/test-local.ts')).toContain('vitest.local.config.ts');
  expect(suites.local).toEqual(['tests/local/foundation.spec.ts']);
});

it('the real runner rejects no discovery, focused tests and zero assertions', () => {
  mkdirSync(resolve('.local'), { recursive: true });
  const directory = mkdtempSync(resolve('.local/00h-runner-'));
  if (dirname(directory) !== resolve('.local'))
    throw new Error('Unsafe fixture path');
  try {
    const policy = testPolicy('fixture');
    writeFileSync(
      resolve(directory, 'vitest.config.mts'),
      `export default ${JSON.stringify({ test: { allowOnly: policy.allowOnly, passWithNoTests: policy.passWithNoTests, expect: policy.expect } })};`,
    );
    const run = () =>
      spawnSync(
        process.execPath,
        [
          resolve('node_modules/vitest/vitest.mjs'),
          'run',
          '--root',
          directory,
          '--config',
          resolve(directory, 'vitest.config.mts'),
        ],
        { cwd: repository, encoding: 'utf8', timeout: 15000 },
      );
    for (const source of [
      undefined,
      "import {it} from 'vitest'; it('empty', () => {});",
      "import {it,expect} from 'vitest'; it.only('focused', () => expect(1).toBe(1));",
    ]) {
      if (source) writeFileSync(resolve(directory, 'invalid.spec.ts'), source);
      const result = run();
      expect(result.error).toBeUndefined();
      expect(result.status).not.toBe(0);
    }
    writeFileSync(
      resolve(directory, 'invalid.spec.ts'),
      "import {it,expect} from 'vitest'; it('real assertion', () => expect(1).toBe(1));",
    );
    const result = run();
    expect(result.error).toBeUndefined();
    expect(result.status, result.stdout + result.stderr).toBe(0);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
