import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import { createShopOperations } from '../lib/core/shop-operations.js';
import { createCredentialOperations } from '../lib/core/credential-operations.js';
import { validateShopId, validateDomain, validateShopConfig } from '../lib/core/validation.js';
import type { ShopConfig, ShopCredentials } from '../types/shop.js';

// Mock file system
vi.mock('fs');

describe('Functional Operations', () => {
  const mockDeps = {
    cwd: '/test/project',
    shopsDir: '/test/project/shops',
    credentialsDir: '/test/project/shops/credentials'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Shop Operations', () => {
    const shopOps = createShopOperations(mockDeps);

    test('should load shop configuration successfully', async () => {
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

      const result = await shopOps.loadConfig('test-shop');

      expect(result.success).toBe(true);
      expect(result.data?.shopId).toBe('test-shop');
      expect(result.data?.name).toBe('Test Shop');
    });

    test('should return error for non-existent shop', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const result = await shopOps.loadConfig('nonexistent-shop');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Shop configuration not found');
    });

    test('should save shop configuration successfully', async () => {
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
      vi.mocked(fs.writeFileSync).mockImplementation(() => {});

      const result = await shopOps.saveConfig('test-shop', mockConfig);

      expect(result.success).toBe(true);
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    test('should list shops correctly', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue(['shop-a.config.json', 'shop-b.config.json', 'example.config.json'] as any);

      const result = await shopOps.listShops();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(['shop-a', 'shop-b']);
    });

    test('should return empty array when shops directory does not exist', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const result = await shopOps.listShops();

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });
  });

  describe('Credential Operations', () => {
    const credOps = createCredentialOperations(mockDeps);

    test('should load credentials successfully', async () => {
      const mockCreds: ShopCredentials = {
        developer: 'test-developer',
        shopify: {
          stores: {
            production: { themeToken: 'prod-token' },
            staging: { themeToken: 'staging-token' }
          }
        },
        notes: 'Test credentials'
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockCreds));

      const result = await credOps.loadCredentials('test-shop');

      expect(result.success).toBe(true);
      expect(result.data?.developer).toBe('test-developer');
    });

    test('should return null for non-existent credentials', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const result = await credOps.loadCredentials('test-shop');

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    test('should save credentials with metadata', async () => {
      const mockCreds: ShopCredentials = {
        developer: 'test-developer',
        shopify: {
          stores: {
            production: { themeToken: 'prod-token' },
            staging: { themeToken: 'staging-token' }
          }
        },
        notes: 'Test credentials'
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.mkdirSync).mockImplementation(() => '');
      vi.mocked(fs.writeFileSync).mockImplementation(() => {});
      vi.mocked(fs.chmodSync).mockImplementation(() => {});

      const result = await credOps.saveCredentials('test-shop', mockCreds);

      expect(result.success).toBe(true);
      expect(fs.writeFileSync).toHaveBeenCalled();
    });
  });

  describe('Validation Functions', () => {
    test('should validate shop IDs correctly', () => {
      expect(validateShopId('valid-shop-123').success).toBe(true);
      expect(validateShopId('INVALID-SHOP').success).toBe(false);
      expect(validateShopId('invalid.shop').success).toBe(false);
      expect(validateShopId('').success).toBe(false);
      expect(validateShopId('a'.repeat(51)).success).toBe(false);
    });

    test('should validate domains correctly', () => {
      expect(validateDomain('valid-shop.myshopify.com').success).toBe(true);
      expect(validateDomain('invalid-domain.com').success).toBe(false);
      expect(validateDomain('').success).toBe(false);
      expect(validateDomain('no-extension').success).toBe(false);
    });

    test('should validate shop configurations', async () => {
      const validConfig: ShopConfig = {
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

      const result = await validateShopConfig(validConfig, 'test-shop');
      expect(result.success).toBe(true);
    });

    test('should reject invalid shop configurations', async () => {
      const invalidConfig = {
        shopId: 'INVALID-ID',
        name: 'Test Shop'
        // Missing required fields
      };

      const result = await validateShopConfig(invalidConfig, 'test-shop');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});