import { intro, note } from "@clack/prompts";
import { BranchDetector } from "./BranchDetector.js";
import { ShopSelector } from "./ShopSelector.js";  
import { ShopDev } from "./ShopDev.js";

/**
 * Simplified contextual shop manager for feature branch development
 * Coordinates between branch detection, shop selection, and development
 */
export class ContextualShopManager {
  private readonly branchDetector: BranchDetector;
  private readonly shopSelector: ShopSelector;
  private readonly shopDev: ShopDev;

  constructor(cwd: string = process.cwd()) {
    this.branchDetector = new BranchDetector();
    this.shopSelector = new ShopSelector(cwd);
    this.shopDev = new ShopDev(cwd);
  }

  /**
   * Handle contextual development for feature branches
   */
  async handleContextualDev(currentBranch: string): Promise<void> {
    try {
      intro(`🎯 Contextual Development: ${currentBranch}`);

      // Select shop context for feature development
      const shop = await this.shopSelector.selectShop("develop against");
      if (!shop) {
        return;
      }

      // Select environment
      const environment = await this.shopSelector.selectEnvironment(shop);
      if (!environment) {
        return;
      }

      note(`Testing ${currentBranch} against ${shop} (${environment})`, "Context Selected");

      // Start development server
      await this.shopDev.startForShop(shop, environment);

    } catch (error) {
      note(`Contextual development failed: ${error instanceof Error ? error.message : String(error)}`, "Error");
      throw error;
    }
  }
}