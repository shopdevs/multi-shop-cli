/**
 * Unit tests for shop-sync module
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import type { CLIContext } from '../../lib/core/types.js';

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

describe('shop-sync', () => {
  let mockContext: CLIContext;

  beforeEach(() => {
    mockContext = {
      deps: {
        cwd: '/test/project',
        shopsDir: '/test/project/shops',
        credentialsDir: '/test/project/shops/credentials'
      },
      shopOps: {
        loadConfig: vi.fn().mockResolvedValue({
          success: true,
          data: {
            shopId: 'shop-a',
            name: 'Shop A',
            shopify: {
              stores: {
                production: { domain: 'shop-a.myshopify.com', branch: 'shop-a/main' },
                staging: { domain: 'staging-shop-a.myshopify.com', branch: 'shop-a/staging' }
              },
              authentication: { method: 'theme-access-app' }
            }
            // No contentProtection by default (protection disabled)
          }
        }),
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

  describe('syncShops', () => {
    test('displays message when no shops exist', async () => {
      // Arrange
      vi.mocked(mockContext.shopOps.listShops).mockResolvedValue({
        success: true,
        data: []
      });

      const { note } = await import('@clack/prompts');
      const { syncShops } = await import('../../lib/core/shop-sync.js');

      // Act
      const result = await syncShops(mockContext);

      // Assert
      expect(result.success).toBe(true);
      expect(note).toHaveBeenCalledWith(
        'No shops configured yet. Create shops first.',
        '📋 Sync Shops'
      );
    });

    test('displays message when listShops fails', async () => {
      // Arrange
      vi.mocked(mockContext.shopOps.listShops).mockResolvedValue({
        success: false,
        error: 'Failed to list shops'
      });

      const { note } = await import('@clack/prompts');
      const { syncShops } = await import('../../lib/core/shop-sync.js');

      // Act
      const result = await syncShops(mockContext);

      // Assert
      expect(result.success).toBe(true);
      expect(note).toHaveBeenCalledWith(
        'No shops configured yet. Create shops first.',
        '📋 Sync Shops'
      );
    });

    test('displays intro message', async () => {
      // Arrange
      vi.mocked(mockContext.shopOps.listShops).mockResolvedValue({
        success: true,
        data: ['shop-a', 'shop-b']
      });

      const { select, isCancel, note } = await import('@clack/prompts');
      vi.mocked(select).mockResolvedValue(Symbol('cancel'));
      vi.mocked(isCancel).mockReturnValue(true);

      const { syncShops } = await import('../../lib/core/shop-sync.js');

      // Act
      await syncShops(mockContext);

      // Assert
      expect(note).toHaveBeenCalledWith(
        'Sync main branch changes to shops by creating PRs',
        '🔄 Shop Sync'
      );
    });

    test('displays shop selection with all shops option', async () => {
      // Arrange
      vi.mocked(mockContext.shopOps.listShops).mockResolvedValue({
        success: true,
        data: ['shop-a', 'shop-b', 'shop-c']
      });

      const { select, isCancel } = await import('@clack/prompts');
      vi.mocked(select).mockResolvedValue(Symbol('cancel'));
      vi.mocked(isCancel).mockReturnValue(true);

      const { syncShops } = await import('../../lib/core/shop-sync.js');

      // Act
      await syncShops(mockContext);

      // Assert
      expect(select).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Select shops to sync:',
          options: [
            { value: 'all', label: 'All Shops', hint: 'Deploy to all 3 shops' },
            { value: 'shop-a', label: 'shop-a', hint: 'Deploy to shop-a only' },
            { value: 'shop-b', label: 'shop-b', hint: 'Deploy to shop-b only' },
            { value: 'shop-c', label: 'shop-c', hint: 'Deploy to shop-c only' }
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

      const { syncShops } = await import('../../lib/core/shop-sync.js');

      // Act
      const result = await syncShops(mockContext);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('No shops selected');
    });

    test('prompts for PR title', async () => {
      // Arrange
      vi.mocked(mockContext.shopOps.listShops).mockResolvedValue({
        success: true,
        data: ['shop-a']
      });

      const { select, text, isCancel } = await import('@clack/prompts');
      vi.mocked(select).mockResolvedValue('shop-a');
      vi.mocked(text).mockResolvedValue(Symbol('cancel'));
      vi.mocked(isCancel)
        .mockReturnValueOnce(false) // Shop selection
        .mockReturnValueOnce(true); // PR title

      const { syncShops } = await import('../../lib/core/shop-sync.js');

      // Act
      await syncShops(mockContext);

      // Assert
      expect(text).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'PR title for shop sync:',
          placeholder: 'Deploy latest changes from main'
        })
      );
    });

    test('returns error when PR title is cancelled', async () => {
      // Arrange
      vi.mocked(mockContext.shopOps.listShops).mockResolvedValue({
        success: true,
        data: ['shop-a']
      });

      const { select, text, isCancel } = await import('@clack/prompts');
      vi.mocked(select).mockResolvedValue('shop-a');
      vi.mocked(text).mockResolvedValue(Symbol('cancel'));
      vi.mocked(isCancel)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true);

      const { syncShops } = await import('../../lib/core/shop-sync.js');

      // Act
      const result = await syncShops(mockContext);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('No PR title provided');
    });

    test('creates PR for single shop', async () => {
      // Arrange
      vi.mocked(mockContext.shopOps.listShops).mockResolvedValue({
        success: true,
        data: ['shop-a']
      });

      const { execSync } = await import('child_process');
      const { select, text, isCancel } = await import('@clack/prompts');

      vi.mocked(select).mockResolvedValue('shop-a');
      vi.mocked(text).mockResolvedValue('Deploy latest changes');
      vi.mocked(isCancel).mockReturnValue(false);
      vi.mocked(execSync)
        .mockReturnValueOnce(Buffer.from('gh version 2.0.0')) // gh --version
        .mockReturnValueOnce(Buffer.from('PR created')); // gh pr create

      const { syncShops } = await import('../../lib/core/shop-sync.js');

      // Act
      const result = await syncShops(mockContext);

      // Assert
      expect(result.success).toBe(true);
      expect(execSync).toHaveBeenCalledWith(
        'gh pr create --base shop-a/staging --head main --title "Deploy latest changes" --body "Automated deployment of latest changes from main branch"',
        expect.any(Object)
      );
    });

    test('creates PRs for all shops when "all" is selected', async () => {
      // Arrange
      vi.mocked(mockContext.shopOps.listShops).mockResolvedValue({
        success: true,
        data: ['shop-a', 'shop-b']
      });

      const { execSync } = await import('child_process');
      const { select, text, isCancel } = await import('@clack/prompts');

      vi.mocked(select).mockResolvedValue('all');
      vi.mocked(text).mockResolvedValue('Deploy latest changes');
      vi.mocked(isCancel).mockReturnValue(false);
      vi.mocked(execSync)
        .mockReturnValueOnce(Buffer.from('gh version 2.0.0')) // gh --version
        .mockReturnValueOnce(Buffer.from('PR created')) // shop-a
        .mockReturnValueOnce(Buffer.from('PR created')); // shop-b

      const { syncShops } = await import('../../lib/core/shop-sync.js');

      // Act
      const result = await syncShops(mockContext);

      // Assert
      expect(result.success).toBe(true);
      expect(execSync).toHaveBeenCalledWith(
        'gh pr create --base shop-a/staging --head main --title "Deploy latest changes" --body "Automated deployment of latest changes from main branch"',
        expect.any(Object)
      );
      expect(execSync).toHaveBeenCalledWith(
        'gh pr create --base shop-b/staging --head main --title "Deploy latest changes" --body "Automated deployment of latest changes from main branch"',
        expect.any(Object)
      );
    });

    test('displays success message when all PRs created', async () => {
      // Arrange
      vi.mocked(mockContext.shopOps.listShops).mockResolvedValue({
        success: true,
        data: ['shop-a', 'shop-b']
      });

      const { execSync } = await import('child_process');
      const { select, text, isCancel, note } = await import('@clack/prompts');

      vi.mocked(select).mockResolvedValue('all');
      vi.mocked(text).mockResolvedValue('Deploy');
      vi.mocked(isCancel).mockReturnValue(false);
      vi.mocked(execSync)
        .mockReturnValueOnce(Buffer.from('gh version'))
        .mockReturnValueOnce(Buffer.from('PR created'))
        .mockReturnValueOnce(Buffer.from('PR created'));

      const { syncShops } = await import('../../lib/core/shop-sync.js');

      // Act
      await syncShops(mockContext);

      // Assert
      expect(note).toHaveBeenCalledWith(
        'Created PRs for: shop-a, shop-b',
        '✅ Success'
      );
    });

    test('handles partial PR creation failure', async () => {
      // Arrange
      vi.mocked(mockContext.shopOps.listShops).mockResolvedValue({
        success: true,
        data: ['shop-a', 'shop-b']
      });

      const { execSync } = await import('child_process');
      const { select, text, isCancel, note } = await import('@clack/prompts');

      vi.mocked(select)
        .mockResolvedValueOnce('all')
        .mockResolvedValueOnce('no'); // Don't show error logs
      vi.mocked(text).mockResolvedValue('Deploy');
      vi.mocked(isCancel).mockReturnValue(false);

      vi.mocked(execSync).mockImplementation((cmd) => {
        const command = typeof cmd === 'string' ? cmd : '';

        // Mock git diff (content detection)
        if (command.includes('git diff')) {
          return Buffer.from(''); // No content files in diff
        }

        // Mock gh --version check
        if (command.includes('gh --version')) {
          return Buffer.from('gh version 2.0.0');
        }

        // Mock PR creation - fail for shop-b
        if (command.includes('gh pr create')) {
          if (command.includes('shop-b')) {
            const error: any = new Error('Branch not found');
            error.stderr = 'Branch shop-b/staging not found';
            throw error;
          }
          return Buffer.from('https://github.com/repo/pull/123');
        }

        return Buffer.from('');
      });

      const { syncShops } = await import('../../lib/core/shop-sync.js');

      // Act
      await syncShops(mockContext);

      // Assert
      expect(note).toHaveBeenCalledWith(
        'Created PRs for: shop-a',
        '✅ Success'
      );
      expect(note).toHaveBeenCalledWith(
        'Some PR creation failed',
        '⚠️ Automation Failed'
      );
    });

    test('offers to show error logs when PRs fail', async () => {
      // Arrange
      vi.mocked(mockContext.shopOps.listShops).mockResolvedValue({
        success: true,
        data: ['shop-a']
      });

      const { execSync } = await import('child_process');
      const { select, text, isCancel } = await import('@clack/prompts');

      vi.mocked(select)
        .mockResolvedValueOnce('shop-a')
        .mockResolvedValueOnce('yes'); // Show error logs
      vi.mocked(text).mockResolvedValue('Deploy');
      vi.mocked(isCancel).mockReturnValue(false);

      vi.mocked(execSync).mockImplementation((cmd) => {
        const command = typeof cmd === 'string' ? cmd : '';

        // Mock git diff (content detection)
        if (command.includes('git diff')) {
          return Buffer.from(''); // No content files in diff
        }

        // Mock gh --version check
        if (command.includes('gh --version')) {
          return Buffer.from('gh version 2.0.0');
        }

        // Mock PR creation - fail
        if (command.includes('gh pr create')) {
          const error: any = new Error('PR creation failed');
          error.stderr = 'Branch not found';
          throw error;
        }

        return Buffer.from('');
      });

      const { syncShops } = await import('../../lib/core/shop-sync.js');

      // Act
      await syncShops(mockContext);

      // Assert
      expect(select).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Would you like to see the error details?',
          options: [
            { value: 'yes', label: 'Yes, show error logs', hint: 'See why PR creation failed' },
            { value: 'no', label: 'No, just continue', hint: 'Skip to manual instructions' }
          ]
        })
      );
    });

    test('handles GitHub CLI not installed', async () => {
      // Arrange
      vi.mocked(mockContext.shopOps.listShops).mockResolvedValue({
        success: true,
        data: ['shop-a']
      });

      const { execSync } = await import('child_process');
      const { select, text, isCancel, note } = await import('@clack/prompts');

      vi.mocked(select).mockResolvedValue('shop-a');
      vi.mocked(text).mockResolvedValue('Deploy');
      vi.mocked(isCancel).mockReturnValue(false);
      vi.mocked(execSync).mockImplementation(() => {
        throw new Error('gh: command not found');
      });

      const { syncShops } = await import('../../lib/core/shop-sync.js');

      // Act
      const result = await syncShops(mockContext);

      // Assert
      expect(result.success).toBe(true);
      expect(note).toHaveBeenCalledWith(
        'Install GitHub CLI to automate PR creation',
        'Manual Setup Required'
      );
    });

    test('captures GitHub CLI error output', async () => {
      // Arrange
      vi.mocked(mockContext.shopOps.listShops).mockResolvedValue({
        success: true,
        data: ['shop-a']
      });

      const { execSync } = await import('child_process');
      const { select, text, isCancel } = await import('@clack/prompts');

      vi.mocked(select)
        .mockResolvedValueOnce('shop-a')
        .mockResolvedValueOnce('yes'); // Show logs
      vi.mocked(text).mockResolvedValue('Deploy');
      vi.mocked(isCancel).mockReturnValue(false);

      vi.mocked(execSync).mockImplementation((cmd) => {
        const command = typeof cmd === 'string' ? cmd : '';

        // Mock git diff (content detection)
        if (command.includes('git diff')) {
          return Buffer.from(''); // No content files in diff
        }

        // Mock gh --version check
        if (command.includes('gh --version')) {
          return Buffer.from('gh version 2.0.0');
        }

        // Mock PR creation - fail with detailed error
        if (command.includes('gh pr create')) {
          const error: any = new Error('PR creation failed');
          error.stderr = 'pull request create failed: GraphQL: Branch not found';
          throw error;
        }

        return Buffer.from('');
      });

      const { syncShops } = await import('../../lib/core/shop-sync.js');

      // Act
      await syncShops(mockContext);

      // Assert - error should be captured and available for display
      expect(execSync).toHaveBeenCalledWith(
        expect.stringContaining('gh pr create'),
        expect.any(Object)
      );
    });

    test('handles all PRs failing', async () => {
      // Arrange
      vi.mocked(mockContext.shopOps.listShops).mockResolvedValue({
        success: true,
        data: ['shop-a', 'shop-b']
      });

      const { execSync } = await import('child_process');
      const { select, text, isCancel, note } = await import('@clack/prompts');

      vi.mocked(select)
        .mockResolvedValueOnce('all')
        .mockResolvedValueOnce('no'); // Don't show logs
      vi.mocked(text).mockResolvedValue('Deploy');
      vi.mocked(isCancel).mockReturnValue(false);

      vi.mocked(execSync).mockImplementation((cmd) => {
        const command = typeof cmd === 'string' ? cmd : '';

        // Mock git diff (content detection)
        if (command.includes('git diff')) {
          return Buffer.from(''); // No content files in diff
        }

        // Mock gh --version check
        if (command.includes('gh --version')) {
          return Buffer.from('gh version 2.0.0');
        }

        // Mock PR creation - fail for all shops
        if (command.includes('gh pr create')) {
          throw new Error('Branch not found');
        }

        return Buffer.from('');
      });

      const { syncShops } = await import('../../lib/core/shop-sync.js');

      // Act
      await syncShops(mockContext);

      // Assert
      expect(note).toHaveBeenCalledWith(
        'Automated PR creation failed',
        '⚠️ Automation Failed'
      );
    });

    test('uses correct git and gh commands', async () => {
      // Arrange
      vi.mocked(mockContext.shopOps.listShops).mockResolvedValue({
        success: true,
        data: ['shop-a']
      });

      const { execSync } = await import('child_process');
      const { select, text, isCancel } = await import('@clack/prompts');

      vi.mocked(select).mockResolvedValue('shop-a');
      vi.mocked(text).mockResolvedValue('Test PR Title');
      vi.mocked(isCancel).mockReturnValue(false);
      vi.mocked(execSync)
        .mockReturnValueOnce(Buffer.from('gh version'))
        .mockReturnValueOnce(Buffer.from('PR created'));

      const { syncShops } = await import('../../lib/core/shop-sync.js');

      // Act
      await syncShops(mockContext);

      // Assert
      expect(execSync).toHaveBeenCalledWith('gh --version', expect.any(Object));
      expect(execSync).toHaveBeenCalledWith(
        'gh pr create --base shop-a/staging --head main --title "Test PR Title" --body "Automated deployment of latest changes from main branch"',
        expect.objectContaining({
          stdio: ['ignore', 'pipe', 'pipe'],
          encoding: 'utf8'
        })
      );
    });

    test('handles execSync with proper error handling', async () => {
      // Arrange
      vi.mocked(mockContext.shopOps.listShops).mockResolvedValue({
        success: true,
        data: ['shop-a']
      });

      const { execSync } = await import('child_process');
      const { select, text, isCancel } = await import('@clack/prompts');

      vi.mocked(select)
        .mockResolvedValueOnce('shop-a')
        .mockResolvedValueOnce('no');
      vi.mocked(text).mockResolvedValue('Deploy');
      vi.mocked(isCancel).mockReturnValue(false);
      vi.mocked(execSync)
        .mockReturnValueOnce(Buffer.from('gh version'))
        .mockImplementationOnce(() => {
          const error: any = new Error('Command failed');
          error.stdout = 'Some stdout';
          error.stderr = 'Some stderr';
          throw error;
        });

      const { syncShops } = await import('../../lib/core/shop-sync.js');

      // Act
      const result = await syncShops(mockContext);

      // Assert - should handle error gracefully
      expect(result.success).toBe(true);
    });

    test('skips showing logs when user selects no', async () => {
      // Arrange
      vi.mocked(mockContext.shopOps.listShops).mockResolvedValue({
        success: true,
        data: ['shop-a']
      });

      const { execSync } = await import('child_process');
      const { select, text, isCancel } = await import('@clack/prompts');

      vi.mocked(select)
        .mockResolvedValueOnce('shop-a')
        .mockResolvedValueOnce('no'); // Don't show logs
      vi.mocked(text).mockResolvedValue('Deploy');
      vi.mocked(isCancel).mockReturnValue(false);

      vi.mocked(execSync).mockImplementation((cmd) => {
        const command = typeof cmd === 'string' ? cmd : '';

        // Mock git diff (content detection)
        if (command.includes('git diff')) {
          return Buffer.from(''); // No content files in diff
        }

        // Mock gh --version check
        if (command.includes('gh --version')) {
          return Buffer.from('gh version 2.0.0');
        }

        // Mock PR creation - fail
        if (command.includes('gh pr create')) {
          throw new Error('Branch not found');
        }

        return Buffer.from('');
      });

      const { syncShops } = await import('../../lib/core/shop-sync.js');

      // Act
      await syncShops(mockContext);

      // Assert - should proceed without showing detailed logs
      expect(select).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Would you like to see the error details?'
        })
      );
    });

    test('handles log selection cancellation', async () => {
      // Arrange
      vi.mocked(mockContext.shopOps.listShops).mockResolvedValue({
        success: true,
        data: ['shop-a']
      });

      const { execSync } = await import('child_process');
      const { select, text, isCancel } = await import('@clack/prompts');

      vi.mocked(select)
        .mockResolvedValueOnce('shop-a')
        .mockResolvedValueOnce(Symbol('cancel')); // Cancel log selection
      vi.mocked(text).mockResolvedValue('Deploy');
      vi.mocked(isCancel)
        .mockReturnValueOnce(false) // Shop selection
        .mockReturnValueOnce(false) // PR title
        .mockReturnValueOnce(true); // Log selection
      vi.mocked(execSync)
        .mockReturnValueOnce(Buffer.from('gh version'))
        .mockImplementationOnce(() => {
          throw new Error('Branch not found');
        });

      const { syncShops } = await import('../../lib/core/shop-sync.js');

      // Act
      await syncShops(mockContext);

      // Assert - should handle cancellation gracefully
      expect(isCancel).toHaveBeenCalled();
    });
  });
});
