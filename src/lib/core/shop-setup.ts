import { note, text, select, isCancel, spinner } from "@clack/prompts";
import { execSync } from "child_process";
import type { ShopConfig, ShopCredentials } from "../../types/shop.js";
import type { CLIContext } from "./types.js";
import type { ShopData } from "./shop-input.js";

/**
 * Shop setup operations (branches and credentials)
 */

export const setupShopResources = async (shopData: ShopData, config: ShopConfig, context: CLIContext): Promise<void> => {
  await Promise.all([
    handleBranchCreation(shopData.shopId, config),
    handleCredentialSetup(context, shopData, config)
  ]);
};

const handleBranchCreation = async (shopId: string, _config: ShopConfig): Promise<void> => {
  const shouldCreate = await askToCreateBranches();
  
  if (shouldCreate) {
    await createGitHubBranches(shopId);
  } else {
    showManualBranchInstructions(shopId);
  }
};

const askToCreateBranches = async (): Promise<boolean> => {
  const createBranches = await select({
    message: "Create GitHub branches for this shop?",
    options: [
      { value: "yes", label: "Yes, create branches automatically", hint: "Recommended" },
      { value: "no", label: "No, I'll create them manually", hint: "Manual setup" }
    ]
  });

  return !isCancel(createBranches) && createBranches === "yes";
};

const createGitHubBranches = async (shopId: string): Promise<void> => {
  const s = spinner();
  s.start("Creating GitHub branches...");

  try {
    execSync('git rev-parse --git-dir', { stdio: 'ignore' });
    const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
    
    const branches = [`${shopId}/main`, `${shopId}/staging`];
    
    for (const branch of branches) {
      try {
        execSync(`git checkout -b ${branch}`, { stdio: 'ignore' });
        execSync(`git push -u origin ${branch}`, { stdio: 'ignore' });
        execSync(`git checkout ${currentBranch}`, { stdio: 'ignore' });
      } catch {
        // Branch might already exist
      }
    }

    s.stop("✅ GitHub branches created");
    note(`Created: ${branches.join(' and ')}`, "🌿 Branches");
    
  } catch {
    s.stop("❌ Failed to create branches");
    showManualBranchInstructions(shopId);
  }
};

const showManualBranchInstructions = (shopId: string): void => {
  note("Create branches manually:", "📝 Instructions");
  console.log(`git checkout -b ${shopId}/main && git push -u origin ${shopId}/main`);
  console.log(`git checkout -b ${shopId}/staging && git push -u origin ${shopId}/staging`);
};

const handleCredentialSetup = async (context: CLIContext, shopData: ShopData, config: ShopConfig): Promise<void> => {
  note(`Setting up credentials for ${config.name}`, "🔐 Credentials");

  if (shopData.authMethod === 'theme-access-app') {
    showThemeAccessInstructions();
  }

  const credentials = await gatherCredentials(shopData, config);
  if (!credentials) return;

  const result = await context.credOps.saveCredentials(shopData.shopId, credentials);
  if (result.success) {
    note("✅ Credentials saved securely", "Complete");
    note(`Shop ${config.name} is ready for development!`, "🎉 Success");
  } else {
    note(result.error || "Failed to save credentials", "❌ Error");
  }
};

const showThemeAccessInstructions = (): void => {
  console.log(`\n📋 Theme Access App Setup:`);
  console.log(`1. Ask a shop admin to add your email to the Theme Access app`);
  console.log(`2. Check your email for the access link`);
  console.log(`3. Click the link to view your theme access password`);
  console.log(`4. Enter the passwords below\n`);
};

const gatherCredentials = async (shopData: ShopData, config: ShopConfig): Promise<ShopCredentials | null> => {
  const productionToken = await getProductionToken(config);
  if (!productionToken) return null;

  const stagingToken = await getStagingToken(config, productionToken);

  return {
    developer: process.env['USER'] || process.env['USERNAME'] || 'developer',
    shopify: {
      stores: {
        production: { themeToken: productionToken },
        staging: { themeToken: stagingToken }
      }
    },
    notes: `Theme access app credentials for ${shopData.shopId}`
  };
};

const getProductionToken = async (config: ShopConfig): Promise<string | null> => {
  const token = await text({
    message: `Production theme access password (${config.shopify.stores.production.domain}):`,
    placeholder: "Enter your theme access password",
    validate: (value) => {
      if (!value) return "Production password is required";
      if (value.length < 8) return "Password seems too short";
      return undefined;
    }
  });

  return isCancel(token) ? null : token as string;
};

const getStagingToken = async (config: ShopConfig, productionToken: string): Promise<string> => {
  if (config.shopify.stores.staging.domain === config.shopify.stores.production.domain) {
    return productionToken;
  }

  const stagingInput = await text({
    message: `Staging theme access password (${config.shopify.stores.staging.domain}):`,
    placeholder: "Enter staging password (or press Enter to use production password)",
    validate: (value) => {
      if (!value) return undefined;
      if (value.length < 8) return "Password seems too short";
      return undefined;
    }
  });

  return (!isCancel(stagingInput) && stagingInput) ? stagingInput as string : productionToken;
};