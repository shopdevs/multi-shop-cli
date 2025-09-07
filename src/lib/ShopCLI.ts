import { intro, outro, select, isCancel, note, log } from "@clack/prompts";
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
        { value: "audit", label: "Security Audit", hint: "Check security" },
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
        case "audit":
          await this.handleAudit();
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
        { value: "credentials", label: "View Credentials Path", hint: "Show file location" }
      ]
    });

    if (isCancel(editChoice)) return;

    if (editChoice === "delete") {
      await this.crud.delete(shopChoice as string);
    } else if (editChoice === "credentials") {
      note(`Edit manually: shops/credentials/${shopChoice}.credentials.json`, "📁 Credentials");
    }

    await this.waitForKey();
  }

  private async handleAudit(): Promise<void> {
    try {
      const report = await this.security.auditCredentialSecurity();
      
      note("Security audit completed", "🔒 Results");
      
      if (report.issues.length === 0) {
        note("✅ No security issues found", "All Good");
      } else {
        note(`⚠️ Found ${report.issues.length} issues to review`, "Issues Found");
        
        report.issues.forEach((issue, index) => {
          console.log(`\n${index + 1}. [${issue.level.toUpperCase()}] ${issue.message}`);
          if (issue.shopId) {
            console.log(`   Shop: ${issue.shopId}`);
          }
          console.log(`   Fix: ${issue.recommendation}`);
        });
      }
    } catch (error) {
      log.error(`Security audit failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    await this.waitForKey();
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