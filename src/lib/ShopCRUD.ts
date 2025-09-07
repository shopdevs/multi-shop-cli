import { intro, text, select, isCancel, note, log } from "@clack/prompts";
import type { ShopConfig, AuthenticationMethod } from "../types/shop.js";
import { ShopConfigManager } from "./ShopConfig.js";

/**
 * Handles shop creation, editing, and deletion
 * Focused on shop lifecycle management
 */
export class ShopCRUD {
  private readonly configManager: ShopConfigManager;

  constructor(cwd: string = process.cwd()) {
    this.configManager = new ShopConfigManager(cwd);
  }

  /**
   * Interactive shop creation
   */
  async create(): Promise<void> {
    intro("🆕 Create New Shop");
    
    const shopId = await text({
      message: "Shop ID (lowercase, hyphens only):",
      placeholder: "my-shop",
      validate: (value) => {
        if (!value) return "Shop ID is required";
        if (!/^[a-z0-9-]+$/.test(value)) return "Only lowercase letters, numbers, and hyphens allowed";
        if (value.length > 50) return "Shop ID must be 50 characters or less";
        
        if (this.configManager.list().includes(value)) {
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
        { value: "theme-access-app", label: "Theme Access App", hint: "Recommended" },
        { value: "manual-tokens", label: "Manual Tokens", hint: "Direct API access" }
      ]
    });

    if (isCancel(authMethod)) return;

    try {
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

      this.configManager.save(shopId as string, config);
      
      note(`✅ Shop configuration created for ${shopName}`, "Success");
      note("Next: Set up credentials using 'Edit Shop'", "📝 Next Steps");
      
    } catch (error) {
      log.error(`Failed to create shop: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * List all shops with status
   */
  async list(): Promise<void> {
    const shops = this.configManager.list();
    
    if (shops.length === 0) {
      note("No shops configured yet.", "📋 Shop List");
      return;
    }

    console.log();
    note(`Found ${shops.length} configured shop${shops.length === 1 ? '' : 's'}:`, "📋 Shop List");
    
    for (const shopId of shops) {
      try {
        const config = this.configManager.load(shopId);
        
        console.log(`\n📦 ${config.name} (${shopId})`);
        console.log(`   Production: ${config.shopify.stores.production.domain}`);
        console.log(`   Staging: ${config.shopify.stores.staging.domain}`);
        console.log(`   Branch: ${config.shopify.stores.production.branch}`);
        console.log(`   Auth: ${config.shopify.authentication.method}`);
        
      } catch (error) {
        console.log(`\n❌ ${shopId} (Configuration error)`);
        console.log(`   Error: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  /**
   * Delete shop configuration
   */
  async delete(shopId: string): Promise<void> {
    const confirm = await select({
      message: `Delete shop "${shopId}" permanently?`,
      options: [
        { value: "no", label: "No, cancel" },
        { value: "yes", label: "Yes, delete" }
      ]
    });

    if (confirm === "yes") {
      try {
        this.configManager.delete(shopId);
        note(`✅ Shop "${shopId}" deleted`, "Deleted");
      } catch (error) {
        log.error(`Failed to delete shop: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }
}