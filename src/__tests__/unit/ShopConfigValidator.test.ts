/**
 * Unit tests for ShopConfigValidator
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { ShopConfigValidator } from '../../lib/validators/ShopConfigValidator.js';
import { ShopValidationError } from '../../lib/errors/ShopError.js';
import type { ShopConfig, ShopCredentials } from '../../types/shop.js';

describe('ShopConfigValidator', () => {
  let validator: ShopConfigValidator;

  beforeEach(() => {
    validator = new ShopConfigValidator();
  });

  describe('constructor', () => {
    test('creates validator instance', () => {
      // Assert
      expect(validator).toBeInstanceOf(ShopConfigValidator);
    });

    test('validator has all required methods', () => {
      // Assert
      expect(typeof validator.validateConfig).toBe('function');
      expect(typeof validator.validateCredentialsStructure).toBe('function');
      expect(typeof validator.validateShopId).toBe('function');
      expect(typeof validator.validateStoreDomain).toBe('function');
      expect(typeof validator.validateThemeToken).toBe('function');
    });
  });

  describe('validateConfig', () => {
    test('validates valid configuration', () => {
      // Arrange
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
          authentication: {
            method: 'theme-access-app'
          }
        }
      };

      // Act
      const result = validator.validateConfig(validConfig, 'test-shop');

      // Assert
      expect(result).toEqual(validConfig);
    });

    test('validates config with manual-tokens auth method', () => {
      // Arrange
      const validConfig: ShopConfig = {
        shopId: 'my-shop',
        name: 'My Shop',
        shopify: {
          stores: {
            production: {
              domain: 'my-shop.myshopify.com',
              branch: 'my-shop/main'
            },
            staging: {
              domain: 'my-shop-staging.myshopify.com',
              branch: 'my-shop/staging'
            }
          },
          authentication: {
            method: 'manual-tokens'
          }
        }
      };

      // Act
      const result = validator.validateConfig(validConfig, 'my-shop');

      // Assert
      expect(result).toEqual(validConfig);
    });

    test('throws error for missing shopId field', () => {
      // Arrange
      const invalidConfig = {
        name: 'Test Shop',
        shopify: {
          stores: {
            production: { domain: 'test.myshopify.com', branch: 'test/main' },
            staging: { domain: 'staging.myshopify.com', branch: 'test/staging' }
          },
          authentication: { method: 'theme-access-app' }
        }
      };

      // Act & Assert
      expect(() => {
        validator.validateConfig(invalidConfig, 'test-shop');
      }).toThrow(ShopValidationError);
    });

    test('throws error for missing name field', () => {
      // Arrange
      const invalidConfig = {
        shopId: 'test-shop',
        shopify: {
          stores: {
            production: { domain: 'test.myshopify.com', branch: 'test-shop/main' },
            staging: { domain: 'staging.myshopify.com', branch: 'test-shop/staging' }
          },
          authentication: { method: 'theme-access-app' }
        }
      };

      // Act & Assert
      expect(() => {
        validator.validateConfig(invalidConfig, 'test-shop');
      }).toThrow(ShopValidationError);
    });

    test('throws error for missing shopify field', () => {
      // Arrange
      const invalidConfig = {
        shopId: 'test-shop',
        name: 'Test Shop'
      };

      // Act & Assert
      expect(() => {
        validator.validateConfig(invalidConfig, 'test-shop');
      }).toThrow(ShopValidationError);
    });

    test('throws error for invalid shopId pattern', () => {
      // Arrange
      const invalidConfig = {
        shopId: 'INVALID_SHOP',
        name: 'Test Shop',
        shopify: {
          stores: {
            production: { domain: 'test.myshopify.com', branch: 'test/main' },
            staging: { domain: 'staging.myshopify.com', branch: 'test/staging' }
          },
          authentication: { method: 'theme-access-app' }
        }
      };

      // Act & Assert
      expect(() => {
        validator.validateConfig(invalidConfig, 'test-shop');
      }).toThrow(ShopValidationError);
    });

    test('throws error for invalid domain', () => {
      // Arrange
      const invalidConfig = {
        shopId: 'test-shop',
        name: 'Test Shop',
        shopify: {
          stores: {
            production: { domain: 'invalid.com', branch: 'test-shop/main' },
            staging: { domain: 'staging.myshopify.com', branch: 'test-shop/staging' }
          },
          authentication: { method: 'theme-access-app' }
        }
      };

      // Act & Assert
      expect(() => {
        validator.validateConfig(invalidConfig, 'test-shop');
      }).toThrow(ShopValidationError);
    });

    test('throws error for additional properties', () => {
      // Arrange
      const invalidConfig = {
        shopId: 'test-shop',
        name: 'Test Shop',
        shopify: {
          stores: {
            production: { domain: 'test.myshopify.com', branch: 'test-shop/main' },
            staging: { domain: 'staging.myshopify.com', branch: 'test-shop/staging' }
          },
          authentication: { method: 'theme-access-app' }
        },
        extraField: 'not allowed'
      };

      // Act & Assert
      expect(() => {
        validator.validateConfig(invalidConfig, 'test-shop');
      }).toThrow(ShopValidationError);
    });

    test('includes validation errors in exception details', () => {
      // Arrange
      const invalidConfig = { shopId: 'INVALID' };

      // Act & Assert
      try {
        validator.validateConfig(invalidConfig, 'test-shop');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ShopValidationError);
        const validationError = error as ShopValidationError;
        expect(validationError.details).toHaveProperty('validationErrors');
      }
    });

    test('validates config with same domain for production and staging', () => {
      // Arrange
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
              domain: 'test-shop.myshopify.com',
              branch: 'test-shop/staging'
            }
          },
          authentication: {
            method: 'theme-access-app'
          }
        }
      };

      // Act
      const result = validator.validateConfig(validConfig, 'test-shop');

      // Assert
      expect(result).toEqual(validConfig);
    });
  });

  describe('validateCredentialsStructure', () => {
    test('validates valid credentials', () => {
      // Arrange
      const validCredentials: ShopCredentials = {
        developer: 'test-developer',
        shopify: {
          stores: {
            production: {
              themeToken: 'prod-token-123456'
            },
            staging: {
              themeToken: 'staging-token-123456'
            }
          }
        }
      };

      // Act
      const result = validator.validateCredentialsStructure(validCredentials, 'test-shop');

      // Assert
      expect(result).toEqual(validCredentials);
    });

    test('validates credentials with optional notes', () => {
      // Arrange
      const validCredentials: ShopCredentials = {
        developer: 'test-developer',
        shopify: {
          stores: {
            production: { themeToken: 'prod-token-123456' },
            staging: { themeToken: 'staging-token-123456' }
          }
        },
        notes: 'Test credentials - do not use in production'
      };

      // Act
      const result = validator.validateCredentialsStructure(validCredentials, 'test-shop');

      // Assert
      expect(result).toEqual(validCredentials);
    });

    test('throws error for missing developer field', () => {
      // Arrange
      const invalidCredentials = {
        shopify: {
          stores: {
            production: { themeToken: 'token' },
            staging: { themeToken: 'token' }
          }
        }
      };

      // Act & Assert
      expect(() => {
        validator.validateCredentialsStructure(invalidCredentials, 'test-shop');
      }).toThrow(ShopValidationError);
    });

    test('throws error for missing shopify field', () => {
      // Arrange
      const invalidCredentials = {
        developer: 'test-developer'
      };

      // Act & Assert
      expect(() => {
        validator.validateCredentialsStructure(invalidCredentials, 'test-shop');
      }).toThrow(ShopValidationError);
    });

    test('throws error for missing production themeToken', () => {
      // Arrange
      const invalidCredentials = {
        developer: 'test-developer',
        shopify: {
          stores: {
            production: {},
            staging: { themeToken: 'token' }
          }
        }
      };

      // Act & Assert
      expect(() => {
        validator.validateCredentialsStructure(invalidCredentials, 'test-shop');
      }).toThrow(ShopValidationError);
    });

    test('throws error for short themeToken', () => {
      // Arrange
      const invalidCredentials = {
        developer: 'test-developer',
        shopify: {
          stores: {
            production: { themeToken: 'short' },
            staging: { themeToken: 'token-123456' }
          }
        }
      };

      // Act & Assert
      expect(() => {
        validator.validateCredentialsStructure(invalidCredentials, 'test-shop');
      }).toThrow(ShopValidationError);
    });

    test('throws error for additional properties', () => {
      // Arrange
      const invalidCredentials = {
        developer: 'test-developer',
        shopify: {
          stores: {
            production: { themeToken: 'token-123456' },
            staging: { themeToken: 'token-123456' }
          }
        },
        extraField: 'not allowed'
      };

      // Act & Assert
      expect(() => {
        validator.validateCredentialsStructure(invalidCredentials, 'test-shop');
      }).toThrow(ShopValidationError);
    });

    test('includes validation errors in exception details', () => {
      // Arrange
      const invalidCredentials = { developer: '' };

      // Act & Assert
      try {
        validator.validateCredentialsStructure(invalidCredentials, 'test-shop');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ShopValidationError);
        const validationError = error as ShopValidationError;
        expect(validationError.details).toHaveProperty('validationErrors');
      }
    });
  });

  describe('validateShopId', () => {
    test('validates valid shop IDs', () => {
      // Arrange
      const validIds = ['test-shop', 'my-shop-123', 'a', 'shop-a-b-c', 'shop1'];

      // Act & Assert
      validIds.forEach(id => {
        expect(validator.validateShopId(id)).toBe(id);
      });
    });

    test('throws error for uppercase letters', () => {
      // Act & Assert
      expect(() => {
        validator.validateShopId('UPPERCASE');
      }).toThrow(ShopValidationError);
    });

    test('throws error for spaces', () => {
      // Act & Assert
      expect(() => {
        validator.validateShopId('with spaces');
      }).toThrow(ShopValidationError);
    });

    test('throws error for leading hyphen', () => {
      // Act & Assert
      expect(() => {
        validator.validateShopId('-leading-hyphen');
      }).toThrow(ShopValidationError);
    });

    test('throws error for trailing hyphen', () => {
      // Act & Assert
      expect(() => {
        validator.validateShopId('trailing-hyphen-');
      }).toThrow(ShopValidationError);
    });

    test('throws error for non-string values', () => {
      // Act & Assert
      expect(() => {
        validator.validateShopId(123 as any);
      }).toThrow(ShopValidationError);

      expect(() => {
        validator.validateShopId(null as any);
      }).toThrow(ShopValidationError);

      expect(() => {
        validator.validateShopId(undefined as any);
      }).toThrow(ShopValidationError);
    });

    test('throws error for too long shop ID', () => {
      // Arrange
      const tooLong = 'a'.repeat(51);

      // Act & Assert
      expect(() => {
        validator.validateShopId(tooLong);
      }).toThrow(ShopValidationError);
    });

    test('accepts shop ID at max length', () => {
      // Arrange
      const maxLength = 'a'.repeat(50);

      // Act
      const result = validator.validateShopId(maxLength);

      // Assert
      expect(result).toBe(maxLength);
    });

    test('throws error for empty string', () => {
      // Act & Assert
      expect(() => {
        validator.validateShopId('');
      }).toThrow(ShopValidationError);
    });

    test('throws error for special characters', () => {
      // Arrange
      const invalidIds = ['shop_id', 'shop@id', 'shop.id', 'shop/id'];

      // Act & Assert
      invalidIds.forEach(id => {
        expect(() => {
          validator.validateShopId(id);
        }).toThrow(ShopValidationError);
      });
    });
  });

  describe('validateStoreDomain', () => {
    test('validates valid production domain', () => {
      // Arrange
      const domain = 'test-shop.myshopify.com';

      // Act
      const result = validator.validateStoreDomain(domain, 'production');

      // Assert
      expect(result).toBe(domain);
    });

    test('validates valid staging domain', () => {
      // Arrange
      const domain = 'staging-shop.myshopify.com';

      // Act
      const result = validator.validateStoreDomain(domain, 'staging');

      // Assert
      expect(result).toBe(domain);
    });

    test('validates domain without type parameter', () => {
      // Arrange
      const domain = 'my-shop.myshopify.com';

      // Act
      const result = validator.validateStoreDomain(domain);

      // Assert
      expect(result).toBe(domain);
    });

    test('throws error for missing .myshopify.com suffix', () => {
      // Act & Assert
      expect(() => {
        validator.validateStoreDomain('shop.com');
      }).toThrow(ShopValidationError);
    });

    test('throws error for wrong suffix', () => {
      // Act & Assert
      expect(() => {
        validator.validateStoreDomain('shop.shopify.com');
      }).toThrow(ShopValidationError);
    });

    test('throws error for no subdomain', () => {
      // Act & Assert
      expect(() => {
        validator.validateStoreDomain('.myshopify.com');
      }).toThrow(ShopValidationError);
    });

    test('throws error for uppercase letters', () => {
      // Act & Assert
      expect(() => {
        validator.validateStoreDomain('UPPERCASE.myshopify.com');
      }).toThrow(ShopValidationError);
    });

    test('throws error for non-string values', () => {
      // Act & Assert
      expect(() => {
        validator.validateStoreDomain(123 as any);
      }).toThrow(ShopValidationError);
    });

    test('validates single character subdomain', () => {
      // Arrange
      const domain = 'a.myshopify.com';

      // Act
      const result = validator.validateStoreDomain(domain);

      // Assert
      expect(result).toBe(domain);
    });

    test('throws error for invalid characters in subdomain', () => {
      // Arrange
      const invalidDomains = [
        'shop_name.myshopify.com',
        'shop@name.myshopify.com',
        'shop.name.myshopify.com'
      ];

      // Act & Assert
      invalidDomains.forEach(domain => {
        expect(() => {
          validator.validateStoreDomain(domain);
        }).toThrow(ShopValidationError);
      });
    });
  });

  describe('validateThemeToken', () => {
    test('validates theme-access-app token', () => {
      // Arrange
      const token = 'any-token-format-works-here';

      // Act
      const result = validator.validateThemeToken(token, 'theme-access-app');

      // Assert
      expect(result).toBe(token);
    });

    test('validates manual-tokens token with correct prefix', () => {
      // Arrange
      const token = 'shptka_valid_token_123456';

      // Act
      const result = validator.validateThemeToken(token, 'manual-tokens');

      // Assert
      expect(result).toBe(token);
    });

    test('accepts tokens without specific prefix (flexible validation)', () => {
      // Arrange - Any token >= 10 chars is valid (tkat_, shpat_, or other formats)
      const token = 'valid_token_12345';

      // Act
      const result = validator.validateThemeToken(token, 'manual-tokens');

      // Assert
      expect(result).toBe(token);
    });

    test('throws error for token too short', () => {
      // Arrange
      const shortToken = 'short';

      // Act & Assert
      expect(() => {
        validator.validateThemeToken(shortToken, 'theme-access-app');
      }).toThrow(ShopValidationError);
    });

    test('validates token at minimum length', () => {
      // Arrange
      const minToken = 'a'.repeat(10);

      // Act
      const result = validator.validateThemeToken(minToken, 'theme-access-app');

      // Assert
      expect(result).toBe(minToken);
    });

    test('throws error for non-string token', () => {
      // Act & Assert
      expect(() => {
        validator.validateThemeToken(123 as any, 'theme-access-app');
      }).toThrow(ShopValidationError);
    });

    test('accepts theme access tokens with tkat_ prefix', () => {
      // Arrange - Official Theme Access app token format
      const token = 'tkat_abc123xyz456';

      // Act
      const result = validator.validateThemeToken(token, 'theme-access-app');

      // Assert
      expect(result).toBe(token);
    });

    test('accepts custom app tokens with shpat_ prefix', () => {
      // Arrange - Custom app admin API token format
      const token = 'shpat_abc123xyz456';

      // Act
      const result = validator.validateThemeToken(token, 'manual-tokens');

      // Assert
      expect(result).toBe(token);
    });

    test('flexible validation accepts various token formats', () => {
      // Arrange - Accepts any token >= 10 chars
      const token = 'other_format_token_123';

      // Act
      const result = validator.validateThemeToken(token, 'theme-access-app');

      // Assert
      expect(result).toBe(token);
    });
  });

  describe('edge cases', () => {
    test('handles null config gracefully', () => {
      // Act & Assert
      expect(() => {
        validator.validateConfig(null, 'test-shop');
      }).toThrow(ShopValidationError);
    });

    test('handles undefined config gracefully', () => {
      // Act & Assert
      expect(() => {
        validator.validateConfig(undefined, 'test-shop');
      }).toThrow(ShopValidationError);
    });

    test('handles empty object config', () => {
      // Act & Assert
      expect(() => {
        validator.validateConfig({}, 'test-shop');
      }).toThrow(ShopValidationError);
    });

    test('validates config with metadata field', () => {
      // Arrange
      const configWithMetadata = {
        shopId: 'test-shop',
        name: 'Test Shop',
        shopify: {
          stores: {
            production: { domain: 'test.myshopify.com', branch: 'test-shop/main' },
            staging: { domain: 'staging.myshopify.com', branch: 'test-shop/staging' }
          },
          authentication: { method: 'theme-access-app' }
        },
        metadata: {
          description: 'Test shop metadata',
          tags: ['test', 'development']
        }
      };

      // Act & Assert
      expect(() => {
        validator.validateConfig(configWithMetadata, 'test-shop');
      }).toThrow(ShopValidationError); // metadata not allowed by schema additionalProperties: false
    });
  });
});
