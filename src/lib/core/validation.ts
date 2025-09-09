import type { ShopConfig } from "../../types/shop.js";
import type { Result } from "./types.js";

/**
 * Pure functional validation
 */

export const validateShopId = (shopId: string): Result<void> => {
  if (!shopId || typeof shopId !== 'string') {
    return { success: false, error: 'Shop ID is required' };
  }

  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(shopId)) {
    return { success: false, error: 'Shop ID must contain only lowercase letters, numbers, and hyphens (no leading/trailing hyphens)' };
  }

  if (shopId.length < 1 || shopId.length > 50) {
    return { success: false, error: 'Shop ID must be between 1 and 50 characters' };
  }

  return { success: true };
};

export const validateDomain = (domain: string): Result<void> => {
  if (!domain || typeof domain !== 'string') {
    return { success: false, error: 'Domain is required' };
  }

  if (!domain.endsWith('.myshopify.com')) {
    return { success: false, error: 'Domain must end with .myshopify.com' };
  }

  if (domain.length <= '.myshopify.com'.length) {
    return { success: false, error: 'Domain must have a subdomain before .myshopify.com' };
  }

  return { success: true };
};

export const validateShopConfig = async (config: unknown, shopId: string): Promise<Result<void>> => {
  if (!config || typeof config !== 'object') {
    return { success: false, error: 'Configuration must be an object' };
  }

  const shopConfig = config as ShopConfig;

  const shopIdValidation = validateShopId(shopConfig.shopId);
  if (!shopIdValidation.success) {
    return shopIdValidation;
  }

  if (shopConfig.shopId !== shopId) {
    return { success: false, error: 'Shop ID in config does not match provided shop ID' };
  }

  const prodDomainValidation = validateDomain(shopConfig.shopify.stores.production.domain);
  if (!prodDomainValidation.success) {
    return { success: false, error: `Production ${prodDomainValidation.error}` };
  }

  const stagingDomainValidation = validateDomain(shopConfig.shopify.stores.staging.domain);
  if (!stagingDomainValidation.success) {
    return { success: false, error: `Staging ${stagingDomainValidation.error}` };
  }

  return { success: true };
};