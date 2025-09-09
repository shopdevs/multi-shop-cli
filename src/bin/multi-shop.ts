#!/usr/bin/env node

import { Command } from "commander";
import { intro, outro } from "@clack/prompts";
import process from "node:process";

import { ShopManager } from "../lib/ShopManager.js";
import { Initializer } from "../lib/Initializer.js";
import { logger } from "../lib/core/logger.js";

const program = new Command();

program
  .name("multi-shop")
  .description("CLI tool for contextual development and automated shop management for multi-shop Shopify themes")
  .version("1.0.16")
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