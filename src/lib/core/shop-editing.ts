import { select, isCancel, note, text } from "@clack/prompts";
import type { CLIContext, Result } from "./types.js";
import type { ShopCredentials } from "../../types/shop.js";

/**
 * Shop editing operations
 */

export const editShop = async (context: CLIContext): Promise<Result<void>> => {
  const shopsResult = await context.shopOps.listShops();
  if (!shopsResult.success || !shopsResult.data?.length) {
    note("No shops to edit. Create a shop first.", "📝 Edit Shop");
    return { success: true };
  }

  const shops = shopsResult.data;
  const selectedShop = await selectShopToEdit(shops);
  if (!selectedShop) return { success: false, error: "No shop selected" };

  const editAction = await selectEditAction();
  if (!editAction) return { success: false, error: "No action selected" };

  switch (editAction) {
    case "delete":
      return deleteShop(context, selectedShop);
    case "credentials":
      return editCredentials(context, selectedShop);
    default:
      return { success: false, error: "Unknown action" };
  }
};

const selectShopToEdit = async (shops: string[]): Promise<string | null> => {
  const shopChoice = await select({
    message: "Select shop to edit:",
    options: shops.map(shop => ({ value: shop, label: shop }))
  });

  return isCancel(shopChoice) ? null : shopChoice as string;
};

const selectEditAction = async (): Promise<string | null> => {
  const editChoice = await select({
    message: "What would you like to edit?",
    options: [
      { value: "delete", label: "Delete Shop", hint: "Remove completely" },
      { value: "credentials", label: "Edit Credentials", hint: "Update theme access passwords" }
    ]
  });

  return isCancel(editChoice) ? null : editChoice as string;
};

const deleteShop = async (context: CLIContext, shopId: string): Promise<Result<void>> => {
  const confirm = await select({
    message: `Delete shop "${shopId}" permanently?`,
    options: [
      { value: "no", label: "No, cancel" },
      { value: "yes", label: "Yes, delete" }
    ]
  });

  if (isCancel(confirm) || confirm === "no") {
    return { success: true };
  }

  const result = await context.shopOps.deleteShop(shopId);
  if (result.success) {
    note(`✅ Shop "${shopId}" deleted`, "Deleted");
  } else {
    note(result.error || "Failed to delete shop", "❌ Error");
  }

  return result;
};

const editCredentials = async (context: CLIContext, shopId: string): Promise<Result<void>> => {
  const configResult = await context.shopOps.loadConfig(shopId);
  if (!configResult.success) {
    return { success: false, error: configResult.error || "Failed to load shop config" };
  }

  const config = configResult.data;
  if (!config) {
    return { success: false, error: "Config data is missing" };
  }

  const existingCredsResult = await context.credOps.loadCredentials(shopId);
  const existingCreds = existingCredsResult.success ? existingCredsResult.data : null;

  note(`Editing credentials for ${config.name}`, "🔐 Edit Credentials");
  
  console.log(`\n📋 Theme Access App Setup:`);
  console.log(`1. Ask a shop admin to add your email to the Theme Access app`);
  console.log(`2. Check your email for the access link`);
  console.log(`3. Click the link to view your theme access password`);
  console.log(`4. Update the passwords below\n`);

  const productionToken = await getTokenInput(
    `Production password (${config.shopify.stores.production.domain}):`,
    existingCreds?.shopify.stores.production.themeToken
  );
  if (!productionToken) return { success: false, error: "Credential editing cancelled" };

  const stagingToken = await getStagingTokenForEdit(config, existingCreds, productionToken);

  const updatedCredentials: ShopCredentials = {
    developer: existingCreds?.developer || process.env['USER'] || process.env['USERNAME'] || 'developer',
    shopify: {
      stores: {
        production: { themeToken: productionToken },
        staging: { themeToken: stagingToken }
      }
    },
    notes: existingCreds?.notes || `Theme access app credentials for ${shopId}`
  };

  const saveResult = await context.credOps.saveCredentials(shopId, updatedCredentials);
  if (saveResult.success) {
    note(`✅ Credentials updated for ${config.name}`, "Complete");
  } else {
    note(saveResult.error || "Failed to update credentials", "❌ Error");
  }

  return saveResult;
};

const getTokenInput = async (message: string, existingToken?: string): Promise<string | null> => {
  const token = await text({
    message,
    placeholder: existingToken || "Enter your theme access password",
    validate: (value) => {
      if (!value) return "Password is required";
      if (value.length < 8) return "Password seems too short";
      return undefined;
    }
  });

  return isCancel(token) ? null : token as string;
};

const getStagingTokenForEdit = async (config: { shopify: { stores: { staging: { domain: string }; production: { domain: string } } } }, existingCreds: ShopCredentials | null | undefined, productionToken: string): Promise<string> => {
  if (config.shopify.stores.staging.domain === config.shopify.stores.production.domain) {
    return productionToken;
  }

  const stagingInput = await text({
    message: `Staging password (${config.shopify.stores.staging.domain}):`,
    placeholder: existingCreds?.shopify.stores.staging.themeToken || "Enter staging password (or press Enter to use production)",
    validate: (value) => {
      if (!value) return undefined;
      if (value.length < 8) return "Password seems too short";
      return undefined;
    }
  });

  return (!isCancel(stagingInput) && stagingInput) ? stagingInput as string : productionToken;
};