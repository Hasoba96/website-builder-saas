import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  evaluateRisk,
  RiskEvidenceError,
  digest,
  approvedCombinations,
  riskContext,
} from './known-risk.ts';
function fixture() {
  const entries = approvedCombinations.map((id) => {
    const [github_advisory_id, module_name, version, path] = id.split('|');
    return {
      github_advisory_id,
      module_name,
      severity: 'moderate',
      findings: [{ version, paths: [path] }],
    };
  });
  const raw = {
    actions: [],
    muted: [],
    advisories: Object.fromEntries(entries.map((a, i) => [i, a])),
    metadata: {
      vulnerabilities: { info: 0, low: 0, moderate: 4, high: 0, critical: 0 },
    },
  };
  const approval = JSON.parse(
    readFileSync('docs/governance/known-risk-registry.json', 'utf8'),
  );
  const env = riskContext(process.cwd(), Date.parse(approval.adoptedAt));
  approval.advisorySha256 = Object.fromEntries(
    entries.map((a) => [
      a.github_advisory_id,
      digest({ ...a, findings: undefined }),
    ]),
  );
  return { raw, approval, env };
}
it('accepts exactly four risks without mutating raw evidence', () => {
  const { raw, approval, env } = fixture(),
    before = JSON.stringify(raw);
  expect(evaluateRisk(raw, 1, approval, env)).toMatchObject({
    status: 'ACCEPTED_RISK',
    rawExit: 1,
    accepted: approvedCombinations,
    unresolved: [],
  });
  expect(JSON.stringify(raw)).toBe(before);
  expect(digest({ a: 1, b: 2 })).toBe(digest({ b: 2, a: 1 }));
});
it('distinguishes clean, suppressed, missing and inconsistent findings', () => {
  const { raw, approval, env } = fixture();
  for (const bad of [
    null,
    [],
    { ...raw, muted: ['ignored'] },
    { ...raw, advisories: {} },
    { ...raw, extra: true },
  ])
    expect(() => evaluateRisk(bad, 1, approval, env)).toThrow(
      RiskEvidenceError,
    );
  for (const exit of [null, 0, 2])
    expect(() => evaluateRisk(raw, exit, approval, env)).toThrow(
      RiskEvidenceError,
    );
  raw.advisories = {};
  raw.metadata.vulnerabilities.moderate = 0;
  expect(evaluateRisk(raw, 0, null).status).toBe('CLEAN');
});
it('rejects unknown, version/path/content drift, duplicates and High/Critical', () => {
  for (const field of [
    'github_advisory_id',
    'module_name',
    'severity',
    'version',
    'path',
    'fingerprint',
    'duplicate',
    'new',
  ]) {
    const { raw, approval, env } = fixture(),
      a = Object.values(raw.advisories)[0]!;
    if (field === 'version') a.findings[0]!.version = '0.0.0';
    else if (field === 'path') a.findings[0]!.paths[0] += '>new';
    else if (field === 'duplicate') a.findings.push(a.findings[0]!);
    else if (field === 'new')
      a.findings.push({ version: 'new', paths: ['.>unknown'] });
    else
      Object.assign(a, { [field]: field === 'severity' ? 'high' : 'changed' });
    expect(() => evaluateRisk(raw, 1, approval, env)).toThrow(
      'RISK_EVIDENCE_INVALID',
    );
  }
  const { raw, approval, env } = fixture();
  Object.values(raw.advisories)[0]!.severity = 'critical';
  expect(() => evaluateRisk(raw, 1, approval, env)).toThrow(RiskEvidenceError);
});
it('rejects forged, missing, changed graph/profile/approval and overlong evidence', () => {
  for (const [key, value] of [
    ['owner', 'other'],
    ['lockSha256', '0'.repeat(64)],
    ['executionSha256', '0'.repeat(64)],
    ['approvalSha256', '0'.repeat(64)],
    ['findings', []],
    ['advisorySha256', {}],
    ['expiresAt', '2027-01-01T00:00:00Z'],
    ['unexpected', true],
  ]) {
    const { raw, approval, env } = fixture();
    Object.assign(approval, { [String(key)]: value });
    expect(() => evaluateRisk(raw, 1, approval, env)).toThrow(
      RiskEvidenceError,
    );
  }
  const { raw, approval, env } = fixture();
  Reflect.deleteProperty(approval, 'owner');
  expect(() => evaluateRisk(raw, 1, approval, env)).toThrow(RiskEvidenceError);
});
it('rejects exact expiry, future adoption, invalid clocks and missing approvals', () => {
  const { raw, approval, env } = fixture();
  const long = {
    ...approval,
    expiresAt: new Date(env.now + 31 * 86400000).toISOString(),
  };
  expect(() =>
    evaluateRisk(raw, 1, long, { ...env, expiresAt: long.expiresAt }),
  ).toThrow(RiskEvidenceError);
  for (const now of [Date.parse(approval.expiresAt), NaN, env.now - 1])
    expect(() => evaluateRisk(raw, 1, approval, { ...env, now })).toThrow(
      RiskEvidenceError,
    );
  for (const bad of [null, {}, { ...approval, expiresAt: approval.adoptedAt }])
    expect(() => evaluateRisk(raw, 1, bad, env)).toThrow(RiskEvidenceError);
});
