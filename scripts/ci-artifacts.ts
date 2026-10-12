import assert from 'node:assert/strict';
import { spawnSync, execFileSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, resolve, relative, sep } from 'node:path';
import {
  suites,
  validateVitest,
  validateBrowser,
  validateCoverage,
} from './test-evidence.ts';

export function assertSafeArtifact(bytes: Buffer) {
  const text = bytes
    .toString('utf8')
    .replace(/sha256:[a-f0-9]{64}/gi, '[image digest]');
  assert.ok(
    !/(?:[a-z0-9-]*canary[a-z0-9-]*\.(?:example|test)|\d\d[a-z]-server-only-canary|Bearer\s+[A-Za-z0-9._-]{12,}|(?:postgres(?:ql)?|redis):\/\/[^\s]+@|[a-f0-9]{64})/i.test(
      text,
    ),
    'Artifact may contain private runtime data',
  );
}

// Preserve native report shape/status/counts; strip diagnostic payloads, never turn failure into success.
export function sanitizeReport(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeReport);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [
        key,
        /^(?:message|stack|actual|expected|stdout|stderr|snippet|failureMessages|errorMessage|attachments)$/i.test(
          key,
        ) && typeof child !== 'number'
          ? Array.isArray(child)
            ? child.map(() => '[diagnostic withheld]')
            : '[diagnostic withheld]'
          : sanitizeReport(child),
      ]),
    );
  if (typeof value === 'string')
    return value
      .replaceAll(process.cwd(), '<workspace>')
      .replaceAll(process.cwd().replaceAll('\\', '/'), '<workspace>');
  return value;
}

export function prepareArtifacts(gate: unknown) {
  assert.ok(gate === 'verify' || gate === 'images', 'Invalid artifact gate');
  const root = resolve('.local/ci', gate);
  const directory = resolve(root, 'upload');
  const summaryPath = resolve(root, 'summary.json');
  const summary = JSON.parse(readFileSync(summaryPath, 'utf8')) as {
    startedAt: string;
    status: string;
  };
  const started = Date.parse(summary.startedAt);
  assert.ok(
    Number.isFinite(started) && Date.now() - started < 3600000,
    'Missing/stale CI evidence',
  );
  assert.ok(['PASS', 'FAIL'].includes(summary.status));
  assert.ok(started <= Date.now(), 'Future-dated evidence');
  if (gate === 'verify' && summary.status === 'PASS') {
    for (const [name, expected] of Object.entries(suites)) {
      const report = resolve('.local/test-evidence', `${name}.json`);
      assert.ok(lstatSync(report).mtimeMs >= started, 'Stale native report');
      const parsed = JSON.parse(readFileSync(report, 'utf8'));
      if (name === 'browser') validateBrowser(parsed, expected);
      else {
        validateVitest(parsed, expected);
        const coverage = resolve('coverage', name, 'coverage-summary.json');
        assert.ok(lstatSync(coverage).mtimeMs >= started, 'Stale coverage');
        validateCoverage(JSON.parse(readFileSync(coverage, 'utf8')));
      }
    }
  }
  rmSync(directory, { recursive: true, force: true });
  mkdirSync(directory, { recursive: true });
  const files: string[] = [];
  let total = 0;
  function add(source: string, target: string, json = false) {
    const stat = lstatSync(source);
    assert.ok(
      stat.isFile() && !stat.isSymbolicLink(),
      'Only regular evidence files',
    );
    assert.ok(stat.size < 25 * 1024 * 1024, 'Evidence file exceeds bound');
    const output = resolve(directory, target);
    assert.ok(
      output.startsWith(directory + sep),
      'Artifact path escaped destination',
    );
    const bytes = json
      ? Buffer.from(
          JSON.stringify(
            sanitizeReport(JSON.parse(readFileSync(source, 'utf8'))),
            null,
            2,
          ) + '\n',
        )
      : readFileSync(source);
    // Lockfile hashes are public integrity evidence, not generated infrastructure passwords.
    if (target !== 'summary.json') assertSafeArtifact(bytes);
    total += bytes.length;
    assert.ok(
      total < 200 * 1024 * 1024 && files.length < 5000,
      'Evidence exceeds bounded upload',
    );
    mkdirSync(dirname(output), { recursive: true });
    if (json) writeFileSync(output, bytes);
    else copyFileSync(source, output);
    files.push(output);
  }
  add(summaryPath, 'summary.json', true);
  if (gate === 'verify') {
    for (const folder of ['.local/test-evidence', 'coverage', 'test-results']) {
      if (!existsSync(folder)) continue;
      for (const entry of readdirSync(folder, {
        recursive: true,
        withFileTypes: true,
      })) {
        assert.ok(!entry.isSymbolicLink(), 'Symlink evidence is prohibited');
        if (!entry.isFile()) continue;
        const source = resolve(entry.parentPath, entry.name);
        if (lstatSync(source).mtimeMs < started) continue;
        const extension = entry.name.split('.').at(-1);
        if (
          !['json', 'html', 'css', 'js', 'png', 'zip'].includes(extension ?? '')
        )
          continue;
        if (extension === 'zip') {
          const archiveTool = process.platform === 'win32' ? 'tar' : 'unzip';
          const members = execFileSync(
            archiveTool,
            [process.platform === 'win32' ? '-tf' : '-Z1', source],
            {
              encoding: 'utf8',
              timeout: 10000,
              maxBuffer: 1024 * 1024,
            },
          )
            .trim()
            .split(/\r?\n/);
          assert.ok(members.length < 2000, 'Trace archive too large');
          for (const member of members) {
            assert.ok(
              !member.startsWith('/') &&
                !member.startsWith('-') &&
                !member.split(/[\\/]/).includes('..'),
              'Unsafe trace member',
            );
            assertSafeArtifact(
              execFileSync(
                archiveTool,
                [process.platform === 'win32' ? '-xOf' : '-p', source, member],
                {
                  timeout: 10000,
                  maxBuffer: 25 * 1024 * 1024,
                },
              ),
            );
          }
        }
        add(
          source,
          relative(process.cwd(), source).replace(/^\.local[\\/]/, ''),
          extension === 'json',
        );
      }
    }
    const budget = resolve(root, 'bundle-budget.json');
    if (existsSync(budget)) add(budget, 'bundle-budget.json', true);
    const dependencies = resolve(root, 'dependencies.json');
    if (existsSync(dependencies)) add(dependencies, 'dependencies.json', true);
  }
  const scan = spawnSync(
    'gitleaks',
    [
      'dir',
      directory,
      '--config',
      resolve('.gitleaks-staged.toml'),
      '--redact',
      '--no-banner',
      '--ignore-gitleaks-allow',
      '--gitleaks-ignore-path',
      directory,
      '--max-archive-depth',
      '2',
      '--timeout',
      '60',
    ],
    { stdio: 'ignore', timeout: 65000 },
  );
  assert.ok(
    !scan.error && scan.status === 0,
    'Artifact sanitization gate failed; upload prohibited',
  );
  return { directory, files };
}
