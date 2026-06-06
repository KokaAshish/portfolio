import typescriptPlugin from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import astroPlugin from 'eslint-plugin-astro';

/** @type {import("eslint").Linter.FlatConfig[]} */
export default [
  // ── Ignore patterns ───────────────────────────────────────────
  {
    ignores: ['dist/**', '.astro/**', 'node_modules/**'],
  },

  // ── TypeScript source files ───────────────────────────────────
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': typescriptPlugin,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },

  // ── Astro files ───────────────────────────────────────────────
  ...astroPlugin.configs.recommended,
];
