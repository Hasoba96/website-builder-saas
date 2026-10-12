import { readFileSync, readdirSync } from 'node:fs';
import { dirname, extname, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const approved = new Set([
  'queues',
  'database',
  'schemas',
  'types',
  'site-sections',
  'ui-dashboard',
  'config',
  'testing',
  'observability',
]);
const normalize = (value: string) => value.split(sep).join('/');
export function boundaryViolation(
  root: string,
  source: string,
  target: string,
  specifier: string,
): string | undefined {
  const from = normalize(relative(root, source)).split('/');
  const to = normalize(relative(root, target)).split('/');
  const testOnly = (parts: string[]) =>
    parts.some((part) =>
      ['tests', '__tests__', '__mocks__', 'fixtures'].includes(part),
    ) ||
    /\.(spec|test)\.[cm]?[jt]sx?$/.test(parts.at(-1) ?? '') ||
    /^(vitest(?:\.[\w-]+)?|playwright)\.config\./.test(parts.at(-1) ?? '') ||
    (parts[0] === 'scripts' && /^test-/.test(parts.at(-1) ?? ''));
  if (
    ['apps', 'packages'].includes(from[0] ?? '') &&
    !testOnly(from) &&
    (testOnly(to) ||
      specifier === '@website-builder/testing' ||
      [
        '@actions/artifact',
        'vitest',
        '@nestjs/testing',
        '@playwright/test',
        '@vitest/coverage-v8',
      ].some(
        (name) => specifier === name || specifier.startsWith(`${name}/`),
      )) &&
    from.at(-1) !== 'vitest.config.ts'
  )
    return 'Production import of test-only code';
  if (
    specifier === '@website-builder/queues' &&
    from[0] === 'apps' &&
    from[1] !== 'worker'
  )
    return 'Queue runtime ownership';
  if (
    from[0] === 'apps' &&
    ['bullmq', 'ioredis'].some(
      (name) => specifier === name || specifier.startsWith(`${name}/`),
    )
  )
    return 'Use the queue infrastructure boundary';
  if (
    specifier === '@website-builder/database' &&
    from[0] === 'apps' &&
    from[1] !== 'api'
  )
    return 'Database runtime ownership';
  if (from[0] === 'apps' && ['pg', 'node-pg-migrate'].includes(specifier))
    return 'Use the database boundary; migrations are operator-only';
  if (from[0] === 'apps' && specifier.startsWith('@website-builder/config/')) {
    const entry = specifier.split('/')[2];
    const permitted = [
      'locales',
      'public',
      from[1] === 'api'
        ? 'api'
        : from[1] === 'worker'
          ? 'worker'
          : 'web-server',
    ];
    if (!entry || !permitted.includes(entry))
      return 'Application configuration ownership';
  }
  if (from[0] === 'apps' && to[0] === 'apps' && from[1] !== to[1])
    return 'Cross-app import';
  if (from[0] === 'packages' && to[0] === 'apps')
    return 'Package depends on app';
  if (to[0] === 'packages' && (from[0] !== 'packages' || from[1] !== to[1])) {
    if (!approved.has(to[1] ?? '')) return 'Unapproved shared package';
    if (!specifier.startsWith('@website-builder/'))
      return 'Package internal path import';
    if (
      (from[1] === 'public-renderer' || from[1] === 'site-sections') &&
      to[1] === 'ui-dashboard'
    )
      return 'Dashboard UI boundary';
    if (from[1] === 'ui-dashboard' && to[1] === 'site-sections')
      return 'Dashboard UI boundary';
  }
  if (specifier.startsWith('@website-builder/')) {
    const name = specifier.split('/')[1] ?? '';
    if (!approved.has(name)) return 'App or unapproved package import';
  }
  return undefined;
}

export function importSpecifiers(
  source: string,
  filename: string,
): { specifiers: string[]; computed: boolean } {
  const tree = ts.createSourceFile(
    filename,
    source,
    ts.ScriptTarget.Latest,
    true,
  );
  const specifiers: string[] = [];
  let computed = false;
  function record(node: ts.Node | undefined) {
    if (node && ts.isStringLiteralLike(node)) specifiers.push(node.text);
    else computed = true;
  }
  function visit(node: ts.Node) {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier
    )
      record(node.moduleSpecifier);
    if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference)
    )
      record(node.moduleReference.expression);
    if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument))
      record(node.argument.literal);
    if (
      ts.isCallExpression(node) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) &&
          node.expression.text === 'require'))
    )
      record(node.arguments[0]);
    ts.forEachChild(node, visit);
  }
  visit(tree);
  return { specifiers, computed };
}

function filesIn(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (['node_modules', '.next', 'dist', '.turbo'].includes(entry.name))
      return [];
    const path = resolve(directory, entry.name);
    return entry.isDirectory()
      ? filesIn(path)
      : ['.ts', '.tsx', '.mts', '.cts'].includes(extname(path)) &&
          entry.name !== 'next-env.d.ts'
        ? [path]
        : [];
  });
}

export function checkBoundaries(root: string): string[] {
  const failures: string[] = [];
  const edges = new Map<string, string[]>();
  for (const folder of ['apps', 'packages']) {
    for (const entry of readdirSync(resolve(root, folder), {
      withFileTypes: true,
    }).filter((entry) => entry.isDirectory())) {
      const base = resolve(root, folder, entry.name);
      const configPath = resolve(base, 'tsconfig.json');
      const config = ts.readConfigFile(configPath, ts.sys.readFile);
      if (config.error)
        throw new Error(
          ts.flattenDiagnosticMessageText(config.error.messageText, '\n'),
        );
      const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, base);
      for (const source of filesIn(base)) {
        const imports = importSpecifiers(readFileSync(source, 'utf8'), source);
        if (imports.computed)
          failures.push(
            `${relative(root, source)}: computed import cannot be boundary-checked`,
          );
        for (const specifier of imports.specifiers) {
          const resolved = ts.resolveModuleName(
            specifier,
            source,
            parsed.options,
            ts.sys,
          ).resolvedModule?.resolvedFileName;
          const target = resolved ?? resolve(dirname(source), specifier);
          const violation = boundaryViolation(root, source, target, specifier);
          if (violation)
            failures.push(
              `${relative(root, source)}: ${violation}: ${specifier}`,
            );
          if (!resolved && specifier.startsWith('@website-builder/'))
            failures.push(
              `${relative(root, source)}: unresolved shared public export: ${specifier}`,
            );
          if (resolved && !resolved.includes('node_modules'))
            edges.set(source, [...(edges.get(source) ?? []), resolved]);
        }
      }
    }
  }
  const complete = new Set<string>();
  const visiting = new Set<string>();
  function visit(source: string) {
    if (visiting.has(source)) {
      failures.push(`Circular dependency: ${relative(root, source)}`);
      return;
    }
    if (complete.has(source)) return;
    visiting.add(source);
    for (const target of edges.get(source) ?? []) visit(target);
    visiting.delete(source);
    complete.add(source);
  }
  for (const source of edges.keys()) visit(source);
  return failures;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const failures = checkBoundaries(process.cwd());
  if (failures.length) {
    process.stderr.write(failures.join('\n') + '\n');
    process.exitCode = 1;
  } else
    process.stdout.write(
      'Application/package boundaries and local import cycles: PASS\n',
    );
}
