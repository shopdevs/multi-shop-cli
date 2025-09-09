import { describe, test, expect } from 'vitest';
import { validateShopId, validateDomain, validateShopConfig } from '../lib/core/validation.js';
import type { ShopConfig } from '../types/shop.js';

describe('Validation Functions', () => {
  describe('validateShopId', () => {
    test('should accept valid shop IDs', () => {
      const validIds = ['shop-a', 'my-store-123', 'test-shop', 'a', 'shop-name-with-dashes'];
      
      validIds.forEach(id => {
        const result = validateShopId(id);
        expect(result.success).toBe(true);
      });
    });

    test('should reject invalid shop IDs', () => {
      const invalidIds = [
        '', // Empty
        'UPPERCASE', // Uppercase
        'with spaces', // Spaces
        'with.dots', // Dots
        'with_underscores', // Underscores
        'with@symbols', // Special characters
        'a'.repeat(51), // Too long
        '123-', // Ending with dash
        '-123' // Starting with dash
      ];
      
      invalidIds.forEach(id => {
        const result = validateShopId(id);
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    test('should handle non-string input', () => {
      // @ts-expect-error - Testing runtime validation
      expect(validateShopId(null).success).toBe(false);
      // @ts-expect-error - Testing runtime validation  
      expect(validateShopId(undefined).success).toBe(false);
      // @ts-expect-error - Testing runtime validation
      expect(validateShopId(123).success).toBe(false);
    });
  });

  describe('validateDomain', () => {
    test('should accept valid Shopify domains', () => {
      const validDomains = [
        'my-shop.myshopify.com',
        'staging-my-shop.myshopify.com', 
        'test-123.myshopify.com',
        'a.myshopify.com'
      ];
      
      validDomains.forEach(domain => {
        const result = validateDomain(domain);
        expect(result.success).toBe(true);
      });
    });

    test('should reject invalid domains', () => {
      const invalidDomains = [
        '', // Empty
        'my-shop.com', // Wrong TLD
        'my-shop', // No TLD
        'my-shop.shopify.com', // Wrong subdomain
        '.myshopify.com', // Empty subdomain
        'my-shop.myshopify.com.evil.com' // Domain hijacking attempt
      ];
      
      invalidDomains.forEach(domain => {
        const result = validateDomain(domain);
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });
    });
  });

  describe('validateShopConfig', () => {
    test('should validate complete shop configuration', async () => {
      const validConfig: ShopConfig = {
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
          authentication: { method: 'theme-access-app' }
        }
      };

      const result = await validateShopConfig(validConfig, 'test-shop');
      expect(result.success).toBe(true);
    });

    test('should reject configuration with mismatched shop ID', async () => {
      const invalidConfig: ShopConfig = {
        shopId: 'different-shop',
        name: 'Test Shop',
        shopify: {
          stores: {
            production: { domain: 'test-shop.myshopify.com', branch: 'test-shop/main' },
            staging: { domain: 'staging-test-shop.myshopify.com', branch: 'test-shop/staging' }
          },
          authentication: { method: 'theme-access-app' }
        }
      };

      const result = await validateShopConfig(invalidConfig, 'test-shop');
      expect(result.success).toBe(false);
      expect(result.error).toContain('does not match provided shop ID');
    });

    test('should reject configuration with invalid domains', async () => {
      const invalidConfig: ShopConfig = {
        shopId: 'test-shop',
        name: 'Test Shop',
        shopify: {
          stores: {
            production: { domain: 'invalid-domain.com', branch: 'test-shop/main' },
            staging: { domain: 'staging-test-shop.myshopify.com', branch: 'test-shop/staging' }
          },
          authentication: { method: 'theme-access-app' }
        }
      };

      const result = await validateShopConfig(invalidConfig, 'test-shop');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Production');
    });

    test('should reject non-object input', async () => {
      const result = await validateShopConfig("invalid", 'test-shop');
      expect(result.success).toBe(false);
      expect(result.error).toContain('object');
    });
  });
});