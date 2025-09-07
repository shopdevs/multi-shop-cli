import { execSync } from "child_process";
import {
  intro,
  outro,
  select,
  spinner,
  isCancel,
  cancel,
  note,
  log,
} from "@clack/prompts";

import { logger } from "./core/SimpleLogger.js";
import { GitOperations } from "./core/GitOperations.js";
import { ShopCommandError } from "./errors/ShopError.js";

/**
 * Synchronizes feature branches with latest main branch
 * Provides interactive rebase/merge options with conflict guidance
 */
export class SyncMain {
  private readonly gitOps: GitOperations;
  private readonly method: 'rebase' | 'merge';
  private readonly logger = logger;

  constructor(options: { method?: 'rebase' | 'merge' } = {}) {
    this.gitOps = new GitOperations();
    this.method = options.method ?? 'rebase';
  }

  async run(): Promise<void> {
    const endOperation = this.logger.startOperation('sync_main', { method: this.method });

    try {
      console.clear();
      intro("🔄 Sync with Main Branch");

      const currentBranch = this.gitOps.getCurrentBranch();

      // Check if we're on main
      if (currentBranch === "main") {
        cancel("You're already on main branch. No sync needed.");
        endOperation('skipped', { reason: 'already_on_main' });
        return;
      }

      // Check for uncommitted changes
      if (!this.gitOps.isWorkingDirectoryClean()) {
        cancel("You have uncommitted changes. Please commit or stash them first.");
        endOperation('error', { reason: 'dirty_working_directory' });
        return;
      }

      console.log();
      note(
        `Current branch: ${currentBranch}\n` +
        `This will sync your branch with the latest main branch changes.`,
        "📋 Sync Info"
      );

      // Choose sync method (if not specified in constructor)
      let syncMethod = this.method;
      if (!syncMethod) {
        syncMethod = await select({
          message: "How would you like to sync with main?",
          options: [
            {
              value: "rebase",
              label: "Rebase (Recommended)",
              hint: "Replays your commits on top of latest main - cleaner history",
            },
            {
              value: "merge",
              label: "Merge",
              hint: "Merges latest main into your branch - preserves commit structure",
            },
          ],
        }) as 'rebase' | 'merge';

        if (isCancel(syncMethod)) {
          cancel("Sync cancelled.");
          endOperation('cancelled');
          return;
        }
      }

      const s = spinner();
      
      try {
        // Fetch latest changes
        s.start("Fetching latest changes from origin...");
        this.gitOps.fetchLatest();
        
        if (syncMethod === "rebase") {
          s.message("Rebasing your branch on latest main...");
          execSync("git rebase origin/main", { stdio: "pipe" });
          s.stop("✅ Successfully rebased on latest main");
        } else {
          s.message("Merging latest main into your branch...");
          execSync("git merge origin/main --no-edit", { stdio: "pipe" });
          s.stop("✅ Successfully merged latest main");
        }

        console.log();
        note(
          `Branch ${currentBranch} is now up to date with main.\n\n` +
          `Next steps:\n` +
          `1. Test your changes: npm run dev\n` +
          `2. Run quality checks: npm run lint && npm run test\n` +
          `3. Create PR: gh pr create --base main`,
          "🚀 Ready for PR"
        );

        outro("✨ Sync completed successfully!");
        endOperation('success', { branch: currentBranch, method: syncMethod });

      } catch (error) {
        s.stop("❌ Sync failed");
        
        if (error instanceof Error && (error.message.includes("rebase") || error.message.includes("merge"))) {
          console.log();
          log.error("Conflicts detected during sync.");
          console.log();
          note(
            `To resolve conflicts:\n\n` +
            `1. Fix conflicts in your editor\n` +
            `2. Stage resolved files: git add <file>\n` +
            `3. Continue: git ${syncMethod} --continue\n` +
            `4. Or abort: git ${syncMethod} --abort`,
            "🔧 Conflict Resolution"
          );
          
          endOperation('conflict', { branch: currentBranch, method: syncMethod });
        } else {
          console.log();
          log.error(`Sync failed: ${error instanceof Error ? error.message : String(error)}`);
          endOperation('error', { 
            branch: currentBranch, 
            method: syncMethod,
            error: error instanceof Error ? error.message : String(error)
          });
        }
        
        throw error;
      }

    } catch (error) {
      if (error instanceof ShopCommandError) {
        throw error;
      }
      
      throw new ShopCommandError(
        `Sync operation failed: ${error instanceof Error ? error.message : String(error)}`,
        `git ${this.method}`,
        1,
        { originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }
}

export default SyncMain;