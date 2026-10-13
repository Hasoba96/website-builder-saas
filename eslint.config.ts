import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig(
  globalIgnores([
    '**/node_modules/**',
    '**/.pnpm-store/**',
    '**/.turbo/**',
    '**/dist/**',
    '**/.next/**',
    '**/next-env.d.ts',
    '**/test-results/**',
    '**/playwright-report/**',
    '**/coverage/**',
    '.local/**',
  ]),
  {
    files: ['**/*.{spec,test}.{ts,tsx,mts,cts,js,jsx,mjs,cjs}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'MemberExpression[property.name=/^(skip|todo|only|skipIf|runIf|fails)$/]',
          message:
            'No disabled, focused or expected-failure tests in acceptance suites (TS-026). Track quarantine with owner/ticket/date outside passing closure evidence.',
        },
      ],
    },
  },
  {
    files: ['apps/**/src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "MemberExpression[object.name='process'][property.name='env']",
          message: 'Use packages/config; no application environment access.',
        },
        {
          selector:
            "MemberExpression[object.name='process'][property.value='env']",
          message: 'Use packages/config; no application environment access.',
        },
        {
          selector: "VariableDeclarator[init.name='process']",
          message: 'Do not alias or destructure process; use packages/config.',
        },
      ],
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'node:process',
              message: 'Use packages/config for environment access.',
            },
            {
              name: 'process',
              message: 'Use packages/config for environment access.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-ignore': true,
          'ts-nocheck': true,
          'ts-check': false,
          'ts-expect-error': {
            descriptionFormat: '^: .+ [A-Z][A-Z0-9]+-[0-9]+$',
          },
          minimumDescriptionLength: 10,
        },
      ],
    },
  },
);
