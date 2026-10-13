import js from '@eslint/js'
import stylistic from '@stylistic/eslint-plugin'
import { defineConfig, globalIgnores } from 'eslint/config'
import prettier from 'eslint-config-prettier/flat'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import importSort from 'eslint-plugin-simple-import-sort'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default defineConfig([
  globalIgnores(['dist', 'coverage', '.husky/_']),
  {
    files: ['**/*.{js,ts,tsx}'],
    extends: [js.configs.recommended],
    plugins: {
      '@stylistic': stylistic,
      'simple-import-sort': importSort,
    },
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
    rules: {
      eqeqeq: ['error', 'always'],
      'no-nested-ternary': 'error',
      'simple-import-sort/imports': [
        'error',
        {
          groups: [['^node:'], ['^@?\\w'], ['^@/'], ['^\\.'], ['^.+\\.css$']],
        },
      ],
      'simple-import-sort/exports': 'error',
      '@stylistic/padding-line-between-statements': [
        'error',
        { blankLine: 'always', prev: ['const', 'let'], next: '*' },
        { blankLine: 'any', prev: ['const', 'let'], next: ['const', 'let'] },
        { blankLine: 'always', prev: ['if', 'for', 'while', 'try'], next: '*' },
        { blankLine: 'always', prev: '*', next: ['return', 'for', 'while', 'try'] },
        { blankLine: 'always', prev: ['type', 'interface'], next: '*' },
      ],
      'no-restricted-syntax': [
        'error',
        { selector: 'FunctionDeclaration', message: 'Use an arrow function.' },
        { selector: 'FunctionExpression', message: 'Use an arrow function.' },
      ],
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat.recommended, reactRefresh.configs.vite],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    files: ['src/**/ui/*.tsx', 'src/app/**/*.tsx', 'src/**/model/use*.ts'],
    rules: {
      '@typescript-eslint/explicit-module-boundary-types': 'error',
    },
  },
  {
    files: ['tests/**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat.recommended],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },
  {
    files: ['*.config.{js,ts}'],
    languageOptions: {
      globals: globals.node,
    },
  },
  prettier,
])
