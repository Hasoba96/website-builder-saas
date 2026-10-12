import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

export const verificationGates = [
  'ci:validate',
  'ci:supply-chain',
  'format:check',
  'lint',
  'typecheck',
  'workspace:check',
  'build',
  'test',
  'ci:budget',
  'security:dependencies',
  'security:secrets',
];
type RecordValue = Record<string, unknown>;
function object(value: unknown): RecordValue {
  assert.ok(
    value && typeof value === 'object' && !Array.isArray(value),
    'Expected object',
  );
  return value as RecordValue;
}
function keys(value: RecordValue, allowed: string[]) {
  assert.deepEqual(
    Object.keys(value).sort(),
    allowed.sort(),
    'Unexpected or missing workflow fields',
  );
}
export function validateWorkflow(input: unknown) {
  const workflow = object(input);
  keys(workflow, ['name', 'on', 'permissions', 'concurrency', 'env', 'jobs']);
  assert.equal(workflow['name'], 'CI');
  assert.deepEqual(workflow['on'], {
    pull_request: {},
    push: { branches: ['main'] },
    workflow_dispatch: {},
  });
  assert.deepEqual(workflow['permissions'], { contents: 'read' });
  assert.deepEqual(workflow['concurrency'], {
    group:
      'ci-${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}',
    'cancel-in-progress': true,
  });
  const jobs = object(workflow['jobs']);
  keys(jobs, ['verify', 'images']);
  for (const name of ['verify', 'images']) {
    const job = object(jobs[name]);
    keys(job, ['runs-on', 'timeout-minutes', 'steps']);
    assert.equal(job['runs-on'], 'ubuntu-24.04');
    assert.equal(job['timeout-minutes'], 14);
    assert.ok(Array.isArray(job['steps']));
    const steps = job['steps'].map(object);
    assert.equal(steps.length, name === 'verify' ? 5 : 4);
    for (const step of steps) {
      assert.equal(step['continue-on-error'], undefined);
      assert.equal(step['timeout-minutes'], undefined);
      if (step['uses']) {
        keys(step, ['name', 'if', 'uses', 'with']);
        assert.equal(
          step['uses'],
          './.github/actions/evidence',
          'Only reviewed local action permitted',
        );
        assert.deepEqual(step['with'], { gate: name });
        assert.equal(
          step['if'],
          "${{ always() && steps.gates.outcome != 'skipped' }}",
        );
      } else {
        keys(step, [
          'name',
          'shell',
          'run',
          ...(step === steps[0] ? ['env'] : []),
          ...(step['id'] ? ['id'] : []),
        ]);
        assert.equal(step['shell'], 'bash');
        assert.equal(
          step['if'],
          undefined,
          'Mandatory steps cannot be conditional',
        );
        assert.equal(typeof step['run'], 'string');
        assert.ok(
          !String(step['run']).includes('${{'),
          'No event interpolation into shell code',
        );
      }
    }
    assert.equal(steps[1]?.['run'], 'bash scripts/ci-bootstrap.sh');
    assert.equal(steps.at(-2)?.['run'], `pnpm ci:${name}`);
    assert.equal(steps.at(-2)?.['id'], 'gates');
    assert.equal(steps.at(-1)?.['uses'], './.github/actions/evidence');
    const checkout = String(steps[0]?.['run']);
    assert.ok(!/--global|credential\.helper|set -x|\beval\b/.test(checkout));
    assert.ok(
      checkout.includes(
        'unset GIT_CONFIG_VALUE_0 GIT_CONFIG_KEY_0 GIT_CONFIG_COUNT CHECKOUT_TOKEN',
      ),
    );
    assert.ok(
      checkout.includes('test "$(git rev-parse HEAD)" = "$GITHUB_SHA"'),
    );
    assert.deepEqual(steps[0]?.['env'], {
      CHECKOUT_TOKEN: '${{ github.token }}',
    });
    if (name === 'verify')
      assert.equal(
        steps[2]?.['run'],
        'pnpm install --frozen-lockfile --ignore-scripts\npnpm exec playwright install --with-deps chromium',
      );
  }
  assert.deepEqual(workflow['env'], {
    APP_ENV: 'ci',
    NODE_OPTIONS: '--max-old-space-size=1536',
    NEXT_TELEMETRY_DISABLED: '1',
    TURBO_TELEMETRY_DISABLED: '1',
    DO_NOT_TRACK: '1',
    CI: 'true',
    CI_BASE_SHA:
      "${{ github.event.pull_request.base.sha || github.event.before || '' }}",
  });
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  validateWorkflow(
    JSON.parse(readFileSync('.github/workflows/ci.yml', 'utf8')),
  );
  const action = JSON.parse(
    readFileSync('.github/actions/evidence/action.yml', 'utf8'),
  ) as RecordValue;
  assert.deepEqual(action['runs'], { using: 'node24', main: 'upload.mjs' });
  const manifest = JSON.parse(readFileSync('package.json', 'utf8')) as {
    scripts: Record<string, string>;
    engines: { node: string; pnpm: string };
  };
  assert.equal(manifest.engines.node, '24.21.0');
  assert.equal(manifest.engines.pnpm, '10.34.6');
  for (const gate of verificationGates)
    assert.ok(manifest.scripts[gate], `Missing gate ${gate}`);
  assert.equal(manifest.scripts['test'], 'node scripts/test-all.ts');
  process.stdout.write(
    'CI JSON/YAML syntax and project security contract validated; provider execution NOT VERIFIED.\n',
  );
}
