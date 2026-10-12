import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
if (
  args[0] === 'run' &&
  !args.includes('dev') &&
  !args.some((arg) => arg.startsWith('--concurrency'))
)
  args.push('--concurrency=1');

// Build/check commands are bounded; interactive dev tasks run until stopped.
const result = spawnSync(
  process.execPath,
  [
    fileURLToPath(new URL('../node_modules/turbo/bin/turbo', import.meta.url)),
    ...args,
  ],
  {
    env: { ...process.env, TURBO_TELEMETRY_DISABLED: '1', DO_NOT_TRACK: '1' },
    stdio: 'inherit',
    timeout: process.argv.includes('dev') ? undefined : 14 * 60 * 1000,
  },
);

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
