import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  suites,
  prepareEvidence,
  validateVitest,
  validateBrowser,
  minimumTests,
  validateCoverage,
} from './test-evidence.ts';
import { evidenceDirectory, repository } from './test-policy.ts';

prepareEvidence();
const started = Date.now();
const local = spawnSync(process.execPath, ['scripts/test-local.ts'], {
  stdio: 'inherit',
  timeout: 600000,
});
if (local.error || local.status !== 0)
  throw new Error('Local infrastructure tests failed');
const result = spawnSync(process.execPath, ['scripts/test-redis.ts', '--all'], {
  stdio: 'inherit',
  timeout: 14 * 60 * 1000,
});
if (result.error) throw result.error;
if (result.status !== 0) throw new Error('Full test path failed');
const counts: Record<string, number> = {};
for (const [name, files] of Object.entries(suites)) {
  const report = JSON.parse(
    readFileSync(resolve(evidenceDirectory, `${name}.json`), 'utf8'),
  );
  counts[name] =
    name === 'browser'
      ? validateBrowser(report, files)
      : validateVitest(report, files);
  assert.ok(
    counts[name] >= minimumTests[name as keyof typeof suites],
    `Test count regressed: ${name}`,
  );
  if (name !== 'browser') {
    const coverage = JSON.parse(
      readFileSync(
        resolve(repository, 'coverage', name, 'coverage-summary.json'),
        'utf8',
      ),
    ) as { total: { statements: { total: number } } };
    validateCoverage(coverage);
  }
}
const summary = {
  counts,
  total: Object.values(counts).reduce((a, b) => a + b, 0),
  durationMs: Date.now() - started,
};
writeFileSync(
  resolve(evidenceDirectory, 'summary.json'),
  JSON.stringify(summary, null, 2) + '\n',
);
process.stdout.write(
  `Verified full test evidence: ${JSON.stringify(summary)}\n`,
);
