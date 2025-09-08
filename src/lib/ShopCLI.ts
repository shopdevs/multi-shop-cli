import { intro, outro, select, isCancel, note } from "@clack/prompts";
import { ShopConfigManager } from "./ShopConfig.js";
import { ShopCRUD } from "./ShopCRUD.js";
import { ShopDev } from "./ShopDev.js";
import { PRManager } from "./PRManager.js";
import { ThemeLinker } from "./ThemeLinker.js";
import { VersionChecker } from "./VersionChecker.js";
import { logger } from "./core/SimpleLogger.js";

/**
 * Main CLI interface - coordination only
 */
export class ShopCLI {
  private readonly configManager: ShopConfigManager;
  private readonly crud: ShopCRUD;
  private readonly dev: ShopDev;
  private readonly prManager: PRManager;
  private readonly themeLinker: ThemeLinker;
  private readonly versionChecker: VersionChecker;

  constructor(cwd: string = process.cwd()) {
    this.configManager = new ShopConfigManager(cwd);
    this.crud = new ShopCRUD(cwd);
    this.dev = new ShopDev(cwd);
    this.prManager = new PRManager(cwd);
    this.themeLinker = new ThemeLinker(cwd);
    this.versionChecker = new VersionChecker();
  }

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
        { value: "sync", label: "Sync Shops", hint: "Create PRs to deploy main branch changes to shops" },
        { value: "themes", label: "Link Themes", hint: "Connect Git branches to Shopify themes" },
        { value: "versions", label: "Version Check", hint: "Check versions of key tools and packages" }
      ]
    });

    if (isCancel(toolChoice)) return;

    switch (toolChoice) {
      case "sync":
        await this.prManager.syncShops();
        break;
      case "themes":
        await this.themeLinker.linkThemes();
        break;
      case "versions":
        await this.versionChecker.checkVersions();
        break;
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