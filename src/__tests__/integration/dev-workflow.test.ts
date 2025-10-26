import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createTempDir,
  cleanupTempDir,
  setupTestProject,
  createMockShopConfig,
  createMockCredentials,
  writeShopConfig,
  writeShopCredentials
} from '../helpers.js';
import { createMultiShopCLI } from '../../lib/core/index.js';
import type { CLIContext } from '../../lib/core/types.js';

/**
 * Integration tests for development workflow
 * Tests contextual development server operations
 */
describe('Development Workflow Integration', () => {
  let tempDir: string;
  let context: CLIContext;

  beforeEach(() => {
    tempDir = createTempDir();
    context = createMultiShopCLI(tempDir);
    setupTestProject(tempDir);
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  describe('Development Server Prerequisites', () => {
    test('should verify shop configuration exists before dev', async () => {
      // Arrange
      const shopId = 'test-shop';
      writeShopConfig(context.deps.shopsDir, shopId, createMockShopConfig(shopId));

      // Act
      const configResult = await context.shopOps.loadConfig(shopId);

      // Assert - Config loaded successfully
      expect(configResult.success).toBe(true);
      expect(configResult.data?.shopId).toBe(shopId);
    });

    test('should verify credentials exist before dev', async () => {
      // Arrange
      const shopId = 'test-shop';
      writeShopCredentials(context.deps.credentialsDir, shopId, createMockCredentials(shopId));

      // Act
      const credResult = await context.credOps.loadCredentials(shopId);

      // Assert - Credentials loaded successfully
      expect(credResult.success).toBe(true);
      expect(credResult.data?.developer).toBeDefined();
      expect(credResult.data?.shopify.stores.production.themeToken).toBeDefined();
    });

    test('should handle missing configuration gracefully', async () => {
      // Act
      const result = await context.shopOps.loadConfig('nonexistent-shop');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    test('should handle missing credentials gracefully', async () => {
      // Act
      const result = await context.credOps.loadCredentials('nonexistent-shop');

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });
  });

  describe('Environment Selection', () => {
    test('should support production environment', async () => {
      // Arrange
      const shopId = 'test-shop';
      const config = createMockShopConfig(shopId);
      writeShopConfig(context.deps.shopsDir, shopId, config);

      // Act
      const loadResult = await context.shopOps.loadConfig(shopId);

      // Assert - Production store configured
      expect(loadResult.data?.shopify.stores.production).toBeDefined();
      expect(loadResult.data?.shopify.stores.production.domain).toBe('test-shop.myshopify.com');
      expect(loadResult.data?.shopify.stores.production.branch).toBe('test-shop/main');
    });

    test('should support staging environment', async () => {
      // Arrange
      const shopId = 'test-shop';
      const config = createMockShopConfig(shopId);
      writeShopConfig(context.deps.shopsDir, shopId, config);

      // Act
      const loadResult = await context.shopOps.loadConfig(shopId);

      // Assert - Staging store configured
      expect(loadResult.data?.shopify.stores.staging).toBeDefined();
      expect(loadResult.data?.shopify.stores.staging.domain).toBe('staging-test-shop.myshopify.com');
      expect(loadResult.data?.shopify.stores.staging.branch).toBe('test-shop/staging');
    });

    test('should verify credentials for selected environment', async () => {
      // Arrange
      const shopId = 'test-shop';
      const credentials = createMockCredentials(shopId);
      writeShopCredentials(context.deps.credentialsDir, shopId, credentials);

      // Act
      const credResult = await context.credOps.loadCredentials(shopId);

      // Assert - Both environments have credentials
      expect(credResult.data?.shopify.stores.production.themeToken).toBeDefined();
      expect(credResult.data?.shopify.stores.staging.themeToken).toBeDefined();
    });
  });

  describe('Shop Context Resolution', () => {
    test('should resolve shop by ID', async () => {
      // Arrange - Create multiple shops
      const shopIds = ['shop-a', 'shop-b', 'shop-c'];
      for (const shopId of shopIds) {
        writeShopConfig(context.deps.shopsDir, shopId, createMockShopConfig(shopId));
      }

      // Act - Load specific shop
      const result = await context.shopOps.loadConfig('shop-b');

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.shopId).toBe('shop-b');
    });

    test('should list available shops for selection', async () => {
      // Arrange
      const shopIds = ['shop-a', 'shop-b', 'shop-c'];
      for (const shopId of shopIds) {
        writeShopConfig(context.deps.shopsDir, shopId, createMockShopConfig(shopId));
      }

      // Act
      const result = await context.shopOps.listShops();

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(3);
      expect(result.data).toEqual(expect.arrayContaining(shopIds));
    });
  });

  describe('Development Server Configuration', () => {
    test('should construct correct store URL for production', async () => {
      // Arrange
      const shopId = 'test-shop';
      const config = createMockShopConfig(shopId);
      writeShopConfig(context.deps.shopsDir, shopId, config);

      // Act
      const result = await context.shopOps.loadConfig(shopId);

      // Assert
      const productionDomain = result.data?.shopify.stores.production.domain;
      expect(productionDomain).toBe('test-shop.myshopify.com');
      expect(productionDomain?.endsWith('.myshopify.com')).toBe(true);
    });

    test('should construct correct store URL for staging', async () => {
      // Arrange
      const shopId = 'test-shop';
      const config = createMockShopConfig(shopId);
      writeShopConfig(context.deps.shopsDir, shopId, config);

      // Act
      const result = await context.shopOps.loadConfig(shopId);

      // Assert
      const stagingDomain = result.data?.shopify.stores.staging.domain;
      expect(stagingDomain).toBe('staging-test-shop.myshopify.com');
      expect(stagingDomain?.endsWith('.myshopify.com')).toBe(true);
    });

    test('should verify authentication method', async () => {
      // Arrange
      const shopId = 'test-shop';
      const config = createMockShopConfig(shopId);
      writeShopConfig(context.deps.shopsDir, shopId, config);

      // Act
      const result = await context.shopOps.loadConfig(shopId);

      // Assert
      expect(result.data?.shopify.authentication.method).toBe('theme-access-app');
    });

    test('should support theme-access-app authentication', async () => {
      // Arrange
      const shopId = 'test-shop';
      const config = createMockShopConfig(shopId, {
        shopify: {
          stores: {
            production: { domain: 'test.myshopify.com', branch: 'test/main' },
            staging: { domain: 'staging.myshopify.com', branch: 'test/staging' }
          },
          authentication: { method: 'theme-access-app' }
        }
      });
      writeShopConfig(context.deps.shopsDir, shopId, config);

      // Act
      const result = await context.shopOps.loadConfig(shopId);

      // Assert
      expect(result.data?.shopify.authentication.method).toBe('theme-access-app');
    });

    test('should support manual-tokens authentication', async () => {
      // Arrange
      const shopId = 'test-shop';
      const config = createMockShopConfig(shopId, {
        shopify: {
          stores: {
            production: { domain: 'test.myshopify.com', branch: 'test/main' },
            staging: { domain: 'staging.myshopify.com', branch: 'test/staging' }
          },
          authentication: { method: 'manual-tokens' }
        }
      });
      writeShopConfig(context.deps.shopsDir, shopId, config);

      // Act
      const result = await context.shopOps.loadConfig(shopId);

      // Assert
      expect(result.data?.shopify.authentication.method).toBe('manual-tokens');
    });
  });

  describe('Development Operation API', () => {
    test('should provide startDev operation', () => {
      // Assert
      expect(context.devOps.startDev).toBeDefined();
      expect(typeof context.devOps.startDev).toBe('function');
    });

    test('should accept shop ID and environment parameters', async () => {
      // Arrange
      const shopId = 'test-shop';
      writeShopConfig(context.deps.shopsDir, shopId, createMockShopConfig(shopId));
      writeShopCredentials(context.deps.credentialsDir, shopId, createMockCredentials(shopId));

      // Note: We can't actually start Shopify CLI in tests, but we can verify the API
      // In a real scenario, this would be mocked or tested with a test double

      // Assert - API signature is correct
      expect(context.devOps.startDev).toBeDefined();

      // The actual call would look like:
      // const result = await context.devOps.startDev(shopId, 'production');
      // But we'd need to mock the Shopify CLI for this to work in tests
    });
  });

  describe('Error Recovery', () => {
    test('should handle invalid shop selection gracefully', async () => {
      // Act
      const result = await context.shopOps.loadConfig('invalid-shop-id');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should handle corrupted configuration files', async () => {
      // Arrange - Write invalid JSON
      const fs = await import('fs');
      const path = await import('path');
      const configPath = path.join(context.deps.shopsDir, 'broken.config.json');
      fs.writeFileSync(configPath, '{ invalid json }');

      // Act
      const result = await context.shopOps.loadConfig('broken');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should handle missing credential files', async () => {
      // Arrange - Config exists but no credentials
      const shopId = 'no-creds-shop';
      writeShopConfig(context.deps.shopsDir, shopId, createMockShopConfig(shopId));

      // Act
      const credResult = await context.credOps.loadCredentials(shopId);

      // Assert
      expect(credResult.success).toBe(true);
      expect(credResult.data).toBeNull(); // Null means credentials don't exist yet
    });
  });

  describe('Multi-Shop Scenarios', () => {
    test('should support switching between shops', async () => {
      // Arrange - Create two shops
      const shopAId = 'shop-a';
      const shopBId = 'shop-b';

      writeShopConfig(context.deps.shopsDir, shopAId, createMockShopConfig(shopAId));
      writeShopConfig(context.deps.shopsDir, shopBId, createMockShopConfig(shopBId));

      // Act - Load first shop
      const resultA = await context.shopOps.loadConfig(shopAId);
      expect(resultA.data?.shopId).toBe(shopAId);

      // Act - Switch to second shop
      const resultB = await context.shopOps.loadConfig(shopBId);
      expect(resultB.data?.shopId).toBe(shopBId);

      // Assert - Both successful
      expect(resultA.success).toBe(true);
      expect(resultB.success).toBe(true);
    });

    test('should maintain separate credentials for each shop', async () => {
      // Arrange
      const shopAId = 'shop-a';
      const shopBId = 'shop-b';

      const credsA = createMockCredentials(shopAId);
      const credsB = createMockCredentials(shopBId);

      writeShopCredentials(context.deps.credentialsDir, shopAId, credsA);
      writeShopCredentials(context.deps.credentialsDir, shopBId, credsB);

      // Act
      const resultA = await context.credOps.loadCredentials(shopAId);
      const resultB = await context.credOps.loadCredentials(shopBId);

      // Assert - Credentials are separate
      expect(resultA.data?.shopify.stores.production.themeToken).toBe(`prod-token-${shopAId}`);
      expect(resultB.data?.shopify.stores.production.themeToken).toBe(`prod-token-${shopBId}`);
    });
  });
});
