import { execFileSync } from 'node:child_process';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';
import {
  lstatSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { resolve, dirname } from 'node:path';

const limit = 4 * 1024 * 1024;
const digest = (bytes: Buffer) =>
  createHash('sha256').update(bytes).digest('hex');
export class SmokeError extends Error {
  constructor() {
    super('Backup smoke operation refused or failed');
  }
}
function command(args: string[], input?: Buffer) {
  try {
    return execFileSync('docker', args, {
      input,
      timeout: 15000,
      maxBuffer: limit,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch {
    throw new SmokeError();
  }
}

// Test-only capability: no operator endpoint, database name or external archive input.
export class BackupSmoke {
  readonly container: string;
  readonly directory: string;
  readonly path: string;
  readonly #key = randomBytes(32);
  readonly #iv = randomBytes(12);
  #tag?: Buffer;
  #hash?: string;
  #closed = false;
  constructor(name: string | undefined) {
    if (
      !name ||
      !/^wbp-00d-[a-f0-9-]{36}$/.test(name) ||
      process.env['APP_ENV'] !== 'ci'
    )
      throw new SmokeError();
    const inspected = JSON.parse(command(['inspect', name]).toString()) as {
      Id: string;
      Config: { Labels: Record<string, string>; Image: string };
      HostConfig: { Tmpfs: Record<string, string> };
      Mounts: { Type: string; Destination: string }[];
    }[];
    const item = inspected[0];
    if (
      inspected.length !== 1 ||
      !item ||
      item.Config.Labels['website-builder.test'] !== '00-d' ||
      item.Config.Image !==
        'postgres@sha256:77f585114c32fbca283dc835b0596f4e52b51b4c6662d7810b2f4084f60a1873' ||
      item.Mounts.length !== 0 ||
      !item.HostConfig.Tmpfs['/var/lib/postgresql']
    )
      throw new SmokeError();
    this.container = item.Id;
    this.directory = mkdtempSync(resolve('.local/00k-backup-'));
    this.path = resolve(this.directory, 'snapshot.enc');
  }
  sql(database: 'postgres' | 'backup_source' | 'backup_target', sql: string) {
    if (this.#closed) throw new SmokeError();
    return this.#exec(
      [
        'psql',
        '-XAt',
        '--set=ON_ERROR_STOP=1',
        '--username=postgres',
        `--dbname=${database}`,
      ],
      Buffer.from(sql),
    )
      .toString()
      .trim();
  }
  #exec(args: string[], input?: Buffer) {
    return command(
      ['exec', '-i', '--user', 'postgres', this.container, ...args],
      input,
    );
  }
  #restoreInput() {
    if (this.#closed || !this.#tag || !this.#hash) throw new SmokeError();
    try {
      const stat = lstatSync(this.path);
      if (!stat.isFile() || stat.isSymbolicLink() || stat.size > limit)
        throw new SmokeError();
      const encrypted = readFileSync(this.path);
      if (digest(encrypted) !== this.#hash) throw new SmokeError();
      const decipher = createDecipheriv('aes-256-gcm', this.#key, this.#iv);
      decipher.setAuthTag(this.#tag);
      return Buffer.concat([decipher.update(encrypted), decipher.final()]);
    } catch {
      throw new SmokeError();
    }
  }
  backup() {
    if (this.#closed || this.#tag) throw new SmokeError();
    const started = performance.now();
    const plain = this.#exec([
      'pg_dump',
      '--username=backup_reader',
      '--dbname=backup_source',
      '-Fc',
      '--lock-wait-timeout=2000',
    ]);
    try {
      this.#exec(['pg_restore', '--list'], plain);
      const cipher = createCipheriv('aes-256-gcm', this.#key, this.#iv);
      const encrypted = Buffer.concat([cipher.update(plain), cipher.final()]);
      this.#tag = cipher.getAuthTag();
      writeFileSync(this.path, encrypted, { flag: 'wx', mode: 0o600 });
      this.#hash = digest(encrypted);
      return {
        bytes: encrypted.length,
        sha256: this.#hash,
        elapsedMs: performance.now() - started,
      };
    } finally {
      plain.fill(0);
    }
  }
  restore() {
    const started = performance.now();
    const plain = this.#restoreInput();
    try {
      this.#exec(['pg_restore', '--list'], plain);
      // CREATE without DROP/IF NOT EXISTS is the atomic refusal for occupied targets.
      this.sql(
        'postgres',
        'CREATE DATABASE backup_target OWNER wb_migrator TEMPLATE template0;',
      );
      this.sql(
        'postgres',
        'REVOKE ALL ON DATABASE backup_target FROM PUBLIC; GRANT CONNECT ON DATABASE backup_target TO wb_runtime;',
      );
      this.#exec(
        [
          'pg_restore',
          '--username=wb_migrator',
          '--dbname=backup_target',
          '--no-owner',
          '--exit-on-error',
          '--single-transaction',
        ],
        plain,
      );
      return { elapsedMs: performance.now() - started };
    } finally {
      plain.fill(0);
    }
  }
  close() {
    if (this.#closed) return;
    this.#closed = true;
    this.#key.fill(0);
    this.#iv.fill(0);
    this.#tag?.fill(0);
    if (
      dirname(this.directory) !== resolve('.local') ||
      !this.directory.startsWith(resolve('.local/00k-backup-'))
    )
      throw new SmokeError();
    rmSync(this.directory, { recursive: true, force: true });
    // Databases remain inside the exact disposable harness container; its finally owns teardown.
  }
}
