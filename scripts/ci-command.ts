import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

export function executeCheck(
  executable: string,
  args: string[],
  timeout: number,
  output: 'inherit' | 'ignore' = 'inherit',
) {
  const result = spawnSync(executable, args, { stdio: output, timeout });
  assert.ok(
    !result.error && result.status === 0,
    'Verification command failed',
  );
}
