/**
 * Unit tests for logger module
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';

describe('logger', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };

    // Mock console methods
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore environment
    process.env = originalEnv;

    // Restore console methods
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();

    // Clear module cache to reset logger instance
    vi.resetModules();
  });

  describe('log levels', () => {
    test('debug logs with correct format', async () => {
      // Arrange
      process.env['LOG_LEVEL'] = 'debug';
      vi.resetModules();
      const { logger } = await import('../../lib/core/logger.js');
      const message = 'Debug message';
      const meta = { key: 'value' };

      // Act
      logger.debug(message, meta);

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith(`🔍 ${message}`, meta);
    });

    test('info logs with correct format', async () => {
      // Arrange
      const { logger } = await import('../../lib/core/logger.js');
      const message = 'Info message';
      const meta = { key: 'value' };

      // Act
      logger.info(message, meta);

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith(`ℹ️  ${message}`, meta);
    });

    test('warn logs with correct format', async () => {
      // Arrange
      const { logger } = await import('../../lib/core/logger.js');
      const message = 'Warning message';
      const meta = { key: 'value' };

      // Act
      logger.warn(message, meta);

      // Assert
      expect(consoleWarnSpy).toHaveBeenCalledWith(`⚠️  ${message}`, meta);
    });

    test('error logs with correct format', async () => {
      // Arrange
      const { logger } = await import('../../lib/core/logger.js');
      const message = 'Error message';
      const meta = { key: 'value' };

      // Act
      logger.error(message, meta);

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith(`❌ ${message}`, meta);
    });
  });

  describe('metadata handling', () => {
    test('logs without metadata', async () => {
      // Arrange
      const { logger } = await import('../../lib/core/logger.js');
      const message = 'Simple message';

      // Act
      logger.info(message);

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith(`ℹ️  ${message}`, '');
    });

    test('logs with empty metadata object', async () => {
      // Arrange
      const { logger } = await import('../../lib/core/logger.js');
      const message = 'Message with empty meta';

      // Act
      logger.info(message, {});

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith(`ℹ️  ${message}`, '');
    });

    test('logs with metadata', async () => {
      // Arrange
      const { logger } = await import('../../lib/core/logger.js');
      const message = 'Message with metadata';
      const meta = { shopId: 'test-shop', action: 'create' };

      // Act
      logger.info(message, meta);

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith(`ℹ️  ${message}`, meta);
    });

    test('handles complex metadata', async () => {
      // Arrange
      const { logger } = await import('../../lib/core/logger.js');
      const message = 'Complex metadata';
      const meta = {
        nested: { key: 'value' },
        array: [1, 2, 3],
        boolean: true,
        number: 42
      };

      // Act
      logger.info(message, meta);

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith(`ℹ️  ${message}`, meta);
    });
  });

  describe('log level filtering', () => {
    test('debug level shows all logs', async () => {
      // Arrange
      process.env['LOG_LEVEL'] = 'debug';
      vi.resetModules();
      const { logger } = await import('../../lib/core/logger.js');

      // Act
      logger.debug('Debug');
      logger.info('Info');
      logger.warn('Warn');
      logger.error('Error');

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledTimes(2); // debug and info
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });

    test('info level hides debug logs', async () => {
      // Arrange
      process.env['LOG_LEVEL'] = 'info';
      vi.resetModules();
      const { logger } = await import('../../lib/core/logger.js');

      // Act
      logger.debug('Debug');
      logger.info('Info');
      logger.warn('Warn');
      logger.error('Error');

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledTimes(1); // only info
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });

    test('warn level hides debug and info logs', async () => {
      // Arrange
      process.env['LOG_LEVEL'] = 'warn';
      vi.resetModules();
      const { logger } = await import('../../lib/core/logger.js');

      // Act
      logger.debug('Debug');
      logger.info('Info');
      logger.warn('Warn');
      logger.error('Error');

      // Assert
      expect(consoleLogSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });

    test('error level shows only errors', async () => {
      // Arrange
      process.env['LOG_LEVEL'] = 'error';
      vi.resetModules();
      const { logger } = await import('../../lib/core/logger.js');

      // Act
      logger.debug('Debug');
      logger.info('Info');
      logger.warn('Warn');
      logger.error('Error');

      // Assert
      expect(consoleLogSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });

    test('defaults to info level when LOG_LEVEL not set', async () => {
      // Arrange
      delete process.env['LOG_LEVEL'];
      vi.resetModules();
      const { logger } = await import('../../lib/core/logger.js');

      // Act
      logger.debug('Debug');
      logger.info('Info');

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledTimes(1); // only info, no debug
    });
  });

  describe('startOperation', () => {
    test('returns a function', async () => {
      // Arrange
      const { logger } = await import('../../lib/core/logger.js');

      // Act
      const endOperation = logger.startOperation('test-operation');

      // Assert
      expect(typeof endOperation).toBe('function');
    });

    test('accepts operation name', async () => {
      // Arrange
      const { logger } = await import('../../lib/core/logger.js');

      // Act
      const endOperation = logger.startOperation('create-shop');

      // Assert
      expect(endOperation).toBeDefined();
    });

    test('accepts operation context', async () => {
      // Arrange
      const { logger } = await import('../../lib/core/logger.js');
      const context = { shopId: 'test-shop', action: 'create' };

      // Act
      const endOperation = logger.startOperation('create-shop', context);

      // Assert
      expect(endOperation).toBeDefined();
    });

    test('end operation function accepts result', async () => {
      // Arrange
      const { logger } = await import('../../lib/core/logger.js');
      const endOperation = logger.startOperation('test-op');

      // Act & Assert (should not throw)
      endOperation('success');
    });

    test('end operation function accepts metadata', async () => {
      // Arrange
      const { logger } = await import('../../lib/core/logger.js');
      const endOperation = logger.startOperation('test-op');
      const meta = { duration: 100, status: 'ok' };

      // Act & Assert (should not throw)
      endOperation('success', meta);
    });

    test('end operation can be called without arguments', async () => {
      // Arrange
      const { logger } = await import('../../lib/core/logger.js');
      const endOperation = logger.startOperation('test-op');

      // Act & Assert (should not throw)
      endOperation();
    });

    test('multiple operations can be tracked', async () => {
      // Arrange
      const { logger } = await import('../../lib/core/logger.js');

      // Act
      const op1 = logger.startOperation('operation-1');
      const op2 = logger.startOperation('operation-2');
      const op3 = logger.startOperation('operation-3');

      // Assert
      expect(op1).toBeDefined();
      expect(op2).toBeDefined();
      expect(op3).toBeDefined();
      expect(op1).not.toBe(op2);
      expect(op2).not.toBe(op3);
    });
  });

  describe('flush', () => {
    test('flush returns a promise', async () => {
      // Arrange
      const { logger } = await import('../../lib/core/logger.js');

      // Act
      const result = logger.flush();

      // Assert
      expect(result).toBeInstanceOf(Promise);
    });

    test('flush resolves successfully', async () => {
      // Arrange
      const { logger } = await import('../../lib/core/logger.js');

      // Act & Assert (should not throw)
      await expect(logger.flush()).resolves.toBeUndefined();
    });

    test('flush can be called multiple times', async () => {
      // Arrange
      const { logger } = await import('../../lib/core/logger.js');

      // Act & Assert
      await logger.flush();
      await logger.flush();
      await logger.flush();
    });

    test('flush after logging', async () => {
      // Arrange
      const { logger } = await import('../../lib/core/logger.js');

      // Act
      logger.info('Message 1');
      logger.warn('Message 2');
      await logger.flush();

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('createLogger factory', () => {
    test('creates logger with custom default level', async () => {
      // Arrange
      delete process.env['LOG_LEVEL'];
      vi.resetModules();

      // Act
      const module = await import('../../lib/core/logger.js');

      // Assert
      expect(module.logger).toBeDefined();
      expect(module.logger.debug).toBeDefined();
      expect(module.logger.info).toBeDefined();
      expect(module.logger.warn).toBeDefined();
      expect(module.logger.error).toBeDefined();
    });

    test('logger has all required methods', async () => {
      // Arrange
      const { logger } = await import('../../lib/core/logger.js');

      // Assert
      expect(typeof logger.debug).toBe('function');
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.startOperation).toBe('function');
      expect(typeof logger.flush).toBe('function');
    });
  });

  describe('edge cases', () => {
    test('handles undefined metadata gracefully', async () => {
      // Arrange
      const { logger } = await import('../../lib/core/logger.js');

      // Act & Assert (should not throw)
      logger.info('Message', undefined);
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    test('handles null in metadata', async () => {
      // Arrange
      const { logger } = await import('../../lib/core/logger.js');
      const meta = { value: null };

      // Act
      logger.info('Message', meta);

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith('ℹ️  Message', meta);
    });

    test('handles empty string message', async () => {
      // Arrange
      const { logger } = await import('../../lib/core/logger.js');

      // Act
      logger.info('');

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith('ℹ️  ', '');
    });

    test('handles very long messages', async () => {
      // Arrange
      const { logger } = await import('../../lib/core/logger.js');
      const longMessage = 'A'.repeat(10000);

      // Act
      logger.info(longMessage);

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith(`ℹ️  ${longMessage}`, '');
    });

    test('handles special characters in message', async () => {
      // Arrange
      const { logger } = await import('../../lib/core/logger.js');
      const message = 'Message with \n newline \t tab 🎉 emoji';

      // Act
      logger.info(message);

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith(`ℹ️  ${message}`, '');
    });
  });
});
