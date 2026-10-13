import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { rmSync } from 'node:fs';
import { createServer } from 'node:net';
import { once } from 'node:events';
import { execFileSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import {
  docker,
  initializeLocal,
  localUp,
  localReset,
} from './local-infrastructure.ts';

// Image smoke is a separate, explicit acceptance gate, not a replacement for pnpm test.
const project = `wb-local-test-${randomUUID()}`;
const directory = resolve('.local', project);
const names: string[] = [];
const packageManager = process.env['npm_execpath'];
assert.ok(packageManager, 'Invoke through pnpm test:images');
const graph: unknown = JSON.parse(
  execFileSync(
    process.execPath,
    [
      packageManager,
      'list',
      '--recursive',
      '--depth',
      'Infinity',
      '--lockfile-only',
      '--json',
    ],
    { encoding: 'utf8', timeout: 30000 },
  ),
);
const allowed = new Set<string>();
function collect(value: unknown) {
  if (!value || typeof value !== 'object') return;
  const record = value as Record<string, unknown>;
  const name = record['name'] ?? record['from'];
  if (typeof name === 'string' && typeof record['version'] === 'string')
    allowed.add(`${name}@${record['version']}`);
  for (const child of Object.values(record)) collect(child);
}
collect(graph);
assert.ok(allowed.size > 100, 'Missing locked package inventory');
async function port() {
  const server = createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing port');
  await new Promise<void>((done) => server.close(() => done()));
  return String(address.port);
}
const failures: unknown[] = [];
try {
  initializeLocal(directory, await port(), await port());
  await localUp(directory, project);
  for (const app of ['api', 'worker', 'dashboard-web', 'public-renderer']) {
    const image = `wbp-local-${app}:00-i`;
    const name = `${project}-${app}`;
    const web = app.endsWith('web') || app === 'public-renderer';
    const args = [
      'run',
      '--detach',
      '--name',
      name,
      '--label',
      `website-builder.image-test=${project}`,
      '--memory',
      '512m',
      '--cpus',
      '1',
      '--pids-limit',
      '128',
      '--cap-drop',
      'ALL',
      '--security-opt',
      'no-new-privileges:true',
      '--read-only',
      '--tmpfs',
      '/tmp:rw,nosuid,nodev,size=64m',
    ];
    if (!web)
      args.push(
        '--network',
        `container:${project}-${app === 'api' ? 'postgres' : 'redis'}-1`,
        '--env-file',
        resolve(directory, `${app}.env`),
        '--env',
        'DB_PORT=5432',
        '--env',
        'REDIS_PORT=6379',
      );
    else
      args.push(
        '--network',
        'none',
        '--env',
        'APP_ENV=local',
        '--env',
        'HOST=127.0.0.1',
        '--env',
        'PORT=3000',
        '--tmpfs',
        `/app/apps/${app}/.next/standalone/apps/${app}/.next/cache:rw,nosuid,nodev,uid=1000,gid=1000,size=64m`,
      );
    args.push('--env', 'NODE_ENV=production', image);
    docker(args);
    names.push(name);
    const listener = web ? 3000 : app === 'api' ? 3001 : 3004;
    const request = (path: string) =>
      docker(
        [
          'exec',
          name,
          'node',
          '-e',
          `fetch('http://127.0.0.1:${listener}${path}',{signal:AbortSignal.timeout(2000)}).then(async r=>{if(r.status!==200)process.exit(1);console.log(await r.text())}).catch(()=>process.exit(1))`,
        ],
        process.env,
        10000,
      );
    const deadline = Date.now() + 30000;
    while (true) {
      try {
        JSON.parse(request('/ready'));
        break;
      } catch {
        if (Date.now() > deadline)
          throw new Error(`Image readiness failed: ${app}`);
        await delay(250);
      }
    }
    assert.deepEqual(Object.keys(JSON.parse(request('/health'))).sort(), [
      'data',
      'requestId',
    ]);
    if (web)
      for (const [locale, direction] of [
        ['ar', 'rtl'],
        ['en', 'ltr'],
      ]) {
        const html = request(`/${locale}`);
        assert.ok(html.includes(`lang="${locale}"`));
        assert.ok(html.includes(`dir="${direction}"`));
      }
    assert.equal(docker(['exec', name, 'id', '-u']), '1000');
    const packages = JSON.parse(
      docker([
        'exec',
        name,
        'node',
        '-e',
        String.raw`
      const fs=require('node:fs'),path=require('node:path'),seen=new Set(),result=new Set();
      function walk(dir){const real=fs.realpathSync(dir);if(seen.has(real))return;seen.add(real);
        for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);
          if(entry.isDirectory())walk(file);
          else if(entry.name==='package.json'&&/\/node_modules\/(?:@[^/]+\/)?[^/]+\/package.json$/.test(file)){const p=JSON.parse(fs.readFileSync(file,'utf8'));if(p.name&&p.version)result.add(p.name+'@'+p.version);}}}
      walk('/app');console.log(JSON.stringify([...result].sort()));
    `,
      ]),
    ) as string[];
    for (const dependency of packages) {
      assert.ok(
        dependency.startsWith('@website-builder/') || allowed.has(dependency),
        `Unlocked artifact dependency: ${dependency}`,
      );
      assert.ok(
        !/^(vitest|@vitest\/|@playwright\/|playwright|@nestjs\/testing@|typescript@|@actions\/)/.test(
          dependency,
        ),
        `Test/build tooling shipped: ${dependency}`,
      );
    }
    const inventory = docker([
      'exec',
      name,
      'find',
      '/app',
      '-type',
      'd',
      '-name',
      'node_modules',
    ]);
    assert.ok(inventory.includes('node_modules'));
    const forbidden = docker([
      'exec',
      name,
      'find',
      '/app',
      '-type',
      'd',
      '(',
      '-name',
      'vitest',
      '-o',
      '-name',
      'playwright',
      '-o',
      '-name',
      'tests',
      ')',
    ]);
    // Installed test runners are rejected by package identity above; vendor paths alone are not package identities.
    assert.deepEqual(
      forbidden
        .split('\n')
        .filter(
          (path) =>
            path &&
            (!path.includes('/node_modules/') ||
              path.includes('@website-builder')),
        ),
      [],
      `Test tooling shipped in ${app}`,
    );
    docker(['stop', '--time', '15', name]);
    const state = JSON.parse(
      docker(['inspect', '--format', '{{json .State}}', name]),
    ) as { ExitCode: number; OOMKilled: boolean };
    assert.equal(state.OOMKilled, false);
    assert.equal(state.ExitCode, 0);
    const logs = docker(['logs', name]);
    assert.ok(
      logs.includes('"event":"stopped"'),
      `Missing clean shutdown event: ${app}`,
    );
    assert.ok(
      !logs.includes('"event":"shutdown_failed"'),
      `Shutdown failure logged: ${app}`,
    );
    for (const line of logs.split('\n').filter(Boolean))
      assert.doesNotThrow(() => JSON.parse(line));
    process.stdout.write(
      `Image PASS: ${app}, non-root, ready, locales where applicable, ${packages.length} locked package identities, structured output, shutdown=${state.ExitCode}\n`,
    );
  }
} catch (error) {
  failures.push(error);
} finally {
  for (const name of names) {
    try {
      docker(['rm', '--force', name]);
    } catch {
      failures.push(new Error(`Image cleanup failed: ${name}`));
    }
  }
  try {
    localReset(directory, project, '--delete-local-data');
  } catch {
    failures.push(new Error(`Infrastructure cleanup failed: ${project}`));
  }
  if (!failures.length) rmSync(directory, { recursive: true, force: true });
}
if (failures.length)
  throw new AggregateError(
    failures,
    'Image verification failed; inspect the reported checks and exact owned resources',
  );
