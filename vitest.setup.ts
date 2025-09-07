/**
 * Vitest setup for enterprise-grade testing
 * Configures global test environment and utilities
 */

import { beforeEach, afterEach, afterAll, vi } from 'vitest';

// Mark test environment
globalThis.__MULTI_SHOP_TEST__ = true;

// Enhanced test utilities
declare global {
  const createMockShopConfig: (overrides?: Partial<ShopConfig>) => ShopConfig;
  const createMockCredentials: (overrides?: Partial<ShopCredentials>) => ShopCredentials;
  
  namespace Vi {
    interface ExpectStatic {
      toBeShopError: (error: unknown, expectedCode?: string) => void;
      toNotExposeSecrets: (data: unknown) => void;
      toBeFasterThan: (duration: number) => void;
    }
  }
}

// Type definitions for test utilities
interface ShopConfig {
  shopId: string;
  name: string;
  shopify: {
    stores: {
      production: { domain: string; branch: string };
      staging: { domain: string; branch: string };
    };
    authentication: { method: string };
  };
}

interface ShopCredentials {
  developer: string;
  shopify: {
    stores: {
      production: { themeToken: string };
      staging: { themeToken: string };
    };
  };
  notes?: string;
}

// Global test utilities
globalThis.createMockShopConfig = (overrides = {}) => ({
  shopId: 'test-shop',
  name: 'Test Shop',
  shopify: {
    stores: {
      production: {
        domain: 'test-shop.myshopify.com',
        branch: 'test-shop/main'
      },
      staging: {
        domain: 'staging-test-shop.myshopify.com',
        branch: 'test-shop/staging'
      }
    },
    authentication: {
      method: 'theme-access-app'
    }
  },
  ...overrides
});

globalThis.createMockCredentials = (overrides = {}) => ({
  developer: 'test-developer',
  shopify: {
    stores: {
      production: { themeToken: 'test-production-token' },
      staging: { themeToken: 'test-staging-token' }
    }
  },
  notes: 'Test credentials',
  ...overrides
});

// Custom matchers
expect.extend({
  toBeShopError(received: unknown, expectedCode?: string) {
    const pass = received instanceof Error && 
      received.constructor.name.endsWith('ShopError') &&
      (!expectedCode || (received as any).code === expectedCode);
    
    if (pass) {
      return {
        message: () => `Expected ${received} not to be a ShopError`,
        pass: true
      };
    } else {
      return {
        message: () => `Expected ${received} to be a ShopError${expectedCode ? ` with code ${expectedCode}` : ''}`,
        pass: false
      };
    }
  },

  toNotExposeSecrets(received: unknown) {
    const serialized = JSON.stringify(received);
    const suspiciousPatterns = [
      /shptka_[a-zA-Z0-9]{40,}/,          // Shopify tokens
      /password.*[:=]\s*['"]\w+['"]/i,    // Password patterns
      /token.*[:=]\s*['"]\w+['"]/i,       // Token patterns
      /secret.*[:=]\s*['"]\w+['"]/i       // Secret patterns
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(serialized)) {
        return {
          message: () => `Expected data not to contain secrets, but found pattern: ${pattern}`,
          pass: false
        };
      }
    }
    
    return {
      message: () => `Expected data to expose secrets`,
      pass: true
    };
  },

  toBeFasterThan(received: number, expected: number) {
    const pass = received < expected;
    
    if (pass) {
      return {
        message: () => `Expected ${received}ms not to be faster than ${expected}ms`,
        pass: true
      };
    } else {
      return {
        message: () => `Expected ${received}ms to be faster than ${expected}ms`,
        pass: false
      };
    }
  }
});

// Setup before each test
beforeEach(() => {
  // Clear environment variables
  delete process.env.AUTO_SELECT_DEV;
  delete process.env.LOG_LEVEL;
  delete process.env.SHOPIFY_CLI_THEME_TOKEN;
  delete process.env.SHOPIFY_STORE_DOMAIN;
  
  // Mock console methods to avoid noise in test output
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

// Cleanup after each test
afterEach(() => {
  // Clear all timers
  vi.clearAllTimers();
  
  // Restore console
  vi.restoreAllMocks();
});

// Global cleanup
afterAll(() => {
  // Cleanup any global resources
  if (globalThis.mockPerformanceMonitor) {
    globalThis.mockPerformanceMonitor.cleanup();
  }
});