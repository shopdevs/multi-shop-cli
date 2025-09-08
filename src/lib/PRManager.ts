import { select, isCancel, note, text, spinner } from "@clack/prompts";
import { execSync } from "child_process";
import { ShopConfigManager } from "./ShopConfig.js";

/**
 * Manages PR creation for shop synchronization
 */
export class PRManager {
  private readonly configManager: ShopConfigManager;

  constructor(cwd: string = process.cwd()) {
    this.configManager = new ShopConfigManager(cwd);
  }

  async syncShops(): Promise<void> {
    const shops = this.configManager.list();
    
    if (shops.length === 0) {
      note("No shops configured yet. Create shops first.", "📋 Sync Shops");
      return;
    }

    note("Sync main branch changes to shops by creating PRs", "🔄 Shop Sync");
    
    const selectedShops = await this.selectShops(shops);
    if (!selectedShops) return;

    const prTitle = await this.getPRTitle();
    if (!prTitle) return;

    await this.createPRs(selectedShops, prTitle);
  }

  private async selectShops(shops: string[]): Promise<string[] | null> {
    const allShopsOption = { value: "all", label: "All Shops", hint: `Deploy to all ${shops.length} shops` };
    const shopOptions = shops.map(shop => ({ value: shop, label: shop, hint: `Deploy to ${shop} only` }));
    
    const shopChoice = await select({
      message: "Select shops to sync:",
      options: [allShopsOption, ...shopOptions]
    });

    if (isCancel(shopChoice)) return null;

    return shopChoice === "all" ? shops : [shopChoice as string];
  }

  private async getPRTitle(): Promise<string | null> {
    const prTitle = await text({
      message: "PR title for shop sync:",
      placeholder: "Deploy latest changes from main",
      validate: (value) => value ? undefined : "PR title is required"
    });

    if (isCancel(prTitle)) return null;
    return prTitle as string;
  }

  private async createPRs(shops: string[], title: string): Promise<void> {
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
      this.displayResults(results, shops, title);

    } catch {
      s.stop("❌ GitHub CLI not found");
      note("Install GitHub CLI to automate PR creation", "Manual Setup Required");
      this.showManualInstructions(shops, title);
    }
  }

  private displayResults(results: { shop: string; success: boolean; error?: string }[], shops: string[], title: string): void {
    const successes = results.filter(r => r.success);
    const failures = results.filter(r => !r.success);

    if (successes.length > 0) {
      note(`Created PRs for: ${successes.map(r => r.shop).join(', ')}`, "✅ Success");
    }

    if (failures.length > 0) {
      note(`Failed for: ${failures.map(r => r.shop).join(', ')}`, "⚠️ Manual Required");
      this.showManualInstructions(failures.map(f => f.shop), title);
    }
  }

  private showManualInstructions(shops: string[], title: string): void {
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
  }
}