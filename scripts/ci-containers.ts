import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

// Read-only inventory; cleanup remains with each fixture's exact ownership boundary.
const names = execFileSync(
  'docker',
  ['ps', '--all', '--format', '{{.Names}}'],
  {
    encoding: 'utf8',
    timeout: 30000,
    stdio: ['ignore', 'pipe', 'ignore'],
  },
)
  .trim()
  .split(/\r?\n/);
assert.ok(
  !names.some((name) => /^(?:wbp-00[de]-|wb-local-test-)/.test(name)),
  'Owned test containers remain; inspect exact fixture resources',
);
process.stdout.write(
  'Zero PostgreSQL/Redis/local/image test containers remain.\n',
);
