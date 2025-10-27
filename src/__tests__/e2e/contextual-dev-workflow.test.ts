/**
 * E2E tests for ContextualDev workflow
 * Tests branch detection and delegation logic
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { execSync } from 'child_process';
import { ContextualDev } from '../../lib/ContextualDev.js';

// Mock child_process execSync for git commands
vi.mock('child_process', () => ({
  execSync: vi.fn()
}));

// Mock core index
vi.mock('../../lib/core/index.js', () => ({
  runMultiShopManager: vi.fn().mockResolvedValue(undefined),
  createMultiShopCLI: vi.fn().mockReturnValue({
    deps: {
      cwd: '/test',
      shopsDir: '/test/shops',
      credentialsDir: '/test/shops/credentials'
    },
    shopOps: {},
    credOps: {},
    devOps: {}
  })
}));

// Mock dev-operations - Return value will be overridden per test
vi.mock('../../lib/core/dev-operations.js', () => ({
  startDevelopmentWorkflow: vi.fn(async () => ({ success: true }))
}));

describe('ContextualDev E2E Workflow', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(async () => {
    originalEnv = { ...process.env };
    delete process.env.AUTO_SELECT_DEV;
    vi.clearAllMocks();

    // Reset startDevelopmentWorkflow mock to default successful result
    const { startDevelopmentWorkflow } = await import('../../lib/core/dev-operations.js');
    vi.mocked(startDevelopmentWorkflow).mockResolvedValue({ success: true });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Shop-specific branch detection', () => {
    test('detects shop-a/main as shop-specific branch', async () => {
      // Arrange
      vi.mocked(execSync).mockReturnValue('shop-a/main' as any);

      const { runMultiShopManager } = await import('../../lib/core/index.js');

      const contextualDev = new ContextualDev();

      // Act
      await contextualDev.run();

      // Assert
      expect(execSync).toHaveBeenCalledWith('git branch --show-current', { encoding: 'utf8' });
      expect(runMultiShopManager).toHaveBeenCalled();
      expect(process.env.AUTO_SELECT_DEV).toBe('true');
    });

    test('detects shop-b/staging as shop-specific branch', async () => {
      // Arrange
      vi.mocked(execSync).mockReturnValue('shop-b/staging' as any);

      const { runMultiShopManager } = await import('../../lib/core/index.js');

      const contextualDev = new ContextualDev();

      // Act
      await contextualDev.run();

      // Assert
      expect(runMultiShopManager).toHaveBeenCalled();
      expect(process.env.AUTO_SELECT_DEV).toBe('true');
    });

    test('detects shop-name-with-dashes/feature as shop-specific branch', async () => {
      // Arrange
      vi.mocked(execSync).mockReturnValue('shop-name-with-dashes/promo-campaign' as any);

      const { runMultiShopManager } = await import('../../lib/core/index.js');

      const contextualDev = new ContextualDev();

      // Act
      await contextualDev.run();

      // Assert
      expect(runMultiShopManager).toHaveBeenCalled();
      expect(process.env.AUTO_SELECT_DEV).toBe('true');
    });

    test('delegates to shop manager for shop-specific branches', async () => {
      // Arrange
      vi.mocked(execSync).mockReturnValue('my-shop/main' as any);

      const { runMultiShopManager } = await import('../../lib/core/index.js');

      const contextualDev = new ContextualDev();

      // Act
      await contextualDev.run();

      // Assert
      expect(runMultiShopManager).toHaveBeenCalledTimes(1);
    });

    test('sets AUTO_SELECT_DEV environment variable for shop branches', async () => {
      // Arrange
      vi.mocked(execSync).mockReturnValue('shop-a/main' as any);

      const contextualDev = new ContextualDev();

      // Act
      await contextualDev.run();

      // Assert
      expect(process.env.AUTO_SELECT_DEV).toBe('true');
    });
  });

  describe('Feature branch detection', () => {
    test('detects main as feature branch (core branch, no slash)', async () => {
      // Arrange
      vi.mocked(execSync).mockReturnValue('main' as any);

      const { startDevelopmentWorkflow } = await import('../../lib/core/dev-operations.js');
      const { runMultiShopManager } = await import('../../lib/core/index.js');

      const contextualDev = new ContextualDev();

      // Act
      await contextualDev.run();

      // Assert
      expect(startDevelopmentWorkflow).toHaveBeenCalled();
      expect(runMultiShopManager).not.toHaveBeenCalled();
    });

    test('detects develop as feature branch (no slash)', async () => {
      // Arrange
      vi.mocked(execSync).mockReturnValue('develop' as any);

      const { startDevelopmentWorkflow } = await import('../../lib/core/dev-operations.js');
      const { runMultiShopManager } = await import('../../lib/core/index.js');

      const contextualDev = new ContextualDev();

      // Act
      await contextualDev.run();

      // Assert
      expect(startDevelopmentWorkflow).toHaveBeenCalled();
      expect(runMultiShopManager).not.toHaveBeenCalled();
    });

    test('detects single-word branch as feature branch', async () => {
      // Arrange
      vi.mocked(execSync).mockReturnValue('production' as any);

      const { startDevelopmentWorkflow } = await import('../../lib/core/dev-operations.js');
      const { runMultiShopManager } = await import('../../lib/core/index.js');

      const contextualDev = new ContextualDev();

      // Act
      await contextualDev.run();

      // Assert
      expect(startDevelopmentWorkflow).toHaveBeenCalled();
      expect(runMultiShopManager).not.toHaveBeenCalled();
    });

    test('delegates to contextual development for non-slash branches', async () => {
      // Arrange
      vi.mocked(execSync).mockReturnValue('bugfix' as any);

      const { startDevelopmentWorkflow } = await import('../../lib/core/dev-operations.js');

      const contextualDev = new ContextualDev();

      // Act
      await contextualDev.run();

      // Assert
      expect(startDevelopmentWorkflow).toHaveBeenCalledTimes(1);
    });

    test('does not set AUTO_SELECT_DEV for non-slash branches', async () => {
      // Arrange
      vi.mocked(execSync).mockReturnValue('test-branch' as any);

      const contextualDev = new ContextualDev();

      // Act
      await contextualDev.run();

      // Assert
      expect(process.env.AUTO_SELECT_DEV).toBeUndefined();
    });

    test('branches with slashes are treated as shop branches', async () => {
      // Arrange - Any branch with slash is treated as shop branch
      vi.mocked(execSync).mockReturnValue('feature/carousel-fix' as any);

      const { runMultiShopManager } = await import('../../lib/core/index.js');
      const { startDevelopmentWorkflow } = await import('../../lib/core/dev-operations.js');

      const contextualDev = new ContextualDev();

      // Act
      await contextualDev.run();

      // Assert
      expect(runMultiShopManager).toHaveBeenCalled();
      expect(startDevelopmentWorkflow).not.toHaveBeenCalled();
      expect(process.env.AUTO_SELECT_DEV).toBe('true');
    });
  });

  describe('Branch name edge cases', () => {
    test('handles branch with multiple slashes (shop-a/feature/sub)', async () => {
      // Arrange - First slash determines shop-specific
      vi.mocked(execSync).mockReturnValue('shop-a/feature/sub' as any);

      const { runMultiShopManager } = await import('../../lib/core/index.js');

      const contextualDev = new ContextualDev();

      // Act
      await contextualDev.run();

      // Assert - Should treat as shop-specific (shop-a prefix)
      expect(runMultiShopManager).toHaveBeenCalled();
    });

    test('handles branch with numbers (shop-123/main)', async () => {
      // Arrange
      vi.mocked(execSync).mockReturnValue('shop-123/main' as any);

      const { runMultiShopManager } = await import('../../lib/core/index.js');

      const contextualDev = new ContextualDev();

      // Act
      await contextualDev.run();

      // Assert
      expect(runMultiShopManager).toHaveBeenCalled();
    });

    test('handles branch without slash (main)', async () => {
      // Arrange
      vi.mocked(execSync).mockReturnValue('main' as any);

      const { startDevelopmentWorkflow } = await import('../../lib/core/dev-operations.js');
      const { runMultiShopManager } = await import('../../lib/core/index.js');

      const contextualDev = new ContextualDev();

      // Act
      await contextualDev.run();

      // Assert
      expect(startDevelopmentWorkflow).toHaveBeenCalled();
      expect(runMultiShopManager).not.toHaveBeenCalled();
    });

    test('handles empty branch name', async () => {
      // Arrange
      vi.mocked(execSync).mockReturnValue('' as any);

      const { startDevelopmentWorkflow } = await import('../../lib/core/dev-operations.js');
      const { runMultiShopManager } = await import('../../lib/core/index.js');

      const contextualDev = new ContextualDev();

      // Act
      await contextualDev.run();

      // Assert - Treats as feature branch (no slash)
      expect(startDevelopmentWorkflow).toHaveBeenCalled();
      expect(runMultiShopManager).not.toHaveBeenCalled();
    });

    test('trims whitespace from branch name', async () => {
      // Arrange
      vi.mocked(execSync).mockReturnValue('  shop-a/main  \n' as any);

      const { runMultiShopManager } = await import('../../lib/core/index.js');

      const contextualDev = new ContextualDev();

      // Act
      await contextualDev.run();

      // Assert - Should still detect shop-specific
      expect(runMultiShopManager).toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    test('handles git command failure gracefully', async () => {
      // Arrange
      vi.mocked(execSync).mockImplementation(() => {
        throw new Error('fatal: not a git repository');
      });

      const contextualDev = new ContextualDev();

      // Act & Assert
      await expect(contextualDev.run()).rejects.toThrow();
    });

    test('handles development workflow failure', async () => {
      // Arrange
      vi.mocked(execSync).mockReturnValue('main' as any);

      const { startDevelopmentWorkflow } = await import('../../lib/core/dev-operations.js');
      vi.mocked(startDevelopmentWorkflow).mockResolvedValue({
        success: false,
        error: 'Development failed'
      });

      const contextualDev = new ContextualDev();

      // Act
      await contextualDev.run();

      // Assert - Should not throw, just log error
      expect(startDevelopmentWorkflow).toHaveBeenCalled();
    });

    test('handles shop manager failure', async () => {
      // Arrange
      vi.mocked(execSync).mockReturnValue('shop-a/main') as any;

      const { runMultiShopManager } = await import('../../lib/core/index.js');
      vi.mocked(runMultiShopManager).mockRejectedValue(new Error('Shop manager failed'));

      const contextualDev = new ContextualDev();

      // Act & Assert
      await expect(contextualDev.run()).rejects.toThrow('Shop manager failed');
    });
  });

  describe('Git command execution', () => {
    test('executes git branch --show-current command', async () => {
      // Arrange
      vi.mocked(execSync).mockReturnValue('main') as any;

      const contextualDev = new ContextualDev();

      // Act
      await contextualDev.run();

      // Assert
      expect(execSync).toHaveBeenCalledWith(
        'git branch --show-current',
        { encoding: 'utf8' }
      );
    });

    test('uses utf8 encoding for git output', async () => {
      // Arrange
      vi.mocked(execSync).mockReturnValue('shop-a/main') as any;

      const contextualDev = new ContextualDev();

      // Act
      await contextualDev.run();

      // Assert
      const call = vi.mocked(execSync).mock.calls[0];
      expect(call[1]).toEqual({ encoding: 'utf8' });
    });
  });

  describe('Workflow delegation verification', () => {
    test('shop-specific branches use shop manager workflow', async () => {
      // Arrange
      vi.mocked(execSync).mockReturnValue('shop-a/promo') as any;

      const { runMultiShopManager } = await import('../../lib/core/index.js');
      const { startDevelopmentWorkflow } = await import('../../lib/core/dev-operations.js');

      const contextualDev = new ContextualDev();

      // Act
      await contextualDev.run();

      // Assert
      expect(runMultiShopManager).toHaveBeenCalled();
      expect(startDevelopmentWorkflow).not.toHaveBeenCalled();
    });

    test('feature branches (without slash) use contextual development workflow', async () => {
      // Arrange
      vi.mocked(execSync).mockReturnValue('main' as any);  // Branch without slash

      const { runMultiShopManager } = await import('../../lib/core/index.js');
      const { startDevelopmentWorkflow } = await import('../../lib/core/dev-operations.js');

      const contextualDev = new ContextualDev();

      // Act
      await contextualDev.run();

      // Assert
      expect(startDevelopmentWorkflow).toHaveBeenCalled();
      expect(runMultiShopManager).not.toHaveBeenCalled();
    });

    test('creates CLI context for feature branches (without slash)', async () => {
      // Arrange
      vi.mocked(execSync).mockReturnValue('develop' as any);  // Branch without slash

      const { createMultiShopCLI } = await import('../../lib/core/index.js');

      const contextualDev = new ContextualDev();

      // Act
      await contextualDev.run();

      // Assert
      expect(createMultiShopCLI).toHaveBeenCalled();
    });

    test('passes context to startDevelopmentWorkflow for non-slash branches', async () => {
      // Arrange
      vi.mocked(execSync).mockReturnValue('bugfix' as any);  // Branch without slash

      const { createMultiShopCLI } = await import('../../lib/core/index.js');
      const { startDevelopmentWorkflow } = await import('../../lib/core/dev-operations.js');

      const mockContext = {
        deps: { cwd: '/test', shopsDir: '/test/shops', credentialsDir: '/test/shops/credentials' },
        shopOps: {},
        credOps: {},
        devOps: {}
      };

      vi.mocked(createMultiShopCLI).mockReturnValue(mockContext as any);

      const contextualDev = new ContextualDev();

      // Act
      await contextualDev.run();

      // Assert
      expect(startDevelopmentWorkflow).toHaveBeenCalledWith(mockContext);
    });
  });

  describe('Branch pattern matching', () => {
    test('matches shop branch pattern with regex', async () => {
      // Arrange - Test various valid shop branch patterns
      const shopBranches = [
        'shop/main',
        'shop-a/main',
        'shop-1/staging',
        'my-shop/feature',
        'shop123/test',
        's/m' // Minimal case
      ];

      const { runMultiShopManager } = await import('../../lib/core/index.js');

      for (const branch of shopBranches) {
        vi.mocked(execSync).mockReturnValue(branch) as any;

        const contextualDev = new ContextualDev();

        // Act
        await contextualDev.run();

        // Assert
        expect(runMultiShopManager).toHaveBeenCalled();

        // Reset mocks between iterations
        vi.clearAllMocks();
      }
    });

    test('does not match feature branch patterns', async () => {
      // Arrange - Test various feature branch patterns
      const featureBranches = [
        'feature',
        'main',
        'develop',
        'bugfix',
        'hotfix-123',
        'test-branch'
      ];

      const { startDevelopmentWorkflow } = await import('../../lib/core/dev-operations.js');

      for (const branch of featureBranches) {
        vi.mocked(execSync).mockReturnValue(branch) as any;

        const contextualDev = new ContextualDev();

        // Act
        await contextualDev.run();

        // Assert
        expect(startDevelopmentWorkflow).toHaveBeenCalled();

        // Reset mocks between iterations
        vi.clearAllMocks();
      }
    });
  });

  describe('Console output', () => {
    test('logs detected shop-specific branch', async () => {
      // Arrange
      vi.mocked(execSync).mockReturnValue('shop-a/main') as any;
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const contextualDev = new ContextualDev();

      // Act
      await contextualDev.run();

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('shop-a/main'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Shop-specific branch detected'));

      consoleSpy.mockRestore();
    });

    test('logs detected feature branch', async () => {
      // Arrange
      vi.mocked(execSync).mockReturnValue('main' as any);  // Use branch without slash
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const contextualDev = new ContextualDev();

      // Act
      await contextualDev.run();

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('main'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Feature branch detected'));

      consoleSpy.mockRestore();
    });
  });
});
