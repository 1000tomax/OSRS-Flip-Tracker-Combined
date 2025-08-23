import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import jsxA11y from 'eslint-plugin-jsx-a11y';

export default [
  {
    ignores: [
      'dist/**/*',
      'build/**/*',
      'node_modules/**/*',
      'data-processing/**/*',
      'scripts/**/*',
      'public/**/*',
      '**/*.test.{js,jsx,ts,tsx}',
      '**/__tests__/**/*',
      'coverage/**/*',
      '.vite/**/*',
      'vite.config.js',
      'jest.config.js',
    ],
  },
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      '@typescript-eslint': tseslint,
      'jsx-a11y': jsxA11y,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,

      // React specific rules
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // TypeScript specific rules (only when @typescript-eslint plugin is active)
      'no-unused-vars': 'off', // Turn off base rule
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',

      // Accessibility rules (basic set)
      'jsx-a11y/alt-text': 'warn',
      'jsx-a11y/aria-props': 'warn',
      'jsx-a11y/click-events-have-key-events': 'warn',
      'jsx-a11y/no-static-element-interactions': 'warn',

      // General code quality (relaxed for existing codebase)
      'no-console': 'off', // Allow console statements for now
      'no-debugger': 'error',
      'no-alert': 'error',
      'no-duplicate-imports': 'error',
      'no-unused-expressions': 'error',
      'prefer-const': 'error',
      'no-var': 'error',
      'object-shorthand': 'error',
      'prefer-template': 'error',

      // Performance related
      'no-async-promise-executor': 'error',
      'no-await-in-loop': 'warn',
      'require-atomic-updates': 'error',

      // Security related
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',

      // Trading app specific rules (relaxed for existing codebase)
      'no-magic-numbers': [
        'warn',
        {
          ignore: [
            0, 1, -1, 2, 3, 4, 5, 7, 10, 11, 12, 13, 21, 24, 30, 36, 50, 60, 100, 365, 400, 1000,
            1000000, 1000000000, 2147483647,
          ],
          ignoreArrayIndexes: true,
          ignoreDefaultValues: true,
          enforceConst: false,
          detectObjects: false,
        },
      ],
    },
  },
  {
    files: ['**/*.{js,jsx}'],
    rules: {
      // Relax TypeScript rules for JS files
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
    },
  },
  {
    files: ['**/*.test.{js,jsx,ts,tsx}', '**/__tests__/**/*'],
    languageOptions: {
      globals: {
        ...globals.jest,
        ...globals.browser,
      },
    },
    rules: {
      // Relax rules for test files
      'no-magic-numbers': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off',
    },
  },
  {
    files: ['tailwind.config.js', 'scripts/**/*.{js,cjs}'],
    languageOptions: {
      globals: globals.node,
    },
  },
];
