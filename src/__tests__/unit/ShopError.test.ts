/**
 * Unit tests for ShopError and error hierarchy
 */

import { describe, test, expect, beforeEach } from 'vitest';
import {
  ShopError,
  ShopConfigurationError,
  ShopValidationError,
  ShopCredentialError,
  ShopBranchError,
  ShopCommandError,
  ShopNetworkError
} from '../../lib/errors/ShopError.js';

describe('ShopError', () => {
  describe('constructor', () => {
    test('creates error with message, code, and details', () => {
      // Arrange
      const message = 'Test error message';
      const code = 'TEST_ERROR';
      const details = { key: 'value', number: 42 };

      // Act
      const error = new ShopError(message, code, details);

      // Assert
      expect(error.message).toBe(message);
      expect(error.code).toBe(code);
      expect(error.details).toEqual(details);
      expect(error.name).toBe('ShopError');
      expect(error.timestamp).toBeDefined();
      expect(typeof error.timestamp).toBe('string');
    });

    test('creates error with default empty details', () => {
      // Arrange
      const message = 'Test error';
      const code = 'TEST_CODE';

      // Act
      const error = new ShopError(message, code);

      // Assert
      expect(error.details).toEqual({});
    });

    test('captures stack trace', () => {
      // Arrange & Act
      const error = new ShopError('Test error', 'TEST_CODE');

      // Assert
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('ShopError');
    });

    test('sets correct error name', () => {
      // Arrange & Act
      const error = new ShopError('Test error', 'TEST_CODE');

      // Assert
      expect(error.name).toBe('ShopError');
    });

    test('timestamp is valid ISO string', () => {
      // Arrange & Act
      const error = new ShopError('Test error', 'TEST_CODE');

      // Assert
      const timestamp = new Date(error.timestamp);
      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.getTime()).not.toBeNaN();
    });

    test('is instance of Error', () => {
      // Arrange & Act
      const error = new ShopError('Test error', 'TEST_CODE');

      // Assert
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ShopError);
    });
  });

  describe('toJSON', () => {
    test('serializes error to JSON object', () => {
      // Arrange
      const message = 'Test error message';
      const code = 'TEST_ERROR';
      const details = { shopId: 'test-shop' };
      const error = new ShopError(message, code, details);

      // Act
      const json = error.toJSON();

      // Assert
      expect(json).toHaveProperty('name', 'ShopError');
      expect(json).toHaveProperty('message', message);
      expect(json).toHaveProperty('code', code);
      expect(json).toHaveProperty('details', details);
      expect(json).toHaveProperty('timestamp');
      expect(json).toHaveProperty('stack');
    });

    test('includes stack trace in JSON', () => {
      // Arrange
      const error = new ShopError('Test error', 'TEST_CODE');

      // Act
      const json = error.toJSON();

      // Assert
      expect(json.stack).toBeDefined();
      expect(typeof json.stack).toBe('string');
    });

    test('serialized JSON is a plain object', () => {
      // Arrange
      const error = new ShopError('Test error', 'TEST_CODE');

      // Act
      const json = error.toJSON();

      // Assert
      expect(Object.getPrototypeOf(json)).toBe(Object.prototype);
    });
  });
});

describe('ShopConfigurationError', () => {
  test('creates configuration error with shopId', () => {
    // Arrange
    const message = 'Invalid configuration';
    const shopId = 'test-shop';

    // Act
    const error = new ShopConfigurationError(message, shopId);

    // Assert
    expect(error.message).toBe(message);
    expect(error.code).toBe('SHOP_CONFIG_ERROR');
    expect(error.details).toHaveProperty('shopId', shopId);
    expect(error.name).toBe('ShopConfigurationError');
  });

  test('includes additional details', () => {
    // Arrange
    const message = 'Invalid configuration';
    const shopId = 'test-shop';
    const additionalDetails = { field: 'domain', reason: 'invalid format' };

    // Act
    const error = new ShopConfigurationError(message, shopId, additionalDetails);

    // Assert
    expect(error.details).toEqual({ shopId, ...additionalDetails });
  });

  test('is instance of ShopError', () => {
    // Arrange & Act
    const error = new ShopConfigurationError('Test', 'shop-id');

    // Assert
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ShopError);
    expect(error).toBeInstanceOf(ShopConfigurationError);
  });

  test('serializes to JSON correctly', () => {
    // Arrange
    const error = new ShopConfigurationError('Config error', 'my-shop');

    // Act
    const json = error.toJSON();

    // Assert
    expect(json.name).toBe('ShopConfigurationError');
    expect(json.code).toBe('SHOP_CONFIG_ERROR');
    expect(json.details).toHaveProperty('shopId', 'my-shop');
  });
});

describe('ShopValidationError', () => {
  test('creates validation error with field and value', () => {
    // Arrange
    const message = 'Validation failed';
    const field = 'domain';
    const value = 'invalid.com';

    // Act
    const error = new ShopValidationError(message, field, value);

    // Assert
    expect(error.message).toBe(message);
    expect(error.code).toBe('SHOP_VALIDATION_ERROR');
    expect(error.details).toHaveProperty('field', field);
    expect(error.details).toHaveProperty('value', value);
    expect(error.name).toBe('ShopValidationError');
  });

  test('includes additional details', () => {
    // Arrange
    const message = 'Validation failed';
    const field = 'shopId';
    const value = 'BAD_ID';
    const additionalDetails = { expected: 'lowercase-with-hyphens' };

    // Act
    const error = new ShopValidationError(message, field, value, additionalDetails);

    // Assert
    expect(error.details).toEqual({ field, value, ...additionalDetails });
  });

  test('handles complex value types', () => {
    // Arrange
    const message = 'Invalid object';
    const field = 'config';
    const value = { nested: { key: 'value' }, array: [1, 2, 3] };

    // Act
    const error = new ShopValidationError(message, field, value);

    // Assert
    expect(error.details.value).toEqual(value);
  });

  test('is instance of ShopError', () => {
    // Arrange & Act
    const error = new ShopValidationError('Test', 'field', 'value');

    // Assert
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ShopError);
    expect(error).toBeInstanceOf(ShopValidationError);
  });
});

describe('ShopCredentialError', () => {
  test('creates credential error with shopId and environment', () => {
    // Arrange
    const message = 'Credential error';
    const shopId = 'test-shop';
    const environment = 'production';

    // Act
    const error = new ShopCredentialError(message, shopId, environment);

    // Assert
    expect(error.message).toBe(message);
    expect(error.code).toBe('SHOP_CREDENTIAL_ERROR');
    expect(error.details).toHaveProperty('shopId', shopId);
    expect(error.details).toHaveProperty('environment', environment);
    expect(error.name).toBe('ShopCredentialError');
  });

  test('includes additional details', () => {
    // Arrange
    const message = 'Missing token';
    const shopId = 'my-shop';
    const environment = 'staging';
    const additionalDetails = { reason: 'file not found' };

    // Act
    const error = new ShopCredentialError(message, shopId, environment, additionalDetails);

    // Assert
    expect(error.details).toEqual({ shopId, environment, ...additionalDetails });
  });

  test('is instance of ShopError', () => {
    // Arrange & Act
    const error = new ShopCredentialError('Test', 'shop', 'production');

    // Assert
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ShopError);
    expect(error).toBeInstanceOf(ShopCredentialError);
  });
});

describe('ShopBranchError', () => {
  test('creates branch error with branch name', () => {
    // Arrange
    const message = 'Branch error';
    const branch = 'shop-a/main';

    // Act
    const error = new ShopBranchError(message, branch);

    // Assert
    expect(error.message).toBe(message);
    expect(error.code).toBe('SHOP_BRANCH_ERROR');
    expect(error.details).toHaveProperty('branch', branch);
    expect(error.name).toBe('ShopBranchError');
  });

  test('includes additional details', () => {
    // Arrange
    const message = 'Branch not found';
    const branch = 'shop-b/staging';
    const additionalDetails = { remote: 'origin', action: 'checkout' };

    // Act
    const error = new ShopBranchError(message, branch, additionalDetails);

    // Assert
    expect(error.details).toEqual({ branch, ...additionalDetails });
  });

  test('is instance of ShopError', () => {
    // Arrange & Act
    const error = new ShopBranchError('Test', 'branch');

    // Assert
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ShopError);
    expect(error).toBeInstanceOf(ShopBranchError);
  });
});

describe('ShopCommandError', () => {
  test('creates command error with command and exit code', () => {
    // Arrange
    const message = 'Command failed';
    const command = 'git push';
    const exitCode = 1;

    // Act
    const error = new ShopCommandError(message, command, exitCode);

    // Assert
    expect(error.message).toBe(message);
    expect(error.code).toBe('SHOP_COMMAND_ERROR');
    expect(error.details).toHaveProperty('command', command);
    expect(error.details).toHaveProperty('exitCode', exitCode);
    expect(error.name).toBe('ShopCommandError');
  });

  test('includes additional details', () => {
    // Arrange
    const message = 'Command timeout';
    const command = 'shopify theme push';
    const exitCode = 124;
    const additionalDetails = { stdout: 'output', stderr: 'error output' };

    // Act
    const error = new ShopCommandError(message, command, exitCode, additionalDetails);

    // Assert
    expect(error.details).toEqual({ command, exitCode, ...additionalDetails });
  });

  test('handles zero exit code', () => {
    // Arrange & Act
    const error = new ShopCommandError('Unexpected success', 'test', 0);

    // Assert
    expect(error.details.exitCode).toBe(0);
  });

  test('is instance of ShopError', () => {
    // Arrange & Act
    const error = new ShopCommandError('Test', 'cmd', 1);

    // Assert
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ShopError);
    expect(error).toBeInstanceOf(ShopCommandError);
  });
});

describe('ShopNetworkError', () => {
  test('creates network error with URL', () => {
    // Arrange
    const message = 'Network error';
    const url = 'https://api.example.com/data';

    // Act
    const error = new ShopNetworkError(message, url);

    // Assert
    expect(error.message).toBe(message);
    expect(error.code).toBe('SHOP_NETWORK_ERROR');
    expect(error.details).toHaveProperty('url', url);
    expect(error.name).toBe('ShopNetworkError');
  });

  test('includes additional details', () => {
    // Arrange
    const message = 'Request timeout';
    const url = 'https://myshop.myshopify.com/admin/api';
    const additionalDetails = { statusCode: 504, timeout: 30000 };

    // Act
    const error = new ShopNetworkError(message, url, additionalDetails);

    // Assert
    expect(error.details).toEqual({ url, ...additionalDetails });
  });

  test('is instance of ShopError', () => {
    // Arrange & Act
    const error = new ShopNetworkError('Test', 'https://example.com');

    // Assert
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ShopError);
    expect(error).toBeInstanceOf(ShopNetworkError);
  });
});

describe('Error hierarchy', () => {
  let errors: ShopError[];

  beforeEach(() => {
    errors = [
      new ShopError('base', 'BASE'),
      new ShopConfigurationError('config', 'shop'),
      new ShopValidationError('validation', 'field', 'value'),
      new ShopCredentialError('credential', 'shop', 'production'),
      new ShopBranchError('branch', 'shop/main'),
      new ShopCommandError('command', 'git', 1),
      new ShopNetworkError('network', 'https://example.com')
    ];
  });

  test('all errors are instances of Error', () => {
    // Assert
    errors.forEach(error => {
      expect(error).toBeInstanceOf(Error);
    });
  });

  test('all errors are instances of ShopError', () => {
    // Assert
    errors.forEach(error => {
      expect(error).toBeInstanceOf(ShopError);
    });
  });

  test('all errors have unique error codes', () => {
    // Arrange
    const codes = errors.map(e => e.code);

    // Assert
    const uniqueCodes = new Set(codes);
    expect(uniqueCodes.size).toBe(codes.length);
  });

  test('all errors have valid timestamps', () => {
    // Assert
    errors.forEach(error => {
      const timestamp = new Date(error.timestamp);
      expect(timestamp.getTime()).not.toBeNaN();
    });
  });

  test('all errors serialize to JSON correctly', () => {
    // Assert
    errors.forEach(error => {
      const json = error.toJSON();
      expect(json).toHaveProperty('name');
      expect(json).toHaveProperty('message');
      expect(json).toHaveProperty('code');
      expect(json).toHaveProperty('details');
      expect(json).toHaveProperty('timestamp');
      expect(json).toHaveProperty('stack');
    });
  });

  test('all errors can be caught as ShopError', () => {
    // Assert
    errors.forEach(error => {
      try {
        throw error;
      } catch (e) {
        expect(e).toBeInstanceOf(ShopError);
      }
    });
  });

  test('error name matches constructor name', () => {
    // Assert
    expect(errors[0].name).toBe('ShopError');
    expect(errors[1].name).toBe('ShopConfigurationError');
    expect(errors[2].name).toBe('ShopValidationError');
    expect(errors[3].name).toBe('ShopCredentialError');
    expect(errors[4].name).toBe('ShopBranchError');
    expect(errors[5].name).toBe('ShopCommandError');
    expect(errors[6].name).toBe('ShopNetworkError');
  });
});
