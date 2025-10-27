# Types Reference

Complete TypeScript type definitions for ShopDevs Multi-Shop CLI.

## Overview

All types are exported from the main package and available for import:

```typescript
import type {
  ShopConfig,
  ShopCredentials,
  Environment,
  ShopManagerOptions,
  // ... more types
} from '@shopdevs/multi-shop-cli';
```

## Core Types

### ShopConfig

Complete shop configuration (stored in `shops/*.config.json`).

```typescript
interface ShopConfig {
  readonly shopId: string;
  readonly name: string;
  readonly shopify: ShopifyConfig;
  readonly metadata?: ShopMetadata;
}
```

**Properties:**
- `shopId` - Unique shop identifier (e.g., 'shop-a')
- `name` - Human-readable shop name (e.g., 'Fitness Store')
- `shopify` - Shopify-specific configuration
- `metadata` (optional) - Additional metadata

**Example:**
```typescript
const config: ShopConfig = {
  shopId: 'fitness-store',
  name: 'Fitness Store',
  shopify: {
    stores: {
      production: {
        domain: 'fitness-store.myshopify.com',
        branch: 'fitness-store/main'
      },
      staging: {
        domain: 'staging-fitness.myshopify.com',
        branch: 'fitness-store/staging'
      }
    },
    authentication: {
      method: 'theme-access-app'
    }
  },
  metadata: {
    description: 'Fitness and wellness products',
    tags: ['fitness', 'health'],
    created: '2024-01-15'
  }
};
```

### ShopifyConfig

Shopify-specific configuration within ShopConfig.

```typescript
interface ShopifyConfig {
  readonly stores: {
    readonly production: ShopifyStore;
    readonly staging: ShopifyStore;
  };
  readonly authentication: AuthenticationConfig;
}
```

**Properties:**
- `stores` - Production and staging store configurations
- `authentication` - Authentication method configuration

### ShopifyStore

Individual store (production or staging) configuration.

```typescript
interface ShopifyStore {
  readonly domain: string;
  readonly branch: string;
  readonly themeId?: string;
}
```

**Properties:**
- `domain` - Shopify store domain (e.g., 'shop-a.myshopify.com')
- `branch` - Git branch name (e.g., 'shop-a/main')
- `themeId` (optional) - Theme ID if known

**Example:**
```typescript
const store: ShopifyStore = {
  domain: 'fitness-store.myshopify.com',
  branch: 'fitness-store/main',
  themeId: '123456789'
};
```

### AuthenticationConfig

Authentication method configuration.

```typescript
interface AuthenticationConfig {
  readonly method: AuthenticationMethod;
  readonly notes?: AuthenticationNotes;
}
```

**Properties:**
- `method` - Authentication method to use
- `notes` (optional) - Additional authentication notes

### AuthenticationMethod

Valid authentication methods.

```typescript
type AuthenticationMethod = 'theme-access-app' | 'manual-tokens';
```

**Values:**
- `'theme-access-app'` - Use Shopify Theme Access app (recommended)
- `'manual-tokens'` - Use manually generated theme tokens

**Example:**
```typescript
const auth: AuthenticationConfig = {
  method: 'theme-access-app',
  notes: {
    themeAccessApp: 'Installed in all shops'
  }
};
```

### AuthenticationNotes

Optional notes about authentication setup.

```typescript
interface AuthenticationNotes {
  readonly themeId?: string;
  readonly themeAccessApp?: string;
  readonly manualTokens?: string;
  readonly credentials?: string;
}
```

### ShopMetadata

Optional metadata about a shop.

```typescript
interface ShopMetadata {
  readonly description?: string;
  readonly tags?: readonly string[];
  readonly created?: string;
  readonly lastModified?: string;
}
```

**Example:**
```typescript
const metadata: ShopMetadata = {
  description: 'Fitness and wellness products',
  tags: ['fitness', 'health', 'wellness'],
  created: '2024-01-15',
  lastModified: '2024-03-20'
};
```

## Credential Types

### ShopCredentials

Developer-specific credentials (stored in `shops/credentials/*.credentials.json`).

```typescript
interface ShopCredentials {
  readonly developer: string;
  readonly shopify: ShopifyCredentials;
  readonly notes?: string;
  readonly _metadata?: CredentialMetadata;
}
```

**Properties:**
- `developer` - Developer name (e.g., 'john-doe')
- `shopify` - Shopify credentials
- `notes` (optional) - Additional notes
- `_metadata` (optional) - Internal metadata (auto-generated)

**Security:** Files stored with 600 permissions (owner read/write only).

**Example:**
```typescript
const credentials: ShopCredentials = {
  developer: 'john-doe',
  shopify: {
    stores: {
      production: {
        themeToken: 'shptka_1234567890abcdef'
      },
      staging: {
        themeToken: 'tkat_abc123xyz789'
      }
    }
  },
  notes: 'Theme access app credentials for fitness-store'
};
```

### ShopifyCredentials

Shopify-specific credentials.

```typescript
interface ShopifyCredentials {
  readonly stores: {
    readonly production: StoreCredentials;
    readonly staging: StoreCredentials;
  };
}
```

### StoreCredentials

Credentials for a single store.

```typescript
interface StoreCredentials {
  readonly themeToken: string;
}
```

**Properties:**
- `themeToken` - Theme access token or password

### CredentialMetadata

Internal metadata for credential files (auto-generated).

```typescript
interface CredentialMetadata {
  readonly created: string;
  readonly version: string;
  readonly checksum: string;
}
```

**Properties:**
- `created` - ISO timestamp when created
- `version` - Credential format version
- `checksum` - SHA-256 checksum for integrity

## Environment Types

### Environment

Target environment for operations.

```typescript
type Environment = 'production' | 'staging';
```

**Values:**
- `'production'` - Live production store
- `'staging'` - Staging/preview store

**Usage:**
```typescript
function startDev(shopId: string, env: Environment) {
  console.log(`Starting ${env} environment for ${shopId}`);
}

startDev('shop-a', 'staging');
```

## CLI Types

### CLIOptions

Options for CLI commands.

```typescript
interface CLIOptions {
  readonly verbose?: boolean;
  readonly debug?: boolean;
  readonly dryRun?: boolean;
  readonly force?: boolean;
}
```

**Properties:**
- `verbose` (optional) - Verbose output
- `debug` (optional) - Debug logging
- `dryRun` (optional) - Dry run mode (no changes)
- `force` (optional) - Force operation

**Example:**
```typescript
const options: CLIOptions = {
  verbose: true,
  debug: false,
  dryRun: false,
  force: false
};
```

### ShopManagerOptions

Options for creating a ShopManager instance.

```typescript
interface ShopManagerOptions {
  readonly cwd?: string;
  readonly logger?: Logger;
  readonly performanceMonitor?: PerformanceMonitor;
}
```

**Properties:**
- `cwd` (optional) - Working directory (defaults to `process.cwd()`)
- `logger` (optional) - Custom logger instance
- `performanceMonitor` (optional) - Performance monitoring

## Security Types

### SecurityAuditReport

Security audit report structure.

```typescript
interface SecurityAuditReport {
  readonly timestamp: string;
  readonly shops: readonly ShopSecurityAudit[];
  readonly issues: readonly SecurityIssue[];
  readonly recommendations: readonly string[];
}
```

**Properties:**
- `timestamp` - ISO timestamp of audit
- `shops` - Per-shop audit results
- `issues` - Security issues found
- `recommendations` - Recommendations for remediation

**Example:**
```typescript
const report: SecurityAuditReport = {
  timestamp: '2024-03-20T10:30:00Z',
  shops: [
    {
      shopId: 'shop-a',
      filePermissions: '600',
      lastModified: '2024-03-15',
      hasProduction: true,
      hasStaging: true,
      integrityValid: true
    }
  ],
  issues: [],
  recommendations: ['All credentials secure']
};
```

### ShopSecurityAudit

Security audit for a single shop.

```typescript
interface ShopSecurityAudit {
  readonly shopId: string;
  readonly filePermissions: string;
  readonly lastModified: string;
  readonly hasProduction: boolean;
  readonly hasStaging: boolean;
  readonly integrityValid: boolean;
}
```

### SecurityIssue

Individual security issue found during audit.

```typescript
interface SecurityIssue {
  readonly level: 'error' | 'warning' | 'info';
  readonly shopId?: string;
  readonly message: string;
  readonly recommendation: string;
}
```

**Properties:**
- `level` - Issue severity
- `shopId` (optional) - Affected shop (if specific)
- `message` - Issue description
- `recommendation` - How to fix the issue

**Example:**
```typescript
const issue: SecurityIssue = {
  level: 'warning',
  shopId: 'shop-a',
  message: 'Credential file has loose permissions (644)',
  recommendation: 'Run: chmod 600 shops/credentials/shop-a.credentials.json'
};
```

## Utility Types

### Logger

Logger interface for custom logging.

```typescript
interface Logger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
  flush(): Promise<void>;
  startOperation(
    name: string,
    context?: Record<string, unknown>
  ): (result: string, meta?: Record<string, unknown>) => void;
}
```

**Usage:**
```typescript
const logger: Logger = {
  debug: (msg, meta) => console.debug(msg, meta),
  info: (msg, meta) => console.info(msg, meta),
  warn: (msg, meta) => console.warn(msg, meta),
  error: (msg, meta) => console.error(msg, meta),
  flush: async () => {},
  startOperation: (name, context) => {
    const start = Date.now();
    return (result, meta) => {
      console.log(`${name}: ${result} (${Date.now() - start}ms)`, meta);
    };
  }
};
```

### PerformanceMonitor

Performance monitoring interface.

```typescript
interface PerformanceMonitor {
  startOperation(name: string, context?: Record<string, unknown>): string;
  endOperation(operationId: string, result?: unknown, error?: Error): void;
  getPerformanceSummary(): {
    uptime: number;
    memoryUsage: NodeJS.MemoryUsage;
    activeOperations: number;
    recentOperations: number;
    averageDuration: number;
  };
  cleanup(): Promise<void>;
}
```

## Result Pattern

### Result<T>

Generic result type for safe error handling.

```typescript
interface Result<T> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: string;
}
```

**Usage Pattern:**
```typescript
// Function that returns Result
function loadShop(shopId: string): Result<ShopConfig> {
  try {
    const config = loadFromFile(shopId);
    return { success: true, data: config };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Using Result
const result = loadShop('shop-a');
if (result.success) {
  console.log('Config:', result.data);
} else {
  console.error('Error:', result.error);
}
```

## Type Guards

Type guards are functions that perform runtime type checking:

```typescript
import {
  isValidShopId,
  isValidDomain,
  isValidBranchName,
  isValidThemeToken
} from '@shopdevs/multi-shop-cli';

// These are covered in detail in validation.md
```

See [Validation API](./validation.md) for complete type guard documentation.

## Complete Example

Here's a complete example using multiple types:

```typescript
import type {
  ShopConfig,
  ShopCredentials,
  Environment,
  Result,
  CLIOptions,
  SecurityAuditReport
} from '@shopdevs/multi-shop-cli';
import { createMultiShopCLI } from '@shopdevs/multi-shop-cli';

async function setupAndAudit(options: CLIOptions) {
  // Create context
  const context = createMultiShopCLI();

  // Create shop config
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

  // Save config
  const saveResult: Result<void> = await context.shopOps.saveConfig(
    'new-shop',
    config
  );

  if (!saveResult.success) {
    console.error('Failed to save:', saveResult.error);
    return;
  }

  // Create credentials
  const credentials: ShopCredentials = {
    developer: 'john-doe',
    shopify: {
      stores: {
        production: { themeToken: 'shptka_prod' },
        staging: { themeToken: 'shptka_staging' }
      }
    }
  };

  // Save credentials
  await context.credOps.saveCredentials('new-shop', credentials);

  // Start development
  const env: Environment = 'staging';
  await context.devOps.startDev('new-shop', env);

  if (options.verbose) {
    console.log('Setup complete');
  }
}

setupAndAudit({ verbose: true, debug: false });
```

## Type Safety Best Practices

1. **Use readonly** for immutable data structures
2. **Prefer interfaces** over types for extensibility
3. **Use type guards** for runtime validation
4. **Leverage Result<T>** for error handling
5. **Use discriminated unions** for state management
6. **Make optional properties explicit** with `?`
7. **Use const assertions** for literal types

## See Also

- [API Index](./index.md) - Main API overview
- [Shop Manager API](./shop-manager.md) - Operations API
- [Validation API](./validation.md) - Validation and type guards
- [Getting Started](../guides/getting-started.md) - Usage guide
