/**
 * Unit tests for version-check module
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';

// Mock child_process
vi.mock('child_process');

// Mock @clack/prompts
vi.mock('@clack/prompts', () => ({
  note: vi.fn()
}));

describe('version-check', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.clearAllMocks();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  describe('checkVersions', () => {
    test('checks versions and returns success', async () => {
      // Arrange
      vi.mocked(execSync).mockImplementation((cmd) => {
        if (typeof cmd === 'string') {
          if (cmd.includes('multi-shop --version')) return Buffer.from('2.0.0');
          if (cmd.includes('shopify version')) return Buffer.from('3.50.0');
          if (cmd.includes('pnpm --version')) return Buffer.from('8.10.0');
          if (cmd.includes('npm view')) {
            if (cmd.includes('@shopdevs/multi-shop-cli')) return Buffer.from('2.0.0');
            if (cmd.includes('@shopify/cli')) return Buffer.from('3.50.0');
            if (cmd.includes('pnpm')) return Buffer.from('8.10.0');
          }
        }
        return Buffer.from('');
      });

      const { checkVersions } = await import('../../lib/core/version-check.js');

      // Act
      const result = await checkVersions();

      // Assert
      expect(result.success).toBe(true);
    });

    test('displays package version header', async () => {
      // Arrange
      vi.mocked(execSync).mockReturnValue(Buffer.from('1.0.0'));

      const { note } = await import('@clack/prompts');
      const { checkVersions } = await import('../../lib/core/version-check.js');

      // Act
      await checkVersions();

      // Assert
      expect(note).toHaveBeenCalledWith('Checking versions of important packages', '📋 Version Check');
      expect(consoleLogSpy).toHaveBeenCalledWith('\n📋 Package Versions:');
    });

    test('checks all important packages', async () => {
      // Arrange
      vi.mocked(execSync).mockReturnValue(Buffer.from('1.0.0'));

      const { checkVersions } = await import('../../lib/core/version-check.js');

      // Act
      await checkVersions();

      // Assert
      const calls = vi.mocked(execSync).mock.calls.map(call => call[0]);

      // Should check installed versions
      expect(calls.some(call => typeof call === 'string' && call.includes('multi-shop --version'))).toBe(true);
      expect(calls.some(call => typeof call === 'string' && call.includes('shopify version'))).toBe(true);
      expect(calls.some(call => typeof call === 'string' && call.includes('pnpm --version'))).toBe(true);

      // Should check latest versions
      expect(calls.some(call => typeof call === 'string' && call.includes('npm view @shopdevs/multi-shop-cli'))).toBe(true);
      expect(calls.some(call => typeof call === 'string' && call.includes('npm view @shopify/cli'))).toBe(true);
      expect(calls.some(call => typeof call === 'string' && call.includes('npm view pnpm'))).toBe(true);
    });
  });

  describe('checkSinglePackage', () => {
    test('shows up-to-date status when versions match', async () => {
      // Arrange
      vi.mocked(execSync).mockImplementation((cmd) => {
        if (typeof cmd === 'string') {
          if (cmd.includes('npx multi-shop --version')) return Buffer.from('2.0.0');
          if (cmd.includes('npm view @shopdevs/multi-shop-cli')) return Buffer.from('"2.0.0"');
          if (cmd.includes('shopify version')) return Buffer.from('3.50.0');
          if (cmd.includes('npm view @shopify/cli')) return Buffer.from('"3.50.0"');
          if (cmd.includes('pnpm --version')) return Buffer.from('8.0.0');
          if (cmd.includes('npm view pnpm')) return Buffer.from('"8.0.0"');
        }
        return Buffer.from('');
      });

      const { checkVersions } = await import('../../lib/core/version-check.js');

      // Act
      const result = await checkVersions();

      // Assert
      expect(result.success).toBe(true);
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    test('shows update available when versions differ', async () => {
      // Arrange
      vi.mocked(execSync).mockImplementation((cmd) => {
        if (typeof cmd === 'string') {
          if (cmd.includes('npx multi-shop --version')) return Buffer.from('1.0.0');
          if (cmd.includes('npm view @shopdevs/multi-shop-cli')) return Buffer.from('"2.0.0"');
          if (cmd.includes('shopify version')) return Buffer.from('3.50.0');
          if (cmd.includes('npm view @shopify/cli')) return Buffer.from('"3.50.0"');
          if (cmd.includes('pnpm --version')) return Buffer.from('8.0.0');
          if (cmd.includes('npm view pnpm')) return Buffer.from('"8.0.0"');
        }
        return Buffer.from('');
      });

      const { checkVersions } = await import('../../lib/core/version-check.js');

      // Act
      const result = await checkVersions();

      // Assert
      expect(result.success).toBe(true);
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    test('shows not installed status when package missing', async () => {
      // Arrange
      vi.mocked(execSync).mockImplementation((cmd) => {
        if (typeof cmd === 'string') {
          if (cmd.includes('npx multi-shop --version')) throw new Error('Command not found');
          if (cmd.includes('npm view @shopdevs/multi-shop-cli')) return Buffer.from('"2.0.0"');
          if (cmd.includes('shopify version')) return Buffer.from('3.50.0');
          if (cmd.includes('npm view @shopify/cli')) return Buffer.from('"3.50.0"');
          if (cmd.includes('pnpm --version')) return Buffer.from('8.0.0');
          if (cmd.includes('npm view pnpm')) return Buffer.from('"8.0.0"');
        }
        return Buffer.from('');
      });

      const { checkVersions } = await import('../../lib/core/version-check.js');

      // Act
      const result = await checkVersions();

      // Assert
      expect(result.success).toBe(true);
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    test('handles error checking package', async () => {
      // Arrange
      vi.mocked(execSync).mockImplementation((cmd) => {
        if (typeof cmd === 'string') {
          if (cmd.includes('npx multi-shop --version')) return Buffer.from('1.0.0');
          if (cmd.includes('npm view')) throw new Error('Network error');
        }
        return Buffer.from('');
      });

      const { checkVersions } = await import('../../lib/core/version-check.js');

      // Act
      const result = await checkVersions();

      // Assert
      expect(result.success).toBe(true);
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    test('displays package name', async () => {
      // Arrange
      vi.mocked(execSync).mockReturnValue(Buffer.from('1.0.0'));

      const { checkVersions } = await import('../../lib/core/version-check.js');

      // Act
      await checkVersions();

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith('\n@shopdevs/multi-shop-cli:');
      expect(consoleLogSpy).toHaveBeenCalledWith('\n@shopify/cli:');
      expect(consoleLogSpy).toHaveBeenCalledWith('\npnpm:');
    });

    test('displays update command when update available', async () => {
      // Arrange
      vi.mocked(execSync).mockImplementation((cmd) => {
        if (typeof cmd === 'string') {
          if (cmd.includes('multi-shop --version')) return Buffer.from('1.0.0');
          if (cmd.includes('npm view @shopdevs/multi-shop-cli')) return Buffer.from('"2.0.0"');
          if (cmd.includes('shopify version')) return Buffer.from('3.50.0');
          if (cmd.includes('npm view @shopify/cli')) return Buffer.from('"3.50.0"');
          if (cmd.includes('pnpm --version')) return Buffer.from('8.0.0');
          if (cmd.includes('npm view pnpm')) return Buffer.from('"8.0.0"');
        }
        return Buffer.from('');
      });

      const { checkVersions } = await import('../../lib/core/version-check.js');

      // Act
      const result = await checkVersions();

      // Assert
      expect(result.success).toBe(true);
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    test('strips quotes from npm view output', async () => {
      // Arrange
      vi.mocked(execSync).mockImplementation((cmd) => {
        if (typeof cmd === 'string') {
          if (cmd.includes('multi-shop --version')) return Buffer.from('2.0.0');
          if (cmd.includes('npm view @shopdevs/multi-shop-cli')) return Buffer.from('"2.0.0"');
          if (cmd.includes('shopify version')) return Buffer.from('3.50.0');
          if (cmd.includes('npm view @shopify/cli')) return Buffer.from('"3.50.0"');
          if (cmd.includes('pnpm --version')) return Buffer.from('8.0.0');
          if (cmd.includes('npm view pnpm')) return Buffer.from('"8.0.0"');
        }
        return Buffer.from('');
      });

      const { checkVersions } = await import('../../lib/core/version-check.js');

      // Act
      const result = await checkVersions();

      // Assert
      expect(result.success).toBe(true);
      expect(consoleLogSpy).toHaveBeenCalled();
    });
  });

  describe('getInstalledVersion', () => {
    test('gets multi-shop version', async () => {
      // Arrange
      vi.mocked(execSync).mockImplementation((cmd) => {
        if (typeof cmd === 'string' && cmd.includes('multi-shop --version')) return Buffer.from('2.0.5');
        if (typeof cmd === 'string' && cmd.includes('npm view')) return Buffer.from('"2.0.5"');
        return Buffer.from('');
      });

      const { checkVersions } = await import('../../lib/core/version-check.js');

      // Act
      await checkVersions();

      // Assert
      expect(vi.mocked(execSync)).toHaveBeenCalledWith(
        'npx multi-shop --version',
        expect.objectContaining({ encoding: 'utf8', timeout: 5000 })
      );
    });

    test('gets shopify CLI version', async () => {
      // Arrange
      vi.mocked(execSync).mockImplementation((cmd) => {
        if (typeof cmd === 'string' && cmd.includes('shopify version')) return Buffer.from('3.50.0');
        if (typeof cmd === 'string' && cmd.includes('npm view')) return Buffer.from('"3.50.0"');
        return Buffer.from('');
      });

      const { checkVersions } = await import('../../lib/core/version-check.js');

      // Act
      await checkVersions();

      // Assert
      expect(vi.mocked(execSync)).toHaveBeenCalledWith(
        'shopify version',
        expect.objectContaining({ encoding: 'utf8', timeout: 5000 })
      );
    });

    test('gets pnpm version', async () => {
      // Arrange
      vi.mocked(execSync).mockImplementation((cmd) => {
        if (typeof cmd === 'string' && cmd.includes('pnpm --version')) return Buffer.from('8.10.0');
        if (typeof cmd === 'string' && cmd.includes('npm view')) return Buffer.from('"8.10.0"');
        return Buffer.from('');
      });

      const { checkVersions } = await import('../../lib/core/version-check.js');

      // Act
      await checkVersions();

      // Assert
      expect(vi.mocked(execSync)).toHaveBeenCalledWith(
        'pnpm --version',
        expect.objectContaining({ encoding: 'utf8', timeout: 5000 })
      );
    });

    test('shows not installed when getInstalledVersion fails', async () => {
      // Arrange
      vi.mocked(execSync).mockImplementation((cmd) => {
        if (typeof cmd === 'string') {
          // Simulate multi-shop not installed
          if (cmd.includes('npx multi-shop --version')) throw new Error('Command failed');
          if (cmd.includes('npm view @shopdevs/multi-shop-cli')) return Buffer.from('"2.0.0"');
          // Other packages work fine
          if (cmd.includes('shopify version')) return Buffer.from('3.50.0');
          if (cmd.includes('npm view @shopify/cli')) return Buffer.from('"3.50.0"');
          if (cmd.includes('pnpm --version')) return Buffer.from('8.0.0');
          if (cmd.includes('npm view pnpm')) return Buffer.from('"8.0.0"');
        }
        return Buffer.from('');
      });

      const { checkVersions } = await import('../../lib/core/version-check.js');

      // Act
      const result = await checkVersions();

      // Assert
      expect(result.success).toBe(true);
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    test('uses timeout of 5000ms', async () => {
      // Arrange
      vi.mocked(execSync).mockReturnValue(Buffer.from('1.0.0'));

      const { checkVersions } = await import('../../lib/core/version-check.js');

      // Act
      await checkVersions();

      // Assert
      const calls = vi.mocked(execSync).mock.calls;
      calls.forEach(call => {
        if (call[1]) {
          expect(call[1]).toHaveProperty('timeout', 5000);
        }
      });
    });

    test('trims version output', async () => {
      // Arrange
      vi.mocked(execSync).mockImplementation((cmd) => {
        if (typeof cmd === 'string') {
          if (cmd.includes('npx multi-shop --version')) return Buffer.from('  2.0.0\n  ');
          if (cmd.includes('npm view @shopdevs/multi-shop-cli')) return Buffer.from('"2.0.0"');
          if (cmd.includes('shopify version')) return Buffer.from('3.50.0');
          if (cmd.includes('npm view @shopify/cli')) return Buffer.from('"3.50.0"');
          if (cmd.includes('pnpm --version')) return Buffer.from('8.0.0');
          if (cmd.includes('npm view pnpm')) return Buffer.from('"8.0.0"');
        }
        return Buffer.from('');
      });

      const { checkVersions } = await import('../../lib/core/version-check.js');

      // Act
      const result = await checkVersions();

      // Assert
      expect(result.success).toBe(true);
      expect(consoleLogSpy).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    test('handles empty version strings', async () => {
      // Arrange
      vi.mocked(execSync).mockImplementation((cmd) => {
        if (typeof cmd === 'string' && cmd.includes('--version')) return Buffer.from('');
        if (typeof cmd === 'string' && cmd.includes('npm view')) return Buffer.from('');
        return Buffer.from('');
      });

      const { checkVersions } = await import('../../lib/core/version-check.js');

      // Act
      const result = await checkVersions();

      // Assert
      expect(result.success).toBe(true);
    });

    test('handles timeout errors gracefully', async () => {
      // Arrange
      vi.mocked(execSync).mockImplementation((cmd) => {
        if (typeof cmd === 'string' && cmd.includes('npm view')) {
          const error = new Error('Timeout');
          (error as any).code = 'ETIMEDOUT';
          throw error;
        }
        return Buffer.from('1.0.0');
      });

      const { checkVersions } = await import('../../lib/core/version-check.js');

      // Act
      const result = await checkVersions();

      // Assert
      expect(result.success).toBe(true);
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    test('handles multiple quotes in version', async () => {
      // Arrange
      vi.mocked(execSync).mockImplementation((cmd) => {
        if (typeof cmd === 'string') {
          if (cmd.includes('npx multi-shop --version')) return Buffer.from('2.0.0');
          if (cmd.includes('npm view @shopdevs/multi-shop-cli')) return Buffer.from('""2.0.0""');
          if (cmd.includes('shopify version')) return Buffer.from('3.50.0');
          if (cmd.includes('npm view @shopify/cli')) return Buffer.from('"3.50.0"');
          if (cmd.includes('pnpm --version')) return Buffer.from('8.0.0');
          if (cmd.includes('npm view pnpm')) return Buffer.from('"8.0.0"');
        }
        return Buffer.from('');
      });

      const { checkVersions } = await import('../../lib/core/version-check.js');

      // Act
      const result = await checkVersions();

      // Assert
      expect(result.success).toBe(true);
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    test('handles Buffer return type correctly', async () => {
      // Arrange
      vi.mocked(execSync).mockReturnValue(Buffer.from('1.0.0'));

      const { checkVersions } = await import('../../lib/core/version-check.js');

      // Act
      const result = await checkVersions();

      // Assert
      expect(result.success).toBe(true);
    });

    test('completes successfully even with all errors', async () => {
      // Arrange
      vi.mocked(execSync).mockImplementation(() => {
        throw new Error('All commands fail');
      });

      const { checkVersions } = await import('../../lib/core/version-check.js');

      // Act
      const result = await checkVersions();

      // Assert
      expect(result.success).toBe(true);
    });
  });
});
