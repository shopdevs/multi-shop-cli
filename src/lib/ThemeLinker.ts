import { select, isCancel, note, spinner } from "@clack/prompts";
import { execSync } from "child_process";
import { ShopConfigManager } from "./ShopConfig.js";
import { SecurityManager } from "./core/SecurityManager.js";
import type { ShopConfig, ShopCredentials } from "../types/shop.js";

/**
 * Manages Shopify theme to GitHub branch linking
 */
export class ThemeLinker {
  private readonly configManager: ShopConfigManager;
  private readonly security: SecurityManager;

  constructor(cwd: string = process.cwd()) {
    this.configManager = new ShopConfigManager(cwd);
    this.security = new SecurityManager(`${cwd}/shops/credentials`);
  }

  async linkThemes(): Promise<void> {
    const shops = this.configManager.list();
    
    if (shops.length === 0) {
      note("No shops configured yet. Create shops first.", "🔗 Link Themes");
      return;
    }

    note("Connect Git branches to Shopify themes for automatic syncing", "🔗 Theme Linking");
    
    const shopId = await this.selectShop(shops);
    if (!shopId) return;

    await this.setupThemes(shopId);
  }

  private async selectShop(shops: string[]): Promise<string | null> {
    const shopChoice = await select({
      message: "Select shop to link themes:",
      options: shops.map(shop => ({ 
        value: shop, 
        label: shop, 
        hint: `Set up theme linking for ${shop}` 
      }))
    });

    if (isCancel(shopChoice)) return null;
    return shopChoice as string;
  }

  private async setupThemes(shopId: string): Promise<void> {
    const config = this.configManager.load(shopId);
    const credentials = this.security.loadCredentials(shopId);
    
    if (!credentials) {
      note("Set up credentials first using 'Edit Shop'", "⚠️ Credentials Required");
      return;
    }

    note(`Setting up themes for ${config.name}`, `🎨 ${shopId}`);
    
    await this.checkExistingThemes(config, credentials);
    this.showManualInstructions(config);
  }

  private async checkExistingThemes(config: ShopConfig, credentials: ShopCredentials): Promise<void> {
    const s = spinner();
    const prodDomain = config.shopify.stores.production.domain;
    s.start(`Checking themes for ${prodDomain}...`);

    try {
      const env = {
        ...process.env,
        SHOPIFY_CLI_THEME_TOKEN: credentials.shopify.stores.production.themeToken,
        SHOPIFY_STORE: prodDomain.replace('.myshopify.com', '')
      };

      const output = execSync('shopify theme list', { 
        env, 
        encoding: 'utf8',
        timeout: 10000
      });

      s.stop("✅ Retrieved theme list");
      
      note(`Current themes for ${prodDomain}:`, "📋 Themes");
      if (output.trim()) {
        console.log(output);
      } else {
        note("No themes found or authentication issue", "⚠️ Empty Result");
      }

    } catch (error) {
      s.stop("❌ Could not retrieve themes");
      note(`Shopify CLI failed: ${error instanceof Error ? error.message : String(error)}`, "❌ Error");
    }
  }

  private showManualInstructions(config: ShopConfig): void {
    note(`Manual theme linking for ${config.name}:`, "📝 Instructions");
    
    console.log(`\n1. Go to Shopify Admin:`);
    console.log(`   Production: https://${config.shopify.stores.production.domain}/admin/themes`);
    console.log(`   Staging: https://${config.shopify.stores.staging.domain}/admin/themes`);
    
    console.log(`\n2. Add theme → Connect from GitHub:`);
    console.log(`   Production branch: ${config.shopify.stores.production.branch}`);
    console.log(`   Staging branch: ${config.shopify.stores.staging.branch}`);
    
    console.log(`\n3. Theme names (suggested):`);
    console.log(`   Production: "${config.name} Main"`);
    console.log(`   Staging: "${config.name} Staging"`);
    
    console.log(`\n4. After connecting:`);
    console.log(`   - Changes in Shopify admin sync to Git automatically`);
    console.log(`   - Changes in Git sync to Shopify automatically`);
    
    note("Connect staging branch first to test integration", "💡 Tip");
  }
}