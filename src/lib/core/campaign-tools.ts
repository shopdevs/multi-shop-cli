import { select, isCancel, text, note, confirm, spinner } from "@clack/prompts";
import { execSync } from "child_process";
import type { CLIContext, Result } from "./types.js";

/**
 * Campaign tools for managing promotional campaigns and time-based theme variations
 * Implements Shopify's recommended branch-per-campaign workflow
 */

export const handleCampaignTools = async (context: CLIContext): Promise<Result<void>> => {
  const campaignChoice = await select({
    message: "Select campaign tool:",
    options: [
      { value: "create", label: "Create Promo Branch", hint: "Start new campaign" },
      { value: "push", label: "Push Promo to Main", hint: "Merge campaign content back" },
      { value: "end", label: "End Promo", hint: "Cleanup after campaign" },
      { value: "list", label: "List Active Promos", hint: "Show all promo branches" }
    ]
  });

  if (isCancel(campaignChoice)) {
    return { success: false, error: "No tool selected" };
  }

  switch (campaignChoice) {
    case "create":
      return createPromoBranch(context);
    case "push":
      return pushPromoToMain(context);
    case "end":
      return endPromo(context);
    case "list":
      return listActivePromos(context);
    default:
      return { success: false, error: "Unknown tool" };
  }
};

const createPromoBranch = async (context: CLIContext): Promise<Result<void>> => {
  note("Create a promo branch for a campaign or seasonal promotion", "🎯 Create Promo Branch");

  // Select shop
  const shopsResult = await context.shopOps.listShops();
  if (!shopsResult.success || !shopsResult.data?.length) {
    note("No shops configured yet. Create shops first.", "⚠️ Error");
    return { success: false, error: "No shops configured" };
  }

  const shopId = await selectShop(shopsResult.data);
  if (!shopId) return { success: false, error: "No shop selected" };

  // Get promo name
  const promoName = await text({
    message: "Promo campaign name:",
    placeholder: "summer-sale, black-friday, holiday-2025",
    validate: (value) => {
      if (!value) return "Promo name is required";
      if (!/^[a-z0-9-]+$/.test(value)) return "Use lowercase letters, numbers, and hyphens only";
      return undefined;
    }
  });

  if (isCancel(promoName)) return { success: false, error: "Cancelled" };

  const branchName = `${shopId}/promo-${promoName}`;
  const baseBranch = `${shopId}/main`;

  return createAndPushPromoBranch(branchName, baseBranch, shopId, promoName as string);
};

const createAndPushPromoBranch = async (
  branchName: string,
  baseBranch: string,
  shopId: string,
  promoName: string
): Promise<Result<void>> => {
  const s = spinner();

  try {
    s.start("Creating promo branch...");

    // Check if base branch exists
    try {
      execSync(`git rev-parse --verify origin/${baseBranch}`, { stdio: 'ignore' });
    } catch {
      s.stop("❌ Base branch not found");
      note(`Branch ${baseBranch} doesn't exist. Create the shop first.`, "⚠️ Error");
      return { success: false, error: `Base branch ${baseBranch} not found` };
    }

    // Create branch from shop/main
    execSync(`git checkout -b ${branchName} origin/${baseBranch}`);
    s.message("Branch created locally");

    // Push to GitHub
    execSync(`git push -u origin ${branchName}`);
    s.stop("✅ Promo branch created and pushed");

    displayPromoNextSteps(shopId, branchName, promoName);

    return { success: true };
  } catch (error) {
    s.stop("❌ Failed to create promo branch");
    return {
      success: false,
      error: `Failed to create branch: ${error instanceof Error ? error.message : String(error)}`
    };
  }
};

const pushPromoToMain = async (context: CLIContext): Promise<Result<void>> => {
  note("Push promo campaign content back to shop main branch", "🔄 Push Promo to Main");

  const currentBranch = getCurrentBranch();

  // Validate we're on a promo branch
  if (!currentBranch.includes('/promo-')) {
    note(`You're not on a promo branch. Current: ${currentBranch}`, "⚠️ Error");
    return { success: false, error: "Not on promo branch" };
  }

  const shopId = currentBranch.split('/')[0];
  const targetBranch = `${shopId}/main`;

  const confirm = await confirmPushPromo(currentBranch, targetBranch);
  if (!confirm) return { success: false, error: "Cancelled" };

  return createPromoToMainPR(currentBranch, targetBranch);
};

const endPromo = async (_context: CLIContext): Promise<Result<void>> => {
  note("End a promo campaign and cleanup", "🧹 End Promo");

  const currentBranch = getCurrentBranch();

  if (!currentBranch.includes('/promo-')) {
    note("Not on a promo branch. Switch to promo branch first.", "⚠️ Error");
    return { success: false, error: "Not on promo branch" };
  }

  const confirmDelete = await confirm({
    message: `Delete branch ${currentBranch}? This can't be undone.`,
    initialValue: false
  });

  if (isCancel(confirmDelete) || !confirmDelete) {
    return { success: false, error: "Cancelled" };
  }

  const s = spinner();
  s.start("Cleaning up promo branch...");

  try {
    const shopMain = `${currentBranch.split('/')[0]}/main`;

    execSync(`git checkout ${shopMain}`);
    s.message("Switched to shop main");

    execSync(`git branch -D ${currentBranch}`);
    s.message("Deleted local branch");

    execSync(`git push origin --delete ${currentBranch}`);
    s.stop("✅ Promo branch deleted");

    note(`Branch ${currentBranch} has been deleted locally and on GitHub`, "✅ Cleanup Complete");

    return { success: true };
  } catch (error) {
    s.stop("❌ Cleanup failed");
    return {
      success: false,
      error: `Failed to cleanup: ${error instanceof Error ? error.message : String(error)}`
    };
  }
};

const listActivePromos = async (context: CLIContext): Promise<Result<void>> => {
  try {
    const branches = execSync('git branch -r', { encoding: 'utf8' })
      .split('\n')
      .map(b => b.trim())
      .filter(b => b.includes('/promo-'))
      .map(b => b.replace('origin/', ''));

    if (branches.length === 0) {
      note("No active promo branches found", "📋 Active Promos");
      return { success: true };
    }

    note(`Found ${branches.length} active promo branch${branches.length === 1 ? '' : 'es'}:`, "📋 Active Promos");

    branches.forEach(branch => {
      const [shop, promo] = branch.split('/promo-');
      console.log(`\n🎯 ${shop}/${promo}`);
      console.log(`   Branch: ${branch}`);
    });

    console.log();

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `Failed to list promos: ${error instanceof Error ? error.message : String(error)}`
    };
  }
};

// Helper functions
const selectShop = async (shops: string[]): Promise<string | null> => {
  const shopChoice = await select({
    message: "Select shop for promo:",
    options: shops.map(shop => ({ value: shop, label: shop }))
  });

  return isCancel(shopChoice) ? null : String(shopChoice);
};

const getCurrentBranch = (): string => {
  return execSync('git branch --show-current', { encoding: 'utf8' }).trim();
};

const confirmPushPromo = async (from: string, to: string): Promise<boolean> => {
  const confirmPush = await confirm({
    message: `Create PR: ${from} → ${to}?`,
    initialValue: true
  });

  return !isCancel(confirmPush) && Boolean(confirmPush);
};

const createPromoToMainPR = async (fromBranch: string, toBranch: string): Promise<Result<void>> => {
  const s = spinner();

  try {
    s.start("Creating PR...");

    const prTitle = `Deploy promo campaign: ${fromBranch.split('/promo-')[1]}`;
    const prBody = `Merge promo campaign content from ${fromBranch} to ${toBranch}.

This includes all customizations made during the campaign.

**Review carefully:** This PR contains campaign-specific content that should be merged to keep ${toBranch} current.`;

    execSync(
      `gh pr create --base ${toBranch} --head ${fromBranch} --title "${prTitle}" --body "${prBody}"`,
      { stdio: 'pipe' }
    );

    s.stop("✅ PR created");
    note(`PR created: ${fromBranch} → ${toBranch}`, "✅ Success");

    return { success: true };
  } catch (error) {
    s.stop("❌ PR creation failed");

    const manualInstructions = `
Manual PR creation:

GitHub CLI:
  gh pr create --base ${toBranch} --head ${fromBranch}

GitHub Web:
  1. Go to your repository
  2. Click "Pull requests" → "New pull request"
  3. Set base: ${toBranch}, compare: ${fromBranch}
  4. Create pull request
`;

    console.log(manualInstructions);

    return { success: true }; // Don't fail, just show manual instructions
  }
};

const displayPromoNextSteps = (shopId: string, branchName: string, promoName: string): void => {
  note("Promo branch created successfully!", "✅ Success");

  console.log(`\n📋 Next Steps:\n`);
  console.log(`1. Connect to Shopify Theme:`);
  console.log(`   - Shopify Admin → Themes → Add theme → Connect from GitHub`);
  console.log(`   - Select branch: ${branchName}`);
  console.log();
  console.log(`2. Customize in Shopify Theme Editor:`);
  console.log(`   - Changes auto-sync back to ${branchName}`);
  console.log();
  console.log(`3. Launch promo:`);
  console.log(`   - Publish the theme (or use Launchpad app for scheduling)`);
  console.log();
  console.log(`4. After campaign ends:`);
  console.log(`   - Run: pnpm run shop → Campaign Tools → Push Promo to Main`);
  console.log(`   - This merges content back to ${shopId}/main`);
  console.log();
  console.log(`5. Cleanup:`);
  console.log(`   - Run: pnpm run shop → Campaign Tools → End Promo`);
  console.log(`   - Deletes the ${branchName} branch`);
  console.log();
};
