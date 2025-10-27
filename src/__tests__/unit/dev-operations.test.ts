/**
 * Unit tests for dev-operations module
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import type { CLIContext } from '../../lib/core/types.js';
import { createMockShopConfig, createMockCredentials } from '../helpers.js';

// Mock @clack/prompts
vi.mock('@clack/prompts', () => ({
  select: vi.fn(),
  isCancel: vi.fn(),
  note: vi.fn(),
  spinner: vi.fn(() => ({
    start: vi.fn(),
    stop: vi.fn()
  }))
}));

// Mock child_process
vi.mock('child_process', () => ({
  spawn: vi.fn(() => ({
    on: vi.fn(),
    kill: vi.fn()
  })),
  execSync: vi.fn()
}));

describe('dev-operations', () => {
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

  describe('startDevelopmentWorkflow', () => {
    test('displays message when no shops exist', async () => {
      // Arrange
      vi.mocked(mockContext.shopOps.listShops).mockResolvedValue({
        success: true,
        data: []
      });

      const { note } = await import('@clack/prompts');
      const { startDevelopmentWorkflow } = await import('../../lib/core/dev-operations.js');

      // Act
      const result = await startDevelopmentWorkflow(mockContext);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('No shops available');
      expect(note).toHaveBeenCalledWith(
        'No shops configured. Create a shop first.',
        '⚠️ Setup Required'
      );
    });

    test('displays message when listShops fails', async () => {
      // Arrange
      vi.mocked(mockContext.shopOps.listShops).mockResolvedValue({
        success: false,
        error: 'Failed to list shops'
      });

      const { note } = await import('@clack/prompts');
      const { startDevelopmentWorkflow } = await import('../../lib/core/dev-operations.js');

      // Act
      const result = await startDevelopmentWorkflow(mockContext);

      // Assert
      expect(result.success).toBe(false);
      expect(note).toHaveBeenCalledWith(
        'No shops configured. Create a shop first.',
        '⚠️ Setup Required'
      );
    });

    test('displays shop selection', async () => {
      // Arrange
      vi.mocked(mockContext.shopOps.listShops).mockResolvedValue({
        success: true,
        data: ['shop-a', 'shop-b']
      });

      const { select, isCancel } = await import('@clack/prompts');
      vi.mocked(select).mockResolvedValue(Symbol('cancel'));
      vi.mocked(isCancel).mockReturnValue(true);

      const { startDevelopmentWorkflow } = await import('../../lib/core/dev-operations.js');

      // Act
      await startDevelopmentWorkflow(mockContext);

      // Assert
      expect(select).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Select shop for development:',
          options: [
            { value: 'shop-a', label: 'shop-a', hint: 'Start dev server for shop-a' },
            { value: 'shop-b', label: 'shop-b', hint: 'Start dev server for shop-b' }
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

      const { startDevelopmentWorkflow } = await import('../../lib/core/dev-operations.js');

      // Act
      const result = await startDevelopmentWorkflow(mockContext);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('No shop selected');
    });

    test('displays environment selection', async () => {
      // Arrange
      vi.mocked(mockContext.shopOps.listShops).mockResolvedValue({
        success: true,
        data: ['shop-a']
      });

      const { select, isCancel } = await import('@clack/prompts');
      vi.mocked(select)
        .mockResolvedValueOnce('shop-a')
        .mockResolvedValueOnce(Symbol('cancel'));
      vi.mocked(isCancel)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true);

      const { startDevelopmentWorkflow } = await import('../../lib/core/dev-operations.js');

      // Act
      await startDevelopmentWorkflow(mockContext);

      // Assert
      expect(select).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Select environment:',
          options: [
            { value: 'staging', label: 'Staging', hint: 'Safe for development' },
            { value: 'production', label: 'Production', hint: 'Live store - be careful!' }
          ]
        })
      );
    });

    test('returns error when environment selection is cancelled', async () => {
      // Arrange
      vi.mocked(mockContext.shopOps.listShops).mockResolvedValue({
        success: true,
        data: ['shop-a']
      });

      const { select, isCancel } = await import('@clack/prompts');
      vi.mocked(select)
        .mockResolvedValueOnce('shop-a')
        .mockResolvedValueOnce(Symbol('cancel'));
      vi.mocked(isCancel)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true);

      const { startDevelopmentWorkflow } = await import('../../lib/core/dev-operations.js');

      // Act
      const result = await startDevelopmentWorkflow(mockContext);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('No environment selected');
    });

    test('loads shop configuration', async () => {
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
      const { execSync } = await import('child_process');

      vi.mocked(select)
        .mockResolvedValueOnce('shop-a')
        .mockResolvedValueOnce('staging');
      vi.mocked(isCancel).mockReturnValue(false);
      vi.mocked(execSync).mockImplementation(() => {
        throw new Error('Shopify CLI not found');
      });

      const { startDevelopmentWorkflow } = await import('../../lib/core/dev-operations.js');

      // Act
      await startDevelopmentWorkflow(mockContext);

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
      vi.mocked(select)
        .mockResolvedValueOnce('shop-a')
        .mockResolvedValueOnce('staging');
      vi.mocked(isCancel).mockReturnValue(false);

      const { startDevelopmentWorkflow } = await import('../../lib/core/dev-operations.js');

      // Act
      const result = await startDevelopmentWorkflow(mockContext);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Config file not found');
    });

    test('loads shop credentials', async () => {
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
      const { execSync } = await import('child_process');

      vi.mocked(select)
        .mockResolvedValueOnce('shop-a')
        .mockResolvedValueOnce('staging');
      vi.mocked(isCancel).mockReturnValue(false);
      vi.mocked(execSync).mockImplementation(() => {
        throw new Error('Shopify CLI not found');
      });

      const { startDevelopmentWorkflow } = await import('../../lib/core/dev-operations.js');

      // Act
      await startDevelopmentWorkflow(mockContext);

      // Assert
      expect(mockContext.credOps.loadCredentials).toHaveBeenCalledWith('shop-a');
    });

    test('returns error when credentials load fails', async () => {
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

      const { select, isCancel } = await import('@clack/prompts');
      vi.mocked(select)
        .mockResolvedValueOnce('shop-a')
        .mockResolvedValueOnce('staging');
      vi.mocked(isCancel).mockReturnValue(false);

      const { startDevelopmentWorkflow } = await import('../../lib/core/dev-operations.js');

      // Act
      const result = await startDevelopmentWorkflow(mockContext);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to load credentials');
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
        success: true,
        data: null
      });

      const { select, isCancel, note } = await import('@clack/prompts');
      vi.mocked(select)
        .mockResolvedValueOnce('shop-a')
        .mockResolvedValueOnce('staging');
      vi.mocked(isCancel).mockReturnValue(false);

      const { startDevelopmentWorkflow } = await import('../../lib/core/dev-operations.js');

      // Act
      const result = await startDevelopmentWorkflow(mockContext);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('No credentials available');
      expect(note).toHaveBeenCalledWith(
        'No credentials found for shop-a. Set up credentials first.',
        '⚠️ Setup Required'
      );
    });

    test('returns error when config data is missing', async () => {
      // Arrange
      const mockCreds = createMockCredentials('shop-a');

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
        data: mockCreds
      });

      const { select, isCancel } = await import('@clack/prompts');
      vi.mocked(select)
        .mockResolvedValueOnce('shop-a')
        .mockResolvedValueOnce('staging');
      vi.mocked(isCancel).mockReturnValue(false);

      const { startDevelopmentWorkflow } = await import('../../lib/core/dev-operations.js');

      // Act
      const result = await startDevelopmentWorkflow(mockContext);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Config data is missing');
    });

    test('displays message when theme token is missing', async () => {
      // Arrange
      const mockConfig = createMockShopConfig('shop-a');
      const mockCreds = createMockCredentials('shop-a', {
        shopify: {
          stores: {
            production: { themeToken: 'prod-token' },
            staging: { themeToken: '' } // Empty token
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
        data: mockCreds
      });

      const { select, isCancel, note } = await import('@clack/prompts');
      vi.mocked(select)
        .mockResolvedValueOnce('shop-a')
        .mockResolvedValueOnce('staging');
      vi.mocked(isCancel).mockReturnValue(false);

      const { startDevelopmentWorkflow } = await import('../../lib/core/dev-operations.js');

      // Act
      const result = await startDevelopmentWorkflow(mockContext);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('No theme token available');
      expect(note).toHaveBeenCalledWith(
        'No theme token found for staging',
        '⚠️ Setup Required'
      );
    });

    test('checks for Shopify CLI availability', async () => {
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
      const { execSync } = await import('child_process');

      vi.mocked(select)
        .mockResolvedValueOnce('shop-a')
        .mockResolvedValueOnce('staging');
      vi.mocked(isCancel).mockReturnValue(false);
      vi.mocked(execSync).mockImplementation(() => {
        throw new Error('Command not found');
      });

      const { startDevelopmentWorkflow } = await import('../../lib/core/dev-operations.js');

      // Act
      await startDevelopmentWorkflow(mockContext);

      // Assert
      expect(execSync).toHaveBeenCalledWith('shopify version', expect.any(Object));
    });

    test('displays message when Shopify CLI not installed', async () => {
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
      const { execSync } = await import('child_process');

      vi.mocked(select)
        .mockResolvedValueOnce('shop-a')
        .mockResolvedValueOnce('staging');
      vi.mocked(isCancel).mockReturnValue(false);
      vi.mocked(execSync).mockImplementation(() => {
        throw new Error('Command not found');
      });

      const { startDevelopmentWorkflow } = await import('../../lib/core/dev-operations.js');

      // Act
      const result = await startDevelopmentWorkflow(mockContext);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Shopify CLI not available');
      expect(note).toHaveBeenCalledWith(
        'Install: pnpm add -g @shopify/cli',
        'Installation Required'
      );
    });

    test('starts Shopify CLI with production environment', async () => {
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
      const { execSync, spawn } = await import('child_process');

      const mockSpawn = {
        on: vi.fn((event: string, handler: any) => {
          if (event === 'close') {
            setTimeout(() => handler(0), 0);
          }
          return mockSpawn;
        }),
        kill: vi.fn()
      };

      vi.mocked(select)
        .mockResolvedValueOnce('shop-a')
        .mockResolvedValueOnce('production');
      vi.mocked(isCancel).mockReturnValue(false);
      vi.mocked(execSync).mockReturnValue(Buffer.from('Shopify CLI'));
      vi.mocked(spawn).mockReturnValue(mockSpawn as any);

      const { startDevelopmentWorkflow } = await import('../../lib/core/dev-operations.js');

      // Act
      await startDevelopmentWorkflow(mockContext);

      // Assert
      expect(spawn).toHaveBeenCalledWith(
        'shopify',
        expect.arrayContaining([
          'theme',
          'dev',
          expect.stringContaining('--store=')
        ]),
        expect.objectContaining({
          env: expect.objectContaining({
            SHOPIFY_CLI_THEME_TOKEN: mockCreds.shopify.stores.production.themeToken
          })
        })
      );
    });

    test('starts Shopify CLI with staging environment', async () => {
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
      const { execSync, spawn } = await import('child_process');

      const mockSpawn = {
        on: vi.fn((event: string, handler: any) => {
          if (event === 'close') {
            setTimeout(() => handler(0), 0);
          }
          return mockSpawn;
        }),
        kill: vi.fn()
      };

      vi.mocked(select)
        .mockResolvedValueOnce('shop-a')
        .mockResolvedValueOnce('staging');
      vi.mocked(isCancel).mockReturnValue(false);
      vi.mocked(execSync).mockReturnValue(Buffer.from('Shopify CLI'));
      vi.mocked(spawn).mockReturnValue(mockSpawn as any);

      const { startDevelopmentWorkflow } = await import('../../lib/core/dev-operations.js');

      // Act
      await startDevelopmentWorkflow(mockContext);

      // Assert
      expect(spawn).toHaveBeenCalledWith(
        'shopify',
        expect.arrayContaining([
          'theme',
          'dev',
          expect.stringContaining('--store=')
        ]),
        expect.objectContaining({
          env: expect.objectContaining({
            SHOPIFY_CLI_THEME_TOKEN: mockCreds.shopify.stores.staging.themeToken
          })
        })
      );
    });

    test('handles spawn error', async () => {
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
      const { execSync, spawn } = await import('child_process');

      const mockSpawn = {
        on: vi.fn((event: string, handler: any) => {
          if (event === 'error') {
            setTimeout(() => handler(new Error('Spawn failed')), 0);
          }
          return mockSpawn;
        }),
        kill: vi.fn()
      };

      vi.mocked(select)
        .mockResolvedValueOnce('shop-a')
        .mockResolvedValueOnce('staging');
      vi.mocked(isCancel).mockReturnValue(false);
      vi.mocked(execSync).mockReturnValue(Buffer.from('Shopify CLI'));
      vi.mocked(spawn).mockReturnValue(mockSpawn as any);

      const { startDevelopmentWorkflow } = await import('../../lib/core/dev-operations.js');

      // Act
      const result = await startDevelopmentWorkflow(mockContext);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Spawn failed');
    });

    test('uses correct store domain format', async () => {
      // Arrange
      const mockConfig = createMockShopConfig('shop-a', {
        shopify: {
          stores: {
            production: {
              domain: 'custom-shop.myshopify.com',
              branch: 'shop-a/main'
            },
            staging: {
              domain: 'staging-custom.myshopify.com',
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
      const { execSync, spawn } = await import('child_process');

      const mockSpawn = {
        on: vi.fn((event: string, handler: any) => {
          if (event === 'close') {
            setTimeout(() => handler(0), 0);
          }
          return mockSpawn;
        }),
        kill: vi.fn()
      };

      vi.mocked(select)
        .mockResolvedValueOnce('shop-a')
        .mockResolvedValueOnce('production');
      vi.mocked(isCancel).mockReturnValue(false);
      vi.mocked(execSync).mockReturnValue(Buffer.from('Shopify CLI'));
      vi.mocked(spawn).mockReturnValue(mockSpawn as any);

      const { startDevelopmentWorkflow } = await import('../../lib/core/dev-operations.js');

      // Act
      await startDevelopmentWorkflow(mockContext);

      // Assert
      expect(spawn).toHaveBeenCalledWith(
        'shopify',
        expect.arrayContaining([
          'theme',
          'dev',
          '--store=custom-shop'
        ]),
        expect.any(Object)
      );
    });
  });
});
