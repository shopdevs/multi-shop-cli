import { execSync, spawn } from "child_process";
import { select, spinner, isCancel, note, log } from "@clack/prompts";
import type { ShopConfig, ShopCredentials } from "../types/shop.js";
import { ShopConfigManager } from "./ShopConfig.js";
import { SecurityManager } from "./core/SecurityManager.js";

/**
 * Handles Shopify development server integration
 * Focused solely on dev server operations
 */
export class ShopDev {
  private readonly configManager: ShopConfigManager;
  private readonly securityManager: SecurityManager;

  constructor(cwd: string = process.cwd()) {
    this.configManager = new ShopConfigManager(cwd);
    this.securityManager = new SecurityManager(`${cwd}/shops/credentials`);
  }

  /**
   * Start development server with shop selection
   */
  async start(): Promise<void> {
    const shops = this.configManager.list();
    
    if (shops.length === 0) {
      note("No shops configured. Use 'pnpm run shop' to create shops first.", "⚠️ Setup Required");
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

    const envChoice = await select({
      message: "Select environment:",
      options: [
        { value: "staging", label: "Staging", hint: "Safe for development" },
        { value: "production", label: "Production", hint: "Live store - be careful!" }
      ]
    });

    if (isCancel(envChoice)) {
      return;
    }

    await this.startForShop(shopChoice as string, envChoice as 'staging' | 'production');
  }

  /**
   * Start development server for specific shop (auto-detected from branch)
   */
  async startForShop(shopId: string, environment: 'staging' | 'production'): Promise<void> {
    try {
      const config = this.configManager.load(shopId);
      const credentials = this.securityManager.loadCredentials(shopId);
      
      if (!credentials) {
        note(`No credentials found for ${shopId}. Set up credentials first.`, "⚠️ Setup Required");
        return;
      }

      const store = config.shopify.stores[environment];
      const token = this.securityManager.getThemeToken(shopId, environment);

      if (!token) {
        note(`No theme token found for ${environment}`, "⚠️ Setup Required");
        return;
      }

      await this.runShopifyCLI(store.domain, token, shopId, environment);
      
    } catch (error) {
      log.error(`Failed to start dev server: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Execute Shopify CLI dev command
   */
  private async runShopifyCLI(
    storeDomain: string, 
    themeToken: string, 
    shopId: string, 
    environment: 'staging' | 'production'
  ): Promise<void> {
    const s = spinner();
    s.start("Starting Shopify CLI...");

    try {
      // Check Shopify CLI availability
      try {
        execSync('shopify version', { stdio: 'ignore' });
      } catch {
        s.stop("❌ Shopify CLI not found");
        note("Install: pnpm add -g @shopify/cli", "Installation Required");
        return;
      }

      s.stop("✅ Starting development server");

      console.log(`\n🔗 Development Server:`);
      console.log(`   Shop: ${shopId} (${environment})`);
      console.log(`   Store: ${storeDomain}`);
      console.log(`   Token: ${themeToken.substring(0, 8)}...`);
      console.log(`\n⚡ Running: shopify theme dev --store=${storeDomain.replace('.myshopify.com', '')}`);
      console.log(`\nPress Ctrl+C to stop\n`);

      // Start Shopify CLI
      const devProcess = spawn('shopify', [
        'theme', 
        'dev', 
        `--store=${storeDomain.replace('.myshopify.com', '')}`
      ], {
        env: {
          ...process.env,
          SHOPIFY_CLI_THEME_TOKEN: themeToken,
          SHOPIFY_STORE: storeDomain.replace('.myshopify.com', '')
        },
        stdio: 'inherit'
      });

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
}