import { select, isCancel, note } from "@clack/prompts";
import type { CLIContext, Result } from "./types.js";

/**
 * Theme linking operations for Shopify GitHub integration
 */

export const linkThemes = async (context: CLIContext): Promise<Result<void>> => {
  const shopsResult = await context.shopOps.listShops();
  if (!shopsResult.success || !shopsResult.data?.length) {
    note("No shops configured yet. Create shops first.", "🔗 Link Themes");
    return { success: true };
  }

  const shopChoice = await selectShopForLinking(shopsResult.data);
  if (!shopChoice) return { success: false, error: "No shop selected" };

  const configResult = await context.shopOps.loadConfig(shopChoice);
  if (!configResult.success) {
    return { success: false, error: configResult.error || "Failed to load config" };
  }

  const credentialsResult = await context.credOps.loadCredentials(shopChoice);
  if (!credentialsResult.success || !credentialsResult.data) {
    note("Set up credentials first using 'Edit Shop'", "⚠️ Credentials Required");
    return { success: true };
  }

  const config = configResult.data!;
  note(`Setting up themes for ${config.name}`, `🎨 ${shopChoice}`);
  
  showThemeLinkingInstructions(config);

  return { success: true };
};

const selectShopForLinking = async (shops: string[]): Promise<string | null> => {
  const shopChoice = await select({
    message: "Select shop to link themes:",
    options: shops.map(shop => ({ 
      value: shop, 
      label: shop, 
      hint: `Set up theme linking for ${shop}` 
    }))
  });

  return isCancel(shopChoice) ? null : shopChoice as string;
};

const showThemeLinkingInstructions = (config: any): void => {
  console.log(`\n📝 Manual theme linking for ${config.name}:`);
  console.log(`\n1. Go to Shopify Admin:`);
  console.log(`   Production: https://${config.shopify.stores.production.domain}/admin/themes`);
  console.log(`   Staging: https://${config.shopify.stores.staging.domain}/admin/themes`);
  console.log(`\n2. Add theme → Connect from GitHub:`);
  console.log(`   Production branch: ${config.shopify.stores.production.branch}`);
  console.log(`   Staging branch: ${config.shopify.stores.staging.branch}`);
  console.log(`\n3. Theme names (suggested):`);
  console.log(`   Production: "${config.name} Main"`);
  console.log(`   Staging: "${config.name} Staging"`);
  console.log(`\n4. After connecting, changes sync automatically between Shopify and Git`);
};