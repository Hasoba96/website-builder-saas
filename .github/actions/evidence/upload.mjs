import { spawnSync } from 'node:child_process';

let code = 'PROCESS:FAILED';
try {
  const result = spawnSync(
    process.execPath,
    ['scripts/ci-upload.ts', process.env.INPUT_GATE ?? ''],
    {
      stdio: 'ignore',
      timeout: 180000,
    },
  );
  if (result.error || result.status !== 0) {
    code =
      result.error?.code === 'ETIMEDOUT'
        ? 'PROCESS:TIMEOUT'
        : ({
            31: 'VALIDATION:REJECTED',
            32: 'SCAN:FAILED',
            33: 'PUBLICATION:FAILED',
          }[result.status] ?? 'PROCESS:FAILED');
    throw new Error('Upload failed');
  }
  process.stdout.write('Sanitized CI evidence uploaded; retention 7 days.\n');
} catch {
  // SDK/network errors may contain runtime credentials or signed upload URLs.
  process.stderr.write(
    `CI evidence failure ${code}. Raw diagnostics withheld.\n`,
  );
  process.exitCode = 1;
}
