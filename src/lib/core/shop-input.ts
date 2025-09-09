import { intro, text, select, isCancel } from "@clack/prompts";
import type { AuthenticationMethod } from "../../types/shop.js";
import type { CLIContext, Result } from "./types.js";
import { validateShopId, validateDomain } from "./validation.js";

/**
 * Shop data input collection
 */

export interface ShopData {
  readonly shopId: string;
  readonly shopName: string;
  readonly productionDomain: string;
  readonly stagingDomain: string;
  readonly authMethod: AuthenticationMethod;
}

export const collectShopData = async (context: CLIContext): Promise<Result<ShopData>> => {
  const existingShops = await getExistingShops(context);

  const shopId = await getShopId(existingShops);
  if (!shopId) return { success: false, error: "Shop creation cancelled" };

  const shopName = await getShopName();
  if (!shopName) return { success: false, error: "Shop creation cancelled" };

  const productionDomain = await getDomain("Production domain:", "my-shop.myshopify.com");
  if (!productionDomain) return { success: false, error: "Shop creation cancelled" };

  const stagingDomain = await getDomain("Staging domain:", "staging-my-shop.myshopify.com (can be same as production)");
  if (!stagingDomain) return { success: false, error: "Shop creation cancelled" };

  const authMethod = await getAuthMethod();
  if (!authMethod) return { success: false, error: "Shop creation cancelled" };

  return {
    success: true,
    data: { shopId, shopName, productionDomain, stagingDomain, authMethod }
  };
};

const getExistingShops = async (context: CLIContext): Promise<string[]> => {
  const result = await context.shopOps.listShops();
  return result.success ? result.data || [] : [];
};

const getShopId = async (existingShops: string[]): Promise<string | null> => {
  const shopId = await text({
    message: "Shop ID (lowercase, hyphens only):",
    placeholder: "my-shop",
    validate: (value) => {
      if (!value) return "Shop ID is required";
      
      const validation = validateShopId(value);
      if (!validation.success) return validation.error;
      
      if (existingShops.includes(value)) {
        return "A shop with this ID already exists";
      }
      
      return undefined;
    }
  });

  return isCancel(shopId) ? null : shopId as string;
};

const getShopName = async (): Promise<string | null> => {
  const shopName = await text({
    message: "Shop display name:",
    placeholder: "My Shop"
  });

  return isCancel(shopName) ? null : shopName as string;
};

const getDomain = async (message: string, placeholder: string): Promise<string | null> => {
  const domain = await text({
    message,
    placeholder,
    validate: (value) => {
      if (!value) return "Domain is required";
      const validation = validateDomain(value);
      return validation.success ? undefined : validation.error;
    }
  });

  return isCancel(domain) ? null : domain as string;
};

const getAuthMethod = async (): Promise<AuthenticationMethod | null> => {
  const authMethod = await select({
    message: "Authentication method:",
    options: [
      { value: "theme-access-app", label: "Theme Access App", hint: "Recommended" },
      { value: "manual-tokens", label: "Manual Tokens", hint: "Direct API access" }
    ]
  });

  return isCancel(authMethod) ? null : authMethod as AuthenticationMethod;
};