import { execSync } from "child_process";
import { select, isCancel, note } from "@clack/prompts";

/**
 * Content file detection and warnings for shop sync operations
 * Prevents accidental overwriting of shop-specific content
 */

interface ContentCheckResult {
  readonly hasContentFiles: boolean;
  readonly shouldBlock: boolean;
  readonly syncType: 'cross-shop' | 'within-shop';
}

/**
 * Check if diff contains content files and determine warning level
 */
export const checkContentFiles = async (shops: string[]): Promise<ContentCheckResult> => {
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

    const allFiles = getAllFilesInDiff(currentBranch, shop);
    displayContentWarning(contentFiles, allFiles, syncType);

    if (syncType === 'cross-shop') {
      const confirmed = await confirmSyncWithContentFiles();
      return { hasContentFiles: true, shouldBlock: !confirmed, syncType };
    }

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
