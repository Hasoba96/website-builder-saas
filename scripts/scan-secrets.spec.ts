import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, resolve } from 'node:path';
import { expect, it } from 'vitest';

it('scans untracked source and force-added artifacts without suppressing findings', () => {
  const temporaryRoot = resolve(tmpdir());
  const directory = mkdtempSync(resolve(temporaryRoot, 'website-scan-test-'));
  if (
    dirname(directory) !== temporaryRoot ||
    !basename(directory).startsWith('website-scan-test-')
  )
    throw new Error('Unsafe fixture cleanup path');
  const scanner = resolve('scripts/scan-secrets.ts');
  const run = () =>
    spawnSync(process.execPath, [scanner], {
      cwd: directory,
      encoding: 'utf8',
      timeout: 20_000,
    });
  try {
    expect(
      spawnSync('git', ['init', '--quiet'], { cwd: directory, timeout: 10_000 })
        .status,
    ).toBe(0);
    copyFileSync(
      '.gitleaks-staged.toml',
      resolve(directory, '.gitleaks-staged.toml'),
    );
    writeFileSync(resolve(directory, '.gitignore'), '.next/\n');
    writeFileSync(resolve(directory, 'source.txt'), 'No credentials here.\n');
    expect(run().status).toBe(0);
    // Synthetic scanner canary, never a real issued credential.
    const canary = ['ghp', randomBytes(30).toString('hex').slice(0, 36)].join(
      '_',
    );
    writeFileSync(resolve(directory, 'source.txt'), canary);
    expect(run().status).toBe(1);
    writeFileSync(resolve(directory, 'source.txt'), 'No credentials here.\n');
    mkdirSync(resolve(directory, '.next'));
    writeFileSync(resolve(directory, '.next/generated.txt'), canary);
    expect(run().status).toBe(0);
    expect(
      spawnSync('git', ['add', '-f', '.next/generated.txt'], {
        cwd: directory,
        timeout: 10_000,
      }).status,
    ).toBe(0);
    expect(run().status).toBe(1);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
