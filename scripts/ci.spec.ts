import { expect, it } from 'vitest';
import {
  readFileSync,
  mkdtempSync,
  writeFileSync,
  rmSync,
  mkdirSync,
  copyFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { validateWorkflow, verificationGates } from './ci-policy.js';
import { executeCheck } from './ci-command.js';
import { assertSafeArtifact, sanitizeReport } from './ci-artifacts.js';
import { validateCoverage } from './test-evidence.js';

interface WorkflowFixture {
  permissions: { contents: string };
  on: Record<string, unknown>;
  jobs: Record<
    'verify' | 'images',
    {
      'runs-on': string;
      'timeout-minutes': number;
      steps: Record<string, unknown>[];
    }
  >;
}
const workflow = () =>
  JSON.parse(
    readFileSync('.github/workflows/ci.yml', 'utf8'),
  ) as WorkflowFixture;
it('accepts only the bounded read-only mandatory workflow', () => {
  expect(() => validateWorkflow(workflow())).not.toThrow();
  for (const mutate of [
    (w: ReturnType<typeof workflow>) => {
      w.permissions.contents = 'write';
    },
    (w: ReturnType<typeof workflow>) => {
      w.on['pull_request_target'] = {};
    },
    (w: ReturnType<typeof workflow>) => {
      Reflect.deleteProperty(w.jobs, 'verify');
    },
    (w: ReturnType<typeof workflow>) => {
      w.jobs.images['runs-on'] = 'self-hosted';
    },
    (w: ReturnType<typeof workflow>) => {
      w.jobs.verify['timeout-minutes'] = 60;
    },
    (w: ReturnType<typeof workflow>) => {
      w.jobs.verify.steps[3]!['continue-on-error'] = true;
    },
    (w: ReturnType<typeof workflow>) => {
      w.jobs.verify.steps[3]!['run'] = 'echo success';
    },
    (w: ReturnType<typeof workflow>) => {
      w.jobs.verify.steps[4]!['uses'] = 'actions/upload-artifact@main';
    },
  ]) {
    const candidate = workflow();
    mutate(candidate);
    expect(() => validateWorkflow(candidate)).toThrow();
  }
  expect(verificationGates).toContain('test');
  expect(verificationGates).toContain('security:dependencies');
  expect(verificationGates).toContain('security:secrets');
  expect(() => JSON.parse('{invalid workflow')).toThrow();
});

it('propagates command, unavailable executable, timeout and image build failures', () => {
  expect(() =>
    executeCheck(process.execPath, ['-e', 'process.exit(0)'], 5000, 'ignore'),
  ).not.toThrow();
  expect(() =>
    executeCheck(process.execPath, ['-e', 'process.exit(1)'], 5000, 'ignore'),
  ).toThrow();
  expect(() =>
    executeCheck('00j-nonexistent-container-runtime', [], 1000, 'ignore'),
  ).toThrow();
  expect(() =>
    executeCheck(
      process.execPath,
      ['-e', 'setTimeout(()=>{},5000)'],
      50,
      'ignore',
    ),
  ).toThrow();
  expect(() =>
    executeCheck(
      'docker',
      ['build', '-f', '00j-nonexistent.Dockerfile', '.'],
      15000,
      'ignore',
    ),
  ).toThrow();
});

it('rejects missing and empty coverage instead of accepting a report filename', () => {
  expect(() =>
    validateCoverage({ total: { statements: { total: 1 } } }),
  ).not.toThrow();
  for (const report of [undefined, {}, { total: { statements: { total: 0 } } }])
    expect(() => validateCoverage(report)).toThrow();
});

it('retains native failure status and counts but withholds diagnostic values', () => {
  const privateValue = 'runtime-' + 'private-value';
  const report = {
    success: false,
    numFailedTests: 1,
    errors: [{ message: privateValue, stack: privateValue }],
    expected: 2,
    actual: privateValue,
  };
  const clean = sanitizeReport(report);
  expect(clean).toMatchObject({
    success: false,
    numFailedTests: 1,
    expected: 2,
  });
  expect(JSON.stringify(clean)).not.toContain(privateValue);
});

it('rejects credential-shaped and canary artifacts without accepting raw failures', () => {
  expect(() =>
    assertSafeArtifact(Buffer.from('{"status":"FAIL"}')),
  ).not.toThrow();
  for (const value of [
    'b'.repeat(64),
    'Bearer ' + 'x'.repeat(24),
    'redis://' + 'user:private@host',
    '00c-server-only-' + 'canary-not-a-credential',
    '00g-host-' + 'canary.example',
  ])
    expect(() => assertSafeArtifact(Buffer.from(value))).toThrow();
});

it('frozen installation rejects an invalid lockfile without resolving dependencies', () => {
  const directory = mkdtempSync(resolve(tmpdir(), 'wbp-00j-lock-'));
  try {
    writeFileSync(
      resolve(directory, 'package.json'),
      JSON.stringify({
        name: 'invalid-lock-fixture',
        private: true,
        packageManager: 'pnpm@10.34.6',
      }),
    );
    writeFileSync(
      resolve(directory, 'pnpm-lock.yaml'),
      'lockfileVersion: [invalid',
    );
    const result = spawnSync(
      process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm',
      [
        'install',
        '--ignore-workspace',
        '--frozen-lockfile',
        '--ignore-scripts',
        '--offline',
      ],
      {
        cwd: directory,
        stdio: 'ignore',
        timeout: 15000,
        shell: process.platform === 'win32',
      },
    );
    expect(result.error).toBeUndefined();
    expect(result.status).not.toBe(0);
  } finally {
    expect(dirname(directory)).toBe(resolve(tmpdir()));
    rmSync(directory, { recursive: true, force: true });
  }
});

it('rejects changed graph acceptance before invoking registry tooling', () => {
  const directory = mkdtempSync(resolve(tmpdir(), 'wbp-00j-review-'));
  try {
    mkdirSync(resolve(directory, 'docs/checkpoints/evidence'), {
      recursive: true,
    });
    writeFileSync(
      resolve(
        directory,
        'docs/checkpoints/evidence/00-j-dependency-acceptance.json',
      ),
      JSON.stringify({
        lockfileSha256: 'sha256:unmatched',
        reviewBy: '2027-01-01',
      }),
    );
    writeFileSync(resolve(directory, 'pnpm-lock.yaml'), 'changed');
    const result = spawnSync(
      process.execPath,
      [resolve('scripts/ci-supply-chain.ts')],
      {
        cwd: directory,
        env: { ...process.env, npm_execpath: 'must-not-run' },
        encoding: 'utf8',
        timeout: 10000,
      },
    );
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Dependency graph changed');
  } finally {
    expect(dirname(directory)).toBe(resolve(tmpdir()));
    rmSync(directory, { recursive: true, force: true });
  }
});

it('rejects stale artifact evidence before scan or upload', () => {
  const directory = mkdtempSync(resolve(tmpdir(), 'wbp-00j-artifacts-'));
  try {
    mkdirSync(resolve(directory, '.local/ci/images'), { recursive: true });
    writeFileSync(
      resolve(directory, '.local/ci/images/summary.json'),
      JSON.stringify({ startedAt: '2000-01-01T00:00:00Z', status: 'PASS' }),
    );
    const source = `import {prepareArtifacts} from ${JSON.stringify(pathToFileURL(resolve('scripts/ci-artifacts.ts')).href)}; prepareArtifacts('images');`;
    const result = spawnSync(
      process.execPath,
      ['--input-type=module', '-e', source],
      { cwd: directory, encoding: 'utf8', timeout: 10000 },
    );
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Missing/stale CI evidence');
  } finally {
    expect(dirname(directory)).toBe(resolve(tmpdir()));
    rmSync(directory, { recursive: true, force: true });
  }
});

it('prepares scanned failure evidence but rejects an unsafe unprojected field', () => {
  const directory = mkdtempSync(resolve(tmpdir(), 'wbp-00j-scan-'));
  try {
    mkdirSync(resolve(directory, '.local/ci/verify'), { recursive: true });
    mkdirSync(resolve(directory, '.local/test-evidence'), { recursive: true });
    copyFileSync(
      '.gitleaks-staged.toml',
      resolve(directory, '.gitleaks-staged.toml'),
    );
    writeFileSync(
      resolve(directory, '.local/ci/verify/summary.json'),
      JSON.stringify({
        startedAt: new Date(Date.now() - 1000).toISOString(),
        status: 'FAIL',
      }),
    );
    const report = resolve(directory, '.local/test-evidence/root.json');
    const secret = 'fixture-' + 'private-diagnostic';
    writeFileSync(
      report,
      JSON.stringify({
        success: false,
        numFailedTests: 1,
        failureMessages: [secret],
      }),
    );
    const source = `import {prepareArtifacts} from ${JSON.stringify(pathToFileURL(resolve('scripts/ci-artifacts.ts')).href)}; prepareArtifacts('verify');`;
    const run = () =>
      spawnSync(process.execPath, ['--input-type=module', '-e', source], {
        cwd: directory,
        encoding: 'utf8',
        timeout: 15000,
      });
    expect(run().status).toBe(0);
    const output = readFileSync(
      resolve(directory, '.local/ci/verify/upload/test-evidence/root.json'),
      'utf8',
    );
    expect(output).toContain('"success": false');
    expect(output).toContain('"numFailedTests": 1');
    expect(output).not.toContain(secret);
    writeFileSync(
      report,
      JSON.stringify({ unsafe: 'redis://' + 'user:fixture@host' }),
    );
    const rejected = run();
    expect(rejected.status).not.toBe(0);
    expect(rejected.stderr).toContain(
      'Artifact may contain private runtime data',
    );
  } finally {
    expect(dirname(directory)).toBe(resolve(tmpdir()));
    rmSync(directory, { recursive: true, force: true });
  }
});
