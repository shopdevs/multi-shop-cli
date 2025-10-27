import { execSync } from "child_process";
import { logger } from "./core/logger.js";

/**
 * Contextual development that adapts to branch context
 * Detects whether user is on shop-specific or feature branches
 */
export class ContextualDev {
  private readonly logger = logger;

  async run(): Promise<void> {
    const endOperation = this.logger.startOperation('contextual_development');
    
    try {
      const currentBranch = execSync("git branch --show-current", { 
        encoding: "utf8" 
      }).trim();

      console.log(`🔍 Detected branch: ${currentBranch}`);

      // Check if this is a shop-specific branch (contains slash like "shop-a/feature")
      const shopMatch = currentBranch.match(/^([^/]+)\//);
      
      if (shopMatch) {
        // Shop-specific branch - delegate to shop manager
        console.log(`📋 Shop-specific branch detected: ${shopMatch[1]}`);
        console.log(`🚀 Delegating to shop development workflow...`);
        console.log();

        // Call the shop manager with auto-dev mode
        process.env['AUTO_SELECT_DEV'] = "true";

        const { runMultiShopManager } = await import("./core/index.js");
        await runMultiShopManager();

      } else {
        // Non-shop branch - use contextual development
        console.log(`🛠️  Feature branch detected: ${currentBranch}`);
        console.log(`🎯 Starting contextual development mode...`);
        console.log();
        
        // Use functional contextual development
        const { createMultiShopCLI } = await import("./core/index.js");
        const { startDevelopmentWorkflow } = await import("./core/dev-operations.js");
        
        const context = createMultiShopCLI();
        const result = await startDevelopmentWorkflow(context);
        
        if (!result.success && result.error) {
          logger.error('Contextual development failed', { error: result.error });
        }
      }
      
      endOperation('success', { branch: currentBranch, type: shopMatch ? 'shop-specific' : 'contextual' });
      
    } catch (error) {
      this.logger.error('Contextual development failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      endOperation('error', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }
}

export default ContextualDev;