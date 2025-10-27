import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMultiShopCLI } from '../lib/core/index.js';
import type { ShopConfig } from '../types/shop.js';
import fs from 'fs';

// Mock file system
vi.mock('fs');

/**
 * Tests for the functional Shop Manager API
 * These tests verify the core functional interface works correctly
 */
describe('Functional Shop Manager API', () => {
  const mockCwd = '/test/project';

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createMultiShopCLI', () => {
    test('should create CLI context with correct dependencies', () => {
      // Act
      const context = createMultiShopCLI(mockCwd);

      // Assert
      expect(context.deps.cwd).toBe(mockCwd);
      expect(context.deps.shopsDir).toBe(`${mockCwd}/shops`);
      expect(context.deps.credentialsDir).toBe(`${mockCwd}/shops/credentials`);
    });

    test('should provide shop operations', () => {
      // Act
      const context = createMultiShopCLI(mockCwd);

      // Assert
      expect(context.shopOps).toBeDefined();
      expect(context.shopOps.loadConfig).toBeDefined();
      expect(context.shopOps.saveConfig).toBeDefined();
      expect(context.shopOps.listShops).toBeDefined();
      expect(context.shopOps.deleteShop).toBeDefined();
    });

    test('should provide credential operations', () => {
      // Act
      const context = createMultiShopCLI(mockCwd);

      // Assert
      expect(context.credOps).toBeDefined();
      expect(context.credOps.loadCredentials).toBeDefined();
      expect(context.credOps.saveCredentials).toBeDefined();
    });

    test('should provide dev operations', () => {
      // Act
      const context = createMultiShopCLI(mockCwd);

      // Assert
      expect(context.devOps).toBeDefined();
      expect(context.devOps.startDev).toBeDefined();
    });

    test('should use process.cwd() when no path provided', () => {
      // Act
      const context = createMultiShopCLI();

      // Assert
      expect(context.deps.cwd).toBe(process.cwd());
    });
  });

  describe('Shop Operations', () => {
    test('should load shop configuration', async () => {
      // Arrange
      const context = createMultiShopCLI(mockCwd);
      const mockConfig: ShopConfig = {
        shopId: 'test-shop',
        name: 'Test Shop',
        shopify: {
          stores: {
            production: { domain: 'test-shop.myshopify.com', branch: 'test-shop/main' },
            staging: { domain: 'staging-test-shop.myshopify.com', branch: 'test-shop/staging' }
          },
          authentication: { method: 'theme-access-app' }
        }
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockConfig));

      // Act
      const result = await context.shopOps.loadConfig('test-shop');

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.shopId).toBe('test-shop');
      expect(fs.readFileSync).toHaveBeenCalled();
    });

    test('should list shops', async () => {
      // Arrange
      const context = createMultiShopCLI(mockCwd);
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue(['shop-a.config.json', 'shop-b.config.json'] as any);

      // Act
      const result = await context.shopOps.listShops();

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(['shop-a', 'shop-b']);
    });
  });
});
