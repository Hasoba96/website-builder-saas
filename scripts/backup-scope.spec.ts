import { expect, it } from 'vitest';
import { BackupSmoke } from '../tests/database/backup-smoke.js';

it('refuses missing, malformed and persistent scope before invoking Docker without leaking input', () => {
  for (const name of [undefined, '', 'wb-local-preserve', 'private-value']) {
    expect(() => new BackupSmoke(name)).toThrow(
      'Backup smoke operation refused or failed',
    );
  }
});
