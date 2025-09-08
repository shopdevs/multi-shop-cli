import type { ShopManagerOptions, SecurityAuditReport, ShopConfig } from "../types/shop.js";
import { ShopConfigManager } from "./ShopConfig.js";
import { ShopCLI } from "./ShopCLI.js";
import { SecurityManager } from "./core/SecurityManager.js";
import { logger } from "./core/SimpleLogger.js";

/**
 * Main entry point for shop management
 * Coordinates between config, CLI, and security components
 */
export class ShopManager {
  private readonly configManager: ShopConfigManager;
  private readonly cli: ShopCLI;
  private readonly security: SecurityManager;

  constructor(options: ShopManagerOptions = {}) {
    const cwd = options.cwd ?? process.cwd();
    this.configManager = new ShopConfigManager(cwd);
    this.cli = new ShopCLI(cwd);
    this.security = new SecurityManager(`${cwd}/shops/credentials`);
  }

  /**
   * Run interactive shop management
   */
  async run(): Promise<void> {
    await this.cli.run();
  }

  /**
   * Load shop configuration
   */
  loadShopConfig(shopId: string): ShopConfig {
    return this.configManager.load(shopId);
  }

  /**
   * Save shop configuration  
   */
  saveShopConfig(shopId: string, config: ShopConfig) {
    return this.configManager.save(shopId, config);
  }

  /**
   * List all shops
   */
  listShops(): string[] {
    return this.configManager.list();
  }

  /**
   * Get shop count
   */
  async getShopCount(): Promise<number> {
    return this.configManager.count();
  }

}