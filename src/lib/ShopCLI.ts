import { intro, outro, select, isCancel, note, log, text, spinner } from "@clack/prompts";
import { execSync } from "child_process";
import { ShopConfigManager } from "./ShopConfig.js";
import { ShopCRUD } from "./ShopCRUD.js";
import { ShopDev } from "./ShopDev.js";
import { SecurityManager } from "./core/SecurityManager.js";
import { logger } from "./core/SimpleLogger.js";

/**
 * Main CLI interface for shop management
 * Coordinates between different shop operations
 */
export class ShopCLI {
  private readonly configManager: ShopConfigManager;
  private readonly crud: ShopCRUD;
  private readonly dev: ShopDev;
  private readonly security: SecurityManager;

  constructor(cwd: string = process.cwd()) {
    this.configManager = new ShopConfigManager(cwd);
    this.crud = new ShopCRUD(cwd);
    this.dev = new ShopDev(cwd);
    this.security = new SecurityManager(`${cwd}/shops/credentials`);
  }

  /**
   * Run interactive shop management CLI
   */
  async run(): Promise<void> {
    const endOperation = logger.startOperation('shop_cli_session');

    try {
      intro("🚀 Multi-Shop Manager");

      // Auto-dev mode (from contextual development)
      if (process.env['AUTO_SELECT_DEV'] === "true") {
        delete process.env['AUTO_SELECT_DEV'];
        await this.dev.start();
        endOperation('success', { autodev: true });
        return;
      }

      while (true) {
        const choice = await this.showMenu();
        
        if (isCancel(choice) || choice === "exit") {
          outro("👋 Goodbye!");
          endOperation('success');
          return;
        }

        const shouldContinue = await this.handleChoice(choice as string);
        if (!shouldContinue) {
          endOperation('success');
          return;
        }
      }
    } catch (error) {
      logger.error('Shop CLI session failed', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      endOperation('error', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  private async showMenu(): Promise<string> {
    const shopCount = this.configManager.count();
    const status = shopCount > 0 
      ? `📋 ${shopCount} shop${shopCount === 1 ? "" : "s"} configured`
      : "No shops configured yet";

    note(status, "Current Status");

    const result = await select({
      message: "What would you like to do?",
      options: [
        { value: "dev", label: "Start Development Server", hint: "Most common" },
        { value: "list", label: "List Shops", hint: "View all shops" },
        { value: "create", label: "Create New Shop", hint: "Set up new shop" },
        { value: "edit", label: "Edit Shop", hint: "Update shop" },
        { value: "tools", label: "Tools", hint: "Sync shops and workflows" },
        { value: "exit", label: "Exit", hint: "Close manager" }
      ]
    });
    
    return result as string;
  }

  private async handleChoice(choice: string): Promise<boolean> {
    const endOperation = logger.startOperation(`cli_${choice}`);

    try {
      switch (choice) {
        case "dev":
          await this.dev.start();
          break;
        case "list":
          await this.crud.list();
          await this.waitForKey();
          break;
        case "create":
          await this.crud.create();
          await this.waitForKey();
          break;
        case "edit":
          await this.handleEdit();
          break;
        case "tools":
          await this.handleTools();
          break;
        case "exit":
          endOperation('success');
          return false;
        default:
          logger.warn('Unknown choice', { choice });
          endOperation('error', { reason: 'unknown_choice', choice });
          return false;
      }
      
      endOperation('success');
      return true;
    } catch (error) {
      logger.error('CLI action failed', { 
        choice,
        error: error instanceof Error ? error.message : String(error) 
      });
      endOperation('error', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  private async handleEdit(): Promise<void> {
    const shops = this.configManager.list();
    
    if (shops.length === 0) {
      note("No shops to edit. Create a shop first.", "📝 Edit Shop");
      await this.waitForKey();
      return;
    }

    const shopChoice = await select({
      message: "Select shop to edit:",
      options: shops.map(shop => ({ value: shop, label: shop }))
    });

    if (isCancel(shopChoice)) return;

    const editChoice = await select({
      message: "What would you like to edit?",
      options: [
        { value: "delete", label: "Delete Shop", hint: "Remove completely" },
        { value: "credentials", label: "Edit Credentials", hint: "Update theme access passwords" }
      ]
    });

    if (isCancel(editChoice)) return;

    if (editChoice === "delete") {
      await this.crud.delete(shopChoice as string);
    } else if (editChoice === "credentials") {
      await this.crud.editCredentials(shopChoice as string);
    }

    await this.waitForKey();
  }

  private async handleTools(): Promise<void> {
    const toolChoice = await select({
      message: "Select tool:",
      options: [
        { value: "sync", label: "Sync Shops", hint: "Create PRs to deploy main branch changes to shops" }
      ]
    });

    if (isCancel(toolChoice)) return;

    if (toolChoice === "sync") {
      await this.handleSyncShops();
    }

    await this.waitForKey();
  }

  private async handleSyncShops(): Promise<void> {
    const shops = this.configManager.list();
    
    if (shops.length === 0) {
      note("No shops configured yet. Create shops first.", "📋 Sync Shops");
      return;
    }

    note("Sync main branch changes to shops by creating PRs", "🔄 Shop Sync");
    console.log("\nThis creates PRs: main → shop-*/staging for each selected shop");
    console.log("Shop teams can then review and merge to deploy changes.\n");

    // Shop selection
    const allShopsOption = { value: "all", label: "All Shops", hint: `Deploy to all ${shops.length} shops` };
    const shopOptions = shops.map(shop => ({ value: shop, label: shop, hint: `Deploy to ${shop} only` }));
    
    const shopChoice = await select({
      message: "Select shops to sync:",
      options: [allShopsOption, ...shopOptions]
    });

    if (isCancel(shopChoice)) return;

    const selectedShops = shopChoice === "all" ? shops : [shopChoice as string];

    // Get PR title
    const prTitle = await text({
      message: "PR title for shop sync:",
      placeholder: "Deploy latest changes from main",
      validate: (value) => value ? undefined : "PR title is required"
    });

    if (isCancel(prTitle)) return;

    // Create PRs
    await this.createShopSyncPRs(selectedShops, prTitle as string);
  }

  private async createShopSyncPRs(shops: string[], title: string): Promise<void> {
    const s = spinner();
    
    try {
      s.start("Creating shop sync PRs...");
      
      // Check if gh CLI is available
      try {
        execSync('gh --version', { stdio: 'ignore' });
      } catch {
        s.stop("❌ GitHub CLI not found");
        note("Install: gh CLI to automate PR creation", "Manual Setup Required");
        this.showManualPRInstructions(shops, title);
        return;
      }

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

      // Show results
      const successes = results.filter(r => r.success);
      const failures = results.filter(r => !r.success);

      if (successes.length > 0) {
        note(`Created PRs for: ${successes.map(r => r.shop).join(', ')}`, "✅ Success");
      }

      if (failures.length > 0) {
        note(`Failed for: ${failures.map(r => r.shop).join(', ')}`, "⚠️ Manual Required");
        console.log("\nManual PR commands for failed shops:");
        failures.forEach(result => {
          console.log(`gh pr create --base ${result.shop}/staging --head main --title "${title}"`);
        });
      }

    } catch (error) {
      s.stop("❌ Failed to create PRs");
      note("Creating PRs manually:", "📝 Manual Setup");
      this.showManualPRInstructions(shops, title);
    }
  }

  private showManualPRInstructions(shops: string[], title: string): void {
    console.log("\nManual PR creation commands:");
    shops.forEach(shop => {
      console.log(`gh pr create --base ${shop}/staging --head main --title "${title}"`);
    });
    
    console.log("\nOr using GitHub web interface:");
    console.log("1. Go to your repository on GitHub");
    console.log("2. Click 'Pull requests' → 'New pull request'");
    shops.forEach(shop => {
      console.log(`3. Create: main → ${shop}/staging`);
    });
  }

  private async waitForKey(): Promise<void> {
    return new Promise((resolve) => {
      console.log("\n\x1b[2mPress any key to continue...\x1b[0m");

      if (!process.stdin.isTTY) {
        resolve();
        return;
      }

      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.once("data", () => {
        process.stdin.setRawMode(false);
        process.stdin.pause();
        resolve();
      });
    });
  }
}