import type { ShopManagerOptions, SecurityAuditReport } from "../types/shop.js";
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
  private readonly logger = logger;

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
  loadShopConfig(shopId: string) {
    return this.configManager.load(shopId);
  }

  /**
   * Save shop configuration  
   */
  saveShopConfig(shopId: string, config: any) {
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

  /**
   * Run security audit
   */
  async auditSecurity(): Promise<SecurityAuditReport> {
    const endOperation = this.logger.startOperation('security_audit');

    try {
      const report = this.security.auditCredentialSecurity();
      
      endOperation('success', { 
        shopsAudited: report.shops.length,
        issuesFound: report.issues.length 
      });
      
      return report;
    } catch (error) {
      endOperation('error', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  // Expose security manager for backward compatibility
  get securityManager() {
    return this.security;
  }

  // Expose validator for backward compatibility  
  get validator() {
    return this.configManager['validator'];
  }
}