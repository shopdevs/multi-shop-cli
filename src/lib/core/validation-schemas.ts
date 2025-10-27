/**
 * Single source of truth for all validation rules
 *
 * This module defines validation patterns, constraints, and error messages
 * used throughout the application. All validation logic should reference
 * these constants to ensure consistency.
 */

/**
 * Validation rules for shop identifiers
 */
export const SHOP_ID_RULES = {
  // Safe from ReDoS: maxLength of 50 prevents catastrophic backtracking
  // eslint-disable-next-line security/detect-unsafe-regex
  pattern: /^[a-z0-9]+(-[a-z0-9]+)*$/,
  patternString: '^[a-z0-9]+(-[a-z0-9]+)*$',
  minLength: 1,
  maxLength: 50,
  description: 'Lowercase alphanumeric with hyphens (no leading/trailing hyphens)',
  examples: ['shop-a', 'my-store-123', 'test-shop'],
  invalidExamples: ['-shop', 'shop-', 'UPPERCASE', 'with spaces']
} as const;

/**
 * Validation rules for Shopify store domains
 */
export const DOMAIN_RULES = {
  pattern: /^[a-z0-9-]+\.myshopify\.com$/,
  patternString: '^[a-z0-9-]+\\.myshopify\\.com$',
  suffix: '.myshopify.com',
  minSubdomainLength: 1, // At least one character before .myshopify.com
  minTotalLength: '.myshopify.com'.length, // Just the suffix length (14)
  description: 'Valid Shopify store domain',
  examples: ['my-shop.myshopify.com', 'staging-shop.myshopify.com', 'a.myshopify.com'],
  invalidExamples: ['.myshopify.com', 'shop.com', 'shop.shopify.com']
} as const;

/**
 * Validation rules for shop names
 */
export const SHOP_NAME_RULES = {
  minLength: 1,
  maxLength: 100,
  description: 'Human-readable shop name'
} as const;

/**
 * Validation rules for Git branch names
 */
export const BRANCH_NAME_RULES = {
  productionPattern: /^[a-z0-9-]+\/main$/,
  productionPatternString: '^[a-z0-9-]+/main$',
  stagingPattern: /^[a-z0-9-]+\/staging$/,
  stagingPatternString: '^[a-z0-9-]+/staging$',
  maxLength: 250,
  invalidPatterns: [
    /^\.|\/\.|\.\.|@\{/,  // No leading dots, no /./, no .., no @{
    /\s|~|\^|:|\?|\*|\[/, // No spaces or special chars
    /\/$/,                // No trailing slash
    /\.lock$/             // No .lock suffix
  ],
  description: 'Valid Git branch name',
  examples: ['shop-a/main', 'shop-b/staging'],
  invalidExamples: ['shop/', '/shop', 'shop main', 'shop.lock']
} as const;

/**
 * Validation rules for theme tokens
 */
export const THEME_TOKEN_RULES = {
  minLength: 10,
  themeAccessPrefix: 'tkat_', // Theme Access app tokens
  customAppPrefix: 'shpat_',   // Custom app access tokens
  description: 'Shopify theme access token or custom app token',
  validPrefixes: ['tkat_', 'shpat_'],
  prefixDescription: 'Tokens must start with "tkat_" (Theme Access) or "shpat_" (Custom App)'
} as const;

/**
 * Authentication methods
 */
export const AUTHENTICATION_METHODS = {
  themeAccessApp: 'theme-access-app',
  manualTokens: 'manual-tokens'
} as const;

/**
 * Error messages for validation failures
 */
export const VALIDATION_ERRORS = {
  shopId: {
    required: 'Shop ID is required',
    invalid: `Shop ID ${SHOP_ID_RULES.description}`,
    tooShort: `Shop ID must be at least ${SHOP_ID_RULES.minLength} character`,
    tooLong: `Shop ID must be at most ${SHOP_ID_RULES.maxLength} characters`,
    mismatch: 'Shop ID in config does not match provided shop ID'
  },
  shopName: {
    required: 'Shop name is required',
    tooShort: `Shop name must be at least ${SHOP_NAME_RULES.minLength} character`,
    tooLong: `Shop name must be at most ${SHOP_NAME_RULES.maxLength} characters`
  },
  domain: {
    required: 'Domain is required',
    invalid: `Domain ${DOMAIN_RULES.description}`,
    noSubdomain: `Domain must have a subdomain before ${DOMAIN_RULES.suffix}`,
    wrongSuffix: `Domain must end with ${DOMAIN_RULES.suffix}`
  },
  branch: {
    required: 'Branch name is required',
    invalid: `Branch ${BRANCH_NAME_RULES.description}`,
    tooLong: `Branch name must be at most ${BRANCH_NAME_RULES.maxLength} characters`
  },
  themeToken: {
    required: 'Theme token is required',
    tooShort: `Theme token must be at least ${THEME_TOKEN_RULES.minLength} characters`,
    invalidPrefix: THEME_TOKEN_RULES.prefixDescription
  },
  config: {
    required: 'Configuration is required',
    notObject: 'Configuration must be an object'
  }
} as const;

/**
 * Type guard: Checks if value is a valid shop ID
 */
export const isValidShopId = (value: unknown): value is string => {
  if (typeof value !== 'string') return false;
  if (value.length < SHOP_ID_RULES.minLength || value.length > SHOP_ID_RULES.maxLength) return false;
  return SHOP_ID_RULES.pattern.test(value);
};

/**
 * Type guard: Checks if value is a valid domain
 */
export const isValidDomain = (value: unknown): value is string => {
  if (typeof value !== 'string') return false;
  if (value.length <= DOMAIN_RULES.minTotalLength) return false; // Must be longer than just the suffix
  if (!value.endsWith(DOMAIN_RULES.suffix)) return false;
  return DOMAIN_RULES.pattern.test(value);
};

/**
 * Type guard: Checks if value is a valid branch name
 */
export const isValidBranchName = (value: unknown, type?: 'production' | 'staging'): value is string => {
  if (typeof value !== 'string') return false;
  if (value.length > BRANCH_NAME_RULES.maxLength) return false;

  // Check if matches specific pattern if type is provided
  if (type === 'production') {
    return BRANCH_NAME_RULES.productionPattern.test(value);
  }
  if (type === 'staging') {
    return BRANCH_NAME_RULES.stagingPattern.test(value);
  }

  // General branch name validation
  return !BRANCH_NAME_RULES.invalidPatterns.some(pattern => pattern.test(value));
};

/**
 * Type guard: Checks if value is a valid theme token
 */
export const isValidThemeToken = (value: unknown, authMethod: 'theme-access-app' | 'manual-tokens'): value is string => {
  if (typeof value !== 'string') return false;
  if (value.length < THEME_TOKEN_RULES.minLength) return false;

  // Theme Access app uses tkat_ prefix
  // Custom apps use shpat_ prefix
  // Both are valid - we don't enforce prefix as tokens can vary
  return true;
};
