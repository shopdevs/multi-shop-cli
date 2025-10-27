# Shop Manager API

Detailed API reference for shop management operations.

## Overview

The Shop Manager API provides functional operations for managing shops, credentials, and development workflows. All operations follow a pure functional design with dependency injection.

## CLIContext Interface

The main context object containing all operations:

```typescript
interface CLIContext {
  readonly deps: Dependencies;
  readonly shopOps: ShopOperations;
  readonly credOps: CredentialOperations;
  readonly devOps: DevOperations;
}
```

## Dependencies

Core dependencies used throughout the system:

```typescript
interface Dependencies {
  readonly cwd: string;              // Working directory
  readonly shopsDir: string;         // shops/ directory
  readonly credentialsDir: string;   // shops/credentials/ directory
}
```

## Result Type

All operations return a `Result<T>` for safe error handling:

```typescript
interface Result<T> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: string;
}
```

**Usage Pattern:**
```typescript
const result = await context.shopOps.loadConfig('shop-a');
if (result.success) {
  console.log('Config:', result.data);
} else {
  console.error('Error:', result.error);
}
```

## Shop Operations

### ShopOperations Interface

```typescript
interface ShopOperations {
  readonly loadConfig: (shopId: string) => Promise<Result<ShopConfig>>;
  readonly saveConfig: (shopId: string, config: ShopConfig) => Promise<Result<void>>;
  readonly listShops: () => Promise<Result<string[]>>;
  readonly deleteShop: (shopId: string) => Promise<Result<void>>;
}
```

### loadConfig

Loads a shop configuration from disk.

```typescript
loadConfig(shopId: string): Promise<Result<ShopConfig>>
```

**Parameters:**
- `shopId` - Shop identifier (e.g., 'shop-a')

**Returns:** Result containing ShopConfig or error

**Example:**
```typescript
const result = await context.shopOps.loadConfig('shop-a');
if (result.success) {
  const config = result.data;
  console.log('Shop name:', config.name);
  console.log('Production domain:', config.shopify.stores.production.domain);
} else {
  console.error('Failed to load config:', result.error);
}
```

### saveConfig

Saves a shop configuration to disk.

```typescript
saveConfig(shopId: string, config: ShopConfig): Promise<Result<void>>
```

**Parameters:**
- `shopId` - Shop identifier
- `config` - Complete shop configuration object

**Returns:** Result indicating success or error

**Example:**
```typescript
const config: ShopConfig = {
  shopId: 'shop-a',
  name: 'Fitness Store',
  shopify: {
    stores: {
      production: {
        domain: 'fitness-store.myshopify.com',
        branch: 'shop-a/main'
      },
      staging: {
        domain: 'staging-fitness.myshopify.com',
        branch: 'shop-a/staging'
      }
    },
    authentication: {
      method: 'theme-access-app'
    }
  }
};

const result = await context.shopOps.saveConfig('shop-a', config);
if (result.success) {
  console.log('Config saved successfully');
} else {
  console.error('Failed to save config:', result.error);
}
```

### listShops

Lists all configured shops.

```typescript
listShops(): Promise<Result<string[]>>
```

**Returns:** Result containing array of shop IDs or error

**Example:**
```typescript
const result = await context.shopOps.listShops();
if (result.success) {
  console.log('Configured shops:', result.data);
  // Output: ['shop-a', 'shop-b', 'shop-c']
} else {
  console.error('Failed to list shops:', result.error);
}
```

### deleteShop

Deletes a shop configuration.

```typescript
deleteShop(shopId: string): Promise<Result<void>>
```

**Parameters:**
- `shopId` - Shop identifier to delete

**Returns:** Result indicating success or error

**Example:**
```typescript
const result = await context.shopOps.deleteShop('shop-a');
if (result.success) {
  console.log('Shop deleted successfully');
} else {
  console.error('Failed to delete shop:', result.error);
}
```

## Credential Operations

### CredentialOperations Interface

```typescript
interface CredentialOperations {
  readonly loadCredentials: (shopId: string) => Promise<Result<ShopCredentials | null>>;
  readonly saveCredentials: (shopId: string, credentials: ShopCredentials) => Promise<Result<void>>;
}
```

### loadCredentials

Loads developer credentials for a shop.

```typescript
loadCredentials(shopId: string): Promise<Result<ShopCredentials | null>>
```

**Parameters:**
- `shopId` - Shop identifier

**Returns:** Result containing ShopCredentials, null if not found, or error

**Example:**
```typescript
const result = await context.credOps.loadCredentials('shop-a');
if (result.success) {
  if (result.data) {
    console.log('Developer:', result.data.developer);
    console.log('Has production token:', !!result.data.shopify.stores.production.themeToken);
  } else {
    console.log('No credentials found for shop-a');
  }
} else {
  console.error('Failed to load credentials:', result.error);
}
```

### saveCredentials

Saves developer credentials for a shop.

```typescript
saveCredentials(shopId: string, credentials: ShopCredentials): Promise<Result<void>>
```

**Parameters:**
- `shopId` - Shop identifier
- `credentials` - Complete credentials object

**Returns:** Result indicating success or error

**Security:** Credentials are stored with 600 permissions (owner read/write only).

**Example:**
```typescript
const credentials: ShopCredentials = {
  developer: 'john-doe',
  shopify: {
    stores: {
      production: {
        themeToken: 'shptka_...'
      },
      staging: {
        themeToken: 'shptka_...'
      }
    }
  },
  notes: 'Theme access app credentials'
};

const result = await context.credOps.saveCredentials('shop-a', credentials);
if (result.success) {
  console.log('Credentials saved securely');
} else {
  console.error('Failed to save credentials:', result.error);
}
```

## Development Operations

### DevOperations Interface

```typescript
interface DevOperations {
  readonly startDev: (shopId: string, environment: 'production' | 'staging') => Promise<Result<void>>;
}
```

### startDev

Starts Shopify CLI development server for a shop.

```typescript
startDev(shopId: string, environment: 'production' | 'staging'): Promise<Result<void>>
```

**Parameters:**
- `shopId` - Shop identifier
- `environment` - Target environment ('production' or 'staging')

**Returns:** Result indicating success or error

**Example:**
```typescript
const result = await context.devOps.startDev('shop-a', 'staging');
if (result.success) {
  console.log('Development server started');
} else {
  console.error('Failed to start dev server:', result.error);
}
```

## Creating a CLIContext

Use `createMultiShopCLI()` to create a context:

```typescript
import { createMultiShopCLI } from '@shopdevs/multi-shop-cli';

// Default (current directory)
const context = createMultiShopCLI();

// Custom directory
const context = createMultiShopCLI('/path/to/theme');

// Access operations
const shops = await context.shopOps.listShops();
const config = await context.shopOps.loadConfig('shop-a');
const creds = await context.credOps.loadCredentials('shop-a');
```

## Complete Example

Here's a complete example using all operations:

```typescript
import { createMultiShopCLI } from '@shopdevs/multi-shop-cli';
import type { ShopConfig, ShopCredentials } from '@shopdevs/multi-shop-cli';

async function setupShop() {
  // Create context
  const context = createMultiShopCLI();

  // List existing shops
  const listResult = await context.shopOps.listShops();
  if (!listResult.success) {
    console.error('Failed to list shops:', listResult.error);
    return;
  }

  console.log('Existing shops:', listResult.data);

  // Create new shop configuration
  const config: ShopConfig = {
    shopId: 'new-shop',
    name: 'New Shop',
    shopify: {
      stores: {
        production: {
          domain: 'new-shop.myshopify.com',
          branch: 'new-shop/main'
        },
        staging: {
          domain: 'staging-new-shop.myshopify.com',
          branch: 'new-shop/staging'
        }
      },
      authentication: {
        method: 'theme-access-app'
      }
    }
  };

  // Save configuration
  const saveResult = await context.shopOps.saveConfig('new-shop', config);
  if (!saveResult.success) {
    console.error('Failed to save config:', saveResult.error);
    return;
  }

  console.log('Configuration saved successfully');

  // Save credentials
  const credentials: ShopCredentials = {
    developer: 'john-doe',
    shopify: {
      stores: {
        production: { themeToken: 'shptka_prod_token' },
        staging: { themeToken: 'shptka_staging_token' }
      }
    },
    notes: 'Theme access app credentials'
  };

  const credResult = await context.credOps.saveCredentials('new-shop', credentials);
  if (!credResult.success) {
    console.error('Failed to save credentials:', credResult.error);
    return;
  }

  console.log('Credentials saved securely');

  // Start development
  const devResult = await context.devOps.startDev('new-shop', 'staging');
  if (!devResult.success) {
    console.error('Failed to start dev server:', devResult.error);
    return;
  }

  console.log('Development server started');
}

setupShop().catch(console.error);
```

## Error Handling

All operations use Result types for error handling. Never throws exceptions in normal operation:

```typescript
// Bad: Assuming success
const config = (await context.shopOps.loadConfig('shop-a')).data;

// Good: Check success first
const result = await context.shopOps.loadConfig('shop-a');
if (result.success) {
  const config = result.data;
  // Use config safely
} else {
  console.error('Error:', result.error);
}

// Better: Handle all cases
const result = await context.shopOps.loadConfig('shop-a');
if (!result.success) {
  throw new Error(`Failed to load config: ${result.error}`);
}
const config = result.data!;
```

## Testing

The functional design makes testing simple:

```typescript
import { describe, it, expect } from 'vitest';
import { createMultiShopCLI } from '@shopdevs/multi-shop-cli';

describe('Shop Operations', () => {
  it('should list shops', async () => {
    const context = createMultiShopCLI('./test-fixtures');
    const result = await context.shopOps.listShops();

    expect(result.success).toBe(true);
    expect(result.data).toContain('test-shop');
  });
});
```

## Best Practices

1. **Always check Result.success** before accessing data
2. **Use type guards** to validate shop IDs and domains
3. **Handle null credentials** gracefully (developer may not have set them up)
4. **Secure credentials** are stored with 600 permissions automatically
5. **Pure functions** make operations predictable and testable
6. **Dependency injection** keeps operations isolated and testable

## See Also

- [API Index](./index.md) - Main API overview
- [Validation API](./validation.md) - Input validation
- [Types Reference](./types.md) - Type definitions
- [Getting Started](../guides/getting-started.md) - CLI usage guide
