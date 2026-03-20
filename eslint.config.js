import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores(['dist', 'storybook-static']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, tseslint.configs.recommended, reactHooks.configs.flat.recommended, reactRefresh.configs.vite],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // Ignore _-prefixed parameters and variables (intentionally unused)
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // Allow constant and hook exports alongside components (context files, utility modules)
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // Loading initial state from external sources (localStorage, HA) inside effects is a valid pattern
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
  // Storybook files: relax rules that conflict with decorator / render patterns
  {
    files: ['.storybook/**/*.{ts,tsx}', 'src/**/*.stories.{ts,tsx}'],
    rules: {
      'react-refresh/only-export-components': 'off',
      'react-hooks/rules-of-hooks': 'off',
    },
  },
  // Test files: fast-refresh rules are irrelevant outside the browser bundle
  {
    files: ['src/**/*.test.{ts,tsx}', 'src/test/**/*.{ts,tsx}'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
]);
