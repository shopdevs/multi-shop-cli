import { select, isCancel, cancel, note } from "@clack/prompts";
import { ShopConfigManager } from "./ShopConfig.js";

/**
 * Handles shop selection UI for contextual development
 */
export class ShopSelector {
  private readonly configManager: ShopConfigManager;

  constructor(cwd: string = process.cwd()) {
    this.configManager = new ShopConfigManager(cwd);
  }

  /**
   * Select shop for development with smart defaults
   */
  async selectShop(purpose: string = "work with"): Promise<string | null> {
    const shops = this.configManager.list();

    if (shops.length === 0) {
      cancel("No shops configured yet. Please create a shop first using 'pnpm run shop'.");
      return null;
    }

    if (shops.length === 1) {
      const shop = shops[0];
      if (!shop) {
        return null;
      }
      note(`Using shop: ${shop}`, "Auto-selected");
      return shop;
    }

    const shopOptions = shops.map((shop) => {
      try {
        const config = this.configManager.load(shop);
        return {
          value: shop,
          label: `${config.name} (${shop})`,
          hint: `${config.shopify.stores.production.domain}`
        };
      } catch {
        return {
          value: shop,
          label: shop,
          hint: "Configuration error"
        };
      }
    });

    const shopChoice = await select({
      message: `Select shop to ${purpose}:`,
      options: shopOptions
    });

    if (isCancel(shopChoice)) {
      return null;
    }

    return shopChoice as string;
  }

  /**
   * Select environment (staging/production)
   */
  async selectEnvironment(shopId: string): Promise<'staging' | 'production' | null> {
    try {
      const config = this.configManager.load(shopId);
      
      const envChoice = await select({
        message: "Select environment:",
        options: [
          {
            value: "staging",
            label: "Staging",
            hint: config.shopify.stores.staging.domain
          },
          {
            value: "production", 
            label: "Production",
            hint: config.shopify.stores.production.domain
          }
        ]
      });

      if (isCancel(envChoice)) {
        return null;
      }

      return envChoice as 'staging' | 'production';
    } catch (error) {
      note(`Failed to load shop configuration: ${error instanceof Error ? error.message : String(error)}`, "Error");
      return null;
    }
  }
}