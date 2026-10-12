import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';

const manager = process.env['npm_execpath'];
assert.ok(manager, 'Invoke through pnpm ci:supply-chain');
const reviewed = JSON.parse(
  readFileSync(
    'docs/checkpoints/evidence/00-j-dependency-acceptance.json',
    'utf8',
  ),
) as { lockfileSha256: string; reviewBy: string };
const hash =
  'sha256:' +
  createHash('sha256').update(readFileSync('pnpm-lock.yaml')).digest('hex');
assert.equal(
  hash,
  reviewed.lockfileSha256,
  'Dependency graph changed: CORE-002 review required',
);
assert.ok(
  Date.now() < Date.parse(reviewed.reviewBy),
  'Dependency review expired',
);
const run = (args: string[]) =>
  execFileSync(process.execPath, [manager, ...args], {
    encoding: 'utf8',
    timeout: 120000,
    maxBuffer: 20 * 1024 * 1024,
  });
function withoutPaths(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(withoutPaths);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => key !== 'path' && key !== 'paths')
        .map(([key, child]) => [key, withoutPaths(child)]),
    );
  return value;
}
const graph = withoutPaths(
  JSON.parse(
    run([
      'list',
      '--recursive',
      '--depth',
      'Infinity',
      '--lockfile-only',
      '--json',
    ]),
  ),
);
const licenses = JSON.parse(run(['licenses', 'list', '--json'])) as Record<
  string,
  { name: string; versions: string[] }[]
>;
const permissive = new Set([
  'MIT',
  'MIT/X11',
  'ISC',
  'Apache-2.0',
  '(Apache-2.0 AND BSD-3-Clause)',
  'Apache-2.0 AND MIT',
  'BSD-2-Clause',
  'BSD-3-Clause',
  '0BSD',
  'BlueOak-1.0.0',
]);
for (const [license, packages] of Object.entries(licenses))
  for (const pkg of packages) {
    const existingObligation =
      (license === 'MPL-2.0' &&
        /^(?:@axe-core\/playwright|axe-core|lightningcss(?:-.+)?)$/.test(
          pkg.name,
        )) ||
      (license === 'Apache-2.0 AND LGPL-3.0-or-later' &&
        pkg.name.startsWith('@img/sharp-')) ||
      (license === 'CC-BY-4.0' && pkg.name === 'caniuse-lite');
    const recordedMit =
      license === 'Unknown' &&
      pkg.name === 'buffers' &&
      pkg.versions.every((version) => version === '0.1.1');
    assert.ok(
      permissive.has(license) || existingObligation || recordedMit,
      'Unreviewed license obligation',
    );
  }
const audit = spawnSync(process.execPath, [manager, 'audit', '--json'], {
  encoding: 'utf8',
  timeout: 120000,
  maxBuffer: 10 * 1024 * 1024,
});
assert.ok(!audit.error, 'Dependency audit unavailable');
const auditReport = JSON.parse(audit.stdout) as {
  metadata: { vulnerabilities: { high: number; critical: number } };
};
assert.equal(
  auditReport.metadata.vulnerabilities.high +
    auditReport.metadata.vulnerabilities.critical,
  0,
  'High/Critical dependency finding',
);
assert.equal(audit.status, 0, 'Dependency audit failed');
const base = process.env['CI_BASE_SHA'];
let diff =
  'No committed comparison base: initial/local baseline requires owner review.';
if (base && !/^0+$/.test(base)) {
  assert.match(base, /^[a-f0-9]{40}$/);
  diff = execFileSync(
    'git',
    ['diff', '--no-ext-diff', base, 'HEAD', '--', 'pnpm-lock.yaml'],
    { encoding: 'utf8', timeout: 30000, maxBuffer: 10 * 1024 * 1024 },
  );
}
mkdirSync('.local/ci/verify', { recursive: true });
writeFileSync(
  '.local/ci/verify/dependencies.json',
  JSON.stringify(
    {
      reviewedAt: new Date().toISOString(),
      lockfile: hash,
      sourcePolicy:
        'npmjs.org registry; frozen integrity-checked install; lifecycle scripts disabled',
      graph,
      licenses: withoutPaths(licenses),
      audit: auditReport,
      diff,
    },
    null,
    2,
  ) + '\n',
);
process.stdout.write(
  'Dependency inventory, license obligations, audit and graph-change gate passed.\n',
);
