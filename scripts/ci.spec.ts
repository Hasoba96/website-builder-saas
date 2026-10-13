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
import { createHash } from 'node:crypto';
import browserConfig from '../playwright.config.js';

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

function licenseFixture(license: string, name: string, versions: string[]) {
  const directory = mkdtempSync(resolve(tmpdir(), 'wbp-license-'));
  try {
    mkdirSync(resolve(directory, 'docs/checkpoints/evidence'), {
      recursive: true,
    });
    const lock = 'reviewed-fixture';
    writeFileSync(resolve(directory, 'pnpm-lock.yaml'), lock);
    writeFileSync(
      resolve(
        directory,
        'docs/checkpoints/evidence/00-j-dependency-acceptance.json',
      ),
      JSON.stringify({
        lockfileSha256: `sha256:${createHash('sha256').update(lock).digest('hex')}`,
        reviewBy: new Date(Date.now() + 60000).toISOString(),
      }),
    );
    const manager = resolve(directory, 'manager.cjs');
    writeFileSync(
      manager,
      `const command=process.argv[2];
      require('node:fs').appendFileSync('invocations',command+'\\n');
      const responses={list:[],licenses:${JSON.stringify({ [license]: [{ name, versions }] })},audit:{metadata:{vulnerabilities:{high:0,critical:0}}}};
      if(!(command in responses))process.exit(1);
      require('node:fs').writeFileSync(1,JSON.stringify(responses[command]));`,
    );
    const result = spawnSync(
      process.execPath,
      [resolve('scripts/ci-supply-chain.ts')],
      {
        cwd: directory,
        // Policy fixtures need no real infrastructure credentials or pnpm lifecycle state.
        env: {
          ...Object.fromEntries(
            Object.entries(process.env).filter(([key]) =>
              /^(path|systemroot|windir|temp|tmp)$/i.test(key),
            ),
          ),
          npm_execpath: manager,
          CI_BASE_SHA: '',
        },
        encoding: 'utf8',
        timeout: 15000,
      },
    );
    expect(
      readFileSync(resolve(directory, 'invocations'), 'utf8')
        .trim()
        .split('\n')
        .slice(0, 2),
    ).toEqual(['list', 'licenses']);
    return result;
  } finally {
    expect(dirname(directory)).toBe(resolve(tmpdir()));
    rmSync(directory, { recursive: true, force: true });
  }
}

it('accepts only reviewed Sharp copyleft platform identities', () => {
  for (const [name, version, license] of [
    ['@img/sharp-libvips-linux-x64', '1.3.4', 'LGPL-3.0-or-later'],
    ['@img/sharp-libvips-linuxmusl-x64', '1.3.4', 'LGPL-3.0-or-later'],
    ['@img/sharp-win32-x64', '0.35.5', 'Apache-2.0 AND LGPL-3.0-or-later'],
  ]) {
    const result = licenseFixture(license!, name!, [version!]);
    expect(result.error).toBeUndefined();
    expect(result.status, result.stderr).toBe(0);
  }
});

it('rejects unreviewed Sharp versions, packages and expressions with safe identities', () => {
  for (const [license, name, versions] of [
    ['LGPL-3.0-or-later', '@img/sharp-libvips-linux-x64', ['1.3.5']],
    [
      'LGPL-3.0-or-later',
      '@img/sharp-libvips-linuxmusl-x64',
      ['1.3.4', '1.3.5'],
    ],
    ['LGPL-3.0-or-later', '@img/sharp-libvips-linux-arm64', ['1.3.4']],
    ['LGPL-3.0-or-later', 'unreviewed-library', ['1.3.4']],
    ['LGPL-3.0-only', '@img/sharp-libvips-linux-x64', ['1.3.4']],
    ['MIT', '@img/sharp-libvips-linux-x64', ['1.3.4']],
    ['Unknown', '@img/sharp-libvips-linux-x64', ['1.3.4']],
    ['Apache-2.0 AND LGPL-3.0-or-later', '@img/sharp-win32-x64', ['0.35.6']],
    ['Apache-2.0 AND LGPL-3.0-or-later', '@img/sharp-unreviewed', ['0.35.5']],
    ['LGPL-3.0-or-later', '@img/sharp-libvips-linux-x64', []],
  ] as [string, string, string[]][]) {
    const result = licenseFixture(license, name, versions);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Unreviewed license obligation');
    expect(result.stderr).toContain(name);
    expect(result.stderr).toContain(license);
    for (const version of versions) expect(result.stderr).toContain(version);
  }
});

it('does not reflect unsafe license metadata or paths in rejection diagnostics', () => {
  const unsafe = 'https://user:private@host/\nforged-log';
  const result = licenseFixture(unsafe, unsafe, [unsafe]);
  expect(result.error).toBeUndefined();
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain('Unreviewed license obligation');
  expect(result.stderr).toContain('[invalid metadata]');
  expect(result.stderr).not.toContain('user:private');
  expect(result.stderr).not.toContain('forged-log');
});

it('builds fresh host smoke prerequisites first and stops when their build fails', () => {
  const directory = mkdtempSync(resolve(tmpdir(), 'wbp-image-order-'));
  try {
    mkdirSync(resolve(directory, 'scripts'));
    copyFileSync('scripts/ci.ts', resolve(directory, 'scripts/ci.ts'));
    copyFileSync(
      'scripts/ci-policy.ts',
      resolve(directory, 'scripts/ci-policy.ts'),
    );
    writeFileSync(resolve(directory, 'pnpm-lock.yaml'), 'unchanged');
    // Command-boundary fixture only; real container acceptance remains mandatory.
    writeFileSync(
      resolve(directory, 'scripts/ci-command.ts'),
      `
      import assert from 'node:assert/strict';
      import {appendFileSync,existsSync,writeFileSync} from 'node:fs';
      export function executeCheck(executable,args){
        appendFileSync('commands.jsonl',JSON.stringify(args)+'\\n');
        if(args[0]==='scripts/turbo.ts'){
          assert.deepEqual(args,['scripts/turbo.ts','run','build','--filter=@website-builder/config']);
          assert.equal(existsSync('host-built'),false);
          if(process.env.FIXTURE_BUILD_FAILURE==='1')throw new Error('fixture build failure');
          writeFileSync('host-built','fresh');
        }
        if(args.includes('test:images'))assert.ok(existsSync('host-built'),'missing fresh host outputs');
      }`,
    );
    for (const fail of [false, true]) {
      rmSync(resolve(directory, 'host-built'), { force: true });
      rmSync(resolve(directory, 'commands.jsonl'), { force: true });
      const result = spawnSync(process.execPath, ['scripts/ci.ts', 'images'], {
        cwd: directory,
        env: {
          ...process.env,
          npm_execpath: 'fixture-manager',
          FIXTURE_BUILD_FAILURE: fail ? '1' : '0',
        },
        encoding: 'utf8',
        timeout: 15000,
      });
      expect(result.error).toBeUndefined();
      expect(result.status, result.stderr).toBe(fail ? 1 : 0);
      const commands = readFileSync(
        resolve(directory, 'commands.jsonl'),
        'utf8',
      )
        .trim()
        .split('\n')
        .map((line) => JSON.parse(line) as string[]);
      const build = commands.findIndex(
        (args) => args[0] === 'scripts/turbo.ts',
      );
      const smoke = commands.findIndex((args) => args.includes('test:images'));
      expect(build).toBeGreaterThan(-1);
      expect(smoke).toBe(fail ? -1 : commands.length - 2);
      if (!fail) expect(build).toBeLessThan(smoke);
      expect(commands.filter((args) => args[0] === 'build')).toHaveLength(
        fail ? 0 : 4,
      );
      expect(commands.at(-1)).toEqual(['scripts/ci-containers.ts']);
    }
    const turbo = JSON.parse(readFileSync('turbo.json', 'utf8'));
    expect(turbo.tasks.build).toMatchObject({
      dependsOn: ['^build'],
      cache: false,
    });
    const config = JSON.parse(
      readFileSync('packages/config/package.json', 'utf8'),
    );
    expect(config.dependencies['@website-builder/schemas']).toBe('workspace:*');
  } finally {
    expect(dirname(directory)).toBe(resolve(tmpdir()));
    rmSync(directory, { recursive: true, force: true });
  }
});
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

it('withholds hosted Git/source metadata without changing results or coverage', () => {
  expect(browserConfig.captureGitInfo).toEqual({ commit: false, diff: false });
  const canary = 'origin-' + 'canary.example';
  const ci = {
    commitHash: 'a'.repeat(40),
    prBaseHash: 'b'.repeat(40),
    headSha: 'c'.repeat(40),
    runId: '38420180954',
    buildHref:
      'https://github.com/Hasoba96/website-builder-saas/actions/runs/38420180954',
  };
  const metadata = {
    ci: { ...ci, prTitle: canary },
    gitDiff: canary,
    gitCommit: { body: canary },
    actualWorkers: 1,
    unknown: canary,
  };
  const coverage = {
    total: { statements: { total: 10, covered: 8, pct: 80 } },
  };
  const report = {
    config: { metadata, projects: [{ metadata }] },
    stats: { expected: 17, unexpected: 8, skipped: 0, flaky: 0 },
    numTotalTests: 25,
    numPassedTests: 17,
    success: false,
    coverage,
    metadata: { vulnerabilities: { high: 0, critical: 0 } },
    source: canary,
    sources: [canary],
    sourcesContent: [canary],
    codeFrame: canary,
  };
  const clean = sanitizeReport(report);
  expect(clean).toMatchObject({
    config: { metadata: { ci, actualWorkers: 1 } },
    stats: report.stats,
    numTotalTests: 25,
    numPassedTests: 17,
    success: false,
    coverage,
    metadata: report.metadata,
  });
  expect(JSON.stringify(clean)).not.toContain(canary);
  expect(() =>
    assertSafeArtifact(Buffer.from(JSON.stringify(clean))),
  ).not.toThrow();
  expect(
    sanitizeReport({
      config: {
        metadata: {
          ci: {
            commitHash: canary,
            runId: canary,
            buildHref: ci.buildHref + '?token=' + canary,
          },
        },
      },
    }),
  ).toEqual({ config: { metadata: { ci: {} } } });
  expect(() =>
    assertSafeArtifact(
      Buffer.from(JSON.stringify(sanitizeReport({ unsafe: canary }))),
    ),
  ).toThrow();
});

it('publishes scanned failure reports locally and keeps validation, scan and transport failures fatal', () => {
  const directory = mkdtempSync(resolve(tmpdir(), 'wbp-artifact-publish-'));
  const startedAt = new Date(Date.now() - 1000).toISOString();
  try {
    mkdirSync(resolve(directory, '.local/ci/verify'), { recursive: true });
    mkdirSync(resolve(directory, '.local/test-evidence'), { recursive: true });
    mkdirSync(resolve(directory, 'coverage/root'), { recursive: true });
    copyFileSync(
      '.gitleaks-staged.toml',
      resolve(directory, '.gitleaks-staged.toml'),
    );
    const summary = resolve(directory, '.local/ci/verify/summary.json');
    const reportPath = resolve(directory, '.local/test-evidence/browser.json');
    const canary = 'origin-' + 'canary.example';
    const report = {
      config: { metadata: { gitDiff: canary } },
      stats: { expected: 17, unexpected: 8, skipped: 0, flaky: 0 },
      errors: [],
    };
    writeFileSync(reportPath, JSON.stringify(report));
    const coverage = {
      total: { statements: { total: 10, covered: 8, pct: 80 } },
    };
    writeFileSync(
      resolve(directory, 'coverage/root/coverage-summary.json'),
      JSON.stringify(coverage),
    );
    const source = `import {publishEvidence} from ${JSON.stringify(pathToFileURL(resolve('scripts/ci-upload.ts')).href)};
      import {writeFileSync} from 'node:fs';
      process.exitCode = await publishEvidence('verify', async (name,files,directory) => {
        writeFileSync('called.json',JSON.stringify({name,files,directory}));
        if(process.env.FIXTURE_UPLOAD==='failure')throw new Error('https://host/?secret=private');
        return process.env.FIXTURE_UPLOAD==='missing-id' ? {} : {id:1};
      });`;
    const run = (
      status: string,
      mode = 'success',
      path = process.env['PATH'],
    ) => {
      rmSync(resolve(directory, 'called.json'), { force: true });
      writeFileSync(
        summary,
        JSON.stringify({
          startedAt,
          status,
        }),
      );
      return spawnSync(
        process.execPath,
        ['--input-type=module', '-e', source],
        {
          cwd: directory,
          env: { ...process.env, PATH: path, FIXTURE_UPLOAD: mode },
          encoding: 'utf8',
          timeout: 15000,
        },
      );
    };
    expect(run('FAIL').status).toBe(0);
    expect(
      JSON.parse(readFileSync(resolve(directory, 'called.json'), 'utf8')).name,
    ).toBe('evidence-verify');
    const output = readFileSync(
      resolve(directory, '.local/ci/verify/upload/test-evidence/browser.json'),
      'utf8',
    );
    expect(output).not.toContain(canary);
    expect(JSON.parse(output).stats).toEqual(report.stats);
    expect(
      JSON.parse(
        readFileSync(
          resolve(
            directory,
            '.local/ci/verify/upload/coverage/root/coverage-summary.json',
          ),
          'utf8',
        ),
      ),
    ).toEqual(coverage);
    for (const mode of ['failure', 'missing-id']) {
      const failed = run('FAIL', mode);
      expect(failed.status).toBe(33);
      expect(failed.stdout + failed.stderr).not.toContain('secret=private');
    }
    expect(run('PASS').status).toBe(31); // Missing mandatory suites/coverage cannot publish as PASS.
    expect(run('FAIL', 'success', directory).status).toBe(32); // Scanner unavailable.
    writeFileSync(reportPath, JSON.stringify({ ...report, unsafe: canary }));
    expect(run('FAIL').status).toBe(31);
    expect(() => readFileSync(resolve(directory, 'called.json'))).toThrow();
  } finally {
    expect(dirname(directory)).toBe(resolve(tmpdir()));
    rmSync(directory, { recursive: true, force: true });
  }
});

it('prints only fixed action diagnostic codes and preserves nonzero failures', () => {
  const directory = mkdtempSync(resolve(tmpdir(), 'wbp-artifact-action-'));
  try {
    mkdirSync(resolve(directory, 'scripts'));
    copyFileSync(
      '.github/actions/evidence/upload.mjs',
      resolve(directory, 'upload.mjs'),
    );
    writeFileSync(
      resolve(directory, 'scripts/ci-upload.ts'),
      `
      process.stdout.write('fixture-private-output');
      process.stderr.write('https://host/?token=fixture-private-output');
      process.exitCode = Number(process.env.FIXTURE_STATUS);`,
    );
    for (const [status, code] of [
      [31, 'VALIDATION:REJECTED'],
      [32, 'SCAN:FAILED'],
      [33, 'PUBLICATION:FAILED'],
      [99, 'PROCESS:FAILED'],
      [0, 'uploaded'],
    ] as const) {
      const result = spawnSync(process.execPath, ['upload.mjs'], {
        cwd: directory,
        env: {
          ...process.env,
          FIXTURE_STATUS: String(status),
          INPUT_GATE: 'verify',
        },
        encoding: 'utf8',
        timeout: 10000,
      });
      expect(result.status).toBe(status === 0 ? 0 : 1);
      expect(result.stdout + result.stderr).toContain(code);
      expect(result.stdout + result.stderr).not.toContain(
        'fixture-private-output',
      );
      expect(result.stdout + result.stderr).not.toContain('https://');
    }
  } finally {
    expect(dirname(directory)).toBe(resolve(tmpdir()));
    rmSync(directory, { recursive: true, force: true });
  }
});
