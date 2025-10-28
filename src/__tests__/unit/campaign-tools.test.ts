import { describe, test, expect, vi, beforeEach } from 'vitest';
import type { CLIContext } from '../../lib/core/types.js';

// Mock @clack/prompts
vi.mock('@clack/prompts', () => ({
  select: vi.fn(),
  text: vi.fn(),
  confirm: vi.fn(),
  isCancel: vi.fn(),
  note: vi.fn(),
  spinner: vi.fn(() => ({
    start: vi.fn(),
    message: vi.fn(),
    stop: vi.fn()
  }))
}));

// Mock child_process
vi.mock('child_process', () => ({
  execSync: vi.fn()
}));

describe('campaign-tools', () => {
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

  describe('handleCampaignTools', () => {
    test('shows campaign tools menu', async () => {
      // Arrange
      const { select, isCancel } = await import('@clack/prompts');
      vi.mocked(select).mockResolvedValue('create');
      vi.mocked(isCancel).mockReturnValue(true); // Cancel after menu shows

      const { handleCampaignTools } = await import('../../lib/core/campaign-tools.js');

      // Act
      await handleCampaignTools(mockContext);

      // Assert - Menu was shown with options
      expect(select).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Select campaign tool:",
          options: expect.arrayContaining([
            expect.objectContaining({ value: "create", label: "Create Promo Branch" }),
            expect.objectContaining({ value: "push", label: "Push Promo to Main" }),
            expect.objectContaining({ value: "end", label: "End Promo" }),
            expect.objectContaining({ value: "list", label: "List Active Promos" })
          ])
        })
      );
    });

    test('returns error when cancelled', async () => {
      // Arrange
      const { select, isCancel } = await import('@clack/prompts');
      vi.mocked(select).mockResolvedValue('create');
      vi.mocked(isCancel).mockReturnValue(true);

      const { handleCampaignTools } = await import('../../lib/core/campaign-tools.js');

      // Act
      const result = await handleCampaignTools(mockContext);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain("No tool selected");
    });
  });

  describe('Create Promo Branch', () => {
    test('creates promo branch from shop main', async () => {
      // Arrange
      const { select, text, isCancel } = await import('@clack/prompts');
      const { execSync } = await import('child_process');

      vi.mocked(mockContext.shopOps.listShops).mockResolvedValue({
        success: true,
        data: ['shop-a', 'shop-b']
      });

      vi.mocked(select)
        .mockResolvedValueOnce('create')  // Campaign tool choice
        .mockResolvedValueOnce('shop-a'); // Shop selection

      vi.mocked(text).mockResolvedValue('summer-sale');
      vi.mocked(isCancel).mockReturnValue(false);

      vi.mocked(execSync).mockImplementation((cmd) => {
        const command = typeof cmd === 'string' ? cmd : '';
        // Return strings (not Buffers) since code uses encoding: 'utf8'
        if (command.includes('git rev-parse')) return 'sha123' as any;
        if (command.includes('git checkout -b')) return 'Switched to branch' as any;
        if (command.includes('git push')) return 'Branch pushed' as any;
        if (command.includes('git branch --show-current')) return 'main' as any;
        return '' as any;
      });

      const { handleCampaignTools } = await import('../../lib/core/campaign-tools.js');

      // Act
      const result = await handleCampaignTools(mockContext);

      // Assert - Test behavior, not implementation details
      expect(result.success).toBe(true);
      expect(execSync).toHaveBeenCalled(); // Verify git commands were called
      const calls = vi.mocked(execSync).mock.calls.map(call => call[0]);
      const callsStr = calls.join(' ');
      expect(callsStr).toContain('shop-a/promo-summer-sale'); // Branch name used
    });

    test('validates promo name format', async () => {
      // Arrange
      const { select, text, isCancel } = await import('@clack/prompts');

      vi.mocked(mockContext.shopOps.listShops).mockResolvedValue({
        success: true,
        data: ['shop-a']
      });

      vi.mocked(select)
        .mockResolvedValueOnce('create')
        .mockResolvedValueOnce('shop-a');

      // Mock text to return invalid name
      let validateFn: ((value: string) => string | undefined) | undefined;
      vi.mocked(text).mockImplementation((config: any) => {
        validateFn = config.validate;
        return Promise.resolve('INVALID-NAME');
      });

      vi.mocked(isCancel).mockReturnValue(false);

      const { handleCampaignTools } = await import('../../lib/core/campaign-tools.js');

      // Act
      await handleCampaignTools(mockContext);

      // Assert - Validation function rejects uppercase
      expect(validateFn).toBeDefined();
      expect(validateFn?.('INVALID')).toBeTruthy(); // Should return error message
      expect(validateFn?.('valid-promo-name')).toBeUndefined(); // Should accept valid name
    });

    test('shows error when base branch does not exist', async () => {
      // Arrange
      const { select, text, isCancel } = await import('@clack/prompts');
      const { execSync } = await import('child_process');

      vi.mocked(mockContext.shopOps.listShops).mockResolvedValue({
        success: true,
        data: ['shop-a']
      });

      vi.mocked(select)
        .mockResolvedValueOnce('create')
        .mockResolvedValueOnce('shop-a');

      vi.mocked(text).mockResolvedValue('summer-sale');
      vi.mocked(isCancel).mockReturnValue(false);

      // Mock git rev-parse to fail (branch doesn't exist)
      vi.mocked(execSync).mockImplementation((cmd) => {
        if (typeof cmd === 'string' && cmd.includes('git rev-parse')) {
          throw new Error('Branch not found');
        }
        return Buffer.from('');
      });

      const { handleCampaignTools } = await import('../../lib/core/campaign-tools.js');

      // Act
      const result = await handleCampaignTools(mockContext);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Base branch');
    });
  });

  describe('Push Promo to Main', () => {
    test('creates PR from promo branch to shop main', async () => {
      // Arrange
      const { select, confirm, isCancel } = await import('@clack/prompts');
      const { execSync } = await import('child_process');

      vi.mocked(select).mockResolvedValue('push');
      vi.mocked(confirm).mockResolvedValue(true);
      vi.mocked(isCancel).mockReturnValue(false);

      vi.mocked(execSync).mockImplementation((cmd) => {
        const command = typeof cmd === 'string' ? cmd : '';
        if (command.includes('git branch --show-current')) {
          return 'shop-a/promo-summer-sale' as any;
        }
        if (command.includes('gh pr create')) {
          return 'PR created' as any;
        }
        return '' as any;
      });

      const { handleCampaignTools } = await import('../../lib/core/campaign-tools.js');

      // Act
      const result = await handleCampaignTools(mockContext);

      // Assert
      expect(result.success).toBe(true);
      expect(execSync).toHaveBeenCalledWith(
        expect.stringContaining('gh pr create --base shop-a/main --head shop-a/promo-summer-sale'),
        expect.any(Object)
      );
    });

    test('rejects when not on promo branch', async () => {
      // Arrange
      const { select, isCancel } = await import('@clack/prompts');
      const { execSync } = await import('child_process');

      vi.mocked(select).mockResolvedValue('push');
      vi.mocked(isCancel).mockReturnValue(false);

      vi.mocked(execSync).mockReturnValue('main' as any); // Not on promo branch

      const { handleCampaignTools } = await import('../../lib/core/campaign-tools.js');

      // Act
      const result = await handleCampaignTools(mockContext);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain("Not on promo branch");
    });
  });

  describe('End Promo', () => {
    test('deletes promo branch after confirmation', async () => {
      // Arrange
      const { select, confirm, isCancel } = await import('@clack/prompts');
      const { execSync } = await import('child_process');

      vi.mocked(select).mockResolvedValue('end');
      vi.mocked(confirm).mockResolvedValue(true); // Confirm deletion
      vi.mocked(isCancel).mockReturnValue(false);

      vi.mocked(execSync).mockImplementation((cmd) => {
        const command = typeof cmd === 'string' ? cmd : '';
        if (command.includes('git branch --show-current')) {
          return 'shop-a/promo-summer-sale' as any;
        }
        if (command.includes('git checkout')) return '' as any;
        if (command.includes('git branch -D')) return '' as any;
        if (command.includes('git push')) return '' as any;
        return '' as any;
      });

      const { handleCampaignTools } = await import('../../lib/core/campaign-tools.js');

      // Act
      const result = await handleCampaignTools(mockContext);

      // Assert
      expect(result.success).toBe(true);
      expect(execSync).toHaveBeenCalledWith('git checkout shop-a/main');
      expect(execSync).toHaveBeenCalledWith('git branch -D shop-a/promo-summer-sale');
      expect(execSync).toHaveBeenCalledWith('git push origin --delete shop-a/promo-summer-sale');
    });

    test('cancels when user declines confirmation', async () => {
      // Arrange
      const { select, confirm, isCancel } = await import('@clack/prompts');
      const { execSync } = await import('child_process');

      vi.mocked(select).mockResolvedValue('end');
      vi.mocked(confirm).mockResolvedValue(false); // Decline deletion
      vi.mocked(isCancel).mockReturnValue(false);

      vi.mocked(execSync).mockReturnValue('shop-a/promo-summer-sale' as any);

      const { handleCampaignTools } = await import('../../lib/core/campaign-tools.js');

      // Act
      const result = await handleCampaignTools(mockContext);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain("Cancelled");
    });
  });

  describe('List Active Promos', () => {
    test('lists all promo branches', async () => {
      // Arrange
      const { select, isCancel, note } = await import('@clack/prompts');
      const { execSync } = await import('child_process');

      vi.mocked(select).mockResolvedValue('list');
      vi.mocked(isCancel).mockReturnValue(false);

      vi.mocked(execSync).mockReturnValue(`
        origin/shop-a/promo-summer-sale
        origin/shop-a/main
        origin/shop-b/promo-black-friday
        origin/shop-b/staging
      ` as any);

      const { handleCampaignTools } = await import('../../lib/core/campaign-tools.js');

      // Act
      const result = await handleCampaignTools(mockContext);

      // Assert
      expect(result.success).toBe(true);
      expect(note).toHaveBeenCalledWith(
        expect.stringContaining("2 active promo"),
        expect.any(String)
      );
    });

    test('handles no active promos', async () => {
      // Arrange
      const { select, isCancel, note } = await import('@clack/prompts');
      const { execSync } = await import('child_process');

      vi.mocked(select).mockResolvedValue('list');
      vi.mocked(isCancel).mockReturnValue(false);

      vi.mocked(execSync).mockReturnValue(`
        origin/shop-a/main
        origin/shop-a/staging
        origin/shop-b/main
      ` as any);

      const { handleCampaignTools } = await import('../../lib/core/campaign-tools.js');

      // Act
      const result = await handleCampaignTools(mockContext);

      // Assert
      expect(result.success).toBe(true);
      expect(note).toHaveBeenCalledWith(
        "No active promo branches found",
        expect.any(String)
      );
    });
  });
});
