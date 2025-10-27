/**
 * Unit tests for theme-linking module
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import type { CLIContext } from '../../lib/core/types.js';
import { createMockShopConfig, createMockCredentials } from '../helpers.js';

// Mock @clack/prompts
vi.mock('@clack/prompts', () => ({
  select: vi.fn(),
  isCancel: vi.fn(),
  note: vi.fn()
}));

describe('theme-linking', () => {
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

  describe('linkThemes', () => {
    test('displays message when no shops exist', async () => {
      // Arrange
      vi.mocked(mockContext.shopOps.listShops).mockResolvedValue({
        success: true,
        data: []
      });

      const { note } = await import('@clack/prompts');
      const { linkThemes } = await import('../../lib/core/theme-linking.js');

      // Act
      const result = await linkThemes(mockContext);

      // Assert
      expect(result.success).toBe(true);
      expect(note).toHaveBeenCalledWith(
        'No shops configured yet. Create shops first.',
        '🔗 Link Themes'
      );
    });

    test('displays message when listShops fails', async () => {
      // Arrange
      vi.mocked(mockContext.shopOps.listShops).mockResolvedValue({
        success: false,
        error: 'Failed to list shops'
      });

      const { note } = await import('@clack/prompts');
      const { linkThemes } = await import('../../lib/core/theme-linking.js');

      // Act
      const result = await linkThemes(mockContext);

      // Assert
      expect(result.success).toBe(true);
      expect(note).toHaveBeenCalledWith(
        'No shops configured yet. Create shops first.',
        '🔗 Link Themes'
      );
    });

    test('displays shop selection options', async () => {
      // Arrange
      vi.mocked(mockContext.shopOps.listShops).mockResolvedValue({
        success: true,
        data: ['shop-a', 'shop-b', 'shop-c']
      });

      const { select, isCancel } = await import('@clack/prompts');
      vi.mocked(select).mockResolvedValue(Symbol('cancel'));
      vi.mocked(isCancel).mockReturnValue(true);

      const { linkThemes } = await import('../../lib/core/theme-linking.js');

      // Act
      await linkThemes(mockContext);

      // Assert
      expect(select).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Select shop to link themes:',
          options: [
            { value: 'shop-a', label: 'shop-a', hint: 'Set up theme linking for shop-a' },
            { value: 'shop-b', label: 'shop-b', hint: 'Set up theme linking for shop-b' },
            { value: 'shop-c', label: 'shop-c', hint: 'Set up theme linking for shop-c' }
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

      const { linkThemes } = await import('../../lib/core/theme-linking.js');

      // Act
      const result = await linkThemes(mockContext);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('No shop selected');
    });

    test('loads shop config after selection', async () => {
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

      const { select, isCancel } = await import('@clack/prompts');
      vi.mocked(select).mockResolvedValue('shop-a');
      vi.mocked(isCancel).mockReturnValue(false);

      const { linkThemes } = await import('../../lib/core/theme-linking.js');

      // Act
      await linkThemes(mockContext);

      // Assert
      expect(mockContext.shopOps.loadConfig).toHaveBeenCalledWith('shop-a');
    });

    test('returns error when config load fails', async () => {
      // Arrange
      vi.mocked(mockContext.shopOps.listShops).mockResolvedValue({
        success: true,
        data: ['shop-a']
      });
      vi.mocked(mockContext.shopOps.loadConfig).mockResolvedValue({
        success: false,
        error: 'Config file not found'
      });

      const { select, isCancel } = await import('@clack/prompts');
      vi.mocked(select).mockResolvedValue('shop-a');
      vi.mocked(isCancel).mockReturnValue(false);

      const { linkThemes } = await import('../../lib/core/theme-linking.js');

      // Act
      const result = await linkThemes(mockContext);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Config file not found');
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
      vi.mocked(mockContext.credOps.loadCredentials).mockResolvedValue({
        success: true,
        data: createMockCredentials('shop-a')
      });

      const { select, isCancel } = await import('@clack/prompts');
      vi.mocked(select).mockResolvedValue('shop-a');
      vi.mocked(isCancel).mockReturnValue(false);

      const { linkThemes } = await import('../../lib/core/theme-linking.js');

      // Act
      const result = await linkThemes(mockContext);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Config data is missing');
    });

    test('checks for credentials', async () => {
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
        data: createMockCredentials('shop-a')
      });

      const { select, isCancel } = await import('@clack/prompts');
      vi.mocked(select).mockResolvedValue('shop-a');
      vi.mocked(isCancel).mockReturnValue(false);

      const { linkThemes } = await import('../../lib/core/theme-linking.js');

      // Act
      await linkThemes(mockContext);

      // Assert
      expect(mockContext.credOps.loadCredentials).toHaveBeenCalledWith('shop-a');
    });

    test('displays message when credentials are missing', async () => {
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
        success: false,
        error: 'Credentials not found'
      });

      const { select, isCancel, note } = await import('@clack/prompts');
      vi.mocked(select).mockResolvedValue('shop-a');
      vi.mocked(isCancel).mockReturnValue(false);

      const { linkThemes } = await import('../../lib/core/theme-linking.js');

      // Act
      const result = await linkThemes(mockContext);

      // Assert
      expect(result.success).toBe(true);
      expect(note).toHaveBeenCalledWith(
        'Set up credentials first using \'Edit Shop\'',
        '⚠️ Credentials Required'
      );
    });

    test('displays message when credential data is null', async () => {
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

      const { select, isCancel, note } = await import('@clack/prompts');
      vi.mocked(select).mockResolvedValue('shop-a');
      vi.mocked(isCancel).mockReturnValue(false);

      const { linkThemes } = await import('../../lib/core/theme-linking.js');

      // Act
      const result = await linkThemes(mockContext);

      // Assert
      expect(result.success).toBe(true);
      expect(note).toHaveBeenCalledWith(
        'Set up credentials first using \'Edit Shop\'',
        '⚠️ Credentials Required'
      );
    });

    test('displays setup message with shop name', async () => {
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

      const { select, isCancel, note } = await import('@clack/prompts');
      vi.mocked(select).mockResolvedValue('shop-a');
      vi.mocked(isCancel).mockReturnValue(false);

      const { linkThemes } = await import('../../lib/core/theme-linking.js');

      // Act
      await linkThemes(mockContext);

      // Assert
      expect(note).toHaveBeenCalledWith(
        `Setting up themes for ${mockConfig.name}`,
        '🎨 shop-a'
      );
    });

    test('returns success after displaying instructions', async () => {
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

      const { select, isCancel } = await import('@clack/prompts');
      vi.mocked(select).mockResolvedValue('shop-a');
      vi.mocked(isCancel).mockReturnValue(false);

      const { linkThemes } = await import('../../lib/core/theme-linking.js');

      // Act
      const result = await linkThemes(mockContext);

      // Assert
      expect(result.success).toBe(true);
    });

    test('works with multiple shops', async () => {
      // Arrange
      vi.mocked(mockContext.shopOps.listShops).mockResolvedValue({
        success: true,
        data: ['shop-a', 'shop-b', 'shop-c', 'shop-d']
      });

      const { select, isCancel } = await import('@clack/prompts');
      vi.mocked(select).mockResolvedValue(Symbol('cancel'));
      vi.mocked(isCancel).mockReturnValue(true);

      const { linkThemes } = await import('../../lib/core/theme-linking.js');

      // Act
      await linkThemes(mockContext);

      // Assert
      expect(select).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.arrayContaining([
            expect.objectContaining({ value: 'shop-a' }),
            expect.objectContaining({ value: 'shop-b' }),
            expect.objectContaining({ value: 'shop-c' }),
            expect.objectContaining({ value: 'shop-d' })
          ])
        })
      );
    });

    test('handles shop with custom branch names', async () => {
      // Arrange
      const mockConfig = createMockShopConfig('shop-a', {
        shopify: {
          stores: {
            production: {
              domain: 'shop-a.myshopify.com',
              branch: 'custom-prod-branch'
            },
            staging: {
              domain: 'staging-shop-a.myshopify.com',
              branch: 'custom-staging-branch'
            }
          },
          authentication: {
            method: 'theme-access-app'
          }
        }
      });
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

      const { select, isCancel } = await import('@clack/prompts');
      vi.mocked(select).mockResolvedValue('shop-a');
      vi.mocked(isCancel).mockReturnValue(false);

      const { linkThemes } = await import('../../lib/core/theme-linking.js');

      // Act
      const result = await linkThemes(mockContext);

      // Assert
      expect(result.success).toBe(true);
      expect(mockContext.shopOps.loadConfig).toHaveBeenCalledWith('shop-a');
    });

    test('handles shop with same production and staging domains', async () => {
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

      const { select, isCancel } = await import('@clack/prompts');
      vi.mocked(select).mockResolvedValue('shop-a');
      vi.mocked(isCancel).mockReturnValue(false);

      const { linkThemes } = await import('../../lib/core/theme-linking.js');

      // Act
      const result = await linkThemes(mockContext);

      // Assert
      expect(result.success).toBe(true);
    });

    test('loads config and credentials in sequence', async () => {
      // Arrange
      const mockConfig = createMockShopConfig('shop-a');
      const mockCreds = createMockCredentials('shop-a');
      const loadOrder: string[] = [];

      vi.mocked(mockContext.shopOps.listShops).mockResolvedValue({
        success: true,
        data: ['shop-a']
      });
      vi.mocked(mockContext.shopOps.loadConfig).mockImplementation(async () => {
        loadOrder.push('config');
        return { success: true, data: mockConfig };
      });
      vi.mocked(mockContext.credOps.loadCredentials).mockImplementation(async () => {
        loadOrder.push('credentials');
        return { success: true, data: mockCreds };
      });

      const { select, isCancel } = await import('@clack/prompts');
      vi.mocked(select).mockResolvedValue('shop-a');
      vi.mocked(isCancel).mockReturnValue(false);

      const { linkThemes } = await import('../../lib/core/theme-linking.js');

      // Act
      await linkThemes(mockContext);

      // Assert
      expect(loadOrder).toEqual(['config', 'credentials']);
    });

    test('handles single shop gracefully', async () => {
      // Arrange
      const mockConfig = createMockShopConfig('only-shop');
      const mockCreds = createMockCredentials('only-shop');

      vi.mocked(mockContext.shopOps.listShops).mockResolvedValue({
        success: true,
        data: ['only-shop']
      });
      vi.mocked(mockContext.shopOps.loadConfig).mockResolvedValue({
        success: true,
        data: mockConfig
      });
      vi.mocked(mockContext.credOps.loadCredentials).mockResolvedValue({
        success: true,
        data: mockCreds
      });

      const { select, isCancel } = await import('@clack/prompts');
      vi.mocked(select).mockResolvedValue('only-shop');
      vi.mocked(isCancel).mockReturnValue(false);

      const { linkThemes } = await import('../../lib/core/theme-linking.js');

      // Act
      const result = await linkThemes(mockContext);

      // Assert
      expect(result.success).toBe(true);
      expect(select).toHaveBeenCalledWith(
        expect.objectContaining({
          options: [
            { value: 'only-shop', label: 'only-shop', hint: 'Set up theme linking for only-shop' }
          ]
        })
      );
    });
  });
});
