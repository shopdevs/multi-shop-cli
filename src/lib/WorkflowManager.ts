import { note, log } from "@clack/prompts";
import { execSync } from "child_process";

/**
 * Manages multi-shop workflow operations
 * Provides manual instructions by default, with optional automation
 */
export class WorkflowManager {
  private readonly cwd: string;

  constructor(cwd: string = process.cwd()) {
    this.cwd = cwd;
  }

  /**
   * Gets current git branch
   */
  private getCurrentBranch(): string {
    try {
      return execSync('git rev-parse --abbrev-ref HEAD', { 
        cwd: this.cwd, 
        encoding: 'utf8' 
      }).trim();
    } catch (error) {
      throw new Error(`Failed to get current branch: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Gets current commit SHA
   */
  private getCurrentSha(): string {
    try {
      return execSync('git rev-parse HEAD', { 
        cwd: this.cwd, 
        encoding: 'utf8' 
      }).trim();
    } catch (error) {
      throw new Error(`Failed to get current SHA: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Provides instructions for feature development workflow (GitHub Flow)
   */
  async handleFeatureDevelopment(): Promise<void> {
    const currentBranch = this.getCurrentBranch();
    
    if (currentBranch === 'main') {
      note("Create a feature branch first:", "🔀 GitHub Flow");
      console.log("   git checkout -b feature/your-feature-name");
      console.log("   # Make your changes");
      console.log("   git add . && git commit -m 'Your feature description'");
      return;
    }

    // Feature branch workflow (GitHub Flow - no staging)
    note(`Current branch: ${currentBranch}`, "📋 GitHub Flow Status");
    console.log("\n📋 GitHub Flow - Feature Development:");
    console.log("1. Create PR directly to main:");
    console.log(`   ${currentBranch} → main`);
    console.log("   gh pr create --base main --title 'Your feature description'");
    console.log("\n2. After main merge, create PRs to shop stagings:");
    console.log("   main → shop-a/staging");
    console.log("   main → shop-b/staging");
    console.log("\n3. After shop staging approvals, create PRs to shop mains:");
    console.log("   shop-a/staging → shop-a/main");
    console.log("   shop-b/staging → shop-b/main");
  }

  /**
   * Provides instructions for promo workflow
   */
  async handlePromoWorkflow(shopId: string, promoName: string): Promise<void> {
    const promoBranch = `${shopId}/promo-${promoName}`;
    const shopMain = `${shopId}/main`;
    
    note(`Promo workflow for ${shopId}`, "🎯 Promo Management");
    console.log("\n📋 Promo workflow steps:");
    console.log(`1. Create promo branch:`);
    console.log(`   git checkout ${shopMain}`);
    console.log(`   git pull origin ${shopMain}`);
    console.log(`   git checkout -b ${promoBranch}`);
    console.log(`   git push -u origin ${promoBranch}`);
    console.log(`\n2. Create Shopify theme connected to ${promoBranch}`);
    console.log(`   - Use Shopify admin or GitHub integration`);
    console.log(`   - Theme name: ${promoName}`);
    console.log(`\n3. Make customizations in Shopify admin`);
    console.log(`   - Changes will auto-sync to ${promoBranch} via GitHub integration`);
    console.log(`\n4. Launch promo:`);
    console.log(`   - Use Launchpad app or manually publish theme`);
    console.log(`\n5. After promo launch, sync content to main:`);
    console.log(`   Create PR: ${promoBranch} → ${shopMain}`);
    console.log(`   Review for content-only changes, then merge`);
    console.log(`\n6. Republish main theme to keep it current`);
  }

  /**
   * Provides instructions for end-promo workflow
   */
  async handleEndPromo(shopId: string, promoName: string): Promise<void> {
    const shopMain = `${shopId}/main`;
    const endPromoBranch = `${shopId}/end-promo-${promoName}`;
    
    note(`End promo workflow for ${shopId}`, "🔚 End Promo");
    console.log("\n📋 End promo steps:");
    console.log(`1. Create end-promo branch from current main:`);
    console.log(`   git checkout ${shopMain}`);
    console.log(`   git pull origin ${shopMain}`);
    console.log(`   git checkout -b ${endPromoBranch}`);
    console.log(`\n2. Revert promo-specific content changes`);
    console.log(`   - Keep code improvements from main`);
    console.log(`   - Remove promo-specific content/styling`);
    console.log(`\n3. Create Shopify theme from ${endPromoBranch}`);
    console.log(`\n4. Test the end-promo theme`);
    console.log(`\n5. Publish the end-promo theme when ready`);
    console.log(`\n6. Archive promo branch: ${shopId}/promo-${promoName}`);
  }

  /**
   * Lists shop-specific branches
   */
  async listShopBranches(): Promise<void> {
    try {
      const branches = execSync('git branch -r', { 
        cwd: this.cwd, 
        encoding: 'utf8' 
      }).trim();
      
      const shopBranches = branches
        .split('\n')
        .map(branch => branch.trim())
        .filter(branch => branch.includes('/') && !branch.includes('origin/main'))
        .sort();

      if (shopBranches.length === 0) {
        note("No shop branches found", "📋 Branches");
        console.log("Expected pattern: shop-a/main, shop-a/staging, shop-a/promo-xyz");
        return;
      }

      note("Shop branches:", "📋 Branches");
      shopBranches.forEach(branch => {
        console.log(`   ${branch.replace('origin/', '')}`);
      });

    } catch (error) {
      log.error(`Failed to list branches: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Validates current repository setup for GitHub Flow multi-shop workflow
   */
  async validateSetup(): Promise<boolean> {
    try {
      // Check if we're in a git repo
      execSync('git rev-parse --git-dir', { cwd: this.cwd, stdio: 'ignore' });
      
      // Check for main branch
      const branches = execSync('git branch -r', { 
        cwd: this.cwd, 
        encoding: 'utf8' 
      });
      
      const hasMain = branches.includes('origin/main');
      
      if (!hasMain) {
        note("Missing required branch:", "⚠️ Setup Issue");
        console.log("   ❌ origin/main");
        console.log("\nGitHub Flow requires main branch:");
        console.log("   git checkout -b main && git push -u origin main");
        return false;
      }

      note("Repository setup for GitHub Flow looks good!", "✅ Validation");
      return true;

    } catch (error) {
      note("Not in a git repository", "⚠️ Setup Issue");
      console.log("Initialize git first: git init");
      return false;
    }
  }
}

export default WorkflowManager;