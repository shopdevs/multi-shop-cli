/**
 * ShopDevs Multi-Shop - Enterprise contextual development for Shopify themes
 * 
 * Main package exports with comprehensive type definitions
 */

// Core classes
export { ShopManager } from "./ShopManager.js";
export { ContextualDev } from "./ContextualDev.js";
export { Initializer } from "./Initializer.js";
export { SyncMain } from "./SyncMain.js";
export { TestRunner } from "./TestRunner.js";

// Core infrastructure
export { SecurityManager } from "./core/SecurityManager.js";
export { GitOperations } from "./core/GitOperations.js";
export { Logger, logger } from "./core/Logger.js";
export { PerformanceMonitor, performanceMonitor } from "./core/PerformanceMonitor.js";

// Validation and error handling
export { ShopConfigValidator } from "../validators/ShopConfigValidator.js";
export {
  ShopError,
  ShopConfigurationError,
  ShopValidationError,
  ShopCredentialError,
  ShopBranchError,
  ShopCommandError,
  ShopNetworkError
} from "./errors/ShopError.js";

// Type definitions
export type {
  ShopConfig,
  ShopCredentials,
  ShopCreationData,
  Environment,
  ShopManagerOptions,
  AuthenticationMethod,
  AuthenticationConfig,
  ShopifyConfig,
  ShopifyStore,
  ShopMetadata,
  BranchInfo,
  ShopValidationResult,
  ValidationError,
  PerformanceMetrics,
  MemoryDelta,
  SecurityAuditReport,
  ShopSecurityAudit,
  SecurityIssue,
  CLIOptions,
  GitRepository,
  GitOperationOptions,
  ErrorContext,
  ShopId,
  DomainName,
  ThemeToken,
  BranchName
} from "../types/shop.js";

// Type guards and utilities
export {
  isValidShopId,
  isValidDomain,
  isValidThemeToken,
  isValidBranchName
} from "../types/shop.js";

// Package metadata
export const VERSION = "1.0.0";
export const PACKAGE_NAME = "shopdevs-multi-shop";

/**
 * Creates a new ShopManager instance with enterprise defaults
 * 
 * @param options - Configuration options
 * @returns Configured ShopManager instance
 * 
 * @example
 * ```typescript
 * import { createShopManager } from 'shopdevs-multi-shop';
 * 
 * const manager = createShopManager({
 *   cwd: '/path/to/theme',
 *   logger: customLogger
 * });
 * 
 * await manager.run();
 * ```
 */
export function createShopManager(options: ShopManagerOptions = {}): ShopManager {
  return new ShopManager(options);
}

/**
 * Initializes multi-shop in the current directory
 * 
 * @param options - Initialization options
 * @returns Promise that resolves when initialization is complete
 * 
 * @example
 * ```typescript
 * import { initializeMultiShop } from 'shopdevs-multi-shop';
 * 
 * await initializeMultiShop({ force: true });
 * ```
 */
export async function initializeMultiShop(options: { force?: boolean } = {}): Promise<void> {
  const initializer = new Initializer(options);
  await initializer.run();
}

/**
 * Validates shop configuration
 * 
 * @param config - Shop configuration to validate
 * @param shopId - Shop identifier for error context
 * @returns Validated configuration
 * @throws ShopValidationError if validation fails
 * 
 * @example
 * ```typescript
 * import { validateShopConfig } from 'shopdevs-multi-shop';
 * 
 * try {
 *   const validConfig = validateShopConfig(userInput, 'my-shop');
 *   // Use validConfig safely
 * } catch (error) {
 *   if (error instanceof ShopValidationError) {
 *     console.error('Validation failed:', error.details);
 *   }
 * }
 * ```
 */
export function validateShopConfig(config: unknown, shopId: string): ShopConfig {
  const validator = new ShopConfigValidator();
  return validator.validateConfig(config, shopId);
}