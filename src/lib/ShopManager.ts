/**
 * Shop Manager - Functional API entry point
 *
 * This file re-exports the functional API from core for backward compatibility
 * and convenience. The class-based interface has been removed in favor of
 * the functional approach.
 */

export { runMultiShopManager, createMultiShopCLI } from "./core/index.js";
export type { CLIContext, Dependencies } from "./core/types.js";
