/**
 * Unit tests for shop-editing module
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import type { CLIContext, Result } from '../../lib/core/types.js';
import type { ShopCredentials } from '../../types/shop.js';
import { createMockShopConfig, createMockCredentials } from '../helpers.js';

// Mock @clack/prompts
vi.mock('@clack/prompts', () => ({
  select: vi.fn(),
  text: vi.fn(),
  isCancel: vi.fn(),
  note: vi.fn()
}));

describe('shop-editing', () => {
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

  describe('editShop', () => {
    test('displays message when no shops exist', async () => {
      // Arrange
      vi.mocked(mockContext.shopOps.listShops).mockResolvedValue({
        success: true,
        data: []
      });

      const { note } = await import('@clack/prompts');
      const { editShop } = await import('../../lib/core/shop-editing.js');

      // Act
      const result = await editShop(mockContext);

      // Assert
      expect(result.success).toBe(true);
      expect(note).toHaveBeenCalledWith('No shops to edit. Create a shop first.', '📝 Edit Shop');
    });

    test('displays message when listShops fails', async () => {
      // Arrange
      vi.mocked(mockContext.shopOps.listShops).mockResolvedValue({
        success: false,
        error: 'Failed to list shops'
      });

      const { note } = await import('@clack/prompts');
      const { editShop } = await import('../../lib/core/shop-editing.js');

      // Act
      const result = await editShop(mockContext);

      // Assert
      expect(result.success).toBe(true);
      expect(note).toHaveBeenCalledWith('No shops to edit. Create a shop first.', '📝 Edit Shop');
    });

    test('allows user to select shop', async () => {
      // Arrange
      vi.mocked(mockContext.shopOps.listShops).mockResolvedValue({
        success: true,
        data: ['shop-a', 'shop-b']
      });

      const { select, isCancel } = await import('@clack/prompts');
      vi.mocked(select).mockResolvedValue('shop-a');
      vi.mocked(isCancel)
        .mockReturnValueOnce(false) // Shop selection
        .mockReturnValueOnce(true); // Action selection (cancel)

      const { editShop } = await import('../../lib/core/shop-editing.js');

      // Act
      await editShop(mockContext);

      // Assert
      expect(select).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Select shop to edit:',
          options: [
            { value: 'shop-a', label: 'shop-a' },
            { value: 'shop-b', label: 'shop-b' }
          ]
        })
      );
    });

    test('returns error when shop selection is cancelled', async () => {
      // Arrange
      vi.mocked(mockContext.shopOps.listShops).mockResolvedValue({
        success: true,
        data: ['shop-a']
      });

      const { select, isCancel } = await import('@clack/prompts');
      vi.mocked(select).mockResolvedValue(Symbol('cancel'));
      vi.mocked(isCancel).mockReturnValue(true);

      const { editShop } = await import('../../lib/core/shop-editing.js');

      // Act
      const result = await editShop(mockContext);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('No shop selected');
    });

    test('displays edit action options', async () => {
      // Arrange
      vi.mocked(mockContext.shopOps.listShops).mockResolvedValue({
        success: true,
        data: ['shop-a']
      });

      const { select, isCancel } = await import('@clack/prompts');
      vi.mocked(select)
        .mockResolvedValueOnce('shop-a') // Shop selection
        .mockResolvedValueOnce(Symbol('cancel')); // Action selection
      vi.mocked(isCancel)
        .mockReturnValueOnce(false) // Shop selection
        .mockReturnValueOnce(true); // Action selection

      const { editShop } = await import('../../lib/core/shop-editing.js');

      // Act
      await editShop(mockContext);

      // Assert
      expect(select).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'What would you like to edit?',
          options: [
            { value: 'delete', label: 'Delete Shop', hint: 'Remove completely' },
            { value: 'credentials', label: 'Edit Credentials', hint: 'Update theme access passwords' }
          ]
        })
      );
    });

    test('returns error when action selection is cancelled', async () => {
      // Arrange
      vi.mocked(mockContext.shopOps.listShops).mockResolvedValue({
        success: true,
        data: ['shop-a']
      });

      const { select, isCancel } = await import('@clack/prompts');
      vi.mocked(select)
        .mockResolvedValueOnce('shop-a') // Shop selection
        .mockResolvedValueOnce(Symbol('cancel')); // Action selection
      vi.mocked(isCancel)
        .mockReturnValueOnce(false) // Shop selection
        .mockReturnValueOnce(true); // Action selection

      const { editShop } = await import('../../lib/core/shop-editing.js');

      // Act
      const result = await editShop(mockContext);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('No action selected');
    });

    test('handles delete shop action', async () => {
      // Arrange
      vi.mocked(mockContext.shopOps.listShops).mockResolvedValue({
        success: true,
        data: ['shop-a']
      });
      vi.mocked(mockContext.shopOps.deleteShop).mockResolvedValue({
        success: true
      });

      const { select, isCancel } = await import('@clack/prompts');
      vi.mocked(select)
        .mockResolvedValueOnce('shop-a') // Shop selection
        .mockResolvedValueOnce('delete') // Action selection
        .mockResolvedValueOnce('yes'); // Delete confirmation
      vi.mocked(isCancel).mockReturnValue(false);

      const { editShop } = await import('../../lib/core/shop-editing.js');

      // Act
      const result = await editShop(mockContext);

      // Assert
      expect(result.success).toBe(true);
      expect(mockContext.shopOps.deleteShop).toHaveBeenCalledWith('shop-a');
    });

    test('cancels delete when user selects no', async () => {
      // Arrange
      vi.mocked(mockContext.shopOps.listShops).mockResolvedValue({
        success: true,
        data: ['shop-a']
      });

      const { select, isCancel } = await import('@clack/prompts');
      vi.mocked(select)
        .mockResolvedValueOnce('shop-a') // Shop selection
        .mockResolvedValueOnce('delete') // Action selection
        .mockResolvedValueOnce('no'); // Delete confirmation
      vi.mocked(isCancel).mockReturnValue(false);

      const { editShop } = await import('../../lib/core/shop-editing.js');

      // Act
      const result = await editShop(mockContext);

      // Assert
      expect(result.success).toBe(true);
      expect(mockContext.shopOps.deleteShop).not.toHaveBeenCalled();
    });

    test('cancels delete when confirmation is cancelled', async () => {
      // Arrange
      vi.mocked(mockContext.shopOps.listShops).mockResolvedValue({
        success: true,
        data: ['shop-a']
      });

      const { select, isCancel } = await import('@clack/prompts');
      vi.mocked(select)
        .mockResolvedValueOnce('shop-a') // Shop selection
        .mockResolvedValueOnce('delete') // Action selection
        .mockResolvedValueOnce(Symbol('cancel')); // Delete confirmation
      vi.mocked(isCancel)
        .mockReturnValueOnce(false) // Shop selection
        .mockReturnValueOnce(false) // Action selection
        .mockReturnValueOnce(true); // Delete confirmation

      const { editShop } = await import('../../lib/core/shop-editing.js');

      // Act
      const result = await editShop(mockContext);

      // Assert
      expect(result.success).toBe(true);
      expect(mockContext.shopOps.deleteShop).not.toHaveBeenCalled();
    });

    test('displays success message after deletion', async () => {
      // Arrange
      vi.mocked(mockContext.shopOps.listShops).mockResolvedValue({
        success: true,
        data: ['shop-a']
      });
      vi.mocked(mockContext.shopOps.deleteShop).mockResolvedValue({
        success: true
      });

      const { select, isCancel, note } = await import('@clack/prompts');
      vi.mocked(select)
        .mockResolvedValueOnce('shop-a')
        .mockResolvedValueOnce('delete')
        .mockResolvedValueOnce('yes');
      vi.mocked(isCancel).mockReturnValue(false);

      const { editShop } = await import('../../lib/core/shop-editing.js');

      // Act
      await editShop(mockContext);

      // Assert
      expect(note).toHaveBeenCalledWith('✅ Shop "shop-a" deleted', 'Deleted');
    });

    test('displays error message when deletion fails', async () => {
      // Arrange
      vi.mocked(mockContext.shopOps.listShops).mockResolvedValue({
        success: true,
        data: ['shop-a']
      });
      vi.mocked(mockContext.shopOps.deleteShop).mockResolvedValue({
        success: false,
        error: 'Failed to delete files'
      });

      const { select, isCancel, note } = await import('@clack/prompts');
      vi.mocked(select)
        .mockResolvedValueOnce('shop-a')
        .mockResolvedValueOnce('delete')
        .mockResolvedValueOnce('yes');
      vi.mocked(isCancel).mockReturnValue(false);

      const { editShop } = await import('../../lib/core/shop-editing.js');

      // Act
      await editShop(mockContext);

      // Assert
      expect(note).toHaveBeenCalledWith('Failed to delete files', '❌ Error');
    });

    test('handles edit credentials action', async () => {
      // Arrange
      const mockConfig = createMockShopConfig('shop-a');
      const mockCreds = createMockCredentials('shop-a');

      vi.mocked(mockContext.shopOps.listShops).mockResolvedValue({
        success: true,
        data: ['shop-a']
      });
      vi.mocked(mockContext.shopOps.loadConfig).mockResolvedValue({
        success: true,
        data: mockConfig
      });
      vi.mocked(mockContext.credOps.loadCredentials).mockResolvedValue({
        success: true,
        data: mockCreds
      });
      vi.mocked(mockContext.credOps.saveCredentials).mockResolvedValue({
        success: true
      });

      const { select, isCancel, text } = await import('@clack/prompts');
      vi.mocked(select)
        .mockResolvedValueOnce('shop-a') // Shop selection
        .mockResolvedValueOnce('credentials'); // Action selection
      vi.mocked(text)
        .mockResolvedValueOnce('new-prod-token') // Production token
        .mockResolvedValueOnce('new-staging-token'); // Staging token
      vi.mocked(isCancel).mockReturnValue(false);

      const { editShop } = await import('../../lib/core/shop-editing.js');

      // Act
      const result = await editShop(mockContext);

      // Assert
      expect(result.success).toBe(true);
      expect(mockContext.credOps.saveCredentials).toHaveBeenCalledWith(
        'shop-a',
        expect.objectContaining({
          shopify: {
            stores: {
              production: { themeToken: 'new-prod-token' },
              staging: { themeToken: 'new-staging-token' }
            }
          }
        })
      );
    });

    test('returns error when config load fails during credential edit', async () => {
      // Arrange
      vi.mocked(mockContext.shopOps.listShops).mockResolvedValue({
        success: true,
        data: ['shop-a']
      });
      vi.mocked(mockContext.shopOps.loadConfig).mockResolvedValue({
        success: false,
        error: 'Config not found'
      });

      const { select, isCancel } = await import('@clack/prompts');
      vi.mocked(select)
        .mockResolvedValueOnce('shop-a')
        .mockResolvedValueOnce('credentials');
      vi.mocked(isCancel).mockReturnValue(false);

      const { editShop } = await import('../../lib/core/shop-editing.js');

      // Act
      const result = await editShop(mockContext);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Config not found');
    });

    test('returns error when config data is missing', async () => {
      // Arrange
      vi.mocked(mockContext.shopOps.listShops).mockResolvedValue({
        success: true,
        data: ['shop-a']
      });
      vi.mocked(mockContext.shopOps.loadConfig).mockResolvedValue({
        success: true,
        data: undefined
      });

      const { select, isCancel } = await import('@clack/prompts');
      vi.mocked(select)
        .mockResolvedValueOnce('shop-a')
        .mockResolvedValueOnce('credentials');
      vi.mocked(isCancel).mockReturnValue(false);

      const { editShop } = await import('../../lib/core/shop-editing.js');

      // Act
      const result = await editShop(mockContext);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Config data is missing');
    });

    test('uses production token for staging when domains match', async () => {
      // Arrange
      const mockConfig = createMockShopConfig('shop-a', {
        shopify: {
          stores: {
            production: {
              domain: 'shop-a.myshopify.com',
              branch: 'shop-a/main'
            },
            staging: {
              domain: 'shop-a.myshopify.com', // Same domain
              branch: 'shop-a/staging'
            }
          },
          authentication: {
            method: 'theme-access-app'
          }
        }
      });

      vi.mocked(mockContext.shopOps.listShops).mockResolvedValue({
        success: true,
        data: ['shop-a']
      });
      vi.mocked(mockContext.shopOps.loadConfig).mockResolvedValue({
        success: true,
        data: mockConfig
      });
      vi.mocked(mockContext.credOps.loadCredentials).mockResolvedValue({
        success: true,
        data: null
      });
      vi.mocked(mockContext.credOps.saveCredentials).mockResolvedValue({
        success: true
      });

      const { select, isCancel, text } = await import('@clack/prompts');
      vi.mocked(select)
        .mockResolvedValueOnce('shop-a')
        .mockResolvedValueOnce('credentials');
      vi.mocked(text).mockResolvedValueOnce('prod-token');
      vi.mocked(isCancel).mockReturnValue(false);

      const { editShop } = await import('../../lib/core/shop-editing.js');

      // Act
      await editShop(mockContext);

      // Assert
      expect(mockContext.credOps.saveCredentials).toHaveBeenCalledWith(
        'shop-a',
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

    test('validates production token input', async () => {
      // Arrange
      const mockConfig = createMockShopConfig('shop-a');

      vi.mocked(mockContext.shopOps.listShops).mockResolvedValue({
        success: true,
        data: ['shop-a']
      });
      vi.mocked(mockContext.shopOps.loadConfig).mockResolvedValue({
        success: true,
        data: mockConfig
      });
      vi.mocked(mockContext.credOps.loadCredentials).mockResolvedValue({
        success: true,
        data: null
      });

      const { select, isCancel, text } = await import('@clack/prompts');
      vi.mocked(select)
        .mockResolvedValueOnce('shop-a')
        .mockResolvedValueOnce('credentials');
      vi.mocked(text).mockResolvedValueOnce('validtoken123');
      vi.mocked(isCancel)
        .mockReturnValueOnce(false) // Shop selection
        .mockReturnValueOnce(false) // Action selection
        .mockReturnValueOnce(true); // Production token (cancel)

      const { editShop } = await import('../../lib/core/shop-editing.js');

      // Act
      const result = await editShop(mockContext);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Credential editing cancelled');
    });

    test('returns error for unknown action', async () => {
      // Arrange
      vi.mocked(mockContext.shopOps.listShops).mockResolvedValue({
        success: true,
        data: ['shop-a']
      });

      const { select, isCancel } = await import('@clack/prompts');
      vi.mocked(select)
        .mockResolvedValueOnce('shop-a')
        .mockResolvedValueOnce('unknown-action');
      vi.mocked(isCancel).mockReturnValue(false);

      const { editShop } = await import('../../lib/core/shop-editing.js');

      // Act
      const result = await editShop(mockContext);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown action');
    });

    test('displays success message after saving credentials', async () => {
      // Arrange
      const mockConfig = createMockShopConfig('shop-a');

      vi.mocked(mockContext.shopOps.listShops).mockResolvedValue({
        success: true,
        data: ['shop-a']
      });
      vi.mocked(mockContext.shopOps.loadConfig).mockResolvedValue({
        success: true,
        data: mockConfig
      });
      vi.mocked(mockContext.credOps.loadCredentials).mockResolvedValue({
        success: true,
        data: null
      });
      vi.mocked(mockContext.credOps.saveCredentials).mockResolvedValue({
        success: true
      });

      const { select, isCancel, text, note } = await import('@clack/prompts');
      vi.mocked(select)
        .mockResolvedValueOnce('shop-a')
        .mockResolvedValueOnce('credentials');
      vi.mocked(text)
        .mockResolvedValueOnce('prod-token')
        .mockResolvedValueOnce('staging-token');
      vi.mocked(isCancel).mockReturnValue(false);

      const { editShop } = await import('../../lib/core/shop-editing.js');

      // Act
      await editShop(mockContext);

      // Assert
      expect(note).toHaveBeenCalledWith(`✅ Credentials updated for ${mockConfig.name}`, 'Complete');
    });

    test('displays error message when saving credentials fails', async () => {
      // Arrange
      const mockConfig = createMockShopConfig('shop-a');

      vi.mocked(mockContext.shopOps.listShops).mockResolvedValue({
        success: true,
        data: ['shop-a']
      });
      vi.mocked(mockContext.shopOps.loadConfig).mockResolvedValue({
        success: true,
        data: mockConfig
      });
      vi.mocked(mockContext.credOps.loadCredentials).mockResolvedValue({
        success: true,
        data: null
      });
      vi.mocked(mockContext.credOps.saveCredentials).mockResolvedValue({
        success: false,
        error: 'Failed to write credentials'
      });

      const { select, isCancel, text, note } = await import('@clack/prompts');
      vi.mocked(select)
        .mockResolvedValueOnce('shop-a')
        .mockResolvedValueOnce('credentials');
      vi.mocked(text)
        .mockResolvedValueOnce('prod-token')
        .mockResolvedValueOnce('staging-token');
      vi.mocked(isCancel).mockReturnValue(false);

      const { editShop } = await import('../../lib/core/shop-editing.js');

      // Act
      await editShop(mockContext);

      // Assert
      expect(note).toHaveBeenCalledWith('Failed to write credentials', '❌ Error');
    });
  });
});
