/**
 * Unit tests for cli module
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import type { CLIContext } from '../../lib/core/types.js';

// Mock @clack/prompts
vi.mock('@clack/prompts', () => ({
  intro: vi.fn(),
  outro: vi.fn(),
  select: vi.fn(),
  isCancel: vi.fn(),
  note: vi.fn()
}));

// Mock module dependencies
vi.mock('../../lib/core/shop-creation.js', () => ({
  createNewShop: vi.fn()
}));

vi.mock('../../lib/core/dev-operations.js', () => ({
  startDevelopmentWorkflow: vi.fn()
}));

vi.mock('../../lib/core/shop-editing.js', () => ({
  editShop: vi.fn()
}));

vi.mock('../../lib/core/tools.js', () => ({
  handleTools: vi.fn()
}));

describe('cli', () => {
  let mockContext: CLIContext;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };

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
        deleteShops: vi.fn()
      },
      credOps: {
        loadCredentials: vi.fn(),
        saveCredentials: vi.fn()
      },
      devOps: {
        startDev: vi.fn()
      }
    };

    // Mock stdin for waitForKey
    Object.defineProperty(process.stdin, 'isTTY', {
      value: false,
      writable: true,
      configurable: true
    });

    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('runCLI', () => {
    test('displays intro message', async () => {
      // Arrange
      const { intro, select, isCancel } = await import('@clack/prompts');
      vi.mocked(select).mockResolvedValue(Symbol('cancel'));
      vi.mocked(isCancel).mockReturnValue(true);
      vi.mocked(mockContext.shopOps.listShops).mockResolvedValue({
        success: true,
        data: []
      });

      const { runCLI } = await import('../../lib/core/cli.js');

      // Act
      await runCLI(mockContext);

      // Assert
      expect(intro).toHaveBeenCalledWith('🚀 Multi-Shop Manager');
    });

    test('displays outro message on exit', async () => {
      // Arrange
      const { outro, select, isCancel } = await import('@clack/prompts');
      vi.mocked(select).mockResolvedValue('exit');
      vi.mocked(isCancel).mockReturnValue(false);
      vi.mocked(mockContext.shopOps.listShops).mockResolvedValue({
        success: true,
        data: []
      });

      const { runCLI } = await import('../../lib/core/cli.js');

      // Act
      await runCLI(mockContext);

      // Assert
      expect(outro).toHaveBeenCalledWith('👋 Goodbye!');
    });

    test('displays outro message on cancel', async () => {
      // Arrange
      const { outro, select, isCancel } = await import('@clack/prompts');
      vi.mocked(select).mockResolvedValue(Symbol('cancel'));
      vi.mocked(isCancel).mockReturnValue(true);
      vi.mocked(mockContext.shopOps.listShops).mockResolvedValue({
        success: true,
        data: []
      });

      const { runCLI } = await import('../../lib/core/cli.js');

      // Act
      await runCLI(mockContext);

      // Assert
      expect(outro).toHaveBeenCalledWith('👋 Goodbye!');
    });

    test('auto-selects dev mode when AUTO_SELECT_DEV is set', async () => {
      // Arrange
      process.env['AUTO_SELECT_DEV'] = 'true';

      const { startDevelopmentWorkflow } = await import('../../lib/core/dev-operations.js');
      vi.mocked(startDevelopmentWorkflow).mockResolvedValue({ success: true });

      const { runCLI } = await import('../../lib/core/cli.js');

      // Act
      await runCLI(mockContext);

      // Assert
      expect(startDevelopmentWorkflow).toHaveBeenCalledWith(mockContext);
      expect(process.env['AUTO_SELECT_DEV']).toBeUndefined();
    });

    test('displays error when auto-dev mode fails', async () => {
      // Arrange
      process.env['AUTO_SELECT_DEV'] = 'true';

      const { startDevelopmentWorkflow } = await import('../../lib/core/dev-operations.js');
      const { note } = await import('@clack/prompts');

      vi.mocked(startDevelopmentWorkflow).mockResolvedValue({
        success: false,
        error: 'No shops available'
      });

      const { runCLI } = await import('../../lib/core/cli.js');

      // Act
      await runCLI(mockContext);

      // Assert
      expect(note).toHaveBeenCalledWith('No shops available', '❌ Error');
    });

    test('displays current shop count', async () => {
      // Arrange
      const { select, isCancel, note } = await import('@clack/prompts');
      vi.mocked(select).mockResolvedValue(Symbol('cancel'));
      vi.mocked(isCancel).mockReturnValue(true);
      vi.mocked(mockContext.shopOps.listShops).mockResolvedValue({
        success: true,
        data: ['shop-a', 'shop-b', 'shop-c']
      });

      const { runCLI } = await import('../../lib/core/cli.js');

      // Act
      await runCLI(mockContext);

      // Assert
      expect(note).toHaveBeenCalledWith('📋 3 shops configured', 'Current Status');
    });

    test('displays no shops message', async () => {
      // Arrange
      const { select, isCancel, note } = await import('@clack/prompts');
      vi.mocked(select).mockResolvedValue(Symbol('cancel'));
      vi.mocked(isCancel).mockReturnValue(true);
      vi.mocked(mockContext.shopOps.listShops).mockResolvedValue({
        success: true,
        data: []
      });

      const { runCLI } = await import('../../lib/core/cli.js');

      // Act
      await runCLI(mockContext);

      // Assert
      expect(note).toHaveBeenCalledWith('No shops configured yet', 'Current Status');
    });

    test('displays main menu options', async () => {
      // Arrange
      const { select, isCancel } = await import('@clack/prompts');
      vi.mocked(select).mockResolvedValue(Symbol('cancel'));
      vi.mocked(isCancel).mockReturnValue(true);
      vi.mocked(mockContext.shopOps.listShops).mockResolvedValue({
        success: true,
        data: []
      });

      const { runCLI } = await import('../../lib/core/cli.js');

      // Act
      await runCLI(mockContext);

      // Assert
      expect(select).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'What would you like to do?',
          options: [
            { value: 'dev', label: 'Start Development Server', hint: 'Most common' },
            { value: 'list', label: 'List Shops', hint: 'View all shops' },
            { value: 'create', label: 'Create New Shop', hint: 'Set up new shop' },
            { value: 'edit', label: 'Edit Shop', hint: 'Update shop' },
            { value: 'campaign', label: 'Campaign Tools', hint: 'Manage promos and campaigns' },
            { value: 'tools', label: 'Tools', hint: 'Sync shops and workflows' },
            { value: 'exit', label: 'Exit', hint: 'Close manager' }
          ]
        })
      );
    });

    test('starts development server when dev is selected', async () => {
      // Arrange
      const { select, isCancel } = await import('@clack/prompts');
      const { startDevelopmentWorkflow } = await import('../../lib/core/dev-operations.js');

      vi.mocked(select)
        .mockResolvedValueOnce('dev')
        .mockResolvedValueOnce(Symbol('cancel'));
      vi.mocked(isCancel)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true);
      vi.mocked(mockContext.shopOps.listShops).mockResolvedValue({
        success: true,
        data: ['shop-a']
      });
      vi.mocked(startDevelopmentWorkflow).mockResolvedValue({ success: true });

      const { runCLI } = await import('../../lib/core/cli.js');

      // Act
      await runCLI(mockContext);

      // Assert
      expect(startDevelopmentWorkflow).toHaveBeenCalledWith(mockContext);
    });

    test('lists shops when list is selected', async () => {
      // Arrange
      const { select, isCancel } = await import('@clack/prompts');
      vi.mocked(select)
        .mockResolvedValueOnce('list')
        .mockResolvedValueOnce(Symbol('cancel'));
      vi.mocked(isCancel)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true);
      vi.mocked(mockContext.shopOps.listShops).mockResolvedValue({
        success: true,
        data: ['shop-a']
      });
      vi.mocked(mockContext.shopOps.loadConfig).mockResolvedValue({
        success: true,
        data: {
          shopId: 'shop-a',
          name: 'Shop A',
          shopify: {
            stores: {
              production: {
                domain: 'shop-a.myshopify.com',
                branch: 'shop-a/main'
              },
              staging: {
                domain: 'staging-shop-a.myshopify.com',
                branch: 'shop-a/staging'
              }
            },
            authentication: {
              method: 'theme-access-app'
            }
          }
        }
      });

      const { runCLI } = await import('../../lib/core/cli.js');

      // Act
      await runCLI(mockContext);

      // Assert
      expect(mockContext.shopOps.loadConfig).toHaveBeenCalledWith('shop-a');
    });

    test('displays no shops message when listing empty shops', async () => {
      // Arrange
      const { select, isCancel, note } = await import('@clack/prompts');
      vi.mocked(select)
        .mockResolvedValueOnce('list')
        .mockResolvedValueOnce(Symbol('cancel'));
      vi.mocked(isCancel)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true);
      vi.mocked(mockContext.shopOps.listShops).mockResolvedValue({
        success: true,
        data: []
      });

      const { runCLI } = await import('../../lib/core/cli.js');

      // Act
      await runCLI(mockContext);

      // Assert
      expect(note).toHaveBeenCalledWith('No shops configured yet.', '📋 Shop List');
    });

    test('creates shop when create is selected', async () => {
      // Arrange
      const { select, isCancel } = await import('@clack/prompts');
      const { createNewShop } = await import('../../lib/core/shop-creation.js');

      vi.mocked(select)
        .mockResolvedValueOnce('create')
        .mockResolvedValueOnce(Symbol('cancel'));
      vi.mocked(isCancel)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true);
      vi.mocked(mockContext.shopOps.listShops).mockResolvedValue({
        success: true,
        data: []
      });
      vi.mocked(createNewShop).mockResolvedValue({ success: true });

      const { runCLI } = await import('../../lib/core/cli.js');

      // Act
      await runCLI(mockContext);

      // Assert
      expect(createNewShop).toHaveBeenCalledWith(mockContext);
    });

    test('displays error when shop creation fails', async () => {
      // Arrange
      const { select, isCancel, note } = await import('@clack/prompts');
      const { createNewShop } = await import('../../lib/core/shop-creation.js');

      vi.mocked(select)
        .mockResolvedValueOnce('create')
        .mockResolvedValueOnce(Symbol('cancel'));
      vi.mocked(isCancel)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true);
      vi.mocked(mockContext.shopOps.listShops).mockResolvedValue({
        success: true,
        data: []
      });
      vi.mocked(createNewShop).mockResolvedValue({
        success: false,
        error: 'Failed to create shop'
      });

      const { runCLI } = await import('../../lib/core/cli.js');

      // Act
      await runCLI(mockContext);

      // Assert
      expect(note).toHaveBeenCalledWith('Failed to create shop', '❌ Error');
    });

    test('edits shop when edit is selected', async () => {
      // Arrange
      const { select, isCancel } = await import('@clack/prompts');
      const { editShop } = await import('../../lib/core/shop-editing.js');

      vi.mocked(select)
        .mockResolvedValueOnce('edit')
        .mockResolvedValueOnce(Symbol('cancel'));
      vi.mocked(isCancel)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true);
      vi.mocked(mockContext.shopOps.listShops).mockResolvedValue({
        success: true,
        data: ['shop-a']
      });
      vi.mocked(editShop).mockResolvedValue({ success: true });

      const { runCLI } = await import('../../lib/core/cli.js');

      // Act
      await runCLI(mockContext);

      // Assert
      expect(editShop).toHaveBeenCalledWith(mockContext);
    });

    test('handles tools menu when tools is selected', async () => {
      // Arrange
      const { select, isCancel } = await import('@clack/prompts');
      const { handleTools } = await import('../../lib/core/tools.js');

      vi.mocked(select)
        .mockResolvedValueOnce('tools')
        .mockResolvedValueOnce(Symbol('cancel'));
      vi.mocked(isCancel)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true);
      vi.mocked(mockContext.shopOps.listShops).mockResolvedValue({
        success: true,
        data: ['shop-a']
      });
      vi.mocked(handleTools).mockResolvedValue(undefined);

      const { runCLI } = await import('../../lib/core/cli.js');

      // Act
      await runCLI(mockContext);

      // Assert
      expect(handleTools).toHaveBeenCalledWith(mockContext);
    });

    test('handles unknown menu option', async () => {
      // Arrange
      const { select, isCancel, note } = await import('@clack/prompts');
      vi.mocked(select)
        .mockResolvedValueOnce('unknown' as any)
        .mockResolvedValueOnce(Symbol('cancel'));
      vi.mocked(isCancel)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true);
      vi.mocked(mockContext.shopOps.listShops).mockResolvedValue({
        success: true,
        data: []
      });

      const { runCLI } = await import('../../lib/core/cli.js');

      // Act
      await runCLI(mockContext);

      // Assert
      expect(note).toHaveBeenCalledWith('Unknown option selected', '❌ Error');
    });

    test('loops menu until exit is selected', async () => {
      // Arrange
      const { select, isCancel } = await import('@clack/prompts');
      const { createNewShop } = await import('../../lib/core/shop-creation.js');

      vi.mocked(select)
        .mockResolvedValueOnce('create')
        .mockResolvedValueOnce('list')
        .mockResolvedValueOnce('exit');
      vi.mocked(isCancel).mockReturnValue(false);
      vi.mocked(mockContext.shopOps.listShops).mockResolvedValue({
        success: true,
        data: []
      });
      vi.mocked(createNewShop).mockResolvedValue({ success: true });

      const { runCLI } = await import('../../lib/core/cli.js');

      // Act
      await runCLI(mockContext);

      // Assert
      expect(select).toHaveBeenCalledTimes(3);
    });

    test('handles listShops failure gracefully', async () => {
      // Arrange
      const { select, isCancel } = await import('@clack/prompts');
      vi.mocked(select).mockResolvedValue(Symbol('cancel'));
      vi.mocked(isCancel).mockReturnValue(true);
      vi.mocked(mockContext.shopOps.listShops).mockResolvedValue({
        success: false,
        error: 'Failed to read directory'
      });

      const { runCLI } = await import('../../lib/core/cli.js');

      // Act & Assert - should not throw
      await expect(runCLI(mockContext)).resolves.not.toThrow();
    });

    test('displays singular shop count correctly', async () => {
      // Arrange
      const { select, isCancel, note } = await import('@clack/prompts');
      vi.mocked(select).mockResolvedValue(Symbol('cancel'));
      vi.mocked(isCancel).mockReturnValue(true);
      vi.mocked(mockContext.shopOps.listShops).mockResolvedValue({
        success: true,
        data: ['shop-a']
      });

      const { runCLI } = await import('../../lib/core/cli.js');

      // Act
      await runCLI(mockContext);

      // Assert
      expect(note).toHaveBeenCalledWith('📋 1 shop configured', 'Current Status');
    });

    test('displays plural shop count correctly', async () => {
      // Arrange
      const { select, isCancel, note } = await import('@clack/prompts');
      vi.mocked(select).mockResolvedValue(Symbol('cancel'));
      vi.mocked(isCancel).mockReturnValue(true);
      vi.mocked(mockContext.shopOps.listShops).mockResolvedValue({
        success: true,
        data: ['shop-a', 'shop-b']
      });

      const { runCLI } = await import('../../lib/core/cli.js');

      // Act
      await runCLI(mockContext);

      // Assert
      expect(note).toHaveBeenCalledWith('📋 2 shops configured', 'Current Status');
    });

    test('handles config load error when listing shops', async () => {
      // Arrange
      const { select, isCancel } = await import('@clack/prompts');
      vi.mocked(select)
        .mockResolvedValueOnce('list')
        .mockResolvedValueOnce(Symbol('cancel'));
      vi.mocked(isCancel)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true);
      vi.mocked(mockContext.shopOps.listShops).mockResolvedValue({
        success: true,
        data: ['shop-a']
      });
      vi.mocked(mockContext.shopOps.loadConfig).mockResolvedValue({
        success: false,
        error: 'Config not found'
      });

      const { runCLI } = await import('../../lib/core/cli.js');

      // Act & Assert - should not throw
      await expect(runCLI(mockContext)).resolves.not.toThrow();
    });

    test('uses iterative loop not recursion', async () => {
      // Arrange
      const { select, isCancel } = await import('@clack/prompts');
      let callCount = 0;

      vi.mocked(select).mockImplementation(async () => {
        callCount++;
        if (callCount >= 5) {
          return 'exit';
        }
        return 'list';
      });
      vi.mocked(isCancel).mockReturnValue(false);
      vi.mocked(mockContext.shopOps.listShops).mockResolvedValue({
        success: true,
        data: []
      });

      const { runCLI } = await import('../../lib/core/cli.js');

      // Act
      await runCLI(mockContext);

      // Assert - should complete 5 iterations without stack overflow
      expect(callCount).toBe(5);
      expect(select).toHaveBeenCalledTimes(5);
    });

    test('displays list shops error when listShops fails', async () => {
      // Arrange
      const { select, isCancel, note } = await import('@clack/prompts');
      vi.mocked(select)
        .mockResolvedValueOnce('list')
        .mockResolvedValueOnce(Symbol('cancel'));
      vi.mocked(isCancel)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true);
      // Mock listShops to succeed first (for menu display), then fail (for list action)
      vi.mocked(mockContext.shopOps.listShops)
        .mockResolvedValueOnce({ success: true, data: [] }) // First call in showMainMenu
        .mockResolvedValueOnce({ success: false, error: 'Directory read error' }) // Second call in listShops action
        .mockResolvedValueOnce({ success: true, data: [] }); // Third call in showMainMenu after list

      const { runCLI } = await import('../../lib/core/cli.js');

      // Act
      await runCLI(mockContext);

      // Assert
      expect(note).toHaveBeenCalledWith('Directory read error', '❌ Error');
    });
  });
});
