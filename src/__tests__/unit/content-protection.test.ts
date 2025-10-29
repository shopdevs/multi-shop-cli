import { describe, test, expect, vi, beforeEach } from 'vitest';
import type { CLIContext } from '../../lib/core/types.js';
import type { ShopConfig } from '../../types/shop.js';

// Mock @clack/prompts
vi.mock('@clack/prompts', () => ({
  select: vi.fn(),
  confirm: vi.fn(),
  isCancel: vi.fn(),
  note: vi.fn()
}));

describe('content-protection', () => {
  let mockContext: CLIContext;
  let mockShopConfig: ShopConfig;

  beforeEach(() => {
    mockShopConfig = {
      shopId: 'shop-a',
      name: 'Shop A',
      shopify: {
        stores: {
          production: { domain: 'shop-a.myshopify.com', branch: 'shop-a/main' },
          staging: { domain: 'staging-shop-a.myshopify.com', branch: 'shop-a/staging' }
        },
        authentication: { method: 'theme-access-app' }
      }
    };

    mockContext = {
      deps: {
        cwd: '/test/project',
        shopsDir: '/test/project/shops',
        credentialsDir: '/test/project/shops/credentials'
      },
      shopOps: {
        loadConfig: vi.fn().mockResolvedValue({ success: true, data: mockShopConfig }),
        saveConfig: vi.fn().mockResolvedValue({ success: true }),
        listShops: vi.fn().mockResolvedValue({ success: true, data: ['shop-a', 'shop-b'] }),
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

  describe('handleContentProtection', () => {
    test('shows protection menu with all options', async () => {
      // Arrange
      const { select, isCancel } = await import('@clack/prompts');
      vi.mocked(select).mockResolvedValue(Symbol('cancel'));
      vi.mocked(isCancel).mockReturnValue(true);

      const { handleContentProtection } = await import('../../lib/core/content-protection.js');

      // Act
      await handleContentProtection(mockContext);

      // Assert
      expect(select).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Content Protection:",
          options: expect.arrayContaining([
            expect.objectContaining({ value: "status", label: "Show Protection Status" }),
            expect.objectContaining({ value: "configure", label: "Configure Shop Protection" }),
            expect.objectContaining({ value: "enable-all", label: "Enable All Shops" }),
            expect.objectContaining({ value: "disable-all", label: "Disable All Shops" }),
            expect.objectContaining({ value: "global", label: "Global Settings" })
          ])
        })
      );
    });
  });

  describe('Show Protection Status', () => {
    test('displays protection status for all shops', async () => {
      // Arrange
      const { select, isCancel } = await import('@clack/prompts');
      vi.mocked(select).mockResolvedValue('status');
      vi.mocked(isCancel).mockReturnValue(false);

      // Mock shop with protection enabled
      vi.mocked(mockContext.shopOps.loadConfig).mockResolvedValue({
        success: true,
        data: {
          ...mockShopConfig,
          contentProtection: {
            enabled: true,
            mode: 'strict',
            verbosity: 'verbose'
          }
        }
      });

      const { handleContentProtection } = await import('../../lib/core/content-protection.js');

      // Act
      const result = await handleContentProtection(mockContext);

      // Assert
      expect(result.success).toBe(true);
      expect(mockContext.shopOps.listShops).toHaveBeenCalled();
      expect(mockContext.shopOps.loadConfig).toHaveBeenCalled();
    });

    test('handles shops with no protection configured', async () => {
      // Arrange
      const { select, isCancel } = await import('@clack/prompts');
      vi.mocked(select).mockResolvedValue('status');
      vi.mocked(isCancel).mockReturnValue(false);

      // Shop without contentProtection field
      vi.mocked(mockContext.shopOps.loadConfig).mockResolvedValue({
        success: true,
        data: mockShopConfig // No contentProtection
      });

      const { handleContentProtection } = await import('../../lib/core/content-protection.js');

      // Act
      const result = await handleContentProtection(mockContext);

      // Assert
      expect(result.success).toBe(true);
    });
  });

  describe('Configure Shop Protection', () => {
    test('enables protection for a shop', async () => {
      // Arrange
      const { select, isCancel } = await import('@clack/prompts');
      vi.mocked(select)
        .mockResolvedValueOnce('configure')  // Menu choice
        .mockResolvedValueOnce('shop-a')     // Shop selection
        .mockResolvedValueOnce(true)         // Enable
        .mockResolvedValueOnce('strict')     // Mode
        .mockResolvedValueOnce('verbose');   // Verbosity

      vi.mocked(isCancel).mockReturnValue(false);

      const { handleContentProtection } = await import('../../lib/core/content-protection.js');

      // Act
      const result = await handleContentProtection(mockContext);

      // Assert
      expect(result.success).toBe(true);
      expect(mockContext.shopOps.saveConfig).toHaveBeenCalledWith(
        'shop-a',
        expect.objectContaining({
          contentProtection: {
            enabled: true,
            mode: 'strict',
            verbosity: 'verbose'
          }
        })
      );
    });

    test('disables protection for a shop', async () => {
      // Arrange
      const { select, isCancel } = await import('@clack/prompts');
      vi.mocked(select)
        .mockResolvedValueOnce('configure')
        .mockResolvedValueOnce('shop-a')
        .mockResolvedValueOnce(false);  // Disable

      vi.mocked(isCancel).mockReturnValue(false);

      const { handleContentProtection } = await import('../../lib/core/content-protection.js');

      // Act
      const result = await handleContentProtection(mockContext);

      // Assert
      expect(result.success).toBe(true);
      expect(mockContext.shopOps.saveConfig).toHaveBeenCalledWith(
        'shop-a',
        expect.objectContaining({
          contentProtection: {
            enabled: false,
            mode: 'off',
            verbosity: 'verbose'
          }
        })
      );
    });
  });

  describe('Enable/Disable All Shops', () => {
    test('enables protection for all shops', async () => {
      // Arrange
      const { select, confirm, isCancel } = await import('@clack/prompts');
      vi.mocked(select).mockResolvedValue('enable-all');
      vi.mocked(confirm).mockResolvedValue(true);
      vi.mocked(isCancel).mockReturnValue(false);

      const { handleContentProtection } = await import('../../lib/core/content-protection.js');

      // Act
      const result = await handleContentProtection(mockContext);

      // Assert
      expect(result.success).toBe(true);
      expect(mockContext.shopOps.saveConfig).toHaveBeenCalledTimes(2); // 2 shops
    });

    test('requires confirmation before enabling all', async () => {
      // Arrange
      const { select, confirm, isCancel } = await import('@clack/prompts');
      vi.mocked(select).mockResolvedValue('enable-all');
      vi.mocked(confirm).mockResolvedValue(false); // Decline
      vi.mocked(isCancel).mockReturnValue(false);

      const { handleContentProtection } = await import('../../lib/core/content-protection.js');

      // Act
      const result = await handleContentProtection(mockContext);

      // Assert
      expect(result.success).toBe(false);
      expect(mockContext.shopOps.saveConfig).not.toHaveBeenCalled();
    });
  });
});
