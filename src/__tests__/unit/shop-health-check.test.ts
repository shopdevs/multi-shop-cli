import { describe, test, expect, vi, beforeEach } from 'vitest';
import type { CLIContext } from '../../lib/core/types.js';
import type { ShopConfig } from '../../types/shop.js';

// Mock @clack/prompts
vi.mock('@clack/prompts', () => ({
  select: vi.fn(),
  isCancel: vi.fn(),
  note: vi.fn()
}));

// Mock child_process
vi.mock('child_process', () => ({
  execSync: vi.fn()
}));

describe('shop-health-check', () => {
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
        saveConfig: vi.fn(),
        listShops: vi.fn().mockResolvedValue({ success: true, data: ['shop-a', 'shop-b'] }),
        deleteShop: vi.fn()
      },
      credOps: {
        loadCredentials: vi.fn().mockResolvedValue({
          success: true,
          data: {
            developer: 'test-dev',
            shopify: {
              stores: {
                production: { themeToken: 'token1' },
                staging: { themeToken: 'token2' }
              }
            }
          }
        }),
        saveCredentials: vi.fn()
      },
      devOps: {
        startDev: vi.fn()
      }
    };

    vi.clearAllMocks();
  });

  describe('handleHealthCheck', () => {
    test('shows health check menu with options', async () => {
      // Arrange
      const { select, isCancel } = await import('@clack/prompts');
      vi.mocked(select).mockResolvedValue(Symbol('cancel'));
      vi.mocked(isCancel).mockReturnValue(true);

      const { handleHealthCheck } = await import('../../lib/core/shop-health-check.js');

      // Act
      await handleHealthCheck(mockContext);

      // Assert
      expect(select).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Health Check:",
          options: expect.arrayContaining([
            expect.objectContaining({ value: "single", label: "Check Single Shop" }),
            expect.objectContaining({ value: "all", label: "Check All Shops" })
          ])
        })
      );
    });
  });

  describe('Single Shop Health Check', () => {
    test('performs complete health check for a shop', async () => {
      // Arrange
      const { select, isCancel } = await import('@clack/prompts');
      const { execSync } = await import('child_process');

      vi.mocked(select)
        .mockResolvedValueOnce('single')  // Health check type
        .mockResolvedValueOnce('shop-a'); // Shop selection

      vi.mocked(isCancel).mockReturnValue(false);

      // Mock git branch existence checks
      vi.mocked(execSync).mockImplementation((cmd) => {
        const command = typeof cmd === 'string' ? cmd : '';
        if (command.includes('git rev-parse --verify')) return '' as any;
        if (command.includes('git rev-list --count')) return '0' as any;
        return '' as any;
      });

      const { handleHealthCheck } = await import('../../lib/core/shop-health-check.js');

      // Act
      const result = await handleHealthCheck(mockContext);

      // Assert
      expect(result.success).toBe(true);
      expect(mockContext.shopOps.loadConfig).toHaveBeenCalledWith('shop-a');
      expect(mockContext.credOps.loadCredentials).toHaveBeenCalledWith('shop-a');
    });

    test('detects missing credentials', async () => {
      // Arrange
      const { select, isCancel } = await import('@clack/prompts');
      const { execSync } = await import('child_process');

      vi.mocked(select)
        .mockResolvedValueOnce('single')
        .mockResolvedValueOnce('shop-a');

      vi.mocked(isCancel).mockReturnValue(false);

      // Mock no credentials
      vi.mocked(mockContext.credOps.loadCredentials).mockResolvedValue({
        success: true,
        data: null
      });

      vi.mocked(execSync).mockReturnValue('' as any);

      const { handleHealthCheck } = await import('../../lib/core/shop-health-check.js');

      // Act
      const result = await handleHealthCheck(mockContext);

      // Assert - Should still succeed (informational only)
      expect(result.success).toBe(true);
    });

    test('detects missing git branches', async () => {
      // Arrange
      const { select, isCancel } = await import('@clack/prompts');
      const { execSync } = await import('child_process');

      vi.mocked(select)
        .mockResolvedValueOnce('single')
        .mockResolvedValueOnce('shop-a');

      vi.mocked(isCancel).mockReturnValue(false);

      // Mock git commands to fail (branches don't exist)
      vi.mocked(execSync).mockImplementation((cmd) => {
        const command = typeof cmd === 'string' ? cmd : '';
        if (command.includes('git rev-parse --verify')) {
          throw new Error('Branch not found');
        }
        return '' as any;
      });

      const { handleHealthCheck } = await import('../../lib/core/shop-health-check.js');

      // Act
      const result = await handleHealthCheck(mockContext);

      // Assert - Should still succeed (informational only)
      expect(result.success).toBe(true);
    });

    test('shows content protection status', async () => {
      // Arrange
      const { select, isCancel } = await import('@clack/prompts');
      const { execSync } = await import('child_process');

      vi.mocked(select)
        .mockResolvedValueOnce('single')
        .mockResolvedValueOnce('shop-a');

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

      vi.mocked(execSync).mockReturnValue('' as any);

      const { handleHealthCheck } = await import('../../lib/core/shop-health-check.js');

      // Act
      const result = await handleHealthCheck(mockContext);

      // Assert
      expect(result.success).toBe(true);
    });
  });

  describe('All Shops Health Check', () => {
    test('checks all shops', async () => {
      // Arrange
      const { select, isCancel } = await import('@clack/prompts');
      const { execSync } = await import('child_process');

      vi.mocked(select).mockResolvedValue('all');
      vi.mocked(isCancel).mockReturnValue(false);
      vi.mocked(execSync).mockReturnValue('' as any);

      const { handleHealthCheck } = await import('../../lib/core/shop-health-check.js');

      // Act
      const result = await handleHealthCheck(mockContext);

      // Assert - Test behavior, not implementation
      expect(result.success).toBe(true);
      expect(mockContext.shopOps.listShops).toHaveBeenCalled();
      expect(mockContext.shopOps.loadConfig).toHaveBeenCalled();
      expect(mockContext.credOps.loadCredentials).toHaveBeenCalled();
    });

    test('shows compact output for multiple shops', async () => {
      // Arrange
      const { select, isCancel } = await import('@clack/prompts');
      const { execSync } = await import('child_process');

      vi.mocked(select).mockResolvedValue('all');
      vi.mocked(isCancel).mockReturnValue(false);
      vi.mocked(execSync).mockReturnValue('' as any);

      const { handleHealthCheck } = await import('../../lib/core/shop-health-check.js');

      // Act
      const result = await handleHealthCheck(mockContext);

      // Assert
      expect(result.success).toBe(true);
      // Both shops should be checked
      expect(mockContext.shopOps.listShops).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    test('handles shop with invalid config gracefully', async () => {
      // Arrange
      const { select, isCancel } = await import('@clack/prompts');
      const { execSync } = await import('child_process');

      vi.mocked(select)
        .mockResolvedValueOnce('single')
        .mockResolvedValueOnce('shop-a');

      vi.mocked(isCancel).mockReturnValue(false);

      // Mock invalid config
      vi.mocked(mockContext.shopOps.loadConfig).mockResolvedValue({
        success: false,
        error: 'Config not found'
      });

      vi.mocked(execSync).mockReturnValue('' as any);

      const { handleHealthCheck } = await import('../../lib/core/shop-health-check.js');

      // Act
      const result = await handleHealthCheck(mockContext);

      // Assert - Should still complete (informational)
      expect(result.success).toBe(true);
    });
  });
});
