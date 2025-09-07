import typescriptParser from '@typescript-eslint/parser';

export default [
  {
    files: ['src/**/*.ts'],
    ignores: ['src/**/*.test.ts', 'src/**/*.spec.ts', 'src/__tests__/**'],
    languageOptions: {
      parser: typescriptParser,
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        performance: 'readonly',
        NodeJS: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly'
      }
    },
    rules: {
      // Essential code quality rules
      'prefer-const': 'error',
      'no-var': 'error',
      'no-console': 'warn', // Allow for CLI tool but warn
      'no-debugger': 'error',
      'no-eval': 'error',
      'no-unused-vars': 'warn',
      'no-undef': 'error',
      
      // Import and module rules
      'no-duplicate-imports': 'error'
    }
  }
];