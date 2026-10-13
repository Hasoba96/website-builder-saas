import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
for (const args of [
  [
    'scripts/turbo.ts',
    'run',
    'build',
    '--filter=@website-builder/api',
    '--filter=@website-builder/worker',
  ],
  [
    resolve('node_modules/vitest/vitest.mjs'),
    'run',
    '--config',
    'vitest.local.config.ts',
  ],
]) {
  const result = spawnSync(process.execPath, args, {
    stdio: 'inherit',
    timeout: 600000,
  });
  if (result.error || result.status !== 0) {
    process.exitCode = 1;
    break;
  }
}
