#!/usr/bin/env node

import { Command } from "commander";
import { intro, outro } from "@clack/prompts";
import process from "node:process";

import { ShopManager } from "../lib/ShopManager.js";
import { ContextualDev } from "../lib/ContextualDev.js";
import { Initializer } from "../lib/Initializer.js";
import { SyncMain } from "../lib/SyncMain.js";
import { TestRunner } from "../lib/TestRunner.js";
import { logger } from "../lib/core/Logger.js";
import { performanceMonitor } from "../lib/core/PerformanceMonitor.js";

const program = new Command();

program
  .name("multi-shop")
  .description("Enterprise contextual development and shop management for multi-shop Shopify themes")
  .version("1.0.0")
  .option("-v, --verbose", "Enable verbose logging")
  .option("--debug", "Enable debug logging") 
  .option("--dry-run", "Show what would be done without executing")
  .hook('preAction', (thisCommand) => {
    const options = thisCommand.opts();
    
    // Configure logging based on options
    if (options.debug) {
      process.env.LOG_LEVEL = 'debug';
    } else if (options.verbose) {
      process.env.LOG_LEVEL = 'info';
    }
    
    // Start performance monitoring for the command
    const commandName = thisCommand.name();
    performanceMonitor.startOperation(`cli_${commandName}`, { 
      command: commandName,
      args: thisCommand.args,
      options 
    });
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
      const manager = new ShopManager();
      await manager.run();
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
    const endOperation = logger.startOperation('contextual_development');
    
    try {
      const dev = new ContextualDev();
      await dev.run();
      endOperation('success');
    } catch (error) {
      logger.error('Development server failed', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      endOperation('error', { error: error instanceof Error ? error.message : String(error) });
      process.exit(1);
    }
  });

// Sync feature branch with main
program
  .command("sync-main")
  .description("Sync current branch with latest main")
  .option("--method <method>", "Sync method: rebase or merge", "rebase")
  .action(async (options) => {
    const endOperation = logger.startOperation('sync_main', options);
    
    try {
      const sync = new SyncMain({ method: options.method });
      await sync.run();
      endOperation('success');
    } catch (error) {
      logger.error('Sync failed', { 
        error: error instanceof Error ? error.message : String(error),
        method: options.method
      });
      endOperation('error', { error: error instanceof Error ? error.message : String(error) });
      process.exit(1);
    }
  });

// Test shop sync PR
program
  .command("test-pr")
  .description("Test shop sync PR with comprehensive suite")
  .argument("[shop]", "Shop name")
  .argument("[pr]", "PR number")
  .action(async (shop?: string, pr?: string) => {
    const endOperation = logger.startOperation('test_pr', { shop, pr });
    
    try {
      const tester = new TestRunner({ shop, pr });
      await tester.run();
      endOperation('success');
    } catch (error) {
      logger.error('PR testing failed', { 
        error: error instanceof Error ? error.message : String(error),
        shop,
        pr
      });
      endOperation('error', { error: error instanceof Error ? error.message : String(error) });
      process.exit(1);
    }
  });

// Security audit command
program
  .command("audit")
  .description("Run comprehensive security audit")
  .action(async () => {
    const endOperation = logger.startOperation('security_audit');
    
    try {
      intro("🔒 Security Audit");
      const manager = new ShopManager();
      const auditResult = await manager.auditSecurity();
      
      if (auditResult.issues.length === 0) {
        outro("✅ Security audit passed - no issues found");
      } else {
        outro(`⚠️ Security audit found ${auditResult.issues.length} issues to review`);
      }
      
      endOperation('success', { issuesFound: auditResult.issues.length });
    } catch (error) {
      logger.error('Security audit failed', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      endOperation('error', { error: error instanceof Error ? error.message : String(error) });
      process.exit(1);
    }
  });

// Performance diagnostics
program
  .command("perf")
  .description("Show performance diagnostics and metrics")
  .action(async () => {
    try {
      intro("📊 Performance Diagnostics");
      const summary = performanceMonitor.getPerformanceSummary();
      
      console.log("\n📈 Performance Summary:");
      console.log(`   Uptime: ${Math.round(summary.uptime)}s`);
      console.log(`   Memory: ${Math.round(summary.memoryUsage.heapUsed / 1024 / 1024)}MB`);
      console.log(`   Active Operations: ${summary.activeOperations}`);
      
      if (summary.metrics.commands) {
        console.log(`\n⚡ Command Performance:`);
        console.log(`   Total Commands: ${summary.metrics.commands.total}`);
        console.log(`   Average Duration: ${summary.metrics.commands.averageDuration}ms`);
        console.log(`   Success Rate: ${(summary.metrics.commands.successRate * 100).toFixed(1)}%`);
      }
      
      outro("📊 Performance diagnostics complete");
    } catch (error) {
      logger.error('Performance diagnostics failed', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      process.exit(1);
    }
  });

// Global error handler
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { 
    error: error.message, 
    stack: error.stack 
  });
  console.error('\n💥 Fatal error occurred. Check logs for details.');
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', { 
    reason: reason instanceof Error ? reason.message : String(reason) 
  });
  console.error('\n💥 Unhandled promise rejection. Check logs for details.');
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n👋 Shutting down gracefully...');
  await performanceMonitor.cleanup();
  await logger.flush();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n👋 Shutting down gracefully...');
  await performanceMonitor.cleanup();
  await logger.flush();  
  process.exit(0);
});

program.parse(process.argv);