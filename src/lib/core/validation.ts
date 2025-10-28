import type { ShopConfig } from "../../types/shop.js";
import type { Result } from "./types.js";
import {
  SHOP_ID_RULES,
  DOMAIN_RULES,
  VALIDATION_ERRORS,
  isValidShopId as isShopIdValid,
  isValidDomain as isDomainValid
} from "./validation-schemas.js";

/**
 * Pure functional validation using centralized validation schemas
 */

export const validateShopId = (shopId: string): Result<void> => {
  if (!shopId || typeof shopId !== 'string') {
    return { success: false, error: VALIDATION_ERRORS.shopId.required };
  }

  if (shopId.length < SHOP_ID_RULES.minLength) {
    return { success: false, error: VALIDATION_ERRORS.shopId.tooShort };
  }

  if (shopId.length > SHOP_ID_RULES.maxLength) {
    return { success: false, error: VALIDATION_ERRORS.shopId.tooLong };
  }

  if (!SHOP_ID_RULES.pattern.test(shopId)) {
    return { success: false, error: VALIDATION_ERRORS.shopId.invalid };
  }

  return { success: true };
};

export const validateDomain = (domain: string): Result<void> => {
  if (!domain || typeof domain !== 'string') {
    return { success: false, error: VALIDATION_ERRORS.domain.required };
  }

  if (!domain.endsWith(DOMAIN_RULES.suffix)) {
    return { success: false, error: VALIDATION_ERRORS.domain.wrongSuffix };
  }

  if (domain.length <= DOMAIN_RULES.minTotalLength) {
    return { success: false, error: VALIDATION_ERRORS.domain.noSubdomain };
  }

  if (!DOMAIN_RULES.pattern.test(domain)) {
    return { success: false, error: VALIDATION_ERRORS.domain.invalid };
  }

  return { success: true };
};

export const validateShopConfig = async (config: unknown, shopId: string): Promise<Result<void>> => {
  if (!config || typeof config !== 'object') {
    return { success: false, error: VALIDATION_ERRORS.config.notObject };
  }

  const shopConfig = config as ShopConfig;

  const shopIdValidation = validateShopId(shopConfig.shopId);
  if (!shopIdValidation.success) {
    return shopIdValidation;
  }

  if (shopConfig.shopId !== shopId) {
    return { success: false, error: VALIDATION_ERRORS.shopId.mismatch };
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

// Re-export type guards from validation-schemas
export { isShopIdValid as isValidShopId, isDomainValid as isValidDomain };
