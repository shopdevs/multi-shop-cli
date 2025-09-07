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

import type { ShopConfig, Environment, ShopCredentials } from "../types/shop.js";
import { SecurityManager } from "./core/SecurityManager.js";
import { GitOperations } from "./core/GitOperations.js";
import { ShopConfigValidator } from "../validators/ShopConfigValidator.js";
import { logger } from "./core/SimpleLogger.js";
import { ShopConfigurationError, ShopCredentialError } from "./errors/ShopError.js";

/**
 * Contextual shop manager for feature branch development
 * Provides shop context selection for non-shop-specific branches
 */
export class ContextualShopManager {
  private readonly cwd: string;
  private readonly shopsDir: string;
  private readonly credentialsDir: string;
  private readonly validator: ShopConfigValidator;
  private readonly securityManager: SecurityManager;
  private readonly gitOps: GitOperations;
  private readonly logger = logger;

  constructor(options: { cwd?: string } = {}) {
    this.cwd = options.cwd ?? process.cwd();
    this.shopsDir = path.join(this.cwd, "shops");
    this.credentialsDir = path.join(this.cwd, "shops/credentials");
    
    this.validator = new ShopConfigValidator();
    this.securityManager = new SecurityManager(this.credentialsDir);
    this.gitOps = new GitOperations();

    // Ensure directories exist
    this.ensureDirectoryStructure();
  }

  // ================== CONTEXTUAL DEVELOPMENT ==================

  async handleContextualDev(currentBranch: string): Promise<void> {
    const endOperation = this.logger.startOperation('contextual_dev', { branch: currentBranch });

    try {
      console.clear();
      intro("🚀 Contextual Development Mode");

      note(
        `You're developing on: ${currentBranch}\n` +
        `This appears to be a feature branch (not shop-specific).\n` +
        `Please select the shop context you'd like to develop against.`,
        "🛠️  Feature Branch Development"
      );

      // Select shop context
      const shop = await this.selectShop("develop with context of");
      if (!shop) {
        endOperation('cancelled', { reason: 'no_shop_selected' });
        return;
      }

      // Select environment
      const env = await this.selectEnvironment(shop);
      if (!env) {
        endOperation('cancelled', { reason: 'no_environment_selected' });
        return;
      }

      // Validate shop branches exist
      const isValid = await this.validateShopBranches(shop);
      if (!isValid) {
        endOperation('error', { reason: 'invalid_shop_branches', shop });
        return;
      }

      // Start contextual dev server
      await this.startContextualDevServer(shop, env, currentBranch);
      
      endOperation('success', { shop, environment: env, branch: currentBranch });

    } catch (error) {
      this.logger.error('Contextual development failed', {
        branch: currentBranch,
        error: error instanceof Error ? error.message : String(error)
      });
      endOperation('error', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  private async startContextualDevServer(shop: string, environment: Environment, currentBranch: string): Promise<void> {
    try {
      const config = this.loadShopConfig(shop);
      const store = config.shopify.stores[environment];

      if (!store?.domain) {
        throw new ShopConfigurationError(
          `Missing ${environment} store domain for ${shop}`,
          shop,
          { environment }
        );
      }

      // Get theme token from secure credentials
      let themeToken = this.securityManager.getThemeToken(shop, environment);

      if (!themeToken) {
        console.log();
        log.warn(`🔐 No credentials found for ${shop} ${environment}`);
        console.log(`We need your personal theme access credentials to connect to:`);
        console.log(`   Store: ${store.domain}`);
        console.log(`   Shop: ${shop} (${environment} environment)`);
        console.log();

        const authMethod = config.shopify?.authentication?.method ?? "theme-access-app";
        themeToken = await this.promptForCredentials(shop, environment, authMethod);

        if (!themeToken) {
          cancel("Development server cancelled - credentials required");
          return;
        }

        // Save credentials for future use
        const existingCredentials = this.securityManager.loadCredentials(shop);
        const credentials: ShopCredentials = existingCredentials ?? {
          developer: process.env.USER ?? process.env.USERNAME ?? "developer",
          shopify: { stores: { production: { themeToken: "" }, staging: { themeToken: "" } } },
        };

        // Type-safe credential update
        if (environment === 'production') {
          credentials.shopify.stores.production.themeToken = themeToken;
        } else {
          credentials.shopify.stores.staging.themeToken = themeToken;
        }

        this.securityManager.saveCredentials(shop, credentials);
        log.success(`✅ Credentials saved locally (NOT committed to git)`);
      }

      // Display contextual development info
      console.log();
      note(
        `⚠️  CONTEXTUAL DEVELOPMENT MODE\n\n` +
        `• You're developing on: ${currentBranch}\n` +
        `• Using shop context: ${shop}\n` +
        `• Environment: ${environment}\n\n` +
        `This means:\n` +
        `• Your code changes stay on ${currentBranch}\n` +
        `• You're testing against ${shop}'s ${environment} store\n` +
        `• When ready, create PR to main, then sync to shop branches`,
        "🎯 Development Context"
      );

      // Display configuration
      console.log();
      note(
        `Branch: ${currentBranch} (feature branch)\n` +
        `Shop Context: ${shop}\n` +
        `Environment: ${environment}\n` +
        `Store: ${store.domain}\n` +
        `Token: ${themeToken.substring(0, 12)}... (from credentials file)`,
        "✅ Development Configuration"
      );

      console.log();
      log.info("🌐 Starting Shopify development server...");
      console.log();

      // Set environment variables and start dev server
      const env = {
        ...process.env,
        SHOPIFY_CLI_THEME_TOKEN: themeToken,
        SHOPIFY_STORE_DOMAIN: store.domain,
      };

      await this.runInteractiveCommand(
        "shopify",
        ["theme", "dev", `--store=${store.domain}`],
        env
      );

    } catch (error) {
      throw new ShopCredentialError(
        `Failed to start development server: ${error instanceof Error ? error.message : String(error)}`,
        shop,
        environment
      );
    }
  }

  // ================== UTILITY METHODS ==================

  private loadShopConfig(shopId: string): ShopConfig {
    const configPath = path.join(this.shopsDir, `${shopId}.config.json`);
    if (!fs.existsSync(configPath)) {
      throw new ShopConfigurationError(`Shop configuration not found: ${shopId}`, shopId);
    }
    
    const rawConfig = fs.readFileSync(configPath, "utf8");
    const config = JSON.parse(rawConfig) as ShopConfig;
    
    return this.validator.validateConfig(config, shopId);
  }

  private listShops(): string[] {
    if (!fs.existsSync(this.shopsDir)) {
      return [];
    }

    return fs
      .readdirSync(this.shopsDir)
      .filter(file => file.endsWith(".config.json") && file !== "shop.config.example.json")
      .map(file => file.replace(".config.json", ""));
  }

  private async selectShop(purpose = "work with"): Promise<string | null> {
    const shops = this.listShops();

    if (shops.length === 0) {
      cancel("No shops configured yet. Please create a shop first using 'npm run shop'.");
      return null;
    }

    if (shops.length === 1) {
      const shop = shops[0];
      note(`Using shop: ${shop}`, "Auto-selected");
      return shop;
    }

    const shopOptions = shops.map((shop) => {
      try {
        const config = this.loadShopConfig(shop);
        return {
          value: shop,
          label: `${config.name} (${shop})`,
          hint: `Select ${shop} to ${purpose}`,
        };
      } catch {
        return {
          value: shop,
          label: `${shop} (⚠️ config error)`,
          hint: `Select ${shop} to ${purpose}`,
        };
      }
    });

    const selected = await select({
      message: `Select a shop to ${purpose}:`,
      options: shopOptions,
    });

    return isCancel(selected) ? null : selected as string;
  }

  private async selectEnvironment(shopId?: string): Promise<Environment | null> {
    let stagingDomain = "staging-{shop}.myshopify.com";
    let productionDomain = "{shop}.myshopify.com";

    // Load actual domains if shop is specified
    if (shopId) {
      try {
        const config = this.loadShopConfig(shopId);
        stagingDomain = config.shopify?.stores?.staging?.domain ?? stagingDomain;
        productionDomain = config.shopify?.stores?.production?.domain ?? productionDomain;
      } catch {
        // Use defaults if config can't be loaded
      }
    }

    const env = await select({
      message: "Select environment:",
      options: [
        {
          value: "staging",
          label: "Staging",
          hint: `Development and testing → ${stagingDomain}`,
        },
        {
          value: "production",
          label: "Production",
          hint: `Live store (use with caution) → ${productionDomain}`,
        },
      ],
    });

    return isCancel(env) ? null : env as Environment;
  }

  private async validateShopBranches(shopId: string): Promise<boolean> {
    try {
      // Fetch latest changes
      this.gitOps.fetchLatest();

      const requiredBranches = [`${shopId}/main`, `${shopId}/staging`];
      const missingBranches: string[] = [];

      for (const branch of requiredBranches) {
        const branchInfo = this.gitOps.checkBranchExists(branch);
        if (!branchInfo.remote) {
          missingBranches.push(branch);
        }
      }

      if (missingBranches.length === 0) {
        return true;
      }

      // Show missing branches error
      console.log(`\n❌ Missing required branches for ${shopId}:`);
      missingBranches.forEach((branch) => {
        console.log(`   • ${branch}`);
      });

      console.log(`\n💡 To fix this, use 'npm run shop' to create missing shop branches.`);

      await this.waitForKey();
      return false;
      
    } catch (error) {
      cancel(`❌ Error validating shop branches: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  // ================== PRIVATE HELPER METHODS ==================

  private ensureDirectoryStructure(): void {
    const directories = [this.shopsDir, this.credentialsDir];
    
    directories.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  private async promptForCredentials(shopId: string, environment: Environment, authMethod: string): Promise<string | null> {
    const config = this.loadShopConfig(shopId);
    const store = config.shopify.stores[environment];
    
    console.log();
    note(
      `🔐 SECURITY NOTICE:\n` +
      `Theme credentials are developer-specific and stored locally only.\n` +
      `They are NEVER committed to the repository.\n\n` +
      `Each developer needs their own personal tokens/passwords.`,
      "⚠️ Important Security Information"
    );

    if (authMethod === "theme-access-app") {
      console.log();
      note(
        `📋 NEXT STEPS:\n\n` +
        `1. Go to: ${store.domain}/admin/apps\n` +
        `2. Find and open "Theme Access" app\n` +
        `3. Generate a new password for this store\n` +
        `4. Enter the password below\n\n` +
        `💡 If Theme Access app is not installed:\n` +
        `   • Go to Shopify App Store\n` +
        `   • Search for "Theme Access"\n` +
        `   • Install the app first`,
        "🛠️ How to get your credentials"
      );

      const token = await text({
        message: `Your personal ${environment} theme password:`,
        placeholder: "Password from Theme Access app",
        validate: (value) => !value?.trim() ? `${environment} password is required` : undefined,
      });

      return isCancel(token) ? null : token;
      
    } else {
      console.log();
      note(
        `📋 NEXT STEPS:\n\n` +
        `1. Go to: ${store.domain}/admin/settings/apps\n` +
        `2. Click "Develop apps for your store"\n` +
        `3. Create a new app or select existing one\n` +
        `4. Go to "Configuration" tab\n` +
        `5. Enable "Theme templates and theme assets" under Admin API\n` +
        `6. Install the app and copy the "Admin API access token"\n` +
        `7. Enter the token below (starts with shptka_)`,
        "🛠️ How to get your theme token"
      );

      const token = await text({
        message: `Your personal ${environment} theme token:`,
        placeholder: "shptka_... (from your custom app)",
        validate: (value) => {
          if (!value?.trim()) return `${environment} token is required`;
          if (!value.startsWith("shptka_")) return "Token should start with 'shptka_'";
          return undefined;
        },
      });

      return isCancel(token) ? null : token;
    }
  }

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

  private async runInteractiveCommand(command: string, args: string[] = [], env: NodeJS.ProcessEnv = process.env): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        stdio: "inherit",
        shell: true,
        env,
      });

      child.on("close", resolve);
      child.on("error", reject);
    });
  }
}

export default ContextualShopManager;