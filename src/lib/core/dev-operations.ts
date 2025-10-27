import { spawn, execSync } from "child_process";
import { select, isCancel, note, spinner } from "@clack/prompts";
import type { Dependencies, Result, DevOperations, CLIContext } from "./types.js";

/**
 * Development server operations
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

  return startShopifyDevelopmentServer(context, selectedShop, environment);
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

const startShopifyDevelopmentServer = async (context: CLIContext, shopId: string, environment: 'production' | 'staging'): Promise<Result<void>> => {
  // Load shop configuration
  const configResult = await context.shopOps.loadConfig(shopId);
  if (!configResult.success) {
    return { success: false, error: configResult.error || "Failed to load shop config" };
  }

  // Load credentials
  const credentialsResult = await context.credOps.loadCredentials(shopId);
  if (!credentialsResult.success) {
    return { success: false, error: "Failed to load credentials" };
  }

  const credentials = credentialsResult.data;
  if (!credentials) {
    note(`No credentials found for ${shopId}. Set up credentials first.`, "⚠️ Setup Required");
    return { success: false, error: "No credentials available" };
  }

  const config = configResult.data;
  if (!config) {
    return { success: false, error: "Config data is missing" };
  }

  const store = config.shopify.stores[environment];
  const token = credentials.shopify.stores[environment].themeToken;

  if (!token) {
    note(`No theme token found for ${environment}`, "⚠️ Setup Required");
    return { success: false, error: "No theme token available" };
  }

  return executeShopifyCLI(store.domain, token, shopId, environment);
};

const executeShopifyCLI = async (storeDomain: string, themeToken: string, shopId: string, environment: 'staging' | 'production'): Promise<Result<void>> => {
  const s = spinner();
  s.start("Starting Shopify CLI...");

  try {
    // Check Shopify CLI availability
    execSync('shopify version', { stdio: 'ignore' });

    s.stop("✅ Starting development server");

    console.log(`\n🔗 Development Server:`);
    console.log(`   Shop: ${shopId} (${environment})`);
    console.log(`   Store: ${storeDomain}`);
    console.log(`   Token: ${themeToken.substring(0, 8)}...`);
    console.log(`\n⚡ Running: shopify theme dev --store=${storeDomain.replace('.myshopify.com', '')}`);
    console.log(`\nPress Ctrl+C to stop\n`);

    // Start Shopify CLI with proper signal handling
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
      stdio: 'inherit',
      detached: false
    });

    return new Promise<Result<void>>((resolve) => {
      const handleSignal = (signal: NodeJS.Signals): void => {
        console.log(`\nReceived ${signal}, stopping development server...`);
        devProcess.kill(signal);
      };

      process.on('SIGINT', handleSignal);
      process.on('SIGTERM', handleSignal);

      devProcess.on('close', () => {
        process.off('SIGINT', handleSignal);
        process.off('SIGTERM', handleSignal);
        note("Development server stopped", "ℹ️ Info");
        resolve({ success: true });
      });

      devProcess.on('error', (error) => {
        process.off('SIGINT', handleSignal);
        process.off('SIGTERM', handleSignal);
        resolve({ success: false, error: error.message });
      });
    });

  } catch {
    s.stop("❌ Shopify CLI not found");
    note("Install: pnpm add -g @shopify/cli", "Installation Required");
    return { success: false, error: "Shopify CLI not available" };
  }
};

const startDevServer = async (_deps: Dependencies, _shopId: string, _environment: 'production' | 'staging'): Promise<Result<void>> => {
  // This is called through the DevOperations interface but we use the workflow function instead
  return { success: true };
};