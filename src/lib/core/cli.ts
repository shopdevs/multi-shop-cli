import { intro, outro, select, isCancel, note } from "@clack/prompts";
import type { CLIContext, Result } from "./types.js";
import { createNewShop } from "./shop-creation.js";
import { startDevelopmentWorkflow } from "./dev-operations.js";
import { editShop } from "./shop-editing.js";
import { handleTools } from "./tools.js";

/**
 * CLI interface for shop management
 */

export const runCLI = async (context: CLIContext): Promise<void> => {
  intro("🚀 Multi-Shop Manager");

  // Check for auto-dev mode
  if (process.env['AUTO_SELECT_DEV'] === "true") {
    delete process.env['AUTO_SELECT_DEV'];
    const result = await startDevelopmentServer(context);
    if (!result.success && result.error) {
      note(result.error, "❌ Error");
    }
    return;
  }

  // Recursive menu loop (pure functional)
  await runMenuLoop(context);
};

const showMainMenu = async (context: CLIContext): Promise<string> => {
  const shopsResult = await context.shopOps.listShops();
  const shopCount = shopsResult.success ? shopsResult.data?.length || 0 : 0;
  
  const status = shopCount > 0 
    ? `📋 ${shopCount} shop${shopCount === 1 ? "" : "s"} configured`
    : "No shops configured yet";

  note(status, "Current Status");

  const result = await select({
    message: "What would you like to do?",
    options: [
      { value: "dev", label: "Start Development Server", hint: "Most common" },
      { value: "list", label: "List Shops", hint: "View all shops" },
      { value: "create", label: "Create New Shop", hint: "Set up new shop" },
      { value: "edit", label: "Edit Shop", hint: "Update shop" },
      { value: "tools", label: "Tools", hint: "Sync shops and workflows" },
      { value: "exit", label: "Exit", hint: "Close manager" }
    ]
  });
  
  return result as string;
};

const runMenuLoop = async (context: CLIContext): Promise<void> => {
  const choice = await showMainMenu(context);
  
  if (isCancel(choice) || choice === "exit") {
    outro("👋 Goodbye!");
    return;
  }

  await executeMenuChoice(context, choice as string);
  await runMenuLoop(context); // Tail recursion
};

const executeMenuChoice = async (context: CLIContext, choice: string): Promise<void> => {
  switch (choice) {
    case "dev":
      await startDevelopmentServer(context);
      break;
    case "list":
      await listShops(context);
      await waitForKey();
      break;
    case "create":
      await createShop(context);
      await waitForKey();
      break;
    case "edit":
      await editShop(context);
      break;
    case "tools":
      await handleTools(context);
      break;
    default:
      note("Unknown option selected", "❌ Error");
  }
};

// Pure functional menu handlers
const startDevelopmentServer = (context: CLIContext) => startDevelopmentWorkflow(context);

const listShops = async (context: CLIContext): Promise<void> => {
  const result = await context.shopOps.listShops();
  
  if (!result.success) {
    note(result.error || "Failed to list shops", "❌ Error");
    return;
  }

  const shops = result.data || [];
  
  if (shops.length === 0) {
    note("No shops configured yet.", "📋 Shop List");
    return;
  }

  note(`Found ${shops.length} configured shop${shops.length === 1 ? '' : 's'}:`, "📋 Shop List");
  
  await Promise.all(shops.map(shopId => displayShopInfo(context, shopId)));
};

const displayShopInfo = async (context: CLIContext, shopId: string): Promise<void> => {
  const configResult = await context.shopOps.loadConfig(shopId);
  
  if (configResult.success && configResult.data) {
    const config = configResult.data;
    console.log(`\n📦 ${config.name} (${shopId})`);
    console.log(`   Production: ${config.shopify.stores.production.domain}`);
    console.log(`   Staging: ${config.shopify.stores.staging.domain}`);
    console.log(`   Branch: ${config.shopify.stores.production.branch}`);
    console.log(`   Auth: ${config.shopify.authentication.method}`);
  } else {
    console.log(`\n❌ ${shopId} (Configuration error)`);
  }
};

const createShop = async (context: CLIContext): Promise<void> => {
  const result = await createNewShop(context);
  if (!result.success && result.error) {
    note(result.error, "❌ Error");
  }
};

// Import implementations are at the top of the file

const waitForKey = async (): Promise<void> => {
  return new Promise((resolve) => {
    console.log("\n\x1b[2mPress any key to continue...\x1b[0m");

    if (!process.stdin.isTTY) {
      resolve();
      return;
    }

    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.once("data", () => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      resolve();
    });
  });
};