/**
 * Custom error classes for structured error handling
 * Following enterprise error handling best practices
 */

export class ShopError extends Error {
  public readonly code: string;
  public readonly details: Record<string, unknown>;
  public readonly timestamp: string;

  constructor(message: string, code: string, details: Record<string, unknown> = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
    
    // Maintains proper stack trace for debugging
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      details: this.details,
      timestamp: this.timestamp,
      stack: this.stack
    };
  }
}

export class ShopConfigurationError extends ShopError {
  constructor(message: string, shopId: string, details: Record<string, unknown> = {}) {
    super(message, 'SHOP_CONFIG_ERROR', { shopId, ...details });
  }
}

export class ShopValidationError extends ShopError {
  constructor(message: string, field: string, value: unknown, details: Record<string, unknown> = {}) {
    super(message, 'SHOP_VALIDATION_ERROR', { field, value, ...details });
  }
}

export class ShopCredentialError extends ShopError {
  constructor(message: string, shopId: string, environment: string, details: Record<string, unknown> = {}) {
    super(message, 'SHOP_CREDENTIAL_ERROR', { shopId, environment, ...details });
  }
}

export class ShopBranchError extends ShopError {
  constructor(message: string, branch: string, details: Record<string, unknown> = {}) {
    super(message, 'SHOP_BRANCH_ERROR', { branch, ...details });
  }
}

export class ShopCommandError extends ShopError {
  constructor(message: string, command: string, exitCode: number, details: Record<string, unknown> = {}) {
    super(message, 'SHOP_COMMAND_ERROR', { command, exitCode, ...details });
  }
}

export class ShopNetworkError extends ShopError {
  constructor(message: string, url: string, details: Record<string, unknown> = {}) {
    super(message, 'SHOP_NETWORK_ERROR', { url, ...details });
  }
}