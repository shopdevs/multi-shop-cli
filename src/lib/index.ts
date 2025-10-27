/**
 * ShopDevs Multi-Shop - Contextual development for Shopify themes
 *
 * Main package exports
 */

// Core functional API (primary interface)
export { createMultiShopCLI, runMultiShopManager } from "./core/index.js";
export { createNewShop } from "./core/shop-creation.js";
export { startDevelopmentWorkflow } from "./core/dev-operations.js";

// Contextual development
export { ContextualDev } from "./ContextualDev.js";

// Project initialization
export { Initializer } from "./Initializer.js";

// Error handling
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
  CLIOptions
} from "../types/shop.js";

// Validation utilities
export {
  isValidShopId,
  isValidDomain,
  isValidThemeToken,
  isValidBranchName
} from "../types/shop.js";

// Package metadata  
export const VERSION = "1.0.16";
export const PACKAGE_NAME = "@shopdevs/multi-shop-cli";