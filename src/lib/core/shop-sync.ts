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

  return createShopSyncPRs(selectedShops, prTitle);
};

const selectShopsToSync = async (shops: string[]): Promise<string[] | null> => {
  const allShopsOption = { value: "all", label: "All Shops", hint: `Deploy to all ${shops.length} shops` };
  const shopOptions = shops.map(shop => ({ value: shop, label: shop, hint: `Deploy to ${shop} only` }));
  
  const shopChoice = await select({
    message: "Select shops to sync:",
    options: [allShopsOption, ...shopOptions]
  });

  if (isCancel(shopChoice)) return null;
  return shopChoice === "all" ? shops : [String(shopChoice)];
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
  // Check for content file changes before creating PRs
  const contentWarning = await checkForContentFiles(selectedShops);
  if (contentWarning && !await confirmSyncWithContentFiles()) {
    return { success: false, error: "Sync cancelled by user" };
  }

  const s = spinner();

  try {
    s.start("Creating shop sync PRs...");
    execSync('gh --version', { stdio: 'ignore' });

    const results: { shop: string; success: boolean; error?: string }[] = [];

    for (const shop of selectedShops) {
      try {
        execSync(`gh pr create --base ${shop}/staging --head main --title "${title}" --body "Automated deployment of latest changes from main branch"`, { 
          stdio: ['ignore', 'pipe', 'pipe'],
          encoding: 'utf8' 
        });
        results.push({ shop, success: true });
      } catch (error: unknown) {
        // Capture the actual GitHub CLI error output
        const err = error as { stderr?: string; stdout?: string; message?: string };
        const errorOutput = err.stderr || err.stdout || err.message || 'Unknown error';
        results.push({
          shop,
          success: false,
          error: errorOutput
        });
      }
    }

    const successes = results.filter(r => r.success);
    const failures = results.filter(r => !r.success);

    if (successes.length > 0 && failures.length === 0) {
      s.stop("✅ All PRs created successfully");
      note(`Created PRs for: ${successes.map(r => r.shop).join(', ')}`, "✅ Success");
    } else if (successes.length > 0 && failures.length > 0) {
      s.stop("⚠️ Some PRs failed");
      note(`Created PRs for: ${successes.map(r => r.shop).join(', ')}`, "✅ Success");
      note("Some PR creation failed", "⚠️ Automation Failed");
      await offerToShowLogs(failures);
      showCompleteManualInstructions(failures.map(f => f.shop), title);
    } else {
      s.stop("❌ All PR creation failed");
      note("Automated PR creation failed", "⚠️ Automation Failed");
      await offerToShowLogs(failures);
      showCompleteManualInstructions(failures.map(f => f.shop), title);
    }

    return { success: true };

  } catch {
    s.stop("❌ GitHub CLI not found");
    note("Install GitHub CLI to automate PR creation", "Manual Setup Required");
    showCompleteManualInstructions(selectedShops, title);
    return { success: true };
  }
};

const offerToShowLogs = async (failures: { shop: string; error?: string }[]): Promise<void> => {
  const showLogs = await select({
    message: "Would you like to see the error details?",
    options: [
      { value: "yes", label: "Yes, show error logs", hint: "See why PR creation failed" },
      { value: "no", label: "No, just continue", hint: "Skip to manual instructions" }
    ]
  });

  if (!isCancel(showLogs) && showLogs === "yes") {
    note("Error details for failed PR creation:", "📋 Debug Info");
    failures.forEach(failure => {
      console.log(`\n${failure.shop}:`);
      console.log(`  Error: ${failure.error || "Unknown error"}`);
    });
    console.log();
  }
};

const showCompleteManualInstructions = (shops: string[], title: string): void => {
  note("Manual PR creation options:", "📝 Manual Setup");

  console.log(`\n🔧 Method 1: GitHub CLI Commands`);
  shops.forEach(shop => {
    console.log(`gh pr create --base ${shop}/staging --head main --title "${title}" --body "Deployment of latest changes from main branch"`);
  });

  console.log(`\n🌐 Method 2: GitHub Web Interface`);
  console.log(`1. Go to your repository on GitHub`);
  console.log(`2. Click 'Pull requests' → 'New pull request'`);
  shops.forEach(shop => {
    console.log(`3. Create PR: main → ${shop}/staging`);
    console.log(`   Title: ${title}`);
  });

  console.log(`\n💡 Common issues:`);
  console.log(`   - Branch '${shops[0]}/staging' doesn't exist`);
  console.log(`   - Not authenticated: gh auth login`);
  console.log(`   - Wrong repository context: check you're in the right directory`);
};

/**
 * Check if diff contains content files that shouldn't be synced
 * Different warning levels based on sync type:
 * - Cross-shop (main → shop-a): STRICT warnings
 * - Within-shop (shop-a/main → shop-a/staging): SOFT warnings
 */
const checkForContentFiles = async (shops: string[]): Promise<boolean> => {
  try {
    // Detect current branch to determine sync type
    const currentBranch = execSync('git branch --show-current 2>/dev/null || echo "main"', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim();

    const shop = shops[0];

    // Determine if this is cross-shop or within-shop sync
    // Extract shop prefix from current branch (e.g., "shop-a" from "shop-a/main")
    const currentShopPrefix = currentBranch.includes('/') ? currentBranch.split('/')[0] : null;
    const targetShopPrefix = shop; // e.g., "shop-a"

    // Cross-shop sync if:
    // 1. Current branch is main (no shop context)
    // 2. Current branch is feature/hotfix/bugfix (no shop context)
    // 3. Current shop prefix doesn't match target shop prefix
    const isCrossShopSync =
      currentBranch === 'main' ||
      !currentShopPrefix ||
      currentShopPrefix !== targetShopPrefix;

    // Get diff
    const diff = execSync(`git diff ${currentBranch}..origin/${shop}/staging --name-only 2>/dev/null || echo ""`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim();

    if (!diff) return false;

    const changedFiles = diff.split('\n').filter(Boolean);

    // Content file patterns (shop-specific)
    const contentPatterns = [
      /^config\/settings_data\.json$/,
      /^templates\/.*\.json$/,
      /^locales\/.*\.json$/,
      /^config\/markets\.json$/
    ];

    const contentFiles = changedFiles.filter(file =>
      contentPatterns.some(pattern => pattern.test(file))
    );

    if (contentFiles.length > 0) {
      if (isCrossShopSync) {
        // STRICT warning: syncing from main or feature branch to shop branch
        displayContentWarning(contentFiles, changedFiles, 'strict');
        return true;
      } else {
        // SOFT warning: syncing within same shop (shop-a/main → shop-a/staging)
        displayContentWarning(contentFiles, changedFiles, 'soft');
        return false; // Don't block, just inform
      }
    }

    return false;
  } catch {
    // If git diff fails, proceed without warning
    return false;
  }
};

/**
 * Display warning about content files in diff
 * @param contentFiles List of content files detected
 * @param allFiles All files in diff
 * @param level Warning level: 'strict' for cross-shop, 'soft' for within-shop
 */
const displayContentWarning = (contentFiles: string[], allFiles: string[], level: 'strict' | 'soft'): void => {
  console.log('\n');

  if (level === 'strict') {
    // STRICT warning for cross-shop sync (main → shop-a)
    note('⚠️  CRITICAL: Content files detected in cross-shop sync!', '🚨 WARNING');

    console.log(`\nYou're syncing from main/feature branch to shop-specific branches.`);
    console.log(`The following files contain SHOP-SPECIFIC CONTENT and will OVERWRITE`);
    console.log(`shop customizations made in the Shopify Theme Editor:\n`);

    contentFiles.forEach(file => {
      console.log(`  ⚠️  ${file}`);
    });

    const codeFiles = allFiles.filter(f => !contentFiles.includes(f));
    if (codeFiles.length > 0) {
      console.log(`\n✅ Safe to merge (code files):\n`);
      codeFiles.slice(0, 5).forEach(file => {
        console.log(`  ✅ ${file}`);
      });
      if (codeFiles.length > 5) {
        console.log(`  ... and ${codeFiles.length - 5} more code files`);
      }
    }

    console.log(`\n🚨 CRITICAL RECOMMENDATIONS:`);
    console.log(`  1. Review PR carefully before merging`);
    console.log(`  2. DO NOT merge changes to content files`);
    console.log(`  3. ONLY merge code files (.liquid, .css, .js)`);
    console.log(`  4. Use .gitattributes merge=ours strategy (see CONTENT-PHILOSOPHY.md)`);
    console.log();
  } else {
    // SOFT warning for within-shop sync (shop-a/main → shop-a/staging)
    note('ℹ️  Content files detected (normal for within-shop sync)', 'ℹ️  INFO');

    console.log(`\nYou're syncing within the same shop. Content file changes are expected:\n`);

    contentFiles.forEach(file => {
      console.log(`  📝 ${file}`);
    });

    console.log(`\n💡 This is normal workflow for:`);
    console.log(`  - Deploying shop-specific features to staging`);
    console.log(`  - Testing shop customizations`);
    console.log(`  - Promoting shop-a/main changes to shop-a/staging`);
    console.log(`\nNo action needed - proceed with PR creation.`);
    console.log();
  }
};

/**
 * Confirm sync when content files detected
 */
const confirmSyncWithContentFiles = async (): Promise<boolean> => {
  const confirm = await select({
    message: "Continue creating PRs? (Review carefully before merging!)",
    options: [
      { value: "yes", label: "Yes, create PRs", hint: "I'll review content files before merging" },
      { value: "no", label: "No, cancel sync", hint: "Let me handle this manually" }
    ]
  });

  return !isCancel(confirm) && confirm === "yes";
};