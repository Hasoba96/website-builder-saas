import { readdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import pg from 'pg';
import { runner } from 'node-pg-migrate';
import {
  readMigrationConfig,
  ConfigurationError,
} from '@website-builder/config/migration';
import { connectionOptions, DatabaseError } from '@website-builder/database';

const directory = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../migrations',
);
export async function migrate(command: string | undefined) {
  if (!['up', 'down', 'status', 'check'].includes(command ?? ''))
    throw new Error('Expected migration command: up, down, status or check');
  const config = readMigrationConfig();
  const files = (await readdir(directory)).sort();
  const prefixes = files.map((file) => file.split('_')[0]);
  if (
    !files.length ||
    files.some((file) => !/^\d{13}_[a-z0-9-]+\.cjs$/.test(file)) ||
    new Set(prefixes).size !== prefixes.length
  )
    throw new Error(
      'Migration files require unique 13-digit timestamp prefixes and lowercase slugs',
    );
  if (command === 'down' && !['local', 'ci'].includes(config.APP_ENV))
    throw new Error(
      'Down is restricted to disposable local/CI databases; deployed changes require reviewed roll-forward recovery',
    );
  const client = new pg.Client(connectionOptions(config));
  let connectionFailed = false;
  client.on('error', () => {
    connectionFailed = true;
  });
  try {
    await client.connect();
    if (command === 'status' || command === 'check') {
      const exists = await client.query<{ table_name: string | null }>(
        'SELECT to_regclass($1) AS table_name',
        ['migration_meta.pgmigrations'],
      );
      const applied: string[] = exists.rows[0]?.table_name
        ? (
            await client.query<{ name: string }>(
              'SELECT name FROM migration_meta.pgmigrations ORDER BY id',
            )
          ).rows.map((row) => row.name)
        : [];
      const names = files.map((file) => file.slice(0, -4));
      if (applied.some((name, index) => name !== names[index]))
        throw new Error(
          'Migration history does not match ordered versioned files',
        );
      const pending = names.slice(applied.length);
      if (command === 'check' && pending.length)
        throw new Error('Pending migrations');
      if (connectionFailed)
        throw new DatabaseError('migration connection', undefined);
      return { applied, pending };
    }
    const migrations = await runner({
      dbClient: client,
      dir: directory,
      direction: command === 'up' ? 'up' : 'down',
      ...(command === 'down' ? { count: 1 } : {}),
      migrationsTable: 'pgmigrations',
      migrationsSchema: 'migration_meta',
      schema: 'public',
      createSchema: false,
      createMigrationsSchema: false,
      checkOrder: true,
      singleTransaction: true,
      noLock: false,
      logger: {
        // Raw runner output includes SQL and driver errors. Emit only the command result below.
        info: () => {},
        warn: () => {},
        error: () => {},
        debug: () => {},
      },
    });
    if (connectionFailed)
      throw new DatabaseError('migration connection', undefined);
    return { executed: migrations.map((migration) => migration.name) };
  } catch (error) {
    throw new DatabaseError('migration', error);
  } finally {
    await client.end().catch(() => {
      throw new DatabaseError('migration shutdown', undefined);
    });
  }
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const deadline = setTimeout(() => {
    process.stderr.write(
      '{"event":"migration_failed","reason":"Operator command exceeded 60-second budget; inspect migration status before retrying"}\n',
    );
    process.exit(1);
  }, 60000);
  migrate(process.argv[2]).then(
    (result) => {
      clearTimeout(deadline);
      process.stdout.write(
        JSON.stringify({ event: 'migration_complete', ...result }) + '\n',
      );
    },
    (error: unknown) => {
      clearTimeout(deadline);
      process.stderr.write(
        JSON.stringify({
          event: 'migration_failed',
          reason:
            error instanceof ConfigurationError
              ? error.message
              : 'Migration command failed; check configuration, permissions and migration state',
        }) + '\n',
      );
      process.exitCode = 1;
    },
  );
}
