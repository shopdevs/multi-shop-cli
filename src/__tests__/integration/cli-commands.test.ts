import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import {
  createTempDir,
  cleanupTempDir,
  setupTestProject,
  createMockShopConfig,
  createMockCredentials,
  writeShopConfig,
  writeShopCredentials
} from '../helpers.js';
import { createMultiShopCLI, runMultiShopManager } from '../../lib/core/index.js';
import type { CLIContext } from '../../lib/core/types.js';

/**
 * Integration tests for CLI command operations
 * Tests the programmatic API that backs CLI commands
 */
describe('CLI Commands Integration', () => {
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

  describe('Shop Listing (multi-shop shop list)', () => {
    test('should list all configured shops', async () => {
      // Arrange - Create multiple shops
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

    test('should return empty array when no shops configured', async () => {
      // Act
      const result = await context.shopOps.listShops();

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    test('should filter out example config files', async () => {
      // Arrange
      writeShopConfig(context.deps.shopsDir, 'shop-a', createMockShopConfig('shop-a'));
      writeShopConfig(context.deps.shopsDir, 'example-shop', createMockShopConfig('example-shop'));

      // Act
      const result = await context.shopOps.listShops();

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data).toContain('shop-a');
      expect(result.data).not.toContain('example-shop');
    });
  });

  describe('Shop Config Operations (multi-shop shop create/edit)', () => {
    test('should load shop configuration', async () => {
      // Arrange
      const shopId = 'test-shop';
      const config = createMockShopConfig(shopId);
      writeShopConfig(context.deps.shopsDir, shopId, config);

      // Act
      const result = await context.shopOps.loadConfig(shopId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.shopId).toBe(shopId);
      expect(result.data?.name).toBe(config.name);
      expect(result.data?.shopify.stores.production.domain).toBe(config.shopify.stores.production.domain);
    });

    test('should return error for non-existent shop', async () => {
      // Act
      const result = await context.shopOps.loadConfig('nonexistent-shop');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    test('should save new shop configuration', async () => {
      // Arrange
      const shopId = 'new-shop';
      const config = createMockShopConfig(shopId);

      // Act
      const saveResult = await context.shopOps.saveConfig(shopId, config);

      // Assert
      expect(saveResult.success).toBe(true);

      // Verify saved correctly
      const loadResult = await context.shopOps.loadConfig(shopId);
      expect(loadResult.success).toBe(true);
      expect(loadResult.data?.shopId).toBe(shopId);
    });

    test('should update existing shop configuration', async () => {
      // Arrange
      const shopId = 'test-shop';
      const originalConfig = createMockShopConfig(shopId, { name: 'Original' });
      writeShopConfig(context.deps.shopsDir, shopId, originalConfig);

      // Act - Update
      const updatedConfig = createMockShopConfig(shopId, { name: 'Updated' });
      const saveResult = await context.shopOps.saveConfig(shopId, updatedConfig);

      // Assert
      expect(saveResult.success).toBe(true);

      const loadResult = await context.shopOps.loadConfig(shopId);
      expect(loadResult.data?.name).toBe('Updated');
    });

    test('should validate config before saving', async () => {
      // Arrange - Invalid config (mismatched shop ID)
      const shopId = 'test-shop';
      const invalidConfig = createMockShopConfig('different-id');

      // Act
      const result = await context.shopOps.saveConfig(shopId, invalidConfig);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Credential Operations', () => {
    test('should load shop credentials', async () => {
      // Arrange
      const shopId = 'test-shop';
      const credentials = createMockCredentials(shopId);
      writeShopCredentials(context.deps.credentialsDir, shopId, credentials);

      // Act
      const result = await context.credOps.loadCredentials(shopId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.developer).toBe(credentials.developer);
      expect(result.data?.shopify.stores.production.themeToken).toBe(
        credentials.shopify.stores.production.themeToken
      );
    });

    test('should return null for non-existent credentials', async () => {
      // Act
      const result = await context.credOps.loadCredentials('nonexistent-shop');

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    test('should save shop credentials', async () => {
      // Arrange
      const shopId = 'new-shop';
      const credentials = createMockCredentials(shopId);

      // Act
      const saveResult = await context.credOps.saveCredentials(shopId, credentials);

      // Assert
      expect(saveResult.success).toBe(true);

      // Verify saved correctly
      const loadResult = await context.credOps.loadCredentials(shopId);
      expect(loadResult.success).toBe(true);
      expect(loadResult.data?.developer).toBe(credentials.developer);
    });

    test('should add metadata when saving credentials', async () => {
      // Arrange
      const shopId = 'test-shop';
      const credentials = createMockCredentials(shopId);

      // Act
      await context.credOps.saveCredentials(shopId, credentials);

      // Assert - Load and check metadata
      const loadResult = await context.credOps.loadCredentials(shopId);
      expect(loadResult.data?._metadata).toBeDefined();
      expect(loadResult.data?._metadata?.created).toBeDefined();
      expect(loadResult.data?._metadata?.version).toBe('1.0.0');
    });

    test('should handle credential updates', async () => {
      // Arrange
      const shopId = 'test-shop';
      const originalCreds = createMockCredentials(shopId);
      await context.credOps.saveCredentials(shopId, originalCreds);

      // Act - Update credentials
      const updatedCreds = createMockCredentials(shopId);
      updatedCreds.shopify.stores.production.themeToken = 'new-token';
      await context.credOps.saveCredentials(shopId, updatedCreds);

      // Assert
      const loadResult = await context.credOps.loadCredentials(shopId);
      expect(loadResult.data?.shopify.stores.production.themeToken).toBe('new-token');
    });
  });

  describe('Shop Deletion', () => {
    test('should delete shop and its credentials', async () => {
      // Arrange
      const shopId = 'shop-to-delete';
      writeShopConfig(context.deps.shopsDir, shopId, createMockShopConfig(shopId));
      writeShopCredentials(context.deps.credentialsDir, shopId, createMockCredentials(shopId));

      // Act
      const deleteResult = await context.shopOps.deleteShop(shopId);

      // Assert
      expect(deleteResult.success).toBe(true);

      // Verify config removed
      const configResult = await context.shopOps.loadConfig(shopId);
      expect(configResult.success).toBe(false);

      // Verify credentials removed
      const credResult = await context.credOps.loadCredentials(shopId);
      expect(credResult.success).toBe(true);
      expect(credResult.data).toBeNull();
    });

    test('should handle deletion of non-existent shop gracefully', async () => {
      // Act
      const result = await context.shopOps.deleteShop('nonexistent-shop');

      // Assert - Should succeed even if shop doesn't exist
      expect(result.success).toBe(true);
    });
  });

  describe('Context Creation', () => {
    test('should create CLI context with correct dependencies', () => {
      // Assert (use path.join for cross-platform compatibility)
      expect(context.deps.cwd).toBe(tempDir);
      expect(context.deps.shopsDir).toBe(path.join(tempDir, 'shops'));
      expect(context.deps.credentialsDir).toBe(path.join(tempDir, 'shops', 'credentials'));
    });

    test('should provide shop operations', () => {
      // Assert
      expect(context.shopOps).toBeDefined();
      expect(context.shopOps.loadConfig).toBeDefined();
      expect(context.shopOps.saveConfig).toBeDefined();
      expect(context.shopOps.listShops).toBeDefined();
      expect(context.shopOps.deleteShop).toBeDefined();
    });

    test('should provide credential operations', () => {
      // Assert
      expect(context.credOps).toBeDefined();
      expect(context.credOps.loadCredentials).toBeDefined();
      expect(context.credOps.saveCredentials).toBeDefined();
    });

    test('should provide dev operations', () => {
      // Assert
      expect(context.devOps).toBeDefined();
      expect(context.devOps.startDev).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    test('should handle JSON parse errors gracefully', async () => {
      // Arrange - Write invalid JSON to config file
      const fs = await import('fs');
      const path = await import('path');
      const configPath = path.join(context.deps.shopsDir, 'broken-shop.config.json');
      fs.writeFileSync(configPath, '{ invalid json }');

      // Act
      const result = await context.shopOps.loadConfig('broken-shop');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should handle file system errors gracefully', async () => {
      // Arrange - Try to save to read-only location (simulated)
      const invalidContext = createMultiShopCLI('/nonexistent/readonly/path');

      // Act
      const result = await invalidContext.shopOps.listShops();

      // Assert - Should handle gracefully
      expect(result).toBeDefined();
    });
  });
});
