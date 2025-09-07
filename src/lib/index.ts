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
export { BranchDetector } from "./BranchDetector.js";
export { ShopSelector } from "./ShopSelector.js";
export { Initializer } from "./Initializer.js";
export { SyncMain } from "./SyncMain.js";
// Core infrastructure
export { SecurityManager } from "./core/SecurityManager.js";
export { GitOperations } from "./core/GitOperations.js";
export { SimpleLogger as Logger, logger } from "./core/SimpleLogger.js";
export { SimplePerformanceMonitor, performanceMonitor } from "./core/SimplePerformanceMonitor.js";

// Validation and error handling
export { ShopConfigValidator } from "./validators/ShopConfigValidator.js";
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
export const PACKAGE_NAME = "@shopdevs/multi-shop-cli";

/**
 * Creates a new ShopManager instance
 */
