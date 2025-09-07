import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import {
  intro,
  outro,
  text,
  select,
  spinner,
  isCancel,
  cancel,
  note,
  log,
} from "@clack/prompts";

import { logger } from "./core/Logger.js";
import { performanceMonitor } from "./core/SimplePerformanceMonitor.js";
import { GitOperations } from "./core/GitOperations.js";
import { ShopCommandError } from "./errors/ShopError.js";

interface TestResults {
  visual: boolean;
  integration: boolean;
  accessibility: boolean;
  performance: boolean;
}

interface TestRunnerOptions {
  shop?: string;
  pr?: string;
}

/**
 * Comprehensive testing runner for shop sync PRs
 * Provides automated testing with detailed reporting
 */
export class TestRunner {
  private testDir: string | null = null;
  private readonly gitOps: GitOperations;
  private readonly logger = logger;
  private readonly prefilledShop?: string;
  private readonly prefilledPR?: string;

  constructor(options: TestRunnerOptions = {}) {
    this.gitOps = new GitOperations();
    this.prefilledShop = options.shop;
    this.prefilledPR = options.pr;
  }

  async run(): Promise<void> {
    const endOperation = this.logger.startOperation('test_pr_workflow');

    try {
      console.clear();
      intro("🧪 Shop Sync PR Testing");

      // Get shop and PR number (use prefilled if available)
      const { shop, prNumber } = await this.getTestParameters();
      
      await this.testShopSyncPR(shop, prNumber);
      
      endOperation('success', { shop, prNumber });

    } catch (error) {
      this.logger.error('PR testing failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      endOperation('error', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  private async getTestParameters(): Promise<{ shop: string; prNumber: string }> {
    // Use prefilled values or prompt
    let shop = this.prefilledShop;
    let prNumber = this.prefilledPR;

    if (!shop) {
      shop = await text({
        message: "Shop name:",
        placeholder: "e.g., anolon",
        validate: (value) => (!value?.trim() ? "Shop name is required" : undefined),
      });

      if (isCancel(shop)) {
        throw new Error("Testing cancelled");
      }
    }

    if (!prNumber) {
      prNumber = await text({
        message: "PR number:",
        placeholder: "e.g., 123",
        validate: (value) => {
          if (!value) return "PR number is required";
          if (!/^\d+$/.test(value)) return "PR number must be a number";
          return undefined;
        },
      });

      if (isCancel(prNumber)) {
        throw new Error("Testing cancelled");
      }
    }

    return { shop, prNumber };
  }

  private async testShopSyncPR(shop: string, prNumber: string): Promise<void> {
    this.testDir = `.test-results-pr-${prNumber}`;

    try {
      // Create test directory
      if (!fs.existsSync(this.testDir)) {
        fs.mkdirSync(this.testDir, { recursive: true });
      }

      // Validate GitHub CLI availability
      await this.validateGitHubCLI();

      // Fetch and checkout PR
      await this.checkoutPR(prNumber);

      // Analyze changes
      await this.analyzeChanges(shop, prNumber);

      // Get preview URL
      const previewUrl = await this.getPreviewUrl(shop);
      if (!previewUrl) return;

      // Run comprehensive test suite
      const testResults = await this.runTestSuite(shop, prNumber, previewUrl);

      // Generate report
      await this.generateReport(shop, prNumber, previewUrl, testResults);

      // Offer to comment on PR
      await this.offerPRComment(prNumber);

      outro("✨ Shop sync testing complete!");

    } catch (error) {
      throw new ShopCommandError(
        `PR testing failed: ${error instanceof Error ? error.message : String(error)}`,
        'test-pr',
        1,
        { shop, prNumber }
      );
    }
  }

  private async validateGitHubCLI(): Promise<void> {
    try {
      execSync("gh --version", { stdio: "ignore" });
    } catch {
      throw new ShopCommandError(
        "GitHub CLI not found",
        "gh --version",
        1,
        { resolution: "Install GitHub CLI: https://cli.github.com/" }
      );
    }
  }

  private async checkoutPR(prNumber: string): Promise<string> {
    const s = spinner();
    s.start(`Fetching PR #${prNumber}...`);

    try {
      execSync(`gh pr checkout ${prNumber}`, { stdio: "ignore" });
      const currentBranch = this.gitOps.getCurrentBranch();
      
      s.stop(`✅ Checked out branch: ${currentBranch}`);
      return currentBranch;
    } catch (error) {
      s.stop("❌ Failed to checkout PR");
      throw new ShopCommandError(
        `Failed to checkout PR #${prNumber}`,
        `gh pr checkout ${prNumber}`,
        1,
        { prNumber }
      );
    }
  }

  private async analyzeChanges(shop: string, prNumber: string): Promise<void> {
    const s = spinner();
    s.start("Analyzing PR changes...");

    try {
      if (!this.testDir) throw new Error("Test directory not initialized");

      // Get base branch
      const baseBranch = execSync(`gh pr view ${prNumber} --json baseRefName -q .baseRefName`, {
        encoding: "utf8",
      }).trim();

      // Get changed files
      const changedFiles = execSync(`gh pr diff ${prNumber} --name-only`, {
        encoding: "utf8",
      });
      
      fs.writeFileSync(path.join(this.testDir, "changed-files.txt"), changedFiles);

      // Identify content files
      const contentFiles = changedFiles
        .split("\n")
        .filter(Boolean)
        .filter((file) => file.match(/templates\/.*\.json|config\/settings_data\.json/));

      // Log analysis
      console.log();
      note(
        `Base branch: ${baseBranch}\nFiles changed: ${changedFiles.split("\n").filter(Boolean).length}`,
        "📋 PR Analysis"
      );

      if (contentFiles.length > 0) {
        console.log();
        log.warn("⚠️  Content files detected (requires careful review):");
        contentFiles.forEach((file) => {
          console.log(`   🔴 ${file}`);
        });

        // Get content diffs
        const contentChanges = contentFiles
          .map((file) => {
            try {
              const diff = execSync(`gh pr diff ${prNumber} -- "${file}"`, {
                encoding: "utf8",
              });
              return `\n## Changes in ${file}\n\`\`\`diff\n${diff.split("\n").slice(0, 20).join("\n")}\n\`\`\``;
            } catch {
              return `\n## Changes in ${file}\n(Unable to get diff)`;
            }
          })
          .join("\n");

        fs.writeFileSync(path.join(this.testDir, "content-changes.md"), contentChanges);
      } else {
        console.log();
        log.success("✅ No content files affected - safe merge");
      }

      s.stop("✅ Change analysis complete");

    } catch (error) {
      s.stop("❌ Analysis failed");
      throw error;
    }
  }

  private async getPreviewUrl(shop: string): Promise<string | null> {
    console.log();
    note(
      `Please start your development server in a separate terminal:\n\n` +
      `1. Run: npm run dev\n` +
      `2. Select shop: ${shop}\n` +
      `3. Select environment: staging\n` +
      `4. Copy the preview URL from the output`,
      "🚀 Development Server Setup"
    );

    const previewUrl = await text({
      message: "Paste your preview URL:",
      placeholder: `https://staging-${shop}.myshopify.com?preview_theme_id=123456789`,
      validate: (value) => {
        if (!value) return "Preview URL is required";
        if (!value.includes("preview_theme_id")) {
          return "URL should include preview_theme_id parameter";
        }
        return undefined;
      },
    });

    if (isCancel(previewUrl)) {
      cancel("Testing cancelled - preview URL required.");
      return null;
    }

    return previewUrl;
  }

  private async runTestSuite(shop: string, prNumber: string, previewUrl: string): Promise<TestResults> {
    const baseUrl = previewUrl.split('?')[0].replace(/\/$/, '');
    const themeId = previewUrl.match(/preview_theme_id=([^&]*)/)?.[1];

    console.log();
    note(`Base URL: ${baseUrl}\nTheme ID: ${themeId}`, "🧪 Testing Configuration");

    const testResults: TestResults = {
      visual: false,
      integration: false,
      accessibility: false,
      performance: false
    };

    const env = {
      ...process.env,
      PREVIEW_BASE_URL: baseUrl,
      PREVIEW_THEME_ID: themeId
    };

    // Run test suite
    await this.runTest("Visual Regression", "npm run test:visual", "visual-test.log", env, testResults, "visual");
    await this.runTest("Integration", "npm run test:integration", "integration-test.log", env, testResults, "integration");
    await this.runTest("Accessibility", "npm run test:accessibility", "accessibility-test.log", env, testResults, "accessibility");
    await this.runTest("Performance", "npm run test:performance", "performance-test.log", env, testResults, "performance");

    // Save test results
    if (this.testDir) {
      fs.writeFileSync(
        path.join(this.testDir, "test-results.json"),
        JSON.stringify({ 
          shop, 
          prNumber, 
          previewUrl, 
          results: testResults, 
          timestamp: new Date().toISOString() 
        }, null, 2)
      );
    }

    return testResults;
  }

  private async runTest(
    testName: string, 
    command: string, 
    logFile: string, 
    env: NodeJS.ProcessEnv, 
    results: TestResults, 
    resultKey: keyof TestResults
  ): Promise<void> {
    const endTestOperation = performanceMonitor.startOperation(`test_${resultKey}`, { command });
    const s = spinner();
    s.start(`Running ${testName} tests...`);

    try {
      if (!this.testDir) throw new Error("Test directory not initialized");
      
      const logPath = path.join(this.testDir, logFile);
      execSync(`${command} > ${logPath} 2>&1`, { env });
      
      s.stop(`✅ ${testName} tests passed`);
      results[resultKey] = true;
      endTestOperation('success');
      
    } catch (error) {
      s.stop(`❌ ${testName} tests failed`);
      results[resultKey] = false;
      log.error(`${testName} test failure - check ${logFile} for details`);
      endTestOperation('failed');
    }
  }

  private async generateReport(
    shop: string, 
    prNumber: string, 
    previewUrl: string, 
    testResults: TestResults
  ): Promise<void> {
    if (!this.testDir) throw new Error("Test directory not initialized");
    
    const s = spinner();
    s.start("Generating test report...");

    try {
      const currentBranch = this.gitOps.getCurrentBranch();
      const changedFiles = fs.readFileSync(path.join(this.testDir, "changed-files.txt"), "utf8");

      const contentFiles = changedFiles
        .split("\n")
        .filter(Boolean)
        .filter(file => file.match(/templates\/.*\.json|config\/settings_data\.json/));

      const report = `# Shop Sync PR #${prNumber} Test Results

## PR Information
- **Shop**: ${shop}
- **Branch**: ${currentBranch}
- **Preview URL**: ${previewUrl}
- **Test Time**: ${new Date().toLocaleString()}

## Files Changed
\`\`\`
${changedFiles}
\`\`\`

## Content Files Review
${contentFiles.length > 0 
  ? `⚠️ **Content files detected - requires careful merge strategy**\n\nContent files changed:\n${contentFiles.map(f => `- ${f}`).join('\n')}`
  : '✅ **No content files affected - safe to merge**'
}

## Test Results
- ${testResults.visual ? '✅' : '❌'} Visual regression tests: ${testResults.visual ? 'PASSED' : 'FAILED'}
- ${testResults.integration ? '✅' : '❌'} Integration tests: ${testResults.integration ? 'PASSED' : 'FAILED'}
- ${testResults.accessibility ? '✅' : '❌'} Accessibility tests: ${testResults.accessibility ? 'PASSED' : 'FAILED'}  
- ${testResults.performance ? '✅' : '❌'} Performance tests: ${testResults.performance ? 'PASSED' : 'FAILED'}

## Recommendations

### For Reviewers:
${contentFiles.length > 0
  ? `1. **⚠️ Carefully review content files** - preserve shop customizations
2. **Use selective merge strategy** - accept code changes, keep shop content  
3. **Test on staging theme** after merge to verify shop elements`
  : `1. **✅ Safe to merge normally** - no content files affected
2. **Review code changes** for quality and standards compliance
3. **Test on staging theme** after merge to verify functionality`
}

### Next Steps:
1. Review test results and logs in \`.test-results-pr-${prNumber}/\`
2. If tests pass, approve and merge the PR
3. If tests fail, coordinate with developer to fix issues
4. After merge, verify changes on staging-${shop}.myshopify.com

### Test Artifacts:
- Test summary: test-summary.md
- Changed files: changed-files.txt
- Test logs: *-test.log files
${contentFiles.length > 0 ? '- Content changes: content-changes.md' : ''}
`;

      fs.writeFileSync(path.join(this.testDir, "test-summary.md"), report);

      s.stop("✅ Test report generated");

      console.log();
      note(
        `Test results saved to: ${this.testDir}/\n\n` +
        `Key files:\n` +
        `• test-summary.md - Complete report\n` +
        `• test-results.json - Machine-readable results\n` +
        `• *-test.log files - Detailed test logs`,
        "📂 Test Artifacts"
      );

    } catch (error) {
      s.stop("❌ Report generation failed");
      throw error;
    }
  }

  private async offerPRComment(prNumber: string): Promise<void> {
    const addComment = await select({
      message: "Add test results as PR comment?",
      options: [
        {
          value: "yes",
          label: "Yes, add comment",
          hint: "Post test summary to the PR for reviewers",
        },
        {
          value: "no", 
          label: "No, skip",
          hint: "Keep results local only",
        },
      ],
    });

    if (isCancel(addComment) || addComment === "no") return;

    try {
      if (!this.testDir) throw new Error("Test directory not initialized");
      
      const s = spinner();
      s.start("Adding test results to PR...");

      const report = fs.readFileSync(path.join(this.testDir, "test-summary.md"), "utf8");
      const prComment = `## 🧪 Shop Sync Test Results\n\n${report.replace(/^# Shop Sync PR #\d+ Test Results/, '')}\n\n---\n*Automated test results from \`npm run test:pr\`*`;

      // Write comment to file for gh CLI
      const commentFile = path.join(this.testDir, "pr-comment.md");
      fs.writeFileSync(commentFile, prComment);

      execSync(`gh pr comment ${prNumber} --body-file ${commentFile}`, { stdio: "ignore" });

      s.stop("✅ Test results added to PR");
      
    } catch (error) {
      cancel(`❌ Failed to add PR comment: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

export default TestRunner;