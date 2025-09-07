import fs from "fs";
import path from "path";
import { execSync, spawn } from "child_process";
import {
  intro,
  outro,
  select,
  text,
  spinner,
  isCancel,
  cancel,
  note,
  log,
} from "@clack/prompts";

import type { 
  ShopConfig, 
  ShopCredentials, 
  ShopCreationData, 
  Environment,
  ShopManagerOptions,
  AuthenticationMethod,
  SecurityAuditReport
} from "../types/shop.js";

import { ShopConfigValidator } from "../validators/ShopConfigValidator.js";
import { SecurityManager } from "./core/SecurityManager.js";
import { GitOperations } from "./core/GitOperations.js";
import { logger } from "./core/Logger.js";
import { performanceMonitor } from "./core/PerformanceMonitor.js";
import { 
  ShopConfigurationError, 
  ShopValidationError,
  ShopCredentialError 
} from "./errors/ShopError.js";

/**
 * Enterprise shop management system with full type safety
 * Implements contextual development and automated shop syncing
 */
export class ShopManager {
  private readonly cwd: string;
  private readonly shopsDir: string;
  private readonly credentialsDir: string;
  private readonly toolsDir: string;
  private readonly validator: ShopConfigValidator;
  private readonly securityManager: SecurityManager;
  private readonly gitOps: GitOperations;
  private readonly logger: typeof logger;

  constructor(options: ShopManagerOptions = {}) {
    this.cwd = options.cwd ?? process.cwd();
    this.shopsDir = path.join(this.cwd, "shops");
    this.credentialsDir = path.join(this.cwd, "shops/credentials");
    this.toolsDir = path.join(this.cwd, "tools");
    this.logger = options.logger ?? logger;
    
    // Initialize enterprise components
    this.validator = new ShopConfigValidator();
    this.securityManager = new SecurityManager(this.credentialsDir);
    this.gitOps = new GitOperations();

    // Ensure directories exist with proper permissions
    this.ensureDirectoryStructure();
  }

  // ================== MAIN FLOW ==================

  /**
   * Runs the interactive shop manager
   */
  async run(): Promise<void> {
    const endOperation = this.logger.startOperation('shop_manager_session');

    try {
      console.clear();
      intro("🚀 Multi-Shop Manager");

      // Check if we should auto-select dev mode
      if (process.env.AUTO_SELECT_DEV === "true") {
        delete process.env.AUTO_SELECT_DEV;
        await this.handleDevServer();
        endOperation('success', { autodev: true });
        return;
      }

      while (true) {
        const choice = await this.showMainMenu();
        if (isCancel(choice) || choice === "exit") {
          outro("👋 Goodbye!");
          endOperation('success');
          return;
        }

        const shouldContinue = await this.handleMainMenuChoice(choice);
        if (!shouldContinue) {
          endOperation('success');
          return;
        }
      }
    } catch (error) {
      this.logger.error('Shop manager session failed', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      endOperation('error', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * Shows the main menu with current status
   */
  private async showMainMenu(): Promise<string> {
    const shopCount = await this.getShopCount();
    const statusMessage =
      shopCount > 0
        ? `📋 ${shopCount} shop${shopCount === 1 ? "" : "s"} configured`
        : "No shops configured yet";

    note(statusMessage, "Current Status");

    return await select({
      message: "🚀 What would you like to do?",
      options: [
        {
          value: "dev",
          label: "Start Development Server",
          hint: "Launch dev server for shop (most common)",
        },
        {
          value: "list",
          label: "List Shops",
          hint: "View all configured shops and settings",
        },
        {
          value: "create",
          label: "Create New Shop",
          hint: "Set up new shop with Shopify integration",
        },
        {
          value: "edit",
          label: "Edit Shop",
          hint: "Update existing shop configuration",
        },
        {
          value: "branches",
          label: "Branch Operations",
          hint: "Create sync PRs, testing, etc.",
        },
        {
          value: "campaigns",
          label: "Campaign Tools",
          hint: "Create and manage promotional campaigns",
        },
        {
          value: "audit",
          label: "Security Audit",
          hint: "Run comprehensive security check",
        },
        {
          value: "exit",
          label: "Exit",
          hint: "Close the shop manager",
        },
      ],
    }) as Promise<string>;
  }

  /**
   * Handles main menu choice selection
   */
  private async handleMainMenuChoice(choice: string): Promise<boolean> {
    const endOperation = this.logger.startOperation(`menu_action_${choice}`);

    try {
      switch (choice) {
        case "dev":
          await this.handleDevServer();
          break;
        case "list":
          await this.handleListShops();
          break;
        case "create":
          await this.handleCreateShop();
          break;
        case "edit":
          await this.handleEditShop();
          break;
        case "branches":
          await this.handleBranchOperations();
          break;
        case "campaigns":
          await this.handleCampaigns();
          break;
        case "audit":
          await this.handleSecurityAudit();
          break;
        case "exit":
          outro("👋 Goodbye!");
          endOperation('success');
          return false;
        default:
          this.logger.warn('Unknown menu choice', { choice });
          endOperation('error', { reason: 'unknown_choice', choice });
          return false;
      }
      
      endOperation('success');
      return true;
    } catch (error) {
      this.logger.error('Menu action failed', { 
        choice,
        error: error instanceof Error ? error.message : String(error) 
      });
      endOperation('error', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  // ================== SHOP MANAGEMENT ==================

  /**
   * Loads shop configuration with validation
   */
  loadShopConfig(shopId: string): ShopConfig {
    try {
      this.validator.validateShopId(shopId);
      
      const configPath = path.join(this.shopsDir, `${shopId}.config.json`);
      if (!fs.existsSync(configPath)) {
        throw new ShopConfigurationError(`Shop configuration not found: ${shopId}`, shopId);
      }

      const rawConfig = fs.readFileSync(configPath, "utf8");
      const config = JSON.parse(rawConfig) as ShopConfig;
      
      return this.validator.validateConfig(config, shopId);
    } catch (error) {
      if (error instanceof ShopConfigurationError || error instanceof ShopValidationError) {
        throw error;
      }
      
      throw new ShopConfigurationError(
        `Failed to load shop configuration: ${shopId}`,
        shopId,
        { originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Saves shop configuration with validation
   */
  saveShopConfig(shopId: string, config: ShopConfig): void {
    try {
      this.validator.validateShopId(shopId);
      this.validator.validateConfig(config, shopId);
      
      const configPath = path.join(this.shopsDir, `${shopId}.config.json`);
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      
      this.logger.info('Shop configuration saved', { shopId, path: configPath });
    } catch (error) {
      throw new ShopConfigurationError(
        `Failed to save shop configuration: ${shopId}`,
        shopId,
        { originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Gets count of configured shops
   */
  private async getShopCount(): Promise<number> {
    try {
      if (!fs.existsSync(this.shopsDir)) {
        return 0;
      }

      const files = fs.readdirSync(this.shopsDir);
      return files.filter(
        (file) => file.endsWith(".config.json") && file !== "shop.config.example.json"
      ).length;
    } catch (error) {
      this.logger.error('Failed to count shops', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      return 0;
    }
  }

  /**
   * Lists all configured shops
   */
  listShops(): string[] {
    try {
      if (!fs.existsSync(this.shopsDir)) {
        return [];
      }

      return fs
        .readdirSync(this.shopsDir)
        .filter(
          (file) => file.endsWith(".config.json") && file !== "shop.config.example.json"
        )
        .map((file) => file.replace(".config.json", ""));
    } catch (error) {
      this.logger.error('Failed to list shops', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      return [];
    }
  }

  /**
   * Runs security audit across all shops
   */
  async auditSecurity(): Promise<SecurityAuditReport> {
    const endOperation = this.logger.startOperation('security_audit');

    try {
      const report = this.securityManager.auditCredentialSecurity();
      
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

  // ================== PRIVATE UTILITY METHODS ==================

  /**
   * Ensures proper directory structure exists
   */
  private ensureDirectoryStructure(): void {
    const directories = [this.shopsDir, this.credentialsDir];
    
    directories.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        this.logger.debug('Created directory', { path: dir });
      }
    });
  }

  /**
   * Waits for user key press
   */
  private async waitForKey(): Promise<void> {
    console.log();
    return new Promise((resolve) => {
      console.log("\x1b[2mPress any key to continue...\x1b[0m");

      if (!process.stdin.isTTY) {
        resolve();
        return;
      }

      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.once("data", () => {
        process.stdin.setRawMode(false);
        process.stdin.pause();
        resolve();
      });
    });
  }

  // ================== PLACEHOLDER METHODS ==================
  // These will be implemented in subsequent phases

  private async handleDevServer(): Promise<void> {
    note("Development server integration will be implemented in next phase", "🚧 Coming Soon");
    await this.waitForKey();
  }

  private async handleListShops(): Promise<void> {
    note("Shop listing will be implemented in next phase", "🚧 Coming Soon");
    await this.waitForKey();
  }

  private async handleCreateShop(): Promise<void> {
    note("Shop creation will be implemented in next phase", "🚧 Coming Soon");
    await this.waitForKey();
  }

  private async handleEditShop(): Promise<void> {
    note("Shop editing will be implemented in next phase", "🚧 Coming Soon");
    await this.waitForKey();
  }

  private async handleBranchOperations(): Promise<void> {
    note("Branch operations will be implemented in next phase", "🚧 Coming Soon");
    await this.waitForKey();
  }

  private async handleCampaigns(): Promise<void> {
    note("Campaign tools will be implemented in next phase", "🚧 Coming Soon");
    await this.waitForKey();
  }

  private async handleSecurityAudit(): Promise<void> {
    const report = await this.auditSecurity();
    
    console.log();
    note(`Security audit completed`, "🔒 Results");
    
    if (report.issues.length === 0) {
      log.success("✅ No security issues found");
    } else {
      log.warn(`⚠️ Found ${report.issues.length} security issues to review`);
      
      report.issues.forEach((issue, index) => {
        console.log(`\n${index + 1}. [${issue.level.toUpperCase()}] ${issue.message}`);
        if (issue.shopId) {
          console.log(`   Shop: ${issue.shopId}`);
        }
        console.log(`   Fix: ${issue.recommendation}`);
      });
    }

    await this.waitForKey();
  }
}

export default ShopManager;