import { intro, note } from "@clack/prompts";
import type { ShopConfig } from "../../types/shop.js";
import type { CLIContext, Result } from "./types.js";
import { collectShopData, type ShopData } from "./shop-input.js";
import { setupShopResources } from "./shop-setup.js";

/**
 * Shop creation workflow
 */

export const createNewShop = async (context: CLIContext): Promise<Result<void>> => {
  intro("🆕 Create New Shop");
  
  const shopDataResult = await collectShopData(context);
  if (!shopDataResult.success) return { success: false, error: shopDataResult.error || "Failed to collect shop data" };
  
  const configResult = await buildShopConfig(shopDataResult.data!);
  if (!configResult.success) return { success: false, error: configResult.error || "Failed to build config" };
  
  const saveResult = await context.shopOps.saveConfig(shopDataResult.data!.shopId, configResult.data!);
  if (!saveResult.success) return saveResult;

  note(`✅ Shop configuration created for ${shopDataResult.data!.shopName}`, "Success");
  
  await setupShopResources(shopDataResult.data!, configResult.data!, context);

  return { success: true };
};

const buildShopConfig = async (shopData: ShopData): Promise<Result<ShopConfig>> => {
  const config: ShopConfig = {
    shopId: shopData.shopId,
    name: shopData.shopName,
    shopify: {
      stores: {
        production: {
          domain: shopData.productionDomain,
          branch: `${shopData.shopId}/main`
        },
        staging: {
          domain: shopData.stagingDomain,
          branch: `${shopData.shopId}/staging`
        }
      },
      authentication: {
        method: shopData.authMethod
      }
    }
  };

  return { success: true, data: config };
};