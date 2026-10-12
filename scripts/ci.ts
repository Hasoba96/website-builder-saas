import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { verificationGates } from './ci-policy.ts';
import { executeCheck } from './ci-command.ts';

const mode = process.argv[2];
assert.ok(mode === 'verify' || mode === 'images', 'Unknown CI gate');
const manager = process.env['npm_execpath'];
assert.ok(manager, 'Invoke through pnpm ci:verify or pnpm ci:images');
assert.equal(process.version, 'v24.21.0', 'Pinned Node required');
const directory = resolve('.local/ci', mode);
rmSync(directory, { recursive: true, force: true });
mkdirSync(directory, { recursive: true });
const started = Date.now();
const results: {
  command: string;
  status: 'PASS' | 'FAIL';
  durationMs: number;
}[] = [];
const lockHash = () =>
  createHash('sha256').update(readFileSync('pnpm-lock.yaml')).digest('hex');
const before = lockHash();
function run(
  command: string,
  executable: string,
  args: string[],
  timeout = 600000,
) {
  const start = Date.now();
  let passed = false;
  try {
    executeCheck(executable, args, timeout);
    passed = true;
  } finally {
    results.push({
      command,
      status: passed ? 'PASS' : 'FAIL',
      durationMs: Date.now() - start,
    });
  }
}
function pnpm(command: string) {
  run(command, process.execPath, [manager!, command], 14 * 60000);
}
let success = false;
try {
  run('frozen install', process.execPath, [
    manager,
    'install',
    '--frozen-lockfile',
    '--ignore-scripts',
  ]);
  assert.equal(lockHash(), before, 'Frozen install changed lockfile');
  run(
    'container runtime',
    'docker',
    ['info', '--format', '{{.OSType}}'],
    30000,
  );
  if (mode === 'verify') {
    for (const gate of verificationGates) pnpm(gate);
  } else {
    for (const app of ['api', 'worker', 'dashboard-web', 'public-renderer']) {
      run(`image ${app}`, 'docker', [
        'build',
        '-f',
        'infra/Dockerfile',
        '--build-arg',
        `APP=${app}`,
        '--target',
        app === 'api' || app === 'worker' ? 'runtime' : 'web',
        '-t',
        `wbp-local-${app}:00-i`,
        '.',
      ]);
    }
    pnpm('test:images');
  }
  assert.equal(lockHash(), before, 'Verification changed lockfile');
  success = true;
} finally {
  try {
    run(
      'container cleanup inventory',
      process.execPath,
      ['scripts/ci-containers.ts'],
      35000,
    );
  } catch {
    success = false;
    process.exitCode = 1;
  }
  writeFileSync(
    resolve(directory, 'summary.json'),
    JSON.stringify(
      {
        schema: 1,
        mode,
        status: success ? 'PASS' : 'FAIL',
        startedAt: new Date(started).toISOString(),
        durationMs: Date.now() - started,
        lockfileSha256: before,
        results,
        providerExecution:
          process.env['GITHUB_ACTIONS'] === 'true'
            ? 'HOSTED_RUN'
            : 'NOT_VERIFIED',
      },
      null,
      2,
    ) + '\n',
  );
}
