import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Test environment
    environment: 'node',
    
    // File patterns
    include: [
      'src/**/*.{test,spec}.ts',
      'tests/**/*.{test,spec}.ts'
    ],
    exclude: [
      'node_modules',
      'dist',
      'coverage'
    ],
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'html', 'lcov', 'json'],
      reportsDirectory: 'coverage',
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
        'src/types/**',
        'src/**/*.d.ts'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    },
    
    // Performance
    testTimeout: 30000,
    hookTimeout: 10000,
    
    // Behavior
    globals: true,
    clearMocks: true,
    restoreMocks: true,
    mockReset: true,
    
    // Output
    reporter: ['verbose', 'junit'],
    outputFile: {
      junit: './coverage/junit.xml'
    },
    
    // Setup
    setupFiles: ['./vitest.setup.ts'],
    
    // Parallel execution
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        useAtomics: true
      }
    },
    
    // Watch mode
    watch: {
      exclude: ['node_modules', 'dist', 'coverage']
    }
  },
  
  // Path resolution for imports  
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
      '@/lib': new URL('./src/lib', import.meta.url).pathname,
      '@/types': new URL('./src/types', import.meta.url).pathname,
      '@/utils': new URL('./src/utils', import.meta.url).pathname
    }
  }
});