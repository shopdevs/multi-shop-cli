import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import {
  intro,
  outro,
  select,
  text,
  spinner,
  isCancel,
  cancel,
  note,
  log,
} from "@clack/prompts";

import { logger } from "./core/SimpleLogger.js";
import { ShopConfigurationError } from "./errors/ShopError.js";

/**
 * Initializes multi-shop setup in existing Shopify theme projects
 * Sets up directory structure, package.json scripts, and GitHub workflows
 */
export class Initializer {
  private readonly cwd: string;
  private readonly packageJsonPath: string;
  private readonly gitignorePath: string;
  private readonly force: boolean;
  private readonly logger = logger;

  constructor(options: { cwd?: string; force?: boolean } = {}) {
    this.cwd = options.cwd ?? process.cwd();
    this.packageJsonPath = path.join(this.cwd, "package.json");
    this.gitignorePath = path.join(this.cwd, ".gitignore");
    this.force = options.force ?? false;
  }

  async run(): Promise<void> {
    const endOperation = this.logger.startOperation('initialization', { cwd: this.cwd, force: this.force });

    try {
      // Check for git files without .gitignore (safety warning)
      await this.checkGitSafety();

      // Check if we're in a valid project
      await this.validateProject();

      // Create directory structure
      await this.createDirectories();

      // Update package.json
      await this.updatePackageJson();

      // Update .gitignore
      await this.updateGitignore();

      // Create example configuration
      await this.createExampleConfig();

      // Success message
      await this.showSuccessMessage();

      endOperation('success');

    } catch (error) {
      this.logger.error('Initialization failed', {
        cwd: this.cwd,
        error: error instanceof Error ? error.message : String(error)
      });
      endOperation('error', { error: error instanceof Error ? error.message : String(error) });
      throw new ShopConfigurationError(
        `Initialization failed: ${error instanceof Error ? error.message : String(error)}`,
        'initialization',
        { cwd: this.cwd }
      );
    }
  }

  private async validateProject(): Promise<void> {
    const s = spinner();
    s.start("Validating project structure...");

    // Check if package.json exists
    if (!fs.existsSync(this.packageJsonPath)) {
      s.stop("❌ No package.json found");
      throw new Error("This doesn't appear to be a Node.js project. Run 'npm init' first.");
    }

    // Check if this looks like a Shopify theme
    const shopifyDirs = ["config", "sections", "templates", "assets"];
    const hasShopifyStructure = shopifyDirs.some(dir =>
      fs.existsSync(path.join(this.cwd, dir))
    );

    if (!hasShopifyStructure && !this.force) {
      s.stop("⚠️ No Shopify theme structure detected");
      const proceed = await select({
        message: "This doesn't look like a Shopify theme. Continue anyway?",
        options: [
          { value: "yes", label: "Yes, continue", hint: "Initialize anyway" },
          { value: "no", label: "No, cancel", hint: "Exit initialization" }
        ]
      });

      if (isCancel(proceed) || proceed === "no") {
        throw new Error("Initialization cancelled");
      }
    }

    // Check if already initialized
    if (fs.existsSync(path.join(this.cwd, "shops")) && !this.force) {
      s.stop("⚠️ Multi-shop already initialized");
      const proceed = await select({
        message: "Multi-shop appears to already be set up. Reinitialize?",
        options: [
          { value: "yes", label: "Yes, reinitialize", hint: "Update existing setup" },
          { value: "no", label: "No, cancel", hint: "Keep current setup" }
        ]
      });

      if (isCancel(proceed) || proceed === "no") {
        throw new Error("Initialization cancelled");
      }
    }

    s.stop("✅ Project validation complete");
  }

  private async createDirectories(): Promise<void> {
    const s = spinner();
    s.start("Creating directory structure...");

    const directories = [
      "shops",
      "shops/credentials",
      ".github/workflows"
    ];

    directories.forEach(dir => {
      const dirPath = path.join(this.cwd, dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        this.logger.debug('Created directory', { path: dirPath });
      }
    });

    s.stop("✅ Directories created");
  }

  private async updatePackageJson(): Promise<void> {
    const s = spinner();
    s.start("Updating package.json...");

    const packageJson = JSON.parse(fs.readFileSync(this.packageJsonPath, "utf8"));

    // Add multi-shop scripts
    const newScripts = {
      "dev": "multi-shop dev",
      "shop": "multi-shop shop",
      "sync-main": "multi-shop sync-main",
      "test:pr": "multi-shop test-pr"
    };

    packageJson.scripts = { ...packageJson.scripts, ...newScripts };

    // Add devDependency if not already present
    if (!packageJson.devDependencies?.["@shopdevs/multi-shop-cli"]) {
      packageJson.devDependencies = packageJson.devDependencies || {};
      packageJson.devDependencies["@shopdevs/multi-shop-cli"] = "^1.0.0";
    }

    fs.writeFileSync(this.packageJsonPath, JSON.stringify(packageJson, null, 2));

    s.stop("✅ package.json updated");
  }

  private async updateGitignore(): Promise<void> {
    const s = spinner();
    s.start("Updating .gitignore...");

    const gitignoreEntries = [
      "",
      "# System files",
      ".DS_Store",
      ".DS_Store?", 
      "._*",
      "",
      "# Dependencies", 
      "node_modules/",
      "",
      "# Environment files",
      ".env",
      ".env.local",
      "",
      "# Multi-shop credentials (NEVER COMMIT)",
      "shops/credentials/",
      "*.credentials.json",
      "",
      "# Testing artifacts",
      "playwright-report/",
      "test-results/", 
      "**/test-results/",
      "**/*-snapshots/",
      "lighthouse-results/"
    ];

    let gitignoreContent = "";
    const gitignoreExists = fs.existsSync(this.gitignorePath);
    
    if (gitignoreExists) {
      gitignoreContent = fs.readFileSync(this.gitignorePath, "utf8");
      console.log("   📁 Appending to existing .gitignore");
    } else {
      console.log("   📁 Creating new .gitignore");
    }

    // Track what we actually add
    const addedEntries: string[] = [];

    // Add entries if not already present (simple contains check)
    gitignoreEntries.forEach(entry => {
      // Skip empty lines and comments for duplicate checking
      if (entry.trim() === "" || entry.startsWith("#")) {
        if (!gitignoreContent.includes(entry)) {
          gitignoreContent += `\n${entry}`;
          if (entry.trim() !== "") addedEntries.push(entry);
        }
      } else {
        // For actual ignore patterns, check if pattern exists
        if (!gitignoreContent.includes(entry)) {
          gitignoreContent += `\n${entry}`;
          addedEntries.push(entry);
        }
      }
    });

    // Ensure file ends with newline
    if (!gitignoreContent.endsWith('\n')) {
      gitignoreContent += '\n';
    }

    fs.writeFileSync(this.gitignorePath, gitignoreContent);

    if (addedEntries.length > 0) {
      s.stop(`✅ .gitignore updated (${addedEntries.length} new entries)`);
    } else {
      s.stop("✅ .gitignore already up to date");
    }
  }


  private async createExampleConfig(): Promise<void> {
    const s = spinner();
    s.start("Creating example configuration...");

    const exampleConfig = {
      shopId: "example-shop",
      name: "Example Shop",
      shopify: {
        stores: {
          staging: {
            domain: "staging-example-shop.myshopify.com",
            branch: "example-shop/staging"
          },
          production: {
            domain: "example-shop.myshopify.com",
            branch: "example-shop/main"
          }
        },
        authentication: {
          method: "theme-access-app",
          notes: {
            setup: "Install Theme Access app from Shopify App Store",
            credentials: "⚠️ SECURITY: Theme tokens stored in shops/credentials/ (NOT committed to git)"
          }
        }
      }
    };

    const examplePath = path.join(this.cwd, "shops", "shop.config.example.json");
    fs.writeFileSync(examplePath, JSON.stringify(exampleConfig, null, 2));

    s.stop("✅ Example configuration created");
  }

  private async showSuccessMessage(): Promise<void> {
    console.log();
    note(
      `🎉 Multi-shop initialization complete!\n\n` +
      `Created:\n` +
      `✅ shops/ directory for shop configurations\n` +
      `✅ Updated package.json with multi-shop scripts\n` +
      `✅ Updated .gitignore for credential security\n\n` +
      `Next steps:\n` +
      `1. Create your first shop: pnpm run shop\n` +
      `2. Start development: pnpm run dev\n` +
      `3. Read the documentation for advanced workflows`,
      "✨ Setup Complete"
    );
  }

  /**
   * Check if git repository exists without .gitignore (safety warning)
   */
  private async checkGitSafety(): Promise<void> {
    const gitDir = path.join(this.cwd, '.git');
    const nodeModules = path.join(this.cwd, 'node_modules');
    
    if (fs.existsSync(gitDir) && !fs.existsSync(this.gitignorePath) && fs.existsSync(nodeModules)) {
      note(
        "⚠️ Git repository detected with node_modules but no .gitignore!\n" +
        "This initialization will create .gitignore to prevent committing dependencies.",
        "Safety Check"
      );
    }
  }
}

export default Initializer;