import { select, isCancel } from "@clack/prompts";
import type { CLIContext, Result } from "./types.js";
import { syncShops } from "./shop-sync.js";
import { linkThemes } from "./theme-linking.js";
import { checkVersions } from "./version-check.js";

/**
 * Tools menu coordination
 */

export const handleTools = async (context: CLIContext): Promise<Result<void>> => {
  const toolChoice = await select({
    message: "Select tool:",
    options: [
      { value: "sync", label: "Sync Shops", hint: "Create PRs to deploy main branch changes to shops" },
      { value: "themes", label: "Link Themes", hint: "Connect Git branches to Shopify themes" },
      { value: "versions", label: "Version Check", hint: "Check versions of important packages" }
    ]
  });

  if (isCancel(toolChoice)) return { success: false, error: "No tool selected" };

  switch (toolChoice) {
    case "sync":
      return await syncShops(context);
    case "themes":
      return await linkThemes(context);
    case "versions":
      return await checkVersions();
    default:
      return { success: false, error: "Unknown tool" };
  }
};