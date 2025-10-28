import typescriptParser from '@typescript-eslint/parser';
import typescriptPlugin from '@typescript-eslint/eslint-plugin';
import securityPlugin from 'eslint-plugin-security';

export default [
  // Main source files - strict rules
  {
    files: ['src/**/*.ts'],
    ignores: ['src/**/*.test.ts', 'src/**/*.spec.ts', 'src/__tests__/**'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        project: './tsconfig.json',
        ecmaVersion: 2022,
        sourceType: 'module'
      },
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        performance: 'readonly',
        NodeJS: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly'
      }
    },
    plugins: {
      '@typescript-eslint': typescriptPlugin,
      'security': securityPlugin
    },
    rules: {
      // TypeScript-specific rules (balanced strict/pragmatic)
      '@typescript-eslint/explicit-function-return-type': ['error', {
        allowExpressions: true,
        allowTypedFunctionExpressions: true,
        allowHigherOrderFunctions: true
      }],
      '@typescript-eslint/no-explicit-any': 'error', // Critical: no 'any' types
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrors: 'none'
      }],
      '@typescript-eslint/strict-boolean-expressions': 'warn', // Warn: good practice but very strict
      '@typescript-eslint/no-floating-promises': 'error', // Critical: must handle promises
      '@typescript-eslint/await-thenable': 'error', // Critical: only await promises
      '@typescript-eslint/no-misused-promises': 'warn', // Warn: catches async issues
      '@typescript-eslint/prefer-nullish-coalescing': 'warn', // Warn: good practice
      '@typescript-eslint/prefer-optional-chain': 'warn', // Warn: cleaner code
      '@typescript-eslint/no-unnecessary-condition': 'warn', // Warn: helps find dead code
      '@typescript-eslint/no-non-null-assertion': 'error', // Critical: unsafe operations

      // Security rules
      'security/detect-object-injection': 'off', // Too noisy for our use case
      'security/detect-non-literal-fs-filename': 'warn', // We handle path traversal
      'security/detect-unsafe-regex': 'error',
      'security/detect-buffer-noassert': 'error',
      'security/detect-child-process': 'warn', // We use execSync, needs review
      'security/detect-disable-mustache-escape': 'error',
      'security/detect-eval-with-expression': 'error',
      'security/detect-no-csrf-before-method-override': 'error',
      'security/detect-non-literal-regexp': 'warn',
      'security/detect-possible-timing-attacks': 'warn',
      'security/detect-pseudoRandomBytes': 'error',

      // Essential code quality rules
      'prefer-const': 'error',
      'no-var': 'error',
      'no-console': 'off', // CLI tool needs console
      'no-debugger': 'error',
      'no-eval': 'error',
      'no-unused-vars': 'off', // Use TypeScript version
      'no-undef': 'error',

      // Import and module rules
      'no-duplicate-imports': 'error',

      // Best practices
      'eqeqeq': ['error', 'always'],
      'no-implicit-coercion': 'error',
      'no-return-await': 'error',
      'require-await': 'warn', // Warn: async without await is sometimes intentional
      'no-throw-literal': 'error'
    }
  },

  // Test files - more lenient
  {
    files: ['src/**/*.test.ts', 'src/**/*.spec.ts', 'src/__tests__/**/*.ts'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module'
        // Note: No 'project' - test files are excluded from tsconfig.json
      },
      globals: {
        console: 'readonly',
        process: 'readonly',
        describe: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        vi: 'readonly'
      }
    },
    plugins: {
      '@typescript-eslint': typescriptPlugin
    },
    rules: {
      // Relaxed rules for tests
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-floating-promises': 'off', // Type-aware rule, requires project
      '@typescript-eslint/await-thenable': 'off', // Type-aware rule, requires project
      'no-console': 'off',

      // Still enforce these in tests (non-type-aware rules)
      'prefer-const': 'error',
      'no-var': 'error',
      'eqeqeq': ['error', 'always'],
      'no-eval': 'error'
    }
  }
];
