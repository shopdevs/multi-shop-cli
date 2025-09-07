/**
 * ShopDevs Multi-Shop - Contextual development for Shopify themes
 * 
 * Main package exports
 */

// Core classes
export { ShopManager } from "./ShopManager.js";
export { ShopConfigManager } from "./ShopConfig.js";
export { ShopDev } from "./ShopDev.js";
export { ShopCRUD } from "./ShopCRUD.js";
export { ShopCLI } from "./ShopCLI.js";
export { ContextualDev } from "./ContextualDev.js";
export { Initializer } from "./Initializer.js";
export { SyncMain } from "./SyncMain.js";
export { TestRunner } from "./TestRunner.js";

// Core infrastructure
export { SecurityManager } from "./core/SecurityManager.js";
export { GitOperations } from "./core/GitOperations.js";
export { SimpleLogger as Logger, logger } from "./core/SimpleLogger.js";
export { SimplePerformanceMonitor, performanceMonitor } from "./core/SimplePerformanceMonitor.js";

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
  Environment,
  ShopManagerOptions,
  AuthenticationMethod,
  AuthenticationConfig,
  ShopifyConfig,
  ShopifyStore,
  SecurityAuditReport,
  ShopSecurityAudit,
  SecurityIssue,
  CLIOptions
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
 * Creates a new ShopManager instance
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