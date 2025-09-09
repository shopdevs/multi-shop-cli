import fs from "fs";
import path from "path";
import type { ShopConfig } from "../../types/shop.js";
import type { Dependencies, Result, ShopOperations } from "./types.js";
import { validateShopConfig } from "./validation.js";

/**
 * Shop configuration operations
 */

export const createShopOperations = (deps: Dependencies): ShopOperations => ({
  loadConfig: (shopId: string) => loadShopConfig(deps, shopId),
  saveConfig: (shopId: string, config: ShopConfig) => saveShopConfig(deps, shopId, config),
  listShops: () => listShops(deps),
  deleteShop: (shopId: string) => deleteShop(deps, shopId)
});

const loadShopConfig = async (deps: Dependencies, shopId: string): Promise<Result<ShopConfig>> => {
  try {
    const configPath = path.join(deps.shopsDir, `${shopId}.config.json`);
    
    if (!fs.existsSync(configPath)) {
      return { success: false, error: `Shop configuration not found: ${shopId}` };
    }

    const rawConfig = fs.readFileSync(configPath, "utf8");
    const config = JSON.parse(rawConfig);
    
    const validationResult = await validateShopConfig(config, shopId);
    if (!validationResult.success) {
      return { success: false, error: validationResult.error || "Validation failed" };
    }

    return { success: true, data: config };
  } catch (error) {
    return { 
      success: false, 
      error: `Failed to load shop configuration: ${error instanceof Error ? error.message : String(error)}` 
    };
  }
};

const saveShopConfig = async (deps: Dependencies, shopId: string, config: ShopConfig): Promise<Result<void>> => {
  try {
    const validationResult = await validateShopConfig(config, shopId);
    if (!validationResult.success) {
      return { success: false, error: validationResult.error || "Validation failed" };
    }

    if (!fs.existsSync(deps.shopsDir)) {
      fs.mkdirSync(deps.shopsDir, { recursive: true });
    }

    const configPath = path.join(deps.shopsDir, `${shopId}.config.json`);
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: `Failed to save shop configuration: ${error instanceof Error ? error.message : String(error)}` 
    };
  }
};

const listShops = async (deps: Dependencies): Promise<Result<string[]>> => {
  try {
    if (!fs.existsSync(deps.shopsDir)) {
      return { success: true, data: [] };
    }

    const shops = fs
      .readdirSync(deps.shopsDir)
      .filter(file => file.endsWith(".config.json") && !file.includes("example"))
      .map(file => file.replace(".config.json", ""));

    return { success: true, data: shops };
  } catch (error) {
    return { 
      success: false, 
      error: `Failed to list shops: ${error instanceof Error ? error.message : String(error)}` 
    };
  }
};

const deleteShop = async (deps: Dependencies, shopId: string): Promise<Result<void>> => {
  try {
    const configPath = path.join(deps.shopsDir, `${shopId}.config.json`);
    const credPath = path.join(deps.credentialsDir, `${shopId}.credentials.json`);
    
    if (fs.existsSync(configPath)) {
      fs.unlinkSync(configPath);
    }
    
    if (fs.existsSync(credPath)) {
      fs.unlinkSync(credPath);
    }

    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: `Failed to delete shop: ${error instanceof Error ? error.message : String(error)}` 
    };
  }
};