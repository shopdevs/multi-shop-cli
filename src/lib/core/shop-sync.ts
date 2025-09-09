import { select, isCancel, note, text, spinner } from "@clack/prompts";
import { execSync } from "child_process";
import type { CLIContext, Result } from "./types.js";

/**
 * Shop sync operations for creating PRs
 */

export const syncShops = async (context: CLIContext): Promise<Result<void>> => {
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

const createShopSyncPRs = async (selectedShops: string[], title: string): Promise<Result<void>> => {
  const s = spinner();
  
  try {
    s.start("Creating shop sync PRs...");
    execSync('gh --version', { stdio: 'ignore' });

    const results: { shop: string; success: boolean }[] = [];

    for (const shop of selectedShops) {
      try {
        execSync(`gh pr create --base ${shop}/staging --head main --title "${title}"`, { stdio: 'ignore' });
        results.push({ shop, success: true });
      } catch {
        results.push({ shop, success: false });
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
      showManualInstructions(failures.map(f => f.shop), title);
    }

    return { success: true };

  } catch {
    s.stop("❌ GitHub CLI not found");
    note("Install GitHub CLI to automate PR creation", "Manual Setup Required");
    showManualInstructions(selectedShops, title);
    return { success: true };
  }
};

const showManualInstructions = (shops: string[], title: string): void => {
  note("Manual PR creation commands:", "📝 Commands");
  shops.forEach(shop => {
    console.log(`gh pr create --base ${shop}/staging --head main --title "${title}"`);
  });
};