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
import { performanceMonitor } from "./core/SimplePerformanceMonitor.js";
import { config as systemConfig } from "./core/Config.js";
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
      
      // Validate config size before parsing (prevent DoS attacks)
      if (rawConfig.length > systemConfig.security.maxConfigFileSize) {
        throw new ShopConfigurationError(
          `Configuration file too large: ${shopId}`,
          shopId,
          { size: rawConfig.length, limit: systemConfig.security.maxConfigFileSize }
        );
      }
      
      let config: unknown;
      try {
        config = JSON.parse(rawConfig);
      } catch (error) {
        throw new ShopConfigurationError(
          `Invalid JSON in configuration file: ${shopId}`,
          shopId,
          { error: error instanceof Error ? error.message : String(error) }
        );
      }
      
      // Validate it's an object
      if (!config || typeof config !== 'object' || Array.isArray(config)) {
        throw new ShopConfigurationError(
          `Configuration must be a JSON object: ${shopId}`,
          shopId,
          { type: typeof config, isArray: Array.isArray(config) }
        );
      }
      
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

  // ================== SHOPIFY CLI INTEGRATION ==================

  /**
   * Starts the Shopify CLI development server
   */
  private async startShopifyDevServer(
    storeDomain: string, 
    themeToken: string, 
    shopId: string, 
    environment: 'staging' | 'production'
  ): Promise<void> {
    const s = spinner();
    s.start("Starting Shopify CLI development server...");

    try {
      // Set environment variables for Shopify CLI
      const env = {
        ...process.env,
        SHOPIFY_CLI_THEME_TOKEN: themeToken,
        SHOPIFY_STORE: storeDomain.replace('.myshopify.com', '')
      };

      // Check if Shopify CLI is available
      try {
        execSync('shopify version', { stdio: 'ignore' });
      } catch {
        s.stop("❌ Shopify CLI not found");
        note("Install Shopify CLI: npm install -g @shopify/cli", "Installation Required");
        return;
      }

      s.stop("✅ Starting development server");

      // Display connection info
      console.log(`\n🔗 Development Server Starting:`);
      console.log(`   Shop: ${shopId} (${environment})`);
      console.log(`   Store: ${storeDomain}`);
      console.log(`   Token: ${themeToken.substring(0, 8)}...`);
      console.log(`\n⚡ Running: shopify theme dev --store=${storeDomain.replace('.myshopify.com', '')}`);
      console.log(`\nPress Ctrl+C to stop the development server\n`);

      // Start the development server
      const devProcess = spawn('shopify', ['theme', 'dev', `--store=${storeDomain.replace('.myshopify.com', '')}`], {
        env,
        stdio: 'inherit', // Pass through all output to user
        cwd: this.cwd
      });

      // Handle process events
      devProcess.on('error', (error) => {
        this.logger.error('Shopify CLI error', { 
          error: error.message, 
          shopId, 
          environment 
        });
      });

      // Wait for the process to exit
      return new Promise<void>((resolve, reject) => {
        devProcess.on('close', (code) => {
          if (code === 0 || code === null) {
            note("Development server stopped", "ℹ️ Info");
            resolve();
          } else {
            reject(new Error(`Shopify CLI exited with code ${code}`));
          }
        });

        devProcess.on('error', (error) => {
          reject(error);
        });
      });

    } catch (error) {
      s.stop("❌ Failed to start development server");
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

  // ================== CORE FUNCTIONALITY ==================

  private async handleDevServer(): Promise<void> {
    const shops = this.listShops();
    
    if (shops.length === 0) {
      note("No shops configured. Create a shop first.", "⚠️ Setup Required");
      await this.handleCreateShop();
      return;
    }

    const shopChoice = await select({
      message: "Select shop for development:",
      options: shops.map(shop => ({
        value: shop,
        label: shop,
        hint: `Start dev server for ${shop}`
      }))
    });

    if (isCancel(shopChoice)) {
      return;
    }

    try {
      const config = this.loadShopConfig(shopChoice as string);
      const credentials = this.securityManager.loadCredentials(shopChoice as string);
      
      if (!credentials) {
        note(`No credentials found for ${shopChoice}. Set up credentials first.`, "⚠️ Setup Required");
        return;
      }

      // Choose environment for development
      const envChoice = await select({
        message: "Select environment:",
        options: [
          { value: "staging", label: "Staging", hint: config.shopify.stores.staging.domain },
          { value: "production", label: "Production", hint: config.shopify.stores.production.domain }
        ]
      });

      if (isCancel(envChoice)) return;

      const environment = envChoice as 'staging' | 'production';
      const store = config.shopify.stores[environment];
      const token = this.securityManager.getThemeToken(shopChoice as string, environment);

      if (!token) {
        note(`No theme token found for ${environment}`, "⚠️ Setup Required");
        return;
      }

      note(`Starting development server for ${config.name} (${environment})...`, "🚀 Development Server");
      
      try {
        // Start Shopify CLI dev server with the appropriate credentials
        await this.startShopifyDevServer(store.domain, token, shopChoice as string, environment);
      } catch (error) {
        log.error(`Failed to start Shopify CLI: ${error instanceof Error ? error.message : String(error)}`);
        note("Ensure Shopify CLI is installed: npm install -g @shopify/cli", "💡 Help");
      }
      
    } catch (error) {
      log.error(`Failed to start dev server: ${error instanceof Error ? error.message : String(error)}`);
    }

    await this.waitForKey();
  }

  private async handleListShops(): Promise<void> {
    const shops = this.listShops();
    
    if (shops.length === 0) {
      note("No shops configured yet.", "📋 Shop List");
      await this.waitForKey();
      return;
    }

    console.log();
    note(`Found ${shops.length} configured shop${shops.length === 1 ? '' : 's'}:`, "📋 Shop List");
    
    for (const shopId of shops) {
      try {
        const config = this.loadShopConfig(shopId);
        const credentials = this.securityManager.loadCredentials(shopId);
        const hasCredentials = credentials !== null;
        
        console.log(`\n📦 ${config.name} (${shopId})`);
        console.log(`   Production: ${config.shopify.stores.production.domain}`);
        console.log(`   Staging: ${config.shopify.stores.staging.domain}`);
        console.log(`   Branch: ${config.shopify.stores.production.branch}`);
        console.log(`   Credentials: ${hasCredentials ? '✅ Configured' : '❌ Missing'}`);
        console.log(`   Auth Method: ${config.shopify.authentication.method}`);
        
      } catch (error) {
        console.log(`\n❌ ${shopId} (Error loading configuration)`);
        console.log(`   Error: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    await this.waitForKey();
  }

  private async handleCreateShop(): Promise<void> {
    intro("🆕 Create New Shop");
    
    const shopId = await text({
      message: "Shop ID (lowercase, hyphens only):",
      placeholder: "my-shop",
      validate: (value) => {
        if (!value) return "Shop ID is required";
        if (!/^[a-z0-9-]+$/.test(value)) return "Only lowercase letters, numbers, and hyphens allowed";
        if (value.length > 50) return "Shop ID must be 50 characters or less";
        
        // Check if shop already exists
        if (this.listShops().includes(value)) {
          return "A shop with this ID already exists";
        }
        
        return undefined;
      }
    });

    if (isCancel(shopId)) return;

    const shopName = await text({
      message: "Shop display name:",
      placeholder: "My Shop"
    });

    if (isCancel(shopName)) return;

    const productionDomain = await text({
      message: "Production domain:",
      placeholder: "my-shop.myshopify.com",
      validate: (value) => {
        if (!value) return "Production domain is required";
        if (!value.endsWith('.myshopify.com')) return "Domain must end with .myshopify.com";
        return undefined;
      }
    });

    if (isCancel(productionDomain)) return;

    const stagingDomain = await text({
      message: "Staging domain:",
      placeholder: "staging-my-shop.myshopify.com",
      validate: (value) => {
        if (!value) return "Staging domain is required";
        if (!value.endsWith('.myshopify.com')) return "Domain must end with .myshopify.com";
        return undefined;
      }
    });

    if (isCancel(stagingDomain)) return;

    const authMethod = await select({
      message: "Authentication method:",
      options: [
        { value: "theme-access-app", label: "Theme Access App", hint: "Recommended for teams" },
        { value: "manual-tokens", label: "Manual Tokens", hint: "For direct API access" }
      ]
    });

    if (isCancel(authMethod)) return;

    try {
      // Create shop configuration
      const config: ShopConfig = {
        shopId: shopId as string,
        name: shopName as string,
        shopify: {
          stores: {
            production: {
              domain: productionDomain as string,
              branch: `${shopId}/main`
            },
            staging: {
              domain: stagingDomain as string,
              branch: `${shopId}/staging`
            }
          },
          authentication: {
            method: authMethod as AuthenticationMethod
          }
        }
      };

      this.saveShopConfig(shopId as string, config);
      
      note(`✅ Shop configuration created for ${shopName}`, "Success");
      note("Next: Set up credentials using the Edit Shop option", "📝 Next Steps");
      
    } catch (error) {
      log.error(`Failed to create shop: ${error instanceof Error ? error.message : String(error)}`);
    }

    await this.waitForKey();
  }

  private async handleEditShop(): Promise<void> {
    const shops = this.listShops();
    
    if (shops.length === 0) {
      note("No shops to edit. Create a shop first.", "📝 Edit Shop");
      await this.waitForKey();
      return;
    }

    const shopChoice = await select({
      message: "Select shop to edit:",
      options: shops.map(shop => ({
        value: shop,
        label: shop,
        hint: `Edit configuration for ${shop}`
      }))
    });

    if (isCancel(shopChoice)) return;

    const editChoice = await select({
      message: "What would you like to edit?",
      options: [
        { value: "credentials", label: "Credentials", hint: "Update theme tokens" },
        { value: "config", label: "Configuration", hint: "Update domains and settings" },
        { value: "delete", label: "Delete Shop", hint: "Remove shop completely" }
      ]
    });

    if (isCancel(editChoice)) return;

    if (editChoice === "delete") {
      await this.handleDeleteShop(shopChoice as string);
    } else if (editChoice === "credentials") {
      await this.handleEditCredentials(shopChoice as string);
    } else {
      note("Configuration editing not yet implemented", "🚧 Coming Soon");
    }

    await this.waitForKey();
  }

  private async handleDeleteShop(shopId: string): Promise<void> {
    const confirm = await select({
      message: `Are you sure you want to delete shop "${shopId}"?`,
      options: [
        { value: "no", label: "No, cancel" },
        { value: "yes", label: "Yes, delete permanently" }
      ]
    });

    if (confirm === "yes") {
      try {
        const configPath = path.join(this.shopsDir, `${shopId}.config.json`);
        const credPath = path.join(this.credentialsDir, `${shopId}.credentials.json`);
        
        if (fs.existsSync(configPath)) {
          fs.unlinkSync(configPath);
        }
        
        if (credPath && fs.existsSync(credPath)) {
          fs.unlinkSync(credPath);
        }
        
        note(`✅ Shop "${shopId}" has been deleted`, "Deleted");
        
      } catch (error) {
        log.error(`Failed to delete shop: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  private async handleEditCredentials(shopId: string): Promise<void> {
    note("Credential editing not yet implemented. Manually edit the credentials file:", "🚧 Manual Step");
    note(`shops/credentials/${shopId}.credentials.json`, "File Location");
  }

  private async handleBranchOperations(): Promise<void> {
    note("Branch operations (sync PRs, testing) not yet implemented", "🚧 Coming Soon");
    note("Use git commands manually for now", "Manual Step");
    await this.waitForKey();
  }

  private async handleCampaigns(): Promise<void> {
    note("Campaign management not yet implemented", "🚧 Coming Soon");
    note("Create branches manually for campaign work", "Manual Step");
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