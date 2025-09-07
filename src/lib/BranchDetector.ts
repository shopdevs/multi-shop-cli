import { execSync } from "child_process";

/**
 * Detects Git branch context for contextual development
 */
export class BranchDetector {
  
  /**
   * Get current Git branch
   */
  getCurrentBranch(): string {
    try {
      return execSync("git branch --show-current", { encoding: "utf8" }).trim();
    } catch (error) {
      throw new Error(`Failed to get current branch: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Detect if branch is shop-specific (e.g., shop-a/feature)
   */
  detectShopFromBranch(branch: string): string | null {
    const shopMatch = branch.match(/^([^/]+)\//);
    return shopMatch?.[1] || null;
  }

  /**
   * Check if branch is a feature branch (not shop-specific)
   */
  isFeatureBranch(branch: string): boolean {
    return !this.detectShopFromBranch(branch) && !['main', 'staging'].includes(branch);
  }
}