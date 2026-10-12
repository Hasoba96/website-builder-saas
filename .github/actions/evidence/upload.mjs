import { spawnSync } from 'node:child_process';

try {
  const result = spawnSync(
    process.execPath,
    ['scripts/ci-upload.ts', process.env.INPUT_GATE ?? ''],
    {
      stdio: 'ignore',
      timeout: 180000,
    },
  );
  if (result.error || result.status !== 0) throw new Error('Upload failed');
  process.stdout.write('Sanitized CI evidence uploaded; retention 7 days.\n');
} catch {
  // SDK/network errors may contain runtime credentials or signed upload URLs.
  process.stderr.write(
    'Sanitized evidence validation/upload failed. No raw error was logged.\n',
  );
  process.exitCode = 1;
}
