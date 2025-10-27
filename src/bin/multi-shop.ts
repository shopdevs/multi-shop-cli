#!/usr/bin/env node

import { Command } from "commander";
import { intro, outro } from "@clack/prompts";
import process from "node:process";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

import { runMultiShopManager } from "../lib/core/index.js";
import { Initializer } from "../lib/Initializer.js";
import { logger } from "../lib/core/logger.js";

// Get version from package.json
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJsonPath = join(__dirname, '../../package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
const VERSION = packageJson.version;

const program = new Command();

program
  .name("multi-shop")
  .description("CLI tool for contextual development and automated shop management for multi-shop Shopify themes")
  .version(VERSION)
  .option("-v, --verbose", "Enable verbose logging")
  .option("--debug", "Enable debug logging") 
  .option("--dry-run", "Show what would be done without executing")
  .hook('preAction', (thisCommand) => {
    const options = thisCommand.opts();
    
    // Configure logging based on options
    if (options['debug']) {
      process.env['LOG_LEVEL'] = 'debug';
    } else if (options['verbose']) {
      process.env['LOG_LEVEL'] = 'info';
    }
  });

// Initialize multi-shop in current theme project
program
  .command("init")
  .description("Initialize multi-shop setup in current Shopify theme project")
  .option("--force", "Overwrite existing multi-shop configuration")
  .action(async (options) => {
    const endOperation = logger.startOperation('init_command', options);
    
    try {
      intro("🚀 Multi-Shop Initialization");
      const initializer = new Initializer({ force: options.force });
      await initializer.run();
      outro("✨ Multi-shop setup complete!");
      
      endOperation('success');
    } catch (error) {
      logger.error('Initialization failed', { 
        error: error instanceof Error ? error.message : String(error),
        options 
      });
      endOperation('error', { error: error instanceof Error ? error.message : String(error) });
      process.exit(1);
    }
  });

// Shop management UI
program
  .command("shop")
  .description("Launch interactive shop management")
  .action(async () => {
    const endOperation = logger.startOperation('shop_management');

    try {
      await runMultiShopManager();
      endOperation('success');
    } catch (error) {
      logger.error('Shop management failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      endOperation('error', { error: error instanceof Error ? error.message : String(error) });
      process.exit(1);
    }
  });

// Contextual development server
program
  .command("dev")
  .description("Start contextual development server")
  .action(async () => {
    try {
      const { ContextualDev } = await import("../lib/ContextualDev.js");
      const dev = new ContextualDev();
      await dev.run();
    } catch (error) {
      logger.error('Development server failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      process.exit(1);
    }
  });

// Security audit
program
  .command("audit")
  .description("Run security audit on shop configurations and credentials")
  .option("--json", "Output results as JSON")
  .action(async (options) => {
    const endOperation = logger.startOperation('security_audit', options);

    try {
      const { intro, outro } = await import("@clack/prompts");
      const { createMultiShopCLI } = await import("../lib/core/index.js");
      const { runSecurityAudit, formatAuditReport } = await import("../lib/core/security-audit.js");

      intro("🔒 Security Audit");

      const context = createMultiShopCLI();
      const result = await runSecurityAudit(context.deps);

      if (result.success && result.data) {
        if (options.json) {
          console.log(JSON.stringify(result.data, null, 2));
        } else {
          console.log(formatAuditReport(result.data));
        }

        // Exit with error if critical issues found
        const criticalIssues = result.data.issues.filter(i => i.level === 'error');
        if (criticalIssues.length > 0) {
          outro("⚠️  Critical security issues found");
          endOperation('error', { criticalIssues: criticalIssues.length });
          process.exit(1);
        } else {
          outro("✨ Audit complete");
          endOperation('success');
        }
      } else {
        logger.error('Security audit failed', { error: result.error });
        endOperation('error', { error: result.error });
        process.exit(1);
      }
    } catch (error) {
      logger.error('Security audit failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      endOperation('error', { error: error instanceof Error ? error.message : String(error) });
      process.exit(1);
    }
  });

// Global error handler
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { 
    error: error.message, 
    stack: error.stack 
  });
  console.error('\n💥 Fatal error occurred.');
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', { 
    reason: reason instanceof Error ? reason.message : String(reason) 
  });
  console.error('\n💥 Unhandled promise rejection.');
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n👋 Shutting down gracefully...');
  await logger.flush();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n👋 Shutting down gracefully...');
  await logger.flush();  
  process.exit(0);
});

program.parse(process.argv);