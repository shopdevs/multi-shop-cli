import { intro, text, select, isCancel, note, log, spinner } from "@clack/prompts";
import { execSync } from "child_process";
import type { ShopConfig, AuthenticationMethod, ShopCredentials } from "../types/shop.js";
import { ShopConfigManager } from "./ShopConfig.js";
import { SecurityManager } from "./core/SecurityManager.js";

/**
 * Handles shop creation, editing, and deletion
 * Focused on shop lifecycle management
 */
export class ShopCRUD {
  private readonly configManager: ShopConfigManager;
  private readonly securityManager: SecurityManager;

  constructor(cwd: string = process.cwd()) {
    this.configManager = new ShopConfigManager(cwd);
    this.securityManager = new SecurityManager(`${cwd}/shops/credentials`);
  }

  /**
   * Interactive shop creation
   */
  async create(): Promise<void> {
    intro("🆕 Create New Shop");
    
    const shopId = await text({
      message: "Shop ID (lowercase, hyphens only):",
      placeholder: "my-shop",
      validate: (value) => {
        if (!value) return "Shop ID is required";
        if (!/^[a-z0-9-]+$/.test(value)) return "Only lowercase letters, numbers, and hyphens allowed";
        if (value.length > 50) return "Shop ID must be 50 characters or less";
        
        if (this.configManager.list().includes(value)) {
          return "A shop with this ID already exists";
        }
        
        return undefined;
      }
    });

    if (isCancel(shopId)) return;

    const shopName = await text({
      message: "Shop display name:",
      placeholder: "My Shop"
    });

    if (isCancel(shopName)) return;

    const productionDomain = await text({
      message: "Production domain:",
      placeholder: "my-shop.myshopify.com",
      validate: (value) => {
        if (!value) return "Production domain is required";
        if (!value.endsWith('.myshopify.com')) return "Domain must end with .myshopify.com";
        return undefined;
      }
    });

    if (isCancel(productionDomain)) return;

    const stagingDomain = await text({
      message: "Staging domain:",
      placeholder: "staging-my-shop.myshopify.com (can be same as production)",
      validate: (value) => {
        if (!value) return "Staging domain is required";
        if (!value.endsWith('.myshopify.com')) return "Domain must end with .myshopify.com";
        return undefined;
      }
    });

    if (isCancel(stagingDomain)) return;

    const authMethod = await select({
      message: "Authentication method:",
      options: [
        { value: "theme-access-app", label: "Theme Access App", hint: "Recommended" },
        { value: "manual-tokens", label: "Manual Tokens", hint: "Direct API access" }
      ]
    });

    if (isCancel(authMethod)) return;

    try {
      const config: ShopConfig = {
        shopId: shopId as string,
        name: shopName as string,
        shopify: {
          stores: {
            production: {
              domain: productionDomain as string,
              branch: `${shopId}/main`
            },
            staging: {
              domain: stagingDomain as string,
              branch: `${shopId}/staging`
            }
          },
          authentication: {
            method: authMethod as AuthenticationMethod
          }
        }
      };

      this.configManager.save(shopId as string, config);
      
      note(`✅ Shop configuration created for ${shopName}`, "Success");
      
      // Offer to create GitHub branches
      const createBranches = await select({
        message: "Create GitHub branches for this shop?",
        options: [
          { value: "yes", label: "Yes, create branches automatically", hint: "Recommended" },
          { value: "no", label: "No, I'll create them manually", hint: "Manual setup" }
        ]
      });

      if (createBranches === "yes") {
        await this.createShopBranches(shopId as string, config);
      } else {
        note("Create branches manually:", "📝 Next Steps");
        console.log(`git checkout -b ${shopId}/main && git push -u origin ${shopId}/main`);
        console.log(`git checkout -b ${shopId}/staging && git push -u origin ${shopId}/staging`);
      }
      
      // Collect credentials immediately
      await this.setupCredentials(shopId as string, authMethod as AuthenticationMethod, config);
      
    } catch (error) {
      log.error(`Failed to create shop: ${error instanceof Error ? error.message : String(error)}`);
      
      // Always show detailed error information for debugging
      if (error instanceof Error) {
        console.log(`\nDetailed Error Information:`);
        console.log(`Error type: ${error.constructor.name}`);
        console.log(`Error message: ${error.message}`);
        
        // Show error details if available (our custom error types)
        if ('details' in error && error.details) {
          console.log(`Error details:`, JSON.stringify(error.details, null, 2));
        }
        
        if (error.stack) {
          console.log(`Stack trace:\n${error.stack}`);
        }
      }
    }
  }

  /**
   * List all shops with status
   */
  async list(): Promise<void> {
    const shops = this.configManager.list();
    
    if (shops.length === 0) {
      note("No shops configured yet.", "📋 Shop List");
      return;
    }

    console.log();
    note(`Found ${shops.length} configured shop${shops.length === 1 ? '' : 's'}:`, "📋 Shop List");
    
    for (const shopId of shops) {
      try {
        const config = this.configManager.load(shopId);
        
        console.log(`\n📦 ${config.name} (${shopId})`);
        console.log(`   Production: ${config.shopify.stores.production.domain}`);
        console.log(`   Staging: ${config.shopify.stores.staging.domain}`);
        console.log(`   Branch: ${config.shopify.stores.production.branch}`);
        console.log(`   Auth: ${config.shopify.authentication.method}`);
        
      } catch (error) {
        console.log(`\n❌ ${shopId} (Configuration error)`);
        console.log(`   Error: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  /**
   * Delete shop configuration
   */
  async delete(shopId: string): Promise<void> {
    const confirm = await select({
      message: `Delete shop "${shopId}" permanently?`,
      options: [
        { value: "no", label: "No, cancel" },
        { value: "yes", label: "Yes, delete" }
      ]
    });

    if (confirm === "yes") {
      try {
        this.configManager.delete(shopId);
        note(`✅ Shop "${shopId}" deleted`, "Deleted");
      } catch (error) {
        log.error(`Failed to delete shop: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  /**
   * Creates GitHub branches for a shop automatically
   */
  private async createShopBranches(shopId: string, config: ShopConfig): Promise<void> {
    const s = spinner();
    
    try {
      s.start("Creating GitHub branches...");
      
      // Check if we're in a git repository
      try {
        execSync('git rev-parse --git-dir', { stdio: 'ignore' });
      } catch {
        s.stop("❌ Not in a git repository");
        note("Initialize git first: git init && git remote add origin <repo-url>", "⚠️ Git Required");
        return;
      }

      const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
      
      // Create shop/main branch
      try {
        execSync(`git checkout -b ${shopId}/main`, { stdio: 'ignore' });
        execSync(`git push -u origin ${shopId}/main`, { stdio: 'ignore' });
      } catch (error) {
        // Branch might already exist
        execSync(`git checkout ${currentBranch}`, { stdio: 'ignore' });
        note(`Branch ${shopId}/main might already exist`, "ℹ️ Info");
      }

      // Create shop/staging branch
      try {
        execSync(`git checkout -b ${shopId}/staging`, { stdio: 'ignore' });
        execSync(`git push -u origin ${shopId}/staging`, { stdio: 'ignore' });
      } catch (error) {
        // Branch might already exist
        execSync(`git checkout ${currentBranch}`, { stdio: 'ignore' });
        note(`Branch ${shopId}/staging might already exist`, "ℹ️ Info");
      }

      // Return to original branch
      try {
        execSync(`git checkout ${currentBranch}`, { stdio: 'ignore' });
      } catch {
        // If checkout fails, we're probably already on the right branch
      }
      
      s.stop("✅ GitHub branches created");
      note(`Created: ${shopId}/main and ${shopId}/staging`, "🌿 Branches");
      
    } catch (error) {
      s.stop("❌ Failed to create branches");
      log.error(`Branch creation failed: ${error instanceof Error ? error.message : String(error)}`);
      
      // Provide manual instructions as fallback
      note("Create branches manually:", "📝 Manual Setup");
      console.log(`git checkout -b ${shopId}/main && git push -u origin ${shopId}/main`);
      console.log(`git checkout -b ${shopId}/staging && git push -u origin ${shopId}/staging`);
    }
  }

  /**
   * Set up credentials immediately during shop creation
   */
  private async setupCredentials(shopId: string, authMethod: AuthenticationMethod, config: ShopConfig): Promise<void> {
    try {
      note(`Setting up credentials for ${config.name}`, "🔐 Credentials");

      if (authMethod === 'theme-access-app') {
        console.log(`\n📋 Theme Access App Setup:`);
        console.log(`1. Ask a shop admin to add your email to the Theme Access app`);
        console.log(`2. Check your email for the access link`);
        console.log(`3. Click the link to view your theme access password`);
        console.log(`4. Enter the passwords below\n`);
      }

      const productionToken = await text({
        message: `Production theme access password (${config.shopify.stores.production.domain}):`,
        placeholder: "Enter your theme access password",
        validate: (value) => {
          if (!value) return "Production password is required";
          if (value.length < 8) return "Password seems too short";
          return undefined;
        }
      });

      if (isCancel(productionToken)) return;

      let stagingToken = productionToken; // Default to same as production

      // Only ask for staging if different domain
      if (config.shopify.stores.staging.domain !== config.shopify.stores.production.domain) {
        const stagingTokenInput = await text({
          message: `Staging theme access password (${config.shopify.stores.staging.domain}):`,
          placeholder: "Enter staging password (or press Enter to use same as production)",
          validate: (value) => {
            if (!value) return undefined; // Allow empty to use production token
            if (value.length < 8) return "Password seems too short";
            return undefined;
          }
        });

        if (!isCancel(stagingTokenInput) && stagingTokenInput) {
          stagingToken = stagingTokenInput;
        }
      }

      // Create credentials
      const credentials: ShopCredentials = {
        developer: process.env['USER'] || process.env['USERNAME'] || 'developer',
        shopify: {
          stores: {
            production: { themeToken: productionToken as string },
            staging: { themeToken: stagingToken as string }
          }
        },
        notes: `Theme access app credentials for ${shopId}`
      };

      this.securityManager.saveCredentials(shopId, credentials);
      note(`✅ Credentials saved securely`, "Complete");
      note(`Shop ${config.name} is ready for development!`, "🎉 Success");

    } catch (error) {
      log.error(`Failed to set up credentials: ${error instanceof Error ? error.message : String(error)}`);
      note("You can set up credentials later using 'Edit Shop'", "⚠️ Manual Setup");
    }
  }

  /**
   * Interactive credential editing for existing shop
   */
  async editCredentials(shopId: string): Promise<void> {
    try {
      const config = this.configManager.load(shopId);
      const existingCredentials = this.securityManager.loadCredentials(shopId);
      
      note(`Editing credentials for ${config.name}`, "🔐 Edit Credentials");
      
      console.log(`\n📋 Theme Access App Setup:`);
      console.log(`1. Ask a shop admin to add your email to the Theme Access app`);
      console.log(`2. Check your email for the access link`);
      console.log(`3. Click the link to view your theme access password`);
      console.log(`4. Update the passwords below\n`);

      const productionToken = await text({
        message: `Production password (${config.shopify.stores.production.domain}):`,
        placeholder: existingCredentials?.shopify.stores.production.themeToken || "Enter your theme access password",
        validate: (value) => {
          if (!value) return "Production password is required";
          if (value.length < 8) return "Password seems too short";
          return undefined;
        }
      });

      if (isCancel(productionToken)) return;

      let stagingToken = productionToken; // Default to same as production

      // Only ask for staging if different domain
      if (config.shopify.stores.staging.domain !== config.shopify.stores.production.domain) {
        const stagingTokenInput = await text({
          message: `Staging password (${config.shopify.stores.staging.domain}):`,
          placeholder: existingCredentials?.shopify.stores.staging.themeToken || "Enter staging password (or press Enter to use production)",
          validate: (value) => {
            if (!value) return undefined; // Allow empty to use production token
            if (value.length < 8) return "Password seems too short";
            return undefined;
          }
        });

        if (!isCancel(stagingTokenInput) && stagingTokenInput) {
          stagingToken = stagingTokenInput;
        }
      }

      // Create updated credentials
      const credentials: ShopCredentials = {
        developer: existingCredentials?.developer || process.env['USER'] || process.env['USERNAME'] || 'developer',
        shopify: {
          stores: {
            production: { themeToken: productionToken as string },
            staging: { themeToken: stagingToken as string }
          }
        },
        notes: existingCredentials?.notes || `Theme access app credentials for ${shopId}`
      };

      this.securityManager.saveCredentials(shopId, credentials);
      note(`✅ Credentials updated for ${config.name}`, "Complete");

    } catch (error) {
      log.error(`Failed to edit credentials: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}