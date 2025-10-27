/**
 * Unit tests for shop-creation module
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import type { CLIContext, Result } from '../../lib/core/types.js';
import type { ShopConfig } from '../../types/shop.js';

// Mock @clack/prompts
vi.mock('@clack/prompts', () => ({
  intro: vi.fn(),
  note: vi.fn()
}));

// Mock shop-input module
vi.mock('../../lib/core/shop-input.js', () => ({
  collectShopData: vi.fn()
}));

// Mock shop-setup module
vi.mock('../../lib/core/shop-setup.js', () => ({
  setupShopResources: vi.fn()
}));

describe('shop-creation', () => {
  let mockContext: CLIContext;

  beforeEach(() => {
    mockContext = {
      deps: {
        cwd: '/test/project',
        shopsDir: '/test/project/shops',
        credentialsDir: '/test/project/shops/credentials'
      },
      shopOps: {
        loadConfig: vi.fn(),
        saveConfig: vi.fn(),
        listShops: vi.fn(),
        deleteShop: vi.fn()
      },
      credOps: {
        loadCredentials: vi.fn(),
        saveCredentials: vi.fn()
      },
      devOps: {
        startDev: vi.fn()
      }
    };

    vi.clearAllMocks();
  });

  describe('createNewShop', () => {
    test('creates shop successfully with valid data', async () => {
      // Arrange
      const shopData = {
        shopId: 'test-shop',
        shopName: 'Test Shop',
        productionDomain: 'test-shop.myshopify.com',
        stagingDomain: 'staging-test-shop.myshopify.com',
        authMethod: 'theme-access-app' as const
      };

      const { collectShopData } = await import('../../lib/core/shop-input.js');
      vi.mocked(collectShopData).mockResolvedValue({
        success: true,
        data: shopData
      });

      vi.mocked(mockContext.shopOps.saveConfig).mockResolvedValue({ success: true });

      const { setupShopResources } = await import('../../lib/core/shop-setup.js');
      vi.mocked(setupShopResources).mockResolvedValue({ success: true });

      const { createNewShop } = await import('../../lib/core/shop-creation.js');

      // Act
      const result = await createNewShop(mockContext);

      // Assert
      expect(result.success).toBe(true);
      expect(collectShopData).toHaveBeenCalledWith(mockContext);
      expect(mockContext.shopOps.saveConfig).toHaveBeenCalled();
    });

    test('displays intro message', async () => {
      // Arrange
      const { intro } = await import('@clack/prompts');
      const { collectShopData } = await import('../../lib/core/shop-input.js');
      vi.mocked(collectShopData).mockResolvedValue({
        success: false,
        error: 'Cancelled'
      });

      const { createNewShop } = await import('../../lib/core/shop-creation.js');

      // Act
      await createNewShop(mockContext);

      // Assert
      expect(intro).toHaveBeenCalledWith('🆕 Create New Shop');
    });

    test('returns error when shop data collection fails', async () => {
      // Arrange
      const { collectShopData } = await import('../../lib/core/shop-input.js');
      vi.mocked(collectShopData).mockResolvedValue({
        success: false,
        error: 'User cancelled input'
      });

      const { createNewShop } = await import('../../lib/core/shop-creation.js');

      // Act
      const result = await createNewShop(mockContext);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('User cancelled input');
    });

    test('returns error when shop data is missing', async () => {
      // Arrange
      const { collectShopData } = await import('../../lib/core/shop-input.js');
      vi.mocked(collectShopData).mockResolvedValue({
        success: true
        // data is missing
      });

      const { createNewShop } = await import('../../lib/core/shop-creation.js');

      // Act
      const result = await createNewShop(mockContext);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to collect shop data');
    });

    test('builds correct shop config from shop data', async () => {
      // Arrange
      const shopData = {
        shopId: 'my-shop',
        shopName: 'My Shop',
        productionDomain: 'my-shop.myshopify.com',
        stagingDomain: 'staging-my-shop.myshopify.com',
        authMethod: 'manual-tokens' as const
      };

      const { collectShopData } = await import('../../lib/core/shop-input.js');
      vi.mocked(collectShopData).mockResolvedValue({
        success: true,
        data: shopData
      });

      let savedConfig: ShopConfig | undefined;
      vi.mocked(mockContext.shopOps.saveConfig).mockImplementation(async (shopId, config) => {
        savedConfig = config;
        return { success: true };
      });

      const { setupShopResources } = await import('../../lib/core/shop-setup.js');
      vi.mocked(setupShopResources).mockResolvedValue({ success: true });

      const { createNewShop } = await import('../../lib/core/shop-creation.js');

      // Act
      await createNewShop(mockContext);

      // Assert
      expect(savedConfig).toBeDefined();
      expect(savedConfig?.shopId).toBe('my-shop');
      expect(savedConfig?.name).toBe('My Shop');
      expect(savedConfig?.shopify.stores.production.domain).toBe('my-shop.myshopify.com');
      expect(savedConfig?.shopify.stores.production.branch).toBe('my-shop/main');
      expect(savedConfig?.shopify.stores.staging.domain).toBe('staging-my-shop.myshopify.com');
      expect(savedConfig?.shopify.stores.staging.branch).toBe('my-shop/staging');
      expect(savedConfig?.shopify.authentication.method).toBe('manual-tokens');
    });

    test('creates production branch from shopId', async () => {
      // Arrange
      const shopData = {
        shopId: 'shop-a',
        shopName: 'Shop A',
        productionDomain: 'shop-a.myshopify.com',
        stagingDomain: 'staging-shop-a.myshopify.com',
        authMethod: 'theme-access-app' as const
      };

      const { collectShopData } = await import('../../lib/core/shop-input.js');
      vi.mocked(collectShopData).mockResolvedValue({
        success: true,
        data: shopData
      });

      let savedConfig: ShopConfig | undefined;
      vi.mocked(mockContext.shopOps.saveConfig).mockImplementation(async (shopId, config) => {
        savedConfig = config;
        return { success: true };
      });

      const { setupShopResources } = await import('../../lib/core/shop-setup.js');
      vi.mocked(setupShopResources).mockResolvedValue({ success: true });

      const { createNewShop } = await import('../../lib/core/shop-creation.js');

      // Act
      await createNewShop(mockContext);

      // Assert
      expect(savedConfig?.shopify.stores.production.branch).toBe('shop-a/main');
    });

    test('creates staging branch from shopId', async () => {
      // Arrange
      const shopData = {
        shopId: 'shop-b',
        shopName: 'Shop B',
        productionDomain: 'shop-b.myshopify.com',
        stagingDomain: 'staging-shop-b.myshopify.com',
        authMethod: 'theme-access-app' as const
      };

      const { collectShopData } = await import('../../lib/core/shop-input.js');
      vi.mocked(collectShopData).mockResolvedValue({
        success: true,
        data: shopData
      });

      let savedConfig: ShopConfig | undefined;
      vi.mocked(mockContext.shopOps.saveConfig).mockImplementation(async (shopId, config) => {
        savedConfig = config;
        return { success: true };
      });

      const { setupShopResources } = await import('../../lib/core/shop-setup.js');
      vi.mocked(setupShopResources).mockResolvedValue({ success: true });

      const { createNewShop } = await import('../../lib/core/shop-creation.js');

      // Act
      await createNewShop(mockContext);

      // Assert
      expect(savedConfig?.shopify.stores.staging.branch).toBe('shop-b/staging');
    });

    test('returns error when saving config fails', async () => {
      // Arrange
      const shopData = {
        shopId: 'test-shop',
        shopName: 'Test Shop',
        productionDomain: 'test.myshopify.com',
        stagingDomain: 'staging.myshopify.com',
        authMethod: 'theme-access-app' as const
      };

      const { collectShopData } = await import('../../lib/core/shop-input.js');
      vi.mocked(collectShopData).mockResolvedValue({
        success: true,
        data: shopData
      });

      vi.mocked(mockContext.shopOps.saveConfig).mockResolvedValue({
        success: false,
        error: 'Failed to write config file'
      });

      const { createNewShop } = await import('../../lib/core/shop-creation.js');

      // Act
      const result = await createNewShop(mockContext);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to write config file');
    });

    test('displays success message after saving config', async () => {
      // Arrange
      const shopData = {
        shopId: 'test-shop',
        shopName: 'Test Shop',
        productionDomain: 'test.myshopify.com',
        stagingDomain: 'staging.myshopify.com',
        authMethod: 'theme-access-app' as const
      };

      const { collectShopData } = await import('../../lib/core/shop-input.js');
      vi.mocked(collectShopData).mockResolvedValue({
        success: true,
        data: shopData
      });

      vi.mocked(mockContext.shopOps.saveConfig).mockResolvedValue({ success: true });

      const { setupShopResources } = await import('../../lib/core/shop-setup.js');
      vi.mocked(setupShopResources).mockResolvedValue({ success: true });

      const { note } = await import('@clack/prompts');
      const { createNewShop } = await import('../../lib/core/shop-creation.js');

      // Act
      await createNewShop(mockContext);

      // Assert
      expect(note).toHaveBeenCalledWith(
        '✅ Shop configuration created for Test Shop',
        'Success'
      );
    });

    test('calls setupShopResources after saving config', async () => {
      // Arrange
      const shopData = {
        shopId: 'test-shop',
        shopName: 'Test Shop',
        productionDomain: 'test.myshopify.com',
        stagingDomain: 'staging.myshopify.com',
        authMethod: 'theme-access-app' as const
      };

      const { collectShopData } = await import('../../lib/core/shop-input.js');
      vi.mocked(collectShopData).mockResolvedValue({
        success: true,
        data: shopData
      });

      vi.mocked(mockContext.shopOps.saveConfig).mockResolvedValue({ success: true });

      const { setupShopResources } = await import('../../lib/core/shop-setup.js');
      vi.mocked(setupShopResources).mockResolvedValue({ success: true });

      const { createNewShop } = await import('../../lib/core/shop-creation.js');

      // Act
      await createNewShop(mockContext);

      // Assert
      expect(setupShopResources).toHaveBeenCalledWith(
        shopData,
        expect.objectContaining({ shopId: 'test-shop' }),
        mockContext
      );
    });

    test('passes correct config to setupShopResources', async () => {
      // Arrange
      const shopData = {
        shopId: 'my-shop',
        shopName: 'My Shop',
        productionDomain: 'my.myshopify.com',
        stagingDomain: 'staging.myshopify.com',
        authMethod: 'manual-tokens' as const
      };

      const { collectShopData } = await import('../../lib/core/shop-input.js');
      vi.mocked(collectShopData).mockResolvedValue({
        success: true,
        data: shopData
      });

      vi.mocked(mockContext.shopOps.saveConfig).mockResolvedValue({ success: true });

      const { setupShopResources } = await import('../../lib/core/shop-setup.js');
      vi.mocked(setupShopResources).mockResolvedValue({ success: true });

      const { createNewShop } = await import('../../lib/core/shop-creation.js');

      // Act
      await createNewShop(mockContext);

      // Assert
      expect(setupShopResources).toHaveBeenCalledWith(
        shopData,
        expect.objectContaining({
          shopId: 'my-shop',
          name: 'My Shop',
          shopify: expect.objectContaining({
            authentication: expect.objectContaining({
              method: 'manual-tokens'
            })
          })
        }),
        mockContext
      );
    });

    test('handles theme-access-app authentication method', async () => {
      // Arrange
      const shopData = {
        shopId: 'test-shop',
        shopName: 'Test Shop',
        productionDomain: 'test.myshopify.com',
        stagingDomain: 'staging.myshopify.com',
        authMethod: 'theme-access-app' as const
      };

      const { collectShopData } = await import('../../lib/core/shop-input.js');
      vi.mocked(collectShopData).mockResolvedValue({
        success: true,
        data: shopData
      });

      let savedConfig: ShopConfig | undefined;
      vi.mocked(mockContext.shopOps.saveConfig).mockImplementation(async (shopId, config) => {
        savedConfig = config;
        return { success: true };
      });

      const { setupShopResources } = await import('../../lib/core/shop-setup.js');
      vi.mocked(setupShopResources).mockResolvedValue({ success: true });

      const { createNewShop } = await import('../../lib/core/shop-creation.js');

      // Act
      await createNewShop(mockContext);

      // Assert
      expect(savedConfig?.shopify.authentication.method).toBe('theme-access-app');
    });
  });

  describe('buildShopConfig', () => {
    test('creates config with all required fields', async () => {
      // Arrange
      const shopData = {
        shopId: 'test-shop',
        shopName: 'Test Shop',
        productionDomain: 'test.myshopify.com',
        stagingDomain: 'staging.myshopify.com',
        authMethod: 'theme-access-app' as const
      };

      const { collectShopData } = await import('../../lib/core/shop-input.js');
      vi.mocked(collectShopData).mockResolvedValue({
        success: true,
        data: shopData
      });

      let savedConfig: ShopConfig | undefined;
      vi.mocked(mockContext.shopOps.saveConfig).mockImplementation(async (shopId, config) => {
        savedConfig = config;
        return { success: true };
      });

      const { setupShopResources } = await import('../../lib/core/shop-setup.js');
      vi.mocked(setupShopResources).mockResolvedValue({ success: true });

      const { createNewShop } = await import('../../lib/core/shop-creation.js');

      // Act
      await createNewShop(mockContext);

      // Assert
      expect(savedConfig).toHaveProperty('shopId');
      expect(savedConfig).toHaveProperty('name');
      expect(savedConfig).toHaveProperty('shopify');
      expect(savedConfig?.shopify).toHaveProperty('stores');
      expect(savedConfig?.shopify).toHaveProperty('authentication');
    });

    test('creates production store with correct structure', async () => {
      // Arrange
      const shopData = {
        shopId: 'test-shop',
        shopName: 'Test Shop',
        productionDomain: 'test.myshopify.com',
        stagingDomain: 'staging.myshopify.com',
        authMethod: 'theme-access-app' as const
      };

      const { collectShopData } = await import('../../lib/core/shop-input.js');
      vi.mocked(collectShopData).mockResolvedValue({
        success: true,
        data: shopData
      });

      let savedConfig: ShopConfig | undefined;
      vi.mocked(mockContext.shopOps.saveConfig).mockImplementation(async (shopId, config) => {
        savedConfig = config;
        return { success: true };
      });

      const { setupShopResources } = await import('../../lib/core/shop-setup.js');
      vi.mocked(setupShopResources).mockResolvedValue({ success: true });

      const { createNewShop } = await import('../../lib/core/shop-creation.js');

      // Act
      await createNewShop(mockContext);

      // Assert
      expect(savedConfig?.shopify.stores.production).toHaveProperty('domain');
      expect(savedConfig?.shopify.stores.production).toHaveProperty('branch');
    });

    test('creates staging store with correct structure', async () => {
      // Arrange
      const shopData = {
        shopId: 'test-shop',
        shopName: 'Test Shop',
        productionDomain: 'test.myshopify.com',
        stagingDomain: 'staging.myshopify.com',
        authMethod: 'theme-access-app' as const
      };

      const { collectShopData } = await import('../../lib/core/shop-input.js');
      vi.mocked(collectShopData).mockResolvedValue({
        success: true,
        data: shopData
      });

      let savedConfig: ShopConfig | undefined;
      vi.mocked(mockContext.shopOps.saveConfig).mockImplementation(async (shopId, config) => {
        savedConfig = config;
        return { success: true };
      });

      const { setupShopResources } = await import('../../lib/core/shop-setup.js');
      vi.mocked(setupShopResources).mockResolvedValue({ success: true });

      const { createNewShop } = await import('../../lib/core/shop-creation.js');

      // Act
      await createNewShop(mockContext);

      // Assert
      expect(savedConfig?.shopify.stores.staging).toHaveProperty('domain');
      expect(savedConfig?.shopify.stores.staging).toHaveProperty('branch');
    });
  });
});
