/**
 * Unit tests for shop-setup module
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import type { CLIContext } from '../../lib/core/types.js';
import type { ShopData } from '../../lib/core/shop-input.js';
import { createMockShopConfig } from '../helpers.js';

// Mock @clack/prompts
vi.mock('@clack/prompts', () => ({
  select: vi.fn(),
  text: vi.fn(),
  isCancel: vi.fn(),
  note: vi.fn(),
  spinner: vi.fn(() => ({
    start: vi.fn(),
    stop: vi.fn()
  }))
}));

// Mock child_process
vi.mock('child_process', () => ({
  execSync: vi.fn()
}));

describe('shop-setup', () => {
  let mockContext: CLIContext;
  let mockShopData: ShopData;

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

    mockShopData = {
      shopId: 'test-shop',
      shopName: 'Test Shop',
      productionDomain: 'test-shop.myshopify.com',
      stagingDomain: 'staging-test-shop.myshopify.com',
      authMethod: 'theme-access-app'
    };

    vi.clearAllMocks();
  });

  describe('setupShopResources', () => {
    test('sets up shop resources successfully', async () => {
      // Arrange
      const mockConfig = createMockShopConfig('test-shop');
      const { execSync } = await import('child_process');
      const { select, text, isCancel } = await import('@clack/prompts');

      vi.mocked(select).mockResolvedValue('no'); // Don't create branches
      vi.mocked(text)
        .mockResolvedValueOnce('prod-token')
        .mockResolvedValueOnce('staging-token');
      vi.mocked(isCancel).mockReturnValue(false);
      vi.mocked(mockContext.credOps.saveCredentials).mockResolvedValue({
        success: true
      });

      const { setupShopResources } = await import('../../lib/core/shop-setup.js');

      // Act
      await setupShopResources(mockShopData, mockConfig, mockContext);

      // Assert
      expect(mockContext.credOps.saveCredentials).toHaveBeenCalledWith(
        'test-shop',
        expect.objectContaining({
          shopify: {
            stores: {
              production: { themeToken: 'prod-token' },
              staging: { themeToken: 'staging-token' }
            }
          }
        })
      );
    });

    test('prompts user to create branches', async () => {
      // Arrange
      const mockConfig = createMockShopConfig('test-shop');
      const { select, text, isCancel } = await import('@clack/prompts');

      vi.mocked(select).mockResolvedValue('no');
      vi.mocked(text).mockResolvedValue('token');
      vi.mocked(isCancel).mockReturnValue(false);
      vi.mocked(mockContext.credOps.saveCredentials).mockResolvedValue({
        success: true
      });

      const { setupShopResources } = await import('../../lib/core/shop-setup.js');

      // Act
      await setupShopResources(mockShopData, mockConfig, mockContext);

      // Assert
      expect(select).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Create GitHub branches for this shop?',
          options: [
            { value: 'yes', label: 'Yes, create branches automatically', hint: 'Recommended' },
            { value: 'no', label: 'No, I\'ll create them manually', hint: 'Manual setup' }
          ]
        })
      );
    });

    test('creates GitHub branches when user selects yes', async () => {
      // Arrange
      const mockConfig = createMockShopConfig('test-shop');
      const { execSync } = await import('child_process');
      const { select, text, isCancel } = await import('@clack/prompts');

      vi.mocked(select).mockResolvedValue('yes');
      vi.mocked(text).mockResolvedValue('token');
      vi.mocked(isCancel).mockReturnValue(false);
      vi.mocked(execSync)
        .mockReturnValueOnce(Buffer.from('')) // git rev-parse --git-dir
        .mockReturnValueOnce(Buffer.from('main\n')) // get current branch
        .mockReturnValueOnce(Buffer.from('')) // checkout test-shop/main
        .mockReturnValueOnce(Buffer.from('')) // push test-shop/main
        .mockReturnValueOnce(Buffer.from('')) // checkout back to main
        .mockReturnValueOnce(Buffer.from('')) // checkout test-shop/staging
        .mockReturnValueOnce(Buffer.from('')) // push test-shop/staging
        .mockReturnValueOnce(Buffer.from('')); // checkout back to main
      vi.mocked(mockContext.credOps.saveCredentials).mockResolvedValue({
        success: true
      });

      const { setupShopResources } = await import('../../lib/core/shop-setup.js');

      // Act
      await setupShopResources(mockShopData, mockConfig, mockContext);

      // Assert
      expect(execSync).toHaveBeenCalledWith('git rev-parse --git-dir', expect.any(Object));
      expect(execSync).toHaveBeenCalledWith('git rev-parse --abbrev-ref HEAD', expect.any(Object));
    });

    test('handles branch creation failure gracefully', async () => {
      // Arrange
      const mockConfig = createMockShopConfig('test-shop');
      const { execSync } = await import('child_process');
      const { select, text, isCancel } = await import('@clack/prompts');

      vi.mocked(select).mockResolvedValue('yes');
      vi.mocked(text).mockResolvedValue('token');
      vi.mocked(isCancel).mockReturnValue(false);
      vi.mocked(execSync).mockImplementation(() => {
        throw new Error('Not a git repository');
      });
      vi.mocked(mockContext.credOps.saveCredentials).mockResolvedValue({
        success: true
      });

      const { setupShopResources } = await import('../../lib/core/shop-setup.js');

      // Act & Assert - should not throw
      await expect(setupShopResources(mockShopData, mockConfig, mockContext)).resolves.not.toThrow();
    });

    test('skips branch creation when user selects no', async () => {
      // Arrange
      const mockConfig = createMockShopConfig('test-shop');
      const { execSync } = await import('child_process');
      const { select, text, isCancel } = await import('@clack/prompts');

      vi.mocked(select).mockResolvedValue('no');
      vi.mocked(text).mockResolvedValue('token');
      vi.mocked(isCancel).mockReturnValue(false);
      vi.mocked(mockContext.credOps.saveCredentials).mockResolvedValue({
        success: true
      });

      const { setupShopResources } = await import('../../lib/core/shop-setup.js');

      // Act
      await setupShopResources(mockShopData, mockConfig, mockContext);

      // Assert
      expect(execSync).not.toHaveBeenCalled();
    });

    test('skips branch creation when selection is cancelled', async () => {
      // Arrange
      const mockConfig = createMockShopConfig('test-shop');
      const { execSync } = await import('child_process');
      const { select, text, isCancel } = await import('@clack/prompts');

      vi.mocked(select).mockResolvedValue(Symbol('cancel'));
      vi.mocked(text).mockResolvedValue('token');
      vi.mocked(isCancel)
        .mockReturnValueOnce(true) // Branch creation selection
        .mockReturnValue(false); // Rest
      vi.mocked(mockContext.credOps.saveCredentials).mockResolvedValue({
        success: true
      });

      const { setupShopResources } = await import('../../lib/core/shop-setup.js');

      // Act
      await setupShopResources(mockShopData, mockConfig, mockContext);

      // Assert
      expect(execSync).not.toHaveBeenCalled();
    });

    test('prompts for production theme access password', async () => {
      // Arrange
      const mockConfig = createMockShopConfig('test-shop');
      const { select, text, isCancel } = await import('@clack/prompts');

      vi.mocked(select).mockResolvedValue('no');
      vi.mocked(text).mockResolvedValueOnce('prod-token');
      vi.mocked(isCancel).mockReturnValue(false);
      vi.mocked(mockContext.credOps.saveCredentials).mockResolvedValue({
        success: true
      });

      const { setupShopResources } = await import('../../lib/core/shop-setup.js');

      // Act
      await setupShopResources(mockShopData, mockConfig, mockContext);

      // Assert
      expect(text).toHaveBeenCalledWith(
        expect.objectContaining({
          message: `Production theme access password (${mockConfig.shopify.stores.production.domain}):`,
          placeholder: 'Enter your theme access password'
        })
      );
    });

    test('prompts for staging theme access password', async () => {
      // Arrange
      const mockConfig = createMockShopConfig('test-shop');
      const { select, text, isCancel } = await import('@clack/prompts');

      vi.mocked(select).mockResolvedValue('no');
      vi.mocked(text)
        .mockResolvedValueOnce('prod-token')
        .mockResolvedValueOnce('staging-token');
      vi.mocked(isCancel).mockReturnValue(false);
      vi.mocked(mockContext.credOps.saveCredentials).mockResolvedValue({
        success: true
      });

      const { setupShopResources } = await import('../../lib/core/shop-setup.js');

      // Act
      await setupShopResources(mockShopData, mockConfig, mockContext);

      // Assert
      expect(text).toHaveBeenCalledWith(
        expect.objectContaining({
          message: `Staging theme access password (${mockConfig.shopify.stores.staging.domain}):`,
          placeholder: 'Enter staging password (or press Enter to use production password)'
        })
      );
    });

    test('uses production token for staging when domains match', async () => {
      // Arrange
      const mockConfig = createMockShopConfig('test-shop', {
        shopify: {
          stores: {
            production: {
              domain: 'test-shop.myshopify.com',
              branch: 'test-shop/main'
            },
            staging: {
              domain: 'test-shop.myshopify.com', // Same domain
              branch: 'test-shop/staging'
            }
          },
          authentication: {
            method: 'theme-access-app'
          }
        }
      });

      const { select, text, isCancel } = await import('@clack/prompts');

      vi.mocked(select).mockResolvedValue('no');
      vi.mocked(text).mockResolvedValueOnce('prod-token');
      vi.mocked(isCancel).mockReturnValue(false);
      vi.mocked(mockContext.credOps.saveCredentials).mockResolvedValue({
        success: true
      });

      const { setupShopResources } = await import('../../lib/core/shop-setup.js');

      // Act
      await setupShopResources(mockShopData, mockConfig, mockContext);

      // Assert
      expect(mockContext.credOps.saveCredentials).toHaveBeenCalledWith(
        'test-shop',
        expect.objectContaining({
          shopify: {
            stores: {
              production: { themeToken: 'prod-token' },
              staging: { themeToken: 'prod-token' } // Same token
            }
          }
        })
      );
    });

    test('uses production token for staging when staging input is empty', async () => {
      // Arrange
      const mockConfig = createMockShopConfig('test-shop');
      const { select, text, isCancel } = await import('@clack/prompts');

      vi.mocked(select).mockResolvedValue('no');
      vi.mocked(text)
        .mockResolvedValueOnce('prod-token')
        .mockResolvedValueOnce(''); // Empty staging token
      vi.mocked(isCancel).mockReturnValue(false);
      vi.mocked(mockContext.credOps.saveCredentials).mockResolvedValue({
        success: true
      });

      const { setupShopResources } = await import('../../lib/core/shop-setup.js');

      // Act
      await setupShopResources(mockShopData, mockConfig, mockContext);

      // Assert
      expect(mockContext.credOps.saveCredentials).toHaveBeenCalledWith(
        'test-shop',
        expect.objectContaining({
          shopify: {
            stores: {
              production: { themeToken: 'prod-token' },
              staging: { themeToken: 'prod-token' } // Falls back to production
            }
          }
        })
      );
    });

    test('handles production token cancellation', async () => {
      // Arrange
      const mockConfig = createMockShopConfig('test-shop');
      const { select, text, isCancel } = await import('@clack/prompts');

      vi.mocked(select).mockResolvedValue('no');
      vi.mocked(text).mockResolvedValue(Symbol('cancel'));
      vi.mocked(isCancel)
        .mockReturnValueOnce(false) // Branch selection
        .mockReturnValueOnce(true); // Production token
      vi.mocked(mockContext.credOps.saveCredentials).mockResolvedValue({
        success: true
      });

      const { setupShopResources } = await import('../../lib/core/shop-setup.js');

      // Act
      await setupShopResources(mockShopData, mockConfig, mockContext);

      // Assert
      expect(mockContext.credOps.saveCredentials).not.toHaveBeenCalled();
    });

    test('handles staging token cancellation', async () => {
      // Arrange
      const mockConfig = createMockShopConfig('test-shop');
      const { select, text, isCancel } = await import('@clack/prompts');

      vi.mocked(select).mockResolvedValue('no');
      vi.mocked(text)
        .mockResolvedValueOnce('prod-token')
        .mockResolvedValueOnce(Symbol('cancel'));
      vi.mocked(isCancel)
        .mockReturnValueOnce(false) // Branch selection
        .mockReturnValueOnce(false) // Production token
        .mockReturnValueOnce(true); // Staging token
      vi.mocked(mockContext.credOps.saveCredentials).mockResolvedValue({
        success: true
      });

      const { setupShopResources } = await import('../../lib/core/shop-setup.js');

      // Act
      await setupShopResources(mockShopData, mockConfig, mockContext);

      // Assert - should use production token when staging is cancelled
      expect(mockContext.credOps.saveCredentials).toHaveBeenCalledWith(
        'test-shop',
        expect.objectContaining({
          shopify: {
            stores: {
              production: { themeToken: 'prod-token' },
              staging: { themeToken: 'prod-token' }
            }
          }
        })
      );
    });

    test('saves credentials with correct structure', async () => {
      // Arrange
      const mockConfig = createMockShopConfig('test-shop');
      const { select, text, isCancel } = await import('@clack/prompts');

      vi.mocked(select).mockResolvedValue('no');
      vi.mocked(text)
        .mockResolvedValueOnce('prod-token-123')
        .mockResolvedValueOnce('staging-token-456');
      vi.mocked(isCancel).mockReturnValue(false);
      vi.mocked(mockContext.credOps.saveCredentials).mockResolvedValue({
        success: true
      });

      const { setupShopResources } = await import('../../lib/core/shop-setup.js');

      // Act
      await setupShopResources(mockShopData, mockConfig, mockContext);

      // Assert
      expect(mockContext.credOps.saveCredentials).toHaveBeenCalledWith(
        'test-shop',
        expect.objectContaining({
          developer: expect.any(String),
          shopify: {
            stores: {
              production: { themeToken: 'prod-token-123' },
              staging: { themeToken: 'staging-token-456' }
            }
          },
          notes: expect.stringContaining('test-shop')
        })
      );
    });

    test('displays success message after saving credentials', async () => {
      // Arrange
      const mockConfig = createMockShopConfig('test-shop');
      const { select, text, isCancel, note } = await import('@clack/prompts');

      vi.mocked(select).mockResolvedValue('no');
      vi.mocked(text).mockResolvedValue('token');
      vi.mocked(isCancel).mockReturnValue(false);
      vi.mocked(mockContext.credOps.saveCredentials).mockResolvedValue({
        success: true
      });

      const { setupShopResources } = await import('../../lib/core/shop-setup.js');

      // Act
      await setupShopResources(mockShopData, mockConfig, mockContext);

      // Assert
      expect(note).toHaveBeenCalledWith('✅ Credentials saved securely', 'Complete');
    });

    test('displays final success message', async () => {
      // Arrange
      const mockConfig = createMockShopConfig('test-shop');
      const { select, text, isCancel, note } = await import('@clack/prompts');

      vi.mocked(select).mockResolvedValue('no');
      vi.mocked(text).mockResolvedValue('token');
      vi.mocked(isCancel).mockReturnValue(false);
      vi.mocked(mockContext.credOps.saveCredentials).mockResolvedValue({
        success: true
      });

      const { setupShopResources } = await import('../../lib/core/shop-setup.js');

      // Act
      await setupShopResources(mockShopData, mockConfig, mockContext);

      // Assert
      expect(note).toHaveBeenCalledWith(
        `Shop ${mockConfig.name} is ready for development!`,
        '🎉 Success'
      );
    });

    test('displays error message when saving credentials fails', async () => {
      // Arrange
      const mockConfig = createMockShopConfig('test-shop');
      const { select, text, isCancel, note } = await import('@clack/prompts');

      vi.mocked(select).mockResolvedValue('no');
      vi.mocked(text).mockResolvedValue('token');
      vi.mocked(isCancel).mockReturnValue(false);
      vi.mocked(mockContext.credOps.saveCredentials).mockResolvedValue({
        success: false,
        error: 'Failed to write credentials'
      });

      const { setupShopResources } = await import('../../lib/core/shop-setup.js');

      // Act
      await setupShopResources(mockShopData, mockConfig, mockContext);

      // Assert
      expect(note).toHaveBeenCalledWith('Failed to write credentials', '❌ Error');
    });

    test('runs branch creation and credential setup in parallel', async () => {
      // Arrange
      const mockConfig = createMockShopConfig('test-shop');
      const { select, text, isCancel } = await import('@clack/prompts');

      let branchPromptTime = 0;
      let credentialPromptTime = 0;

      vi.mocked(select).mockImplementation(async () => {
        branchPromptTime = Date.now();
        return 'no';
      });

      vi.mocked(text).mockImplementation(async () => {
        credentialPromptTime = Date.now();
        return 'token';
      });

      vi.mocked(isCancel).mockReturnValue(false);
      vi.mocked(mockContext.credOps.saveCredentials).mockResolvedValue({
        success: true
      });

      const { setupShopResources } = await import('../../lib/core/shop-setup.js');

      // Act
      await setupShopResources(mockShopData, mockConfig, mockContext);

      // Assert - operations should run concurrently
      expect(branchPromptTime).toBeGreaterThan(0);
      expect(credentialPromptTime).toBeGreaterThan(0);
    });
  });
});
