import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import pg from 'pg';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { readMigrationConfig } from '@website-builder/config/migration';
import { connectionOptions } from '@website-builder/database';
import { BackupSmoke, SmokeError } from './backup-smoke.js';

let smoke: BackupSmoke;
beforeAll(() => {
  smoke = new BackupSmoke(process.env['TEST_POSTGRES_CONTAINER']);
  smoke.sql(
    'postgres',
    'CREATE DATABASE backup_source OWNER wb_migrator TEMPLATE template0;',
  );
  smoke.sql(
    'postgres',
    'CREATE ROLE backup_reader LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION; REVOKE ALL ON DATABASE backup_source FROM PUBLIC; GRANT CONNECT ON DATABASE backup_source TO backup_reader, wb_runtime;',
  );
  smoke.sql(
    'backup_source',
    'CREATE SCHEMA migration_meta AUTHORIZATION wb_migrator; REVOKE CREATE ON SCHEMA public FROM PUBLIC;',
  );
  expect(migrate('backup_source', 'up').status).toBe(0);
  smoke.sql(
    'backup_source',
    `SET ROLE wb_migrator;
    CREATE TABLE application.smoke_records (id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY, value_json jsonb NOT NULL, created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL);
    GRANT USAGE ON SCHEMA application TO wb_runtime;
    GRANT SELECT ON application.smoke_records TO wb_runtime;
    GRANT USAGE ON SCHEMA application, migration_meta TO backup_reader;
    GRANT SELECT ON ALL TABLES IN SCHEMA application, migration_meta TO backup_reader;
    GRANT SELECT ON ALL SEQUENCES IN SCHEMA application, migration_meta TO backup_reader;`,
  );
}, 30000);
afterAll(() => {
  smoke?.close();
  if (smoke) expect(existsSync(smoke.directory)).toBe(false);
});
function migrate(database: string, action: string) {
  const result = spawnSync(process.execPath, ['scripts/migrate.ts', action], {
    env: { ...process.env, DB_NAME: database },
    encoding: 'utf8',
    timeout: 15000,
  });
  for (const key of ['DB_PASSWORD', 'MIGRATION_DB_PASSWORD']) {
    const secret = process.env[key];
    if (secret) expect(result.stdout + result.stderr).not.toContain(secret);
  }
  expect(result.error).toBeUndefined();
  return result;
}
async function client(
  database: string,
  work: (connection: pg.Client) => Promise<void>,
) {
  const config = readMigrationConfig({ ...process.env, DB_NAME: database });
  const connection = new pg.Client(connectionOptions(config));
  try {
    await connection.connect();
    await work(connection);
  } finally {
    await connection.end();
  }
}
const values = [
  { text: '\u0645\u0631\u062d\u0628\u0627', optional: null },
  { text: "English ' <>&", long: 'x'.repeat(2048) },
];
function rows(database: 'backup_source' | 'backup_target') {
  return smoke.sql(
    database,
    'SELECT jsonb_agg(t ORDER BY id) FROM application.smoke_records t;',
  );
}
it('restores encrypted real pg_dump into a fresh target with matching data, schema, sequence, ACL and migration history', async () => {
  const started = performance.now();
  await client('backup_source', async (c) => {
    for (const value of values)
      await c.query(
        'INSERT INTO application.smoke_records (value_json, created_at, updated_at) VALUES ($1, $2, $2)',
        [value, '2026-01-01T00:00:00Z'],
      );
  });
  const source = rows('backup_source');
  const history = migrate('backup_source', 'status').stdout;
  const backup = smoke.backup();
  expect(() => smoke.backup()).toThrow(SmokeError);
  expect(backup.bytes).toBeGreaterThan(0);
  expect(backup.bytes).toBeLessThan(4 * 1024 * 1024);
  expect(readFileSync(smoke.path).includes(Buffer.from('PGDMP'))).toBe(false);
  const restore = smoke.restore();
  expect(rows('backup_target')).toBe(source);
  expect(rows('backup_source')).toBe(source);
  expect(migrate('backup_target', 'check').status).toBe(0);
  expect(migrate('backup_target', 'status').stdout).toBe(history);
  expect(migrate('backup_target', 'up').stdout).toContain('"executed":[]');
  expect(
    smoke.sql(
      'backup_target',
      "SELECT has_table_privilege('wb_runtime', 'application.smoke_records', 'SELECT'), has_schema_privilege('wb_runtime', 'application', 'CREATE');",
    ),
  ).toBe('t|f');
  await client('backup_target', async (c) => {
    const next = await c.query(
      'INSERT INTO application.smoke_records (value_json, created_at, updated_at) VALUES ($1, $2, $2) RETURNING id',
      [{ test: true }, '2026-01-01T00:00:00Z'],
    );
    expect(next.rows[0]?.id).toBe(3);
    await expect(
      c.query(
        'INSERT INTO application.smoke_records (value_json, created_at, updated_at) VALUES ($1, $2, $2)',
        [null, '2026-01-01T00:00:00Z'],
      ),
    ).rejects.toMatchObject({ code: '23502' });
  });
  expect(rows('backup_source')).toBe(source);
  const restored = rows('backup_target');
  expect(() => smoke.restore()).toThrow(SmokeError);
  expect(rows('backup_target')).toBe(restored);
  process.stdout.write(
    JSON.stringify({
      event: 'backup_restore_smoke',
      container: smoke.container,
      backup,
      restore,
      totalMs: performance.now() - started,
      sourceUnchanged: true,
      records: 2,
      migrationCompatible: true,
    }) + '\n',
  );
});
it('refuses missing archive and repeated close safely', () => {
  const other = new BackupSmoke(process.env['TEST_POSTGRES_CONTAINER']);
  try {
    expect(() => other.restore()).toThrow(SmokeError);
    other.backup();
    unlinkSync(other.path);
    expect(() => other.restore()).toThrow(SmokeError);
  } finally {
    other.close();
    other.close();
  }
  expect(existsSync(other.directory)).toBe(false);
});
it('rejects tampered ciphertext before restore without touching the source', () => {
  const other = new BackupSmoke(process.env['TEST_POSTGRES_CONTAINER']);
  try {
    other.backup();
    const bytes = readFileSync(other.path);
    bytes[0] = bytes[0]! ^ 1;
    writeFileSync(other.path, bytes);
    expect(() => other.restore()).toThrow(SmokeError);
    expect(
      smoke.sql(
        'backup_source',
        "SELECT to_regclass('application.smoke_records') IS NOT NULL;",
      ),
    ).toBe('t');
  } finally {
    other.close();
  }
});
it('refuses a truncated archive and missing backup permissions with sanitized errors', () => {
  const other = new BackupSmoke(process.env['TEST_POSTGRES_CONTAINER']);
  try {
    other.backup();
    writeFileSync(other.path, Buffer.alloc(0));
    expect(() => other.restore()).toThrow(SmokeError);
    smoke.sql(
      'backup_source',
      'REVOKE SELECT ON application.smoke_records FROM backup_reader;',
    );
    const denied = new BackupSmoke(process.env['TEST_POSTGRES_CONTAINER']);
    try {
      expect(() => denied.backup()).toThrow(
        'Backup smoke operation refused or failed',
      );
      expect(existsSync(denied.path)).toBe(false);
    } finally {
      denied.close();
      smoke.sql(
        'backup_source',
        'GRANT SELECT ON application.smoke_records TO backup_reader;',
      );
    }
  } finally {
    other.close();
  }
});
