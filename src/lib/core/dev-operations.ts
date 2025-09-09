import { spawn, execSync } from "child_process";
import { select, isCancel, note, spinner } from "@clack/prompts";
import type { Dependencies, Result, DevOperations, CLIContext } from "./types.js";

/**
 * Pure functional development operations
 */

export const createDevOperations = (deps: Dependencies): DevOperations => ({
  startDev: (shopId: string, environment: 'production' | 'staging') => startDevServer(deps, shopId, environment)
});

export const startDevelopmentWorkflow = async (context: CLIContext): Promise<Result<void>> => {
  const shopsResult = await context.shopOps.listShops();
  if (!shopsResult.success || !shopsResult.data?.length) {
    note("No shops configured. Create a shop first.", "⚠️ Setup Required");
    return { success: false, error: "No shops available" };
  }

  const shops = shopsResult.data;
  const selectedShop = await selectShopForDevelopment(shops);
  if (!selectedShop) return { success: false, error: "No shop selected" };

  const environment = await selectEnvironment();
  if (!environment) return { success: false, error: "No environment selected" };

  return await context.devOps.startDev(selectedShop, environment);
};

const selectShopForDevelopment = async (shops: string[]): Promise<string | null> => {
  const shopChoice = await select({
    message: "Select shop for development:",
    options: shops.map(shop => ({
      value: shop,
      label: shop,
      hint: `Start dev server for ${shop}`
    }))
  });

  return isCancel(shopChoice) ? null : shopChoice as string;
};

const selectEnvironment = async (): Promise<'staging' | 'production' | null> => {
  const envChoice = await select({
    message: "Select environment:",
    options: [
      { value: "staging", label: "Staging", hint: "Safe for development" },
      { value: "production", label: "Production", hint: "Live store - be careful!" }
    ]
  });

  return isCancel(envChoice) ? null : envChoice as 'staging' | 'production';
};

const startDevServer = async (deps: Dependencies, shopId: string, environment: 'production' | 'staging'): Promise<Result<void>> => {
  const s = spinner();
  s.start("Starting Shopify CLI...");

  try {
    // Check Shopify CLI availability
    execSync('shopify version', { stdio: 'ignore' });

    // This would load config and credentials functionally
    s.stop("✅ Starting development server");
    
    note("Development server integration", "🚧 Implementation");
    // Full Shopify CLI integration would go here
    
    return { success: true };
  } catch {
    s.stop("❌ Shopify CLI not found");
    note("Install: pnpm add -g @shopify/cli", "Installation Required");
    return { success: false, error: "Shopify CLI not available" };
  }
};