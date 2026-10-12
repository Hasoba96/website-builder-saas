import assert from 'node:assert/strict';
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { gzipSync } from 'node:zlib';

// Aggregate shipped JS is deliberately stricter than a single route's first load.
const maximumGzipBytes = 500 * 1024;
const results = [];
for (const app of ['dashboard-web', 'public-renderer']) {
  const directory = resolve('apps', app, '.next/static');
  const files = readdirSync(directory, { recursive: true }).filter(
    (name) => typeof name === 'string' && name.endsWith('.js'),
  ) as string[];
  assert.ok(files.length > 0, `Missing browser build: ${app}`);
  const gzipBytes = files.reduce(
    (total, name) =>
      total + gzipSync(readFileSync(resolve(directory, name))).length,
    0,
  );
  assert.ok(
    gzipBytes <= maximumGzipBytes,
    `Browser JS budget exceeded: ${app}`,
  );
  results.push({ app, files: files.length, gzipBytes, maximumGzipBytes });
}
mkdirSync('.local/ci/verify', { recursive: true });
writeFileSync(
  '.local/ci/verify/bundle-budget.json',
  JSON.stringify(results, null, 2) + '\n',
);
process.stdout.write(JSON.stringify(results) + '\n');
