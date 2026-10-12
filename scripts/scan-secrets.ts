import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import {
  basename,
  dirname,
  isAbsolute,
  relative,
  resolve,
  sep,
} from 'node:path';

// Include tracked files even if ignored, plus all untracked Git-eligible files.
// Generated Next server keys are build artifacts, never source credentials.
const root = process.cwd();
const inventory = spawnSync(
  'git',
  ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
  {
    encoding: 'utf8',
    timeout: 30_000,
    maxBuffer: 10 * 1024 * 1024,
  },
);
if (inventory.error || inventory.status !== 0)
  throw new Error('Git source inventory failed');
const temporaryRoot = resolve(tmpdir());
const directory = mkdtempSync(resolve(temporaryRoot, 'website-secret-scan-'));
if (
  dirname(directory) !== temporaryRoot ||
  !basename(directory).startsWith('website-secret-scan-')
)
  throw new Error('Unsafe scan cleanup path');
try {
  const paths = [...new Set(inventory.stdout.split('\0').filter(Boolean))];
  for (const path of paths) {
    const source = resolve(root, path);
    const destination = resolve(directory, path);
    const local = relative(root, source);
    if (
      isAbsolute(local) ||
      local === '..' ||
      local.startsWith('..' + sep) ||
      !destination.startsWith(directory + sep)
    )
      throw new Error('Source inventory escaped repository');
    const stat = lstatSync(source, { throwIfNoEntry: false });
    if (!stat) continue; // A tracked deletion has no working-tree content to scan.
    if (!stat.isFile() || stat.isSymbolicLink())
      throw new Error('Source scan requires regular repository files');
    mkdirSync(dirname(destination), { recursive: true });
    copyFileSync(source, destination);
  }
  const result = spawnSync(
    'gitleaks',
    [
      'dir',
      directory,
      '--config',
      resolve(root, '.gitleaks-staged.toml'),
      '--redact',
      '--no-banner',
      '--ignore-gitleaks-allow',
      '--gitleaks-ignore-path',
      directory,
      '--timeout',
      '60',
    ],
    { stdio: 'inherit', timeout: 65_000 },
  );
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
  process.stdout.write(
    `Scanned ${paths.length} tracked/untracked Git-eligible paths; no new allowlist or baseline suppression.\n`,
  );
} finally {
  rmSync(directory, { recursive: true, force: true });
}
