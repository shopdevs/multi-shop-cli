import { execSync } from "child_process";
import { select, isCancel, note, text } from "@clack/prompts";
import type { ShopConfig } from "../../types/shop.js";

/**
 * Content file detection and protection enforcement
 * Prevents accidental overwriting of shop-specific content
 */

interface ContentCheckResult {
  readonly hasContentFiles: boolean;
  readonly shouldBlock: boolean;
  readonly syncType: 'cross-shop' | 'within-shop';
  readonly protectionMode?: 'strict' | 'warn' | 'off';
}

/**
 * Check if diff contains content files and enforce protection
 * @param shops List of shops being synced
 * @param shopConfigs Shop configurations (for protection settings)
 */
export const checkContentFiles = async (
  shops: string[],
  shopConfigs?: Map<string, ShopConfig>
): Promise<ContentCheckResult> => {
  try {
    const currentBranch = getCurrentBranch();
    const shop = shops[0];

    if (!shop) {
      return { hasContentFiles: false, shouldBlock: false, syncType: 'cross-shop' };
    }

    const syncType = determineSyncType(currentBranch, shop);
    const contentFiles = getContentFilesInDiff(currentBranch, shop);

    if (contentFiles.length === 0) {
      return { hasContentFiles: false, shouldBlock: false, syncType };
    }

    // Get shop configuration for protection settings
    const shopConfig = shopConfigs?.get(shop);
    const protection = shopConfig?.contentProtection;

    const allFiles = getAllFilesInDiff(currentBranch, shop);

    // Cross-shop sync: Enforce protection
    if (syncType === 'cross-shop') {
      if (protection?.enabled) {
        return enforceContentProtection(contentFiles, allFiles, protection.mode, protection.verbosity);
      } else {
        // No protection configured: Show warning and ask for confirmation
        displayContentWarning(contentFiles, allFiles, syncType);
        const confirmed = await confirmSyncWithContentFiles();
        return { hasContentFiles: true, shouldBlock: !confirmed, syncType };
      }
    }

    // Within-shop sync: Just inform (no blocking)
    displayContentWarning(contentFiles, allFiles, syncType);
    return { hasContentFiles: true, shouldBlock: false, syncType };
  } catch {
    return { hasContentFiles: false, shouldBlock: false, syncType: 'cross-shop' };
  }
};

const getCurrentBranch = (): string => {
  return execSync('git branch --show-current 2>/dev/null || echo "main"', {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore']
  }).trim();
};

const determineSyncType = (currentBranch: string, targetShop: string): 'cross-shop' | 'within-shop' => {
  const currentShopPrefix = currentBranch.includes('/') ? currentBranch.split('/')[0] : null;

  const isCrossShop =
    currentBranch === 'main' ||
    !currentShopPrefix ||
    currentShopPrefix !== targetShop;

  return isCrossShop ? 'cross-shop' : 'within-shop';
};

const getContentFilesInDiff = (currentBranch: string, shop: string): string[] => {
  const diff = execSync(`git diff ${currentBranch}..origin/${shop}/staging --name-only 2>/dev/null || echo ""`, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore']
  }).trim();

  if (!diff) return [];

  const changedFiles = diff.split('\n').filter(Boolean);

  const contentPatterns = [
    /^config\/settings_data\.json$/,
    /^templates\/.*\.json$/,
    /^locales\/.*\.json$/,
    /^config\/markets\.json$/
  ];

  return changedFiles.filter(file =>
    contentPatterns.some(pattern => pattern.test(file))
  );
};

const getAllFilesInDiff = (currentBranch: string, shop: string): string[] => {
  const diff = execSync(`git diff ${currentBranch}..origin/${shop}/staging --name-only 2>/dev/null || echo ""`, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore']
  }).trim();

  return diff ? diff.split('\n').filter(Boolean) : [];
};

const displayContentWarning = (
  contentFiles: string[],
  allFiles: string[],
  syncType: 'cross-shop' | 'within-shop'
): void => {
  console.log('\n');

  if (syncType === 'cross-shop') {
    displayCrossShopWarning(contentFiles, allFiles);
  } else {
    displayWithinShopInfo(contentFiles);
  }
};

const displayCrossShopWarning = (contentFiles: string[], allFiles: string[]): void => {
  note('⚠️  CRITICAL: Content files detected in cross-shop sync!', '🚨 WARNING');

  console.log(`\nYou're syncing from main/feature branch to shop-specific branches.`);
  console.log(`The following files contain SHOP-SPECIFIC CONTENT and will OVERWRITE`);
  console.log(`shop customizations made in the Shopify Theme Editor:\n`);

  contentFiles.forEach(file => console.log(`  ⚠️  ${file}`));

  const codeFiles = allFiles.filter(f => !contentFiles.includes(f));
  if (codeFiles.length > 0) {
    console.log(`\n✅ Safe to merge (code files):\n`);
    codeFiles.slice(0, 5).forEach(file => console.log(`  ✅ ${file}`));
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
};

const displayWithinShopInfo = (contentFiles: string[]): void => {
  note('ℹ️  Content files detected (normal for within-shop sync)', 'ℹ️  INFO');

  console.log(`\nYou're syncing within the same shop. Content file changes are expected:\n`);
  contentFiles.forEach(file => console.log(`  📝 ${file}`));

  console.log(`\n💡 This is normal workflow for:`);
  console.log(`  - Deploying shop-specific features to staging`);
  console.log(`  - Testing shop customizations`);
  console.log(`  - Promoting shop-a/main changes to shop-a/staging`);
  console.log(`\nNo action needed - proceed with PR creation.`);
  console.log();
};

const enforceContentProtection = async (
  contentFiles: string[],
  allFiles: string[],
  mode: 'strict' | 'warn' | 'off',
  verbosity: 'verbose' | 'quiet'
): Promise<ContentCheckResult> => {
  if (mode === 'off') {
    return { hasContentFiles: true, shouldBlock: false, syncType: 'cross-shop', protectionMode: 'off' };
  }

  // Display warning based on verbosity
  if (verbosity === 'verbose') {
    displayProtectionWarning(contentFiles, allFiles, mode);
  }

  if (mode === 'strict') {
    // STRICT mode: Block unless override confirmed
    const override = await requireOverrideConfirmation();
    return {
      hasContentFiles: true,
      shouldBlock: !override,
      syncType: 'cross-shop',
      protectionMode: 'strict'
    };
  }

  if (mode === 'warn') {
    // WARN mode: Show warning, require yes/no confirmation
    const confirmed = await confirmSyncWithContentFiles();
    return {
      hasContentFiles: true,
      shouldBlock: !confirmed,
      syncType: 'cross-shop',
      protectionMode: 'warn'
    };
  }

  return { hasContentFiles: true, shouldBlock: false, syncType: 'cross-shop', protectionMode: mode };
};

const displayProtectionWarning = (contentFiles: string[], allFiles: string[], mode: 'strict' | 'warn'): void => {
  console.log('\n');

  if (mode === 'strict') {
    note('❌ BLOCKED: Content Protection Enabled (STRICT mode)', '🛡️ PROTECTION');
  } else {
    note('⚠️  WARNING: Content Protection Enabled (WARN mode)', '🛡️ PROTECTION');
  }

  console.log(`\nThis would overwrite shop-specific customizations:\n`);
  contentFiles.forEach(file => console.log(`  ⚠️  ${file}`));

  const codeFiles = allFiles.filter(f => !contentFiles.includes(f));
  if (codeFiles.length > 0) {
    console.log(`\n✅ Safe to merge (code files):\n`);
    codeFiles.slice(0, 5).forEach(file => console.log(`  ✅ ${file}`));
    if (codeFiles.length > 5) {
      console.log(`  ... and ${codeFiles.length - 5} more code files`);
    }
  }

  if (mode === 'strict') {
    console.log(`\n🛡️ Content Protection is WORKING:`);
    console.log(`  • Your shop customizations are protected from being overwritten`);
    console.log(`  • This sync would replace shop-specific content with generic content`);
    console.log(`  • This is usually NOT what you want`);
    console.log();
    console.log(`💡 What this means:`);
    console.log(`  - Code files (.liquid, .css, .js) will sync normally`);
    console.log(`  - Content files (settings, templates) will be BLOCKED`);
    console.log(`  - Your shop's branding and customizations stay safe`);
    console.log();
    console.log(`⚠️  Only override if you're CERTAIN:`);
    console.log(`  - You want to replace shop content with main branch content`);
    console.log(`  - You understand shop customizations will be lost`);
    console.log(`  - This is an intentional content reset`);
  }

  console.log();
};

const requireOverrideConfirmation = async (): Promise<boolean> => {
  const override = await text({
    message: "Type 'OVERRIDE' to confirm (or cancel to abort):",
    validate: (value) => {
      if (!value) return "Type OVERRIDE or cancel";
      if (value !== 'OVERRIDE') return "Must type exactly: OVERRIDE";
      return undefined;
    }
  });

  return !isCancel(override) && override === 'OVERRIDE';
};

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
