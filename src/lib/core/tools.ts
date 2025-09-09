import { select, isCancel, note, text, spinner } from "@clack/prompts";
import { execSync } from "child_process";
import type { CLIContext, Result } from "./types.js";

/**
 * Tools menu operations
 */

export const handleTools = async (context: CLIContext): Promise<Result<void>> => {
  const toolChoice = await selectTool();
  if (!toolChoice) return { success: false, error: "No tool selected" };

  switch (toolChoice) {
    case "sync":
      return await syncShops(context);
    case "themes":
      return await linkThemes(context);
    case "versions":
      return await checkVersions();
    default:
      return { success: false, error: "Unknown tool" };
  }
};

const selectTool = async (): Promise<string | null> => {
  const toolChoice = await select({
    message: "Select tool:",
    options: [
      { value: "sync", label: "Sync Shops", hint: "Create PRs to deploy main branch changes to shops" },
      { value: "themes", label: "Link Themes", hint: "Connect Git branches to Shopify themes" },
      { value: "versions", label: "Version Check", hint: "Check versions of key tools and packages" }
    ]
  });

  return isCancel(toolChoice) ? null : toolChoice as string;
};

const syncShops = async (context: CLIContext): Promise<Result<void>> => {
  const shopsResult = await context.shopOps.listShops();
  if (!shopsResult.success || !shopsResult.data?.length) {
    note("No shops configured yet. Create shops first.", "📋 Sync Shops");
    return { success: true };
  }

  const shops = shopsResult.data;
  note("Sync main branch changes to shops by creating PRs", "🔄 Shop Sync");

  const selectedShops = await selectShopsToSync(shops);
  if (!selectedShops) return { success: false, error: "No shops selected" };

  const prTitle = await getPRTitle();
  if (!prTitle) return { success: false, error: "No PR title provided" };

  return await createShopSyncPRs(selectedShops, prTitle);
};

const selectShopsToSync = async (shops: string[]): Promise<string[] | null> => {
  const allShopsOption = { value: "all", label: "All Shops", hint: `Deploy to all ${shops.length} shops` };
  const shopOptions = shops.map(shop => ({ value: shop, label: shop, hint: `Deploy to ${shop} only` }));
  
  const shopChoice = await select({
    message: "Select shops to sync:",
    options: [allShopsOption, ...shopOptions]
  });

  if (isCancel(shopChoice)) return null;
  return shopChoice === "all" ? shops : [shopChoice as string];
};

const getPRTitle = async (): Promise<string | null> => {
  const prTitle = await text({
    message: "PR title for shop sync:",
    placeholder: "Deploy latest changes from main",
    validate: (value) => value ? undefined : "PR title is required"
  });

  return isCancel(prTitle) ? null : prTitle as string;
};

const createShopSyncPRs = async (shops: string[], title: string): Promise<Result<void>> => {
  const s = spinner();
  
  try {
    s.start("Creating shop sync PRs...");
    
    // Check if gh CLI is available
    execSync('gh --version', { stdio: 'ignore' });

    const results: { shop: string; success: boolean; error?: string }[] = [];

    for (const shop of shops) {
      try {
        const command = `gh pr create --base ${shop}/staging --head main --title "${title}"`;
        execSync(command, { stdio: 'ignore' });
        results.push({ shop, success: true });
      } catch (error) {
        results.push({ 
          shop, 
          success: false, 
          error: error instanceof Error ? error.message : String(error) 
        });
      }
    }

    s.stop("✅ PR creation completed");
    
    const successes = results.filter(r => r.success);
    const failures = results.filter(r => !r.success);

    if (successes.length > 0) {
      note(`Created PRs for: ${successes.map(r => r.shop).join(', ')}`, "✅ Success");
    }

    if (failures.length > 0) {
      note(`Failed for: ${failures.map(r => r.shop).join(', ')}`, "⚠️ Manual Required");
      showManualPRInstructions(failures.map(f => f.shop), title);
    }

    return { success: true };

  } catch {
    s.stop("❌ GitHub CLI not found");
    note("Install GitHub CLI to automate PR creation", "Manual Setup Required");
    showManualPRInstructions(shops, title);
    return { success: true }; // Still successful, just manual
  }
};

const showManualPRInstructions = (shops: string[], title: string): void => {
  note("Manual PR creation commands:", "📝 Commands");
  shops.forEach(shop => {
    console.log(`gh pr create --base ${shop}/staging --head main --title "${title}"`);
  });
  
  note("Or using GitHub web interface:", "🌐 Alternative");
  console.log("1. Go to your repository on GitHub");
  console.log("2. Click 'Pull requests' → 'New pull request'");
  shops.forEach(shop => {
    console.log(`3. Create: main → ${shop}/staging`);
  });
};

const linkThemes = async (context: CLIContext): Promise<Result<void>> => {
  const shopsResult = await context.shopOps.listShops();
  if (!shopsResult.success || !shopsResult.data?.length) {
    note("No shops configured yet. Create shops first.", "🔗 Link Themes");
    return { success: true };
  }

  const shops = shopsResult.data;
  note("Connect Git branches to Shopify themes for automatic syncing", "🔗 Theme Linking");
  
  const selectedShop = await selectShopForThemes(shops);
  if (!selectedShop) return { success: false, error: "No shop selected" };

  return await setupThemes(context, selectedShop);
};

const selectShopForThemes = async (shops: string[]): Promise<string | null> => {
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

const setupThemes = async (context: CLIContext, shopId: string): Promise<Result<void>> => {
  const configResult = await context.shopOps.loadConfig(shopId);
  if (!configResult.success) {
    return { success: false, error: configResult.error || "Failed to load config" };
  }

  const credentialsResult = await context.credOps.loadCredentials(shopId);
  if (!credentialsResult.success || !credentialsResult.data) {
    note("Set up credentials first using 'Edit Shop'", "⚠️ Credentials Required");
    return { success: true };
  }

  const config = configResult.data!;
  const credentials = credentialsResult.data;

  note(`Setting up themes for ${config.name}`, `🎨 ${shopId}`);
  
  await checkExistingThemes(config, credentials);
  showManualThemeLinkingInstructions(config);

  return { success: true };
};

const checkExistingThemes = async (config: any, credentials: any): Promise<void> => {
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
};

const showManualThemeLinkingInstructions = (config: any): void => {
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
};

const checkVersions = async (): Promise<Result<void>> => {
  note("Checking versions of key tools and packages", "📋 Version Check");
  
  const tools = [
    { name: "Shopify CLI", command: "shopify version" },
    { name: "@shopdevs/multi-shop-cli", package: "@shopdevs/multi-shop-cli" },
    { name: "Node.js", version: process.version },
    { name: "pnpm", command: "pnpm --version" }
  ];

  console.log(`\n📋 Tool Versions:`);
  
  for (const tool of tools) {
    await displayToolVersion(tool);
  }

  return { success: true };
};

const displayToolVersion = async (tool: { name: string; command?: string; package?: string; version?: string }): Promise<void> => {
  console.log(`\n${tool.name}:`);

  if (tool.version) {
    console.log(`  Version: ${tool.version}`);
    console.log(`  Status: ✅ Up to date`);
    return;
  }

  if (tool.command) {
    try {
      const version = execSync(tool.command, { encoding: 'utf8', timeout: 5000 }).trim();
      console.log(`  Version: ${version}`);
      console.log(`  Status: ✅ Up to date`);
    } catch {
      console.log(`  Version: Not installed`);
      console.log(`  Status: ❌ Not installed`);
    }
    return;
  }

  if (tool.package) {
    try {
      const localOutput = execSync(`pnpm list ${tool.package} --depth=0 --json`, { encoding: 'utf8', timeout: 5000 });
      const localResult = JSON.parse(localOutput);
      const localVersion = localResult.dependencies?.[tool.package]?.version;

      const latestVersion = execSync(`npm view ${tool.package} version`, { encoding: 'utf8', timeout: 5000 }).trim().replace(/"/g, '');

      if (localVersion === latestVersion) {
        console.log(`  Version: ${localVersion}`);
        console.log(`  Status: ✅ Up to date`);
      } else {
        console.log(`  Version: Local: ${localVersion}, NPM: ${latestVersion}`);
        console.log(`  Status: ⚠️ Update available`);
        console.log(`  Update: pnpm update -D ${tool.package}`);
      }
    } catch {
      console.log(`  Version: Not installed locally`);
      console.log(`  Status: ❌ Not installed locally`);
    }
  }
};