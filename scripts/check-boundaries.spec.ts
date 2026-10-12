import { basename, dirname, resolve } from 'node:path';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import {
  boundaryViolation,
  checkBoundaries,
  importSpecifiers,
} from './check-boundaries.js';

const root = process.cwd();
const path = (value: string) => resolve(root, value);
describe('repository boundaries', () => {
  it('rejects test fixtures, re-exports and test libraries from production while allowing tests to exercise production', () => {
    for (const [target, specifier] of [
      ['apps/api/tests/operations.spec.ts', '../tests/operations.spec'],
      ['apps/api/src/fixtures/controller.ts', './fixtures/controller'],
      ['node_modules/@nestjs/testing/index.d.ts', '@nestjs/testing'],
      ['node_modules/@actions/artifact/lib/artifact.d.ts', '@actions/artifact'],
      ['packages/testing/dist/index.js', '@website-builder/testing'],
      ['scripts/test-policy.ts', '../../../scripts/test-policy'],
      ['apps/api/vitest.config.ts', '../vitest.config'],
    ])
      expect(
        boundaryViolation(
          root,
          path('apps/api/src/app.module.ts'),
          path(target!),
          specifier!,
        ),
      ).toBe('Production import of test-only code');
    expect(
      boundaryViolation(
        root,
        path('apps/api/tests/example.spec.ts'),
        path('apps/api/src/app.module.ts'),
        '../src/app.module',
      ),
    ).toBeUndefined();
  });
  it('rejects a cross-app TypeScript path alias after real resolution', () => {
    const fixture = mkdtempSync(resolve(tmpdir(), 'website-boundary-'));
    if (
      dirname(fixture) !== resolve(tmpdir()) ||
      !basename(fixture).startsWith('website-boundary-')
    )
      throw new Error('Unsafe boundary fixture path');
    try {
      mkdirSync(resolve(fixture, 'packages'));
      for (const app of ['api', 'worker']) {
        mkdirSync(resolve(fixture, 'apps', app), { recursive: true });
        writeFileSync(
          resolve(fixture, 'apps', app, 'tsconfig.json'),
          JSON.stringify({
            compilerOptions: {
              moduleResolution: 'NodeNext',
              paths: { '#worker': ['../worker/private.ts'] },
            },
          }),
        );
      }
      writeFileSync(
        resolve(fixture, 'apps/worker/private.ts'),
        'export const privateValue = 1;',
      );
      writeFileSync(
        resolve(fixture, 'apps/api/main.ts'),
        "export { privateValue } from '#worker';",
      );
      expect(checkBoundaries(fixture)).toEqual([
        expect.stringContaining('Cross-app import: #worker'),
      ]);
    } finally {
      rmSync(fixture, { recursive: true, force: true });
    }
  });
  it.each([
    ['dashboard-web', 'public-renderer'],
    ['public-renderer', 'dashboard-web'],
    ['api', 'worker'],
    ['worker', 'api'],
  ])('rejects %s importing %s', (source, target) => {
    expect(
      boundaryViolation(
        root,
        path(`apps/${source}/src/a.ts`),
        path(`apps/${target}/src/private.ts`),
        '../../private',
      ),
    ).toBe('Cross-app import');
  });
  it('rejects shared internal paths and dashboard UI in renderer', () => {
    expect(
      boundaryViolation(
        root,
        path('packages/ui-dashboard/src/a.ts'),
        path('packages/site-sections/dist/index.js'),
        '@website-builder/site-sections',
      ),
    ).toBeTruthy();
    expect(
      boundaryViolation(
        root,
        path('apps/api/src/a.ts'),
        path('packages/config/src/locales.ts'),
        '../../../packages/config/src/locales',
      ),
    ).toBeTruthy();
    expect(
      boundaryViolation(
        root,
        path('apps/public-renderer/src/a.ts'),
        path('packages/ui-dashboard/dist/index.js'),
        '@website-builder/ui-dashboard',
      ),
    ).toBeTruthy();
    expect(
      boundaryViolation(
        root,
        path('packages/site-sections/src/a.ts'),
        path('apps/api/src/a.ts'),
        '../../../apps/api/src/a',
      ),
    ).toBeTruthy();
  });
  it('accepts same-app imports and approved public exports', () => {
    expect(
      boundaryViolation(
        root,
        path('apps/api/src/a.ts'),
        path('apps/api/src/b.ts'),
        './b.js',
      ),
    ).toBeUndefined();
    expect(
      boundaryViolation(
        root,
        path('apps/api/src/a.ts'),
        path('packages/config/dist/locales.js'),
        '@website-builder/config/locales',
      ),
    ).toBeUndefined();
  });
  it('inspects static, dynamic, type, require and re-export imports', () => {
    const result = importSpecifiers(
      `import x from 'a'; export * from 'b'; import('c'); require('d'); type T = import('e').T; import value = require('f');`,
      'fixture.ts',
    );
    expect(result.specifiers).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
    expect(result.computed).toBe(false);
    expect(importSpecifiers('import(name)', 'fixture.ts').computed).toBe(true);
  });
  it('validates actual application sources', () => {
    expect(checkBoundaries(root)).toEqual([]);
  });
});
