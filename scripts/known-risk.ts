import { hash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

type ObjectValue = Record<string, unknown>;
function object(x: unknown): ObjectValue {
  assert.ok(x && typeof x === 'object' && !Array.isArray(x));
  return x as ObjectValue;
}
function keys(x: ObjectValue, expected: string[]) {
  assert.deepEqual(Object.keys(x).sort(), expected.sort());
}
function canonical(x: unknown): unknown {
  if (Array.isArray(x)) return x.map(canonical);
  if (x && typeof x === 'object')
    return Object.fromEntries(
      Object.entries(x)
        .sort()
        .map(([k, v]) => [k, canonical(v)]),
    );
  return x;
}
export const digest = (x: unknown) =>
  hash('sha256', JSON.stringify(canonical(x)));
export const approvedCombinations = [
  'GHSA-3g3m-2fjr-6pw4|glob|10.5.0|.>@actions/artifact>archiver>archiver-utils>glob',
  'GHSA-3g3m-2fjr-6pw4|glob|13.0.6|.>node-pg-migrate>glob',
  'GHSA-g3hv-75wg-m249|minimatch|9.0.9|.>@actions/artifact>archiver>archiver-utils>glob>minimatch',
  'GHSA-g3hv-75wg-m249|minimatch|10.2.6|.>eslint>minimatch',
].sort();
const profileFiles = [
  'package.json',
  'pnpm-workspace.yaml',
  '.npmrc',
  'eslint.config.ts',
  '.github/workflows/ci.yml',
  '.github/actions/evidence/action.yml',
  '.github/actions/evidence/upload.mjs',
  'scripts/ci-upload.ts',
  'scripts/ci-artifacts.ts',
  'scripts/migrate.ts',
  'scripts/ci-bootstrap.sh',
  'scripts/ci-supply-chain.ts',
  'scripts/known-risk.ts',
];
export function riskContext(root: string, now = Date.now()) {
  const textHash = (file: string) =>
    hash(
      'sha256',
      readFileSync(resolve(root, file), 'utf8').replaceAll('\r\n', '\n'),
    );
  const dates = /Effective UTC: (\S+); expires UTC: (\S+)/.exec(
    readFileSync(
      resolve(root, 'docs/governance/known-risk-exceptions.md'),
      'utf8',
    ),
  );
  return {
    now,
    lockSha256: hash('sha256', readFileSync(resolve(root, 'pnpm-lock.yaml'))),
    executionSha256: digest(profileFiles.map((file) => [file, textHash(file)])),
    approvalSha256: textHash('docs/governance/known-risk-exceptions.md'),
    adoptedAt: dates?.[1],
    expiresAt: dates?.[2],
  };
}
type Context = ReturnType<typeof riskContext>;
export const blockedRisk = (rawExit: number | null) => ({
  status: 'BLOCKED',
  rawExit,
  accepted: [] as string[],
  unresolved: [] as string[],
  reason: 'INVALID_EVIDENCE',
});
export class RiskEvidenceError extends Error {
  readonly result: ReturnType<typeof blockedRisk>;
  constructor(result: RiskEvidenceError['result']) {
    super('RISK_EVIDENCE_INVALID');
    this.result = result;
    this.name = 'RiskEvidenceError';
  }
}
export function evaluateRisk(
  report: unknown,
  rawExit: number | null,
  registry: unknown,
  context?: Context,
) {
  const blocked = blockedRisk(rawExit);
  try {
    const raw = object(report);
    keys(raw, ['actions', 'advisories', 'muted', 'metadata']);
    assert.ok(Array.isArray(raw['actions']) && Array.isArray(raw['muted']));
    assert.equal(raw['muted'].length, 0);
    const counts = object(object(raw['metadata'])['vulnerabilities']);
    const found: string[] = [];
    const fingerprints = new Map<string, string>();
    for (const advisory of Object.values(object(raw['advisories']))) {
      const a = object(advisory);
      assert.equal(a['severity'], 'moderate');
      assert.ok(Array.isArray(a['findings']) && a['findings'].length > 0);
      const fingerprint = digest(
        Object.fromEntries(Object.entries(a).filter(([k]) => k !== 'findings')),
      );
      for (const value of a['findings']) {
        const f = object(value);
        assert.ok(Array.isArray(f['paths']) && f['paths'].length > 0);
        for (const path of f['paths']) {
          const parts = [
            a['github_advisory_id'],
            a['module_name'],
            f['version'],
            path,
          ];
          assert.ok(
            parts.every((s) => typeof s === 'string' && s.length <= 512),
          );
          const identity = parts.join('|');
          found.push(identity);
          fingerprints.set(identity, fingerprint);
        }
      }
    }
    blocked.unresolved = [...found];
    assert.deepEqual(counts, {
      info: 0,
      low: 0,
      moderate: found.length,
      high: 0,
      critical: 0,
    });
    if (found.length === 0) {
      assert.equal(rawExit, 0);
      return { ...blocked, status: 'CLEAN', reason: 'ZERO_FINDINGS' };
    }
    assert.equal(rawExit, 1);
    assert.deepEqual(found.sort(), approvedCombinations);
    assert.ok(context);
    const { now, ...binding } = context;
    const r = object(registry);
    const start = Date.parse(String(r['adoptedAt'])),
      end = Date.parse(String(r['expiresAt']));
    assert.ok([now, start, end].every(Number.isFinite));
    assert.ok(start <= now && now < end && end - start <= 30 * 86400000);
    const advisoryHashes = Object.fromEntries(
      found.map((id) => [id.split('|')[0]!, fingerprints.get(id)]),
    );
    for (const id of found)
      assert.equal(advisoryHashes[id.split('|')[0]!], fingerprints.get(id));
    assert.deepEqual(r, {
      schema: 1,
      id: 'KR-20261108-FOUR-MODERATE',
      owner: 'Hasoba96',
      scope: 'development/integration-only',
      ...binding,
      findings: found,
      advisorySha256: advisoryHashes,
    });
    return {
      status: 'ACCEPTED_RISK',
      rawExit,
      accepted: found,
      unresolved: [],
      reason: 'EXACT_UNEXPIRED_OWNER_DISPOSITION',
    };
  } catch {
    throw new RiskEvidenceError(blocked);
  }
}
