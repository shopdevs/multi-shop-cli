import { select, isCancel, note, confirm } from "@clack/prompts";
import type { CLIContext, Result } from "./types.js";
import type { ContentProtectionMode, ContentProtectionVerbosity, GlobalSettings } from "../../types/shop.js";
import { loadGlobalSettings, saveGlobalSettings } from "./global-settings.js";

/**
 * Content protection configuration and management
 * Prevents accidental content overwrites when syncing across shops
 */

export const handleContentProtection = async (context: CLIContext): Promise<Result<void>> => {
  const protectionChoice = await select({
    message: "Content Protection:",
    options: [
      { value: "status", label: "Show Protection Status", hint: "View all shops" },
      { value: "configure", label: "Configure Shop Protection", hint: "Enable/disable per shop" },
      { value: "enable-all", label: "Enable All Shops", hint: "Protect all shops" },
      { value: "disable-all", label: "Disable All Shops", hint: "Remove protection" },
      { value: "global", label: "Global Settings", hint: "Configure defaults" }
    ]
  });

  if (isCancel(protectionChoice)) {
    return { success: false, error: "Cancelled" };
  }

  switch (protectionChoice) {
    case "status":
      return showProtectionStatus(context);
    case "configure":
      return configureShopProtection(context);
    case "enable-all":
      return enableAllShops(context);
    case "disable-all":
      return disableAllShops(context);
    case "global":
      return configureGlobalSettings(context);
    default:
      return { success: false, error: "Unknown option" };
  }
};

const showProtectionStatus = async (context: CLIContext): Promise<Result<void>> => {
  const shopsResult = await context.shopOps.listShops();

  if (!shopsResult.success || !shopsResult.data?.length) {
    note("No shops configured yet", "📋 Protection Status");
    return { success: true };
  }

  note("Content Protection Status:", "🛡️ Protection Status");

  for (const shopId of shopsResult.data) {
    const configResult = await context.shopOps.loadConfig(shopId);

    if (configResult.success && configResult.data) {
      const protection = configResult.data.contentProtection;
      const status = protection?.enabled
        ? `✅ Enabled (${protection.mode} mode, ${protection.verbosity})`
        : '❌ Disabled';

      console.log(`\n  ${shopId}: ${status}`);
    }
  }

  console.log();
  return { success: true };
};

const configureShopProtection = async (context: CLIContext): Promise<Result<void>> => {
  const shopsResult = await context.shopOps.listShops();

  if (!shopsResult.success || !shopsResult.data?.length) {
    note("No shops configured yet", "⚠️ Error");
    return { success: false, error: "No shops configured" };
  }

  const shopId = await selectShop(shopsResult.data);
  if (!shopId) return { success: false, error: "No shop selected" };

  const configResult = await context.shopOps.loadConfig(shopId);
  if (!configResult.success || !configResult.data) {
    return { success: false, error: "Failed to load shop config" };
  }

  const config = configResult.data;
  const currentProtection = config.contentProtection;

  note(`Current: ${currentProtection?.enabled ? 'Enabled' : 'Disabled'}`, `🛡️ Configure ${shopId}`);

  const enableChoice = await select({
    message: "Content protection status:",
    options: [
      { value: true, label: "Enable", hint: "Protect against content overwrites" },
      { value: false, label: "Disable", hint: "Allow content to sync" }
    ]
  });

  if (isCancel(enableChoice)) return { success: false, error: "Cancelled" };

  const enabled = Boolean(enableChoice);

  if (!enabled) {
    const updatedConfig = {
      ...config,
      contentProtection: {
        enabled: false,
        mode: 'off' as ContentProtectionMode,
        verbosity: 'verbose' as ContentProtectionVerbosity
      }
    };

    await context.shopOps.saveConfig(shopId, updatedConfig);
    note(`Content protection disabled for ${shopId}`, "✅ Updated");
    return { success: true };
  }

  // Configure mode
  const mode = await selectMode();
  if (!mode) return { success: false, error: "Cancelled" };

  const verbosity = await selectVerbosity();
  if (!verbosity) return { success: false, error: "Cancelled" };

  const updatedConfig = {
    ...config,
    contentProtection: {
      enabled: true,
      mode,
      verbosity
    }
  };

  await context.shopOps.saveConfig(shopId, updatedConfig);

  note(`Content protection enabled for ${shopId} (${mode} mode, ${verbosity})`, "✅ Updated");

  return { success: true };
};

const enableAllShops = async (context: CLIContext): Promise<Result<void>> => {
  const shopsResult = await context.shopOps.listShops();

  if (!shopsResult.success || !shopsResult.data?.length) {
    note("No shops configured yet", "⚠️ Error");
    return { success: false, error: "No shops configured" };
  }

  const confirmed = await confirm({
    message: `Enable strict content protection for all ${shopsResult.data.length} shops?`,
    initialValue: true
  });

  if (isCancel(confirmed) || !confirmed) {
    return { success: false, error: "Cancelled" };
  }

  let updated = 0;

  for (const shopId of shopsResult.data) {
    const configResult = await context.shopOps.loadConfig(shopId);

    if (configResult.success && configResult.data) {
      const updatedConfig = {
        ...configResult.data,
        contentProtection: {
          enabled: true,
          mode: 'strict' as ContentProtectionMode,
          verbosity: 'verbose' as ContentProtectionVerbosity
        }
      };

      await context.shopOps.saveConfig(shopId, updatedConfig);
      updated++;
    }
  }

  note(`Enabled content protection for ${updated} shop${updated === 1 ? '' : 's'}`, "✅ Success");

  return { success: true };
};

const disableAllShops = async (context: CLIContext): Promise<Result<void>> => {
  const shopsResult = await context.shopOps.listShops();

  if (!shopsResult.success || !shopsResult.data?.length) {
    note("No shops configured yet", "⚠️ Error");
    return { success: false, error: "No shops configured" };
  }

  const confirmed = await confirm({
    message: `Disable content protection for all ${shopsResult.data.length} shops? This removes safety checks.`,
    initialValue: false
  });

  if (isCancel(confirmed) || !confirmed) {
    return { success: false, error: "Cancelled" };
  }

  let updated = 0;

  for (const shopId of shopsResult.data) {
    const configResult = await context.shopOps.loadConfig(shopId);

    if (configResult.success && configResult.data) {
      const updatedConfig = {
        ...configResult.data,
        contentProtection: {
          enabled: false,
          mode: 'off' as ContentProtectionMode,
          verbosity: 'verbose' as ContentProtectionVerbosity
        }
      };

      await context.shopOps.saveConfig(shopId, updatedConfig);
      updated++;
    }
  }

  note(`Disabled content protection for ${updated} shop${updated === 1 ? '' : 's'}`, "✅ Success");

  return { success: true };
};

const configureGlobalSettings = async (context: CLIContext): Promise<Result<void>> => {
  const settingsResult = await loadGlobalSettings(context.deps.cwd);
  const currentSettings = settingsResult.data || {
    contentProtection: {
      defaultMode: 'strict' as ContentProtectionMode,
      defaultVerbosity: 'verbose' as ContentProtectionVerbosity,
      applyToNewShops: true
    },
    version: '1.0.0'
  };

  const current = currentSettings.contentProtection;
  note(`Current: ${current.defaultMode} mode, ${current.defaultVerbosity}, ${current.applyToNewShops ? 'auto-apply' : 'manual'}`, "⚙️ Global Settings");

  const mode = await selectMode();
  if (!mode) return { success: false, error: "Cancelled" };

  const verbosity = await selectVerbosity();
  if (!verbosity) return { success: false, error: "Cancelled" };

  const applyToNew = await confirm({
    message: "Apply to new shops automatically?",
    initialValue: true
  });

  if (isCancel(applyToNew)) return { success: false, error: "Cancelled" };

  const newSettings: GlobalSettings = {
    contentProtection: {
      defaultMode: mode,
      defaultVerbosity: verbosity,
      applyToNewShops: Boolean(applyToNew)
    },
    version: '1.0.0'
  };

  await saveGlobalSettings(context.deps.cwd, newSettings);

  note("Global settings updated. New shops will use these defaults.", "✅ Updated");

  return { success: true };
};

// Helper functions
const selectShop = async (shops: string[]): Promise<string | null> => {
  const shopChoice = await select({
    message: "Select shop to configure:",
    options: shops.map(shop => ({ value: shop, label: shop }))
  });

  return isCancel(shopChoice) ? null : String(shopChoice);
};

const selectMode = async (): Promise<ContentProtectionMode | null> => {
  const modeChoice = await select({
    message: "Protection mode:",
    options: [
      { value: "strict", label: "Strict", hint: "Block cross-shop content sync" },
      { value: "warn", label: "Warn", hint: "Show warning, require confirmation" },
      { value: "off", label: "Off", hint: "No protection" }
    ]
  });

  return isCancel(modeChoice) ? null : modeChoice as ContentProtectionMode;
};

const selectVerbosity = async (): Promise<ContentProtectionVerbosity | null> => {
  const verbosityChoice = await select({
    message: "Output verbosity:",
    options: [
      { value: "verbose", label: "Verbose", hint: "Show all details (recommended)" },
      { value: "quiet", label: "Quiet", hint: "Minimal output" }
    ]
  });

  return isCancel(verbosityChoice) ? null : verbosityChoice as ContentProtectionVerbosity;
};
