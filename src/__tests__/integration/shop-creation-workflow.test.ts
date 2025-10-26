import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import {
  createTempDir,
  cleanupTempDir,
  setupTestProject,
  createMockShopConfig,
  createMockCredentials,
  readShopConfig,
  readShopCredentials,
  fileExists,
  dirExists
} from '../helpers.js';
import { createMultiShopCLI } from '../../lib/core/index.js';
import type { CLIContext } from '../../lib/core/types.js';

/**
 * Integration tests for complete shop creation workflow
 */
describe('Shop Creation Workflow Integration', () => {
  let tempDir: string;
  let context: CLIContext;

  beforeEach(() => {
    tempDir = createTempDir();
    context = createMultiShopCLI(tempDir);
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  test('should complete full shop creation workflow', async () => {
    // Arrange
    const shopId = 'new-shop';
    const config = createMockShopConfig(shopId);
    const credentials = createMockCredentials(shopId);

    // Act - Create shop config
    const saveConfigResult = await context.shopOps.saveConfig(shopId, config);

    // Assert - Config saved successfully
    expect(saveConfigResult.success).toBe(true);

    // Assert - Config file exists
    const configPath = `${context.deps.shopsDir}/${shopId}.config.json`;
    expect(fileExists(configPath)).toBe(true);

    // Assert - Config can be read back
    const loadConfigResult = await context.shopOps.loadConfig(shopId);
    expect(loadConfigResult.success).toBe(true);
    expect(loadConfigResult.data?.shopId).toBe(shopId);
    expect(loadConfigResult.data?.name).toBe(config.name);

    // Act - Save credentials
    const saveCredResult = await context.credOps.saveCredentials(shopId, credentials);

    // Assert - Credentials saved successfully
    expect(saveCredResult.success).toBe(true);

    // Assert - Credentials file exists
    const credPath = `${context.deps.credentialsDir}/${shopId}.credentials.json`;
    expect(fileExists(credPath)).toBe(true);

    // Assert - Credentials can be read back
    const loadCredResult = await context.credOps.loadCredentials(shopId);
    expect(loadCredResult.success).toBe(true);
    expect(loadCredResult.data?.developer).toBe(credentials.developer);
    expect(loadCredResult.data?.shopify.stores.production.themeToken).toBe(
      credentials.shopify.stores.production.themeToken
    );
  });

  test('should create shops directory if it does not exist', async () => {
    // Arrange - Directory doesn't exist yet
    expect(dirExists(context.deps.shopsDir)).toBe(false);

    const shopId = 'test-shop';
    const config = createMockShopConfig(shopId);

    // Act
    await context.shopOps.saveConfig(shopId, config);

    // Assert
    expect(dirExists(context.deps.shopsDir)).toBe(true);
  });

  test('should create credentials directory if it does not exist', async () => {
    // Arrange
    setupTestProject(tempDir); // Create shops dir but not credentials dir yet

    const shopId = 'test-shop';
    const credentials = createMockCredentials(shopId);

    // Act
    await context.credOps.saveCredentials(shopId, credentials);

    // Assert
    expect(dirExists(context.deps.credentialsDir)).toBe(true);
  });

  test('should handle multiple shops creation', async () => {
    // Arrange
    const shopIds = ['shop-a', 'shop-b', 'shop-c'];

    // Act - Create multiple shops
    for (const shopId of shopIds) {
      const config = createMockShopConfig(shopId);
      await context.shopOps.saveConfig(shopId, config);
    }

    // Assert - List all shops
    const listResult = await context.shopOps.listShops();
    expect(listResult.success).toBe(true);
    expect(listResult.data).toHaveLength(3);
    expect(listResult.data).toEqual(expect.arrayContaining(shopIds));
  });

  test('should overwrite existing shop configuration', async () => {
    // Arrange
    const shopId = 'test-shop';
    const originalConfig = createMockShopConfig(shopId, {
      name: 'Original Name'
    });

    // Act - Create initial config
    await context.shopOps.saveConfig(shopId, originalConfig);

    // Assert - Original config exists
    const loadResult1 = await context.shopOps.loadConfig(shopId);
    expect(loadResult1.data?.name).toBe('Original Name');

    // Act - Update config
    const updatedConfig = createMockShopConfig(shopId, {
      name: 'Updated Name'
    });
    await context.shopOps.saveConfig(shopId, updatedConfig);

    // Assert - Config updated
    const loadResult2 = await context.shopOps.loadConfig(shopId);
    expect(loadResult2.data?.name).toBe('Updated Name');
  });

  test('should validate shop config before saving', async () => {
    // Arrange - Invalid config (mismatched shop ID)
    const shopId = 'test-shop';
    const invalidConfig = createMockShopConfig('different-shop-id');

    // Act & Assert - Should fail validation
    const result = await context.shopOps.saveConfig(shopId, invalidConfig);
    expect(result.success).toBe(false);
    expect(result.error).toContain('does not match');
  });

  test('should handle shop deletion', async () => {
    // Arrange - Create a shop
    const shopId = 'shop-to-delete';
    const config = createMockShopConfig(shopId);
    const credentials = createMockCredentials(shopId);

    await context.shopOps.saveConfig(shopId, config);
    await context.credOps.saveCredentials(shopId, credentials);

    // Verify files exist
    expect(fileExists(`${context.deps.shopsDir}/${shopId}.config.json`)).toBe(true);
    expect(fileExists(`${context.deps.credentialsDir}/${shopId}.credentials.json`)).toBe(true);

    // Act - Delete shop
    const deleteResult = await context.shopOps.deleteShop(shopId);

    // Assert - Deletion successful
    expect(deleteResult.success).toBe(true);

    // Assert - Files removed
    expect(fileExists(`${context.deps.shopsDir}/${shopId}.config.json`)).toBe(false);
    expect(fileExists(`${context.deps.credentialsDir}/${shopId}.credentials.json`)).toBe(false);
  });

  test('should handle shop with special characters in ID (sanitized)', async () => {
    // Arrange - Valid shop ID with hyphens
    const shopId = 'shop-with-hyphens-123';
    const config = createMockShopConfig(shopId);

    // Act
    const saveResult = await context.shopOps.saveConfig(shopId, config);

    // Assert
    expect(saveResult.success).toBe(true);

    // Verify file created correctly
    expect(fileExists(`${context.deps.shopsDir}/${shopId}.config.json`)).toBe(true);
  });

  test('should list shops in correct format', async () => {
    // Arrange - Create shops with example file
    const shopIds = ['shop-a', 'shop-b'];
    for (const shopId of shopIds) {
      await context.shopOps.saveConfig(shopId, createMockShopConfig(shopId));
    }

    // Create an example config file (should be filtered out)
    const exampleConfig = createMockShopConfig('example-shop');
    const examplePath = `${context.deps.shopsDir}/example.config.json`;
    const fs = await import('fs');
    fs.writeFileSync(examplePath, JSON.stringify(exampleConfig));

    // Act
    const listResult = await context.shopOps.listShops();

    // Assert - Example file should be filtered out
    expect(listResult.success).toBe(true);
    expect(listResult.data).toHaveLength(2);
    expect(listResult.data).not.toContain('example');
  });

  test('should preserve config structure after save/load cycle', async () => {
    // Arrange
    const shopId = 'test-shop';
    const originalConfig = createMockShopConfig(shopId, {
      metadata: {
        description: 'Test description',
        tags: ['tag1', 'tag2'],
        created: '2025-01-01T00:00:00Z'
      }
    });

    // Act - Save and load
    await context.shopOps.saveConfig(shopId, originalConfig);
    const loadResult = await context.shopOps.loadConfig(shopId);

    // Assert - Structure preserved
    expect(loadResult.success).toBe(true);
    expect(loadResult.data).toEqual(originalConfig);
  });
});
