# Validation API

Complete reference for validation rules, type guards, and input validation.

## Overview

ShopDevs Multi-Shop provides centralized validation through `validation-schemas.ts`. All validation rules, patterns, and error messages are defined in one place for consistency.

## Validation Rules

### SHOP_ID_RULES

Rules for shop identifiers.

```typescript
const SHOP_ID_RULES = {
  pattern: /^[a-z0-9]+(-[a-z0-9]+)*$/,
  patternString: '^[a-z0-9]+(-[a-z0-9]+)*$',
  minLength: 1,
  maxLength: 50,
  description: 'Lowercase alphanumeric with hyphens (no leading/trailing hyphens)',
  examples: ['shop-a', 'my-store-123', 'test-shop'],
  invalidExamples: ['-shop', 'shop-', 'UPPERCASE', 'with spaces']
}
```

**Valid shop IDs:**
- `shop-a`
- `fitness-store`
- `my-shop-123`

**Invalid shop IDs:**
- `-shop` (leading hyphen)
- `shop-` (trailing hyphen)
- `Shop-A` (uppercase)
- `shop a` (spaces)
- `shop_a` (underscore)

### DOMAIN_RULES

Rules for Shopify store domains.

```typescript
const DOMAIN_RULES = {
  pattern: /^[a-z0-9-]+\.myshopify\.com$/,
  patternString: '^[a-z0-9-]+\\.myshopify\\.com$',
  suffix: '.myshopify.com',
  minSubdomainLength: 1,
  minTotalLength: 14,  // '.myshopify.com'.length
  description: 'Valid Shopify store domain',
  examples: ['my-shop.myshopify.com', 'staging-shop.myshopify.com'],
  invalidExamples: ['.myshopify.com', 'shop.com', 'shop.shopify.com']
}
```

**Valid domains:**
- `fitness-store.myshopify.com`
- `staging-shop-a.myshopify.com`
- `a.myshopify.com`

**Invalid domains:**
- `.myshopify.com` (no subdomain)
- `shop.com` (wrong suffix)
- `shop.shopify.com` (wrong suffix)
- `SHOP.myshopify.com` (uppercase)

### SHOP_NAME_RULES

Rules for human-readable shop names.

```typescript
const SHOP_NAME_RULES = {
  minLength: 1,
  maxLength: 100,
  description: 'Human-readable shop name'
}
```

**Valid shop names:**
- `Fitness Store`
- `Shop A`
- `Electronics & Tech Shop`

**Invalid shop names:**
- `` (empty)
- `A very long shop name that exceeds one hundred characters...` (> 100 chars)

### BRANCH_NAME_RULES

Rules for Git branch names.

```typescript
const BRANCH_NAME_RULES = {
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
}
```

**Valid branch names:**
- `shop-a/main`
- `shop-b/staging`
- `fitness-store/main`

**Invalid branch names:**
- `shop/` (trailing slash)
- `/shop` (leading slash)
- `shop main` (spaces)
- `shop.lock` (lock suffix)
- `shop/feature/test` (too many slashes for production/staging)

### THEME_TOKEN_RULES

Rules for Shopify theme access tokens.

```typescript
const THEME_TOKEN_RULES = {
  minLength: 10,
  manualTokenPrefix: 'shptka_',
  description: 'Shopify theme access token',
  manualTokenDescription: 'Manual tokens must start with "shptka_"'
}
```

**Valid theme tokens:**
- `shptka_1234567890abcdef` (manual token)
- `tkat_abc123xyz789` (theme access app token)

**Invalid theme tokens:**
- `abc` (too short)
- `shptka_` (manual token prefix but no token)

### AUTHENTICATION_METHODS

Valid authentication methods.

```typescript
const AUTHENTICATION_METHODS = {
  themeAccessApp: 'theme-access-app',
  manualTokens: 'manual-tokens'
}
```

## Type Guards

Type guards provide runtime type checking with TypeScript type narrowing.

### isValidShopId

Checks if a value is a valid shop identifier.

```typescript
function isValidShopId(value: unknown): value is string
```

**Parameters:**
- `value` - Value to check

**Returns:** `true` if valid shop ID, `false` otherwise

**TypeScript:** Narrows type to `string` when returns `true`

**Example:**
```typescript
import { isValidShopId } from '@shopdevs/multi-shop-cli';

const input = getUserInput();
if (isValidShopId(input)) {
  // TypeScript knows input is string here
  console.log('Valid shop ID:', input);
} else {
  console.error('Invalid shop ID');
}

// Common usage in validation
function processShop(shopId: unknown) {
  if (!isValidShopId(shopId)) {
    throw new Error('Invalid shop ID');
  }
  // shopId is typed as string here
  return shopId.toLowerCase();
}
```

### isValidDomain

Checks if a value is a valid Shopify domain.

```typescript
function isValidDomain(value: unknown): value is string
```

**Parameters:**
- `value` - Value to check

**Returns:** `true` if valid Shopify domain, `false` otherwise

**Example:**
```typescript
import { isValidDomain } from '@shopdevs/multi-shop-cli';

const domain = 'my-shop.myshopify.com';
if (isValidDomain(domain)) {
  console.log('Valid domain:', domain);
} else {
  console.error('Invalid domain');
}

// Validate user input
function validateDomain(input: string): string {
  if (!isValidDomain(input)) {
    throw new Error('Domain must end with .myshopify.com');
  }
  return input;
}
```

### isValidBranchName

Checks if a value is a valid Git branch name.

```typescript
function isValidBranchName(
  value: unknown,
  type?: 'production' | 'staging'
): value is string
```

**Parameters:**
- `value` - Value to check
- `type` (optional) - Specific branch type to validate

**Returns:** `true` if valid branch name, `false` otherwise

**Example:**
```typescript
import { isValidBranchName } from '@shopdevs/multi-shop-cli';

// General branch validation
const branch = 'shop-a/main';
if (isValidBranchName(branch)) {
  console.log('Valid branch:', branch);
}

// Validate production branch
if (isValidBranchName('shop-a/main', 'production')) {
  console.log('Valid production branch');
}

// Validate staging branch
if (isValidBranchName('shop-a/staging', 'staging')) {
  console.log('Valid staging branch');
}

// Invalid patterns
isValidBranchName('shop/');        // false (trailing slash)
isValidBranchName('shop main');    // false (spaces)
isValidBranchName('shop.lock');    // false (.lock suffix)
```

### isValidThemeToken

Checks if a value is a valid theme access token.

```typescript
function isValidThemeToken(
  value: unknown,
  authMethod: 'theme-access-app' | 'manual-tokens'
): value is string
```

**Parameters:**
- `value` - Value to check
- `authMethod` - Authentication method being used

**Returns:** `true` if valid theme token, `false` otherwise

**Example:**
```typescript
import { isValidThemeToken } from '@shopdevs/multi-shop-cli';

// Validate theme access app token
const appToken = 'tkat_abc123xyz789';
if (isValidThemeToken(appToken, 'theme-access-app')) {
  console.log('Valid theme access app token');
}

// Validate manual token (must start with shptka_)
const manualToken = 'shptka_1234567890';
if (isValidThemeToken(manualToken, 'manual-tokens')) {
  console.log('Valid manual token');
}

// Invalid cases
isValidThemeToken('abc', 'theme-access-app');           // false (too short)
isValidThemeToken('invalid', 'manual-tokens');          // false (no shptka_ prefix)
isValidThemeToken('shptka_', 'manual-tokens');          // false (no token after prefix)
```

## Validation Errors

Standardized error messages for validation failures.

```typescript
const VALIDATION_ERRORS = {
  shopId: {
    required: 'Shop ID is required',
    invalid: 'Shop ID must be lowercase alphanumeric with hyphens',
    tooShort: 'Shop ID must be at least 1 character',
    tooLong: 'Shop ID must be at most 50 characters',
    mismatch: 'Shop ID in config does not match provided shop ID'
  },
  shopName: {
    required: 'Shop name is required',
    tooShort: 'Shop name must be at least 1 character',
    tooLong: 'Shop name must be at most 100 characters'
  },
  domain: {
    required: 'Domain is required',
    invalid: 'Domain must be a valid Shopify store domain',
    noSubdomain: 'Domain must have a subdomain before .myshopify.com',
    wrongSuffix: 'Domain must end with .myshopify.com'
  },
  branch: {
    required: 'Branch name is required',
    invalid: 'Branch must be a valid Git branch name',
    tooLong: 'Branch name must be at most 250 characters'
  },
  themeToken: {
    required: 'Theme token is required',
    tooShort: 'Theme token must be at least 10 characters',
    invalidManualToken: 'Manual tokens must start with "shptka_"'
  },
  config: {
    required: 'Configuration is required',
    notObject: 'Configuration must be an object'
  }
}
```

**Usage:**
```typescript
import { VALIDATION_ERRORS, isValidShopId } from '@shopdevs/multi-shop-cli';

function validateShopId(shopId: string): void {
  if (!shopId) {
    throw new Error(VALIDATION_ERRORS.shopId.required);
  }
  if (!isValidShopId(shopId)) {
    throw new Error(VALIDATION_ERRORS.shopId.invalid);
  }
}
```

## Complete Validation Example

Here's a complete example validating a shop configuration:

```typescript
import {
  isValidShopId,
  isValidDomain,
  isValidBranchName,
  VALIDATION_ERRORS
} from '@shopdevs/multi-shop-cli';
import type { ShopConfig } from '@shopdevs/multi-shop-cli';

function validateShopConfig(config: unknown): config is ShopConfig {
  if (!config || typeof config !== 'object') {
    console.error(VALIDATION_ERRORS.config.notObject);
    return false;
  }

  const cfg = config as Record<string, unknown>;

  // Validate shop ID
  if (!isValidShopId(cfg.shopId)) {
    console.error(VALIDATION_ERRORS.shopId.invalid);
    return false;
  }

  // Validate shop name
  if (!cfg.name || typeof cfg.name !== 'string') {
    console.error(VALIDATION_ERRORS.shopName.required);
    return false;
  }
  if (cfg.name.length < 1 || cfg.name.length > 100) {
    console.error(VALIDATION_ERRORS.shopName.tooLong);
    return false;
  }

  // Validate shopify config exists
  if (!cfg.shopify || typeof cfg.shopify !== 'object') {
    return false;
  }

  const shopify = cfg.shopify as Record<string, unknown>;
  if (!shopify.stores || typeof shopify.stores !== 'object') {
    return false;
  }

  const stores = shopify.stores as Record<string, unknown>;

  // Validate production store
  if (!stores.production || typeof stores.production !== 'object') {
    return false;
  }
  const prod = stores.production as Record<string, unknown>;
  if (!isValidDomain(prod.domain)) {
    console.error(VALIDATION_ERRORS.domain.invalid);
    return false;
  }
  if (!isValidBranchName(prod.branch, 'production')) {
    console.error(VALIDATION_ERRORS.branch.invalid);
    return false;
  }

  // Validate staging store
  if (!stores.staging || typeof stores.staging !== 'object') {
    return false;
  }
  const staging = stores.staging as Record<string, unknown>;
  if (!isValidDomain(staging.domain)) {
    console.error(VALIDATION_ERRORS.domain.invalid);
    return false;
  }
  if (!isValidBranchName(staging.branch, 'staging')) {
    console.error(VALIDATION_ERRORS.branch.invalid);
    return false;
  }

  return true;
}

// Usage
const userConfig = loadUserConfig();
if (validateShopConfig(userConfig)) {
  // TypeScript knows userConfig is ShopConfig here
  console.log('Valid configuration');
} else {
  console.error('Invalid configuration');
}
```

## Custom Validation

You can build custom validators using the provided rules:

```typescript
import { SHOP_ID_RULES, DOMAIN_RULES } from '@shopdevs/multi-shop-cli';

// Custom validator with detailed error
function validateShopIdWithError(value: string): { valid: boolean; error?: string } {
  if (value.length < SHOP_ID_RULES.minLength) {
    return { valid: false, error: 'Shop ID too short' };
  }
  if (value.length > SHOP_ID_RULES.maxLength) {
    return { valid: false, error: 'Shop ID too long' };
  }
  if (!SHOP_ID_RULES.pattern.test(value)) {
    return { valid: false, error: SHOP_ID_RULES.description };
  }
  return { valid: true };
}

// Custom domain extractor
function extractShopHandle(domain: string): string | null {
  if (!DOMAIN_RULES.pattern.test(domain)) {
    return null;
  }
  return domain.replace(DOMAIN_RULES.suffix, '');
}

console.log(extractShopHandle('my-shop.myshopify.com')); // 'my-shop'
```

## Testing Validation

Example tests for validation:

```typescript
import { describe, it, expect } from 'vitest';
import { isValidShopId, isValidDomain } from '@shopdevs/multi-shop-cli';

describe('Validation', () => {
  describe('isValidShopId', () => {
    it('accepts valid shop IDs', () => {
      expect(isValidShopId('shop-a')).toBe(true);
      expect(isValidShopId('my-store-123')).toBe(true);
      expect(isValidShopId('test')).toBe(true);
    });

    it('rejects invalid shop IDs', () => {
      expect(isValidShopId('-shop')).toBe(false);
      expect(isValidShopId('shop-')).toBe(false);
      expect(isValidShopId('SHOP')).toBe(false);
      expect(isValidShopId('shop a')).toBe(false);
      expect(isValidShopId('')).toBe(false);
    });
  });

  describe('isValidDomain', () => {
    it('accepts valid domains', () => {
      expect(isValidDomain('shop.myshopify.com')).toBe(true);
      expect(isValidDomain('my-shop-123.myshopify.com')).toBe(true);
    });

    it('rejects invalid domains', () => {
      expect(isValidDomain('.myshopify.com')).toBe(false);
      expect(isValidDomain('shop.com')).toBe(false);
      expect(isValidDomain('SHOP.myshopify.com')).toBe(false);
    });
  });
});
```

## Best Practices

1. **Use type guards** for runtime validation with TypeScript narrowing
2. **Reference VALIDATION_ERRORS** for consistent error messages
3. **Validate early** at boundaries (user input, file parsing)
4. **Test validation** thoroughly with valid and invalid cases
5. **Use validation rules** as single source of truth
6. **Document validation** in user-facing errors

## See Also

- [API Index](./index.md) - Main API overview
- [Shop Manager API](./shop-manager.md) - Operations API
- [Types Reference](./types.md) - Type definitions
- [Security Guide](../guides/security-guide.md) - Security best practices
