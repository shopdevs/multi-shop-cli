import { execSync } from "child_process";
import { ShopBranchError, ShopCommandError } from "../errors/ShopError.js";

/**
 * Enterprise-grade Git operations with comprehensive error handling
 * Implements Git best practices and safety checks
 */
export class GitOperations {
  constructor() {
    this.validateGitEnvironment();
  }

  /**
   * Validates Git environment and repository state
   * @throws {ShopCommandError} If Git environment is invalid
   */
  validateGitEnvironment() {
    try {
      // Check if Git is available
      execSync("git --version", { stdio: "ignore" });
    } catch {
      throw new ShopCommandError(
        "Git is not installed or not available in PATH",
        "git --version",
        1,
        { resolution: "Install Git from https://git-scm.com/" }
      );
    }

    try {
      // Check if we're in a Git repository
      execSync("git rev-parse --git-dir", { stdio: "ignore" });
    } catch {
      throw new ShopCommandError(
        "Not in a Git repository",
        "git rev-parse --git-dir",
        1,
        { resolution: "Initialize Git with: git init" }
      );
    }
  }

  /**
   * Gets current branch with validation
   * @returns {string} Current branch name
   * @throws {ShopBranchError} If branch detection fails
   */
  getCurrentBranch() {
    try {
      const branch = execSync("git branch --show-current", { 
        encoding: "utf8" 
      }).trim();

      if (!branch) {
        throw new ShopBranchError(
          "Could not determine current branch",
          null,
          { 
            possibleCauses: ["Detached HEAD state", "No commits yet"],
            resolution: "Ensure you're on a proper branch" 
          }
        );
      }

      return branch;
    } catch (error) {
      if (error instanceof ShopBranchError) {
        throw error;
      }
      
      throw new ShopBranchError(
        "Failed to get current branch",
        null,
        { originalError: error.message }
      );
    }
  }

  /**
   * Checks if branch exists locally or remotely
   * @param {string} branch - Branch name to check
   * @returns {Object} Branch existence info
   */
  checkBranchExists(branch) {
    const result = {
      local: false,
      remote: false,
      branch
    };

    try {
      // Check local branch
      execSync(`git rev-parse --verify ${branch}`, { stdio: "ignore" });
      result.local = true;
    } catch {
      // Local branch doesn't exist
    }

    try {
      // Check remote branch
      execSync(`git rev-parse --verify origin/${branch}`, { stdio: "ignore" });
      result.remote = true;
    } catch {
      // Remote branch doesn't exist
    }

    return result;
  }

  /**
   * Creates branch safely with validation
   * @param {string} branchName - New branch name
   * @param {string} baseBranch - Base branch to create from
   * @throws {ShopBranchError} If creation fails
   */
  createBranch(branchName, baseBranch = "main") {
    try {
      // Validate branch name
      this.validateBranchName(branchName);

      // Ensure we have the latest changes
      this.fetchLatest();

      // Check if base branch exists
      const baseExists = this.checkBranchExists(baseBranch);
      if (!baseExists.remote && !baseExists.local) {
        throw new ShopBranchError(
          `Base branch ${baseBranch} does not exist`,
          baseBranch,
          { suggestion: "Ensure base branch exists before creating new branch" }
        );
      }

      // Check if target branch already exists
      const targetExists = this.checkBranchExists(branchName);
      if (targetExists.local || targetExists.remote) {
        throw new ShopBranchError(
          `Branch ${branchName} already exists`,
          branchName,
          { 
            local: targetExists.local,
            remote: targetExists.remote,
            suggestion: "Use a different branch name or checkout existing branch"
          }
        );
      }

      // Ensure working directory is clean
      this.ensureCleanWorkingDirectory();

      // Create branch from remote base (most up-to-date)
      const baseRef = baseExists.remote ? `origin/${baseBranch}` : baseBranch;
      execSync(`git checkout -b ${branchName} ${baseRef}`, { stdio: "ignore" });

    } catch (error) {
      if (error instanceof ShopBranchError) {
        throw error;
      }
      
      throw new ShopBranchError(
        `Failed to create branch ${branchName}`,
        branchName,
        { 
          baseBranch,
          originalError: error.message 
        }
      );
    }
  }

  /**
   * Switches to branch safely
   * @param {string} branch - Branch to switch to
   * @throws {ShopBranchError} If switch fails
   */
  switchToBranch(branch) {
    try {
      this.ensureCleanWorkingDirectory();

      const branchExists = this.checkBranchExists(branch);
      
      if (!branchExists.local && !branchExists.remote) {
        throw new ShopBranchError(
          `Branch ${branch} does not exist`,
          branch,
          { suggestion: "Create the branch first or check branch name" }
        );
      }

      if (!branchExists.local && branchExists.remote) {
        // Checkout remote branch
        execSync(`git checkout -b ${branch} origin/${branch}`, { stdio: "ignore" });
      } else {
        // Switch to local branch
        execSync(`git checkout ${branch}`, { stdio: "ignore" });
      }

    } catch (error) {
      if (error instanceof ShopBranchError) {
        throw error;
      }
      
      throw new ShopBranchError(
        `Failed to switch to branch ${branch}`,
        branch,
        { originalError: error.message }
      );
    }
  }

  /**
   * Fetches latest changes with error handling
   * @throws {ShopCommandError} If fetch fails
   */
  fetchLatest() {
    try {
      execSync("git fetch origin", { stdio: "ignore" });
    } catch (error) {
      throw new ShopCommandError(
        "Failed to fetch latest changes from origin",
        "git fetch origin",
        error.status || 1,
        { 
          possibleCauses: ["Network connectivity", "Authentication", "Remote repository issues"],
          resolution: "Check network connection and Git credentials"
        }
      );
    }
  }

  /**
   * Ensures working directory is clean before operations
   * @throws {ShopBranchError} If working directory is dirty
   */
  ensureCleanWorkingDirectory() {
    try {
      const status = execSync("git status --porcelain", { encoding: "utf8" });
      
      if (status.trim()) {
        const changes = status.split("\n").filter(line => line.trim());
        throw new ShopBranchError(
          "Working directory has uncommitted changes",
          null,
          {
            changes: changes.slice(0, 5), // Show first 5 changes
            totalChanges: changes.length,
            resolution: "Commit or stash changes before proceeding"
          }
        );
      }
    } catch (error) {
      if (error instanceof ShopBranchError) {
        throw error;
      }
      
      throw new ShopCommandError(
        "Failed to check repository status",
        "git status --porcelain",
        1,
        { originalError: error.message }
      );
    }
  }

  /**
   * Validates branch name format
   * @param {string} branchName - Branch name to validate
   * @throws {ShopBranchError} If branch name is invalid
   */
  validateBranchName(branchName) {
    if (!branchName || typeof branchName !== 'string') {
      throw new ShopBranchError(
        "Branch name is required",
        branchName,
        { type: typeof branchName }
      );
    }

    // Git branch name restrictions
    const invalidPatterns = [
      /^\.|\/\.|\.\.|@\{/,  // No leading dots, no /./, no .., no @{
      /\s|~|\^|:|\?|\*|\[/, // No spaces or special chars
      /\/$/,                // No trailing slash
      /\.lock$/             // No .lock suffix
    ];

    for (const pattern of invalidPatterns) {
      if (pattern.test(branchName)) {
        throw new ShopBranchError(
          `Invalid branch name: ${branchName}`,
          branchName,
          { 
            issue: "Contains invalid characters",
            recommendation: "Use lowercase letters, numbers, hyphens, and forward slashes only"
          }
        );
      }
    }

    if (branchName.length > 250) {
      throw new ShopBranchError(
        `Branch name too long: ${branchName.length} characters`,
        branchName,
        { maxLength: 250 }
      );
    }
  }

  /**
   * Gets repository information for context
   * @returns {Object} Repository info
   */
  getRepositoryInfo() {
    try {
      const remoteUrl = execSync("git remote get-url origin", { encoding: "utf8" }).trim();
      const currentCommit = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
      const currentBranch = this.getCurrentBranch();

      return {
        remoteUrl,
        currentCommit: currentCommit.substring(0, 8), // Short hash
        currentBranch,
        isClean: this.isWorkingDirectoryClean()
      };
    } catch (error) {
      return {
        error: error.message,
        currentBranch: "unknown"
      };
    }
  }

  /**
   * Checks if working directory is clean
   * @returns {boolean} True if clean
   */
  isWorkingDirectoryClean() {
    try {
      const status = execSync("git status --porcelain", { encoding: "utf8" });
      return !status.trim();
    } catch {
      return false;
    }
  }
}