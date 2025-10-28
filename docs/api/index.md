# API Reference

Complete API documentation for ShopDevs Multi-Shop CLI.

## Overview

ShopDevs Multi-Shop provides both a CLI tool and a programmatic API for managing multi-shop Shopify themes. This reference covers the programmatic API that can be imported and used in Node.js applications.

## Main Exports

The package exports two primary functions for programmatic usage:

```typescript
import { createMultiShopCLI, runMultiShopManager } from '@shopdevs/multi-shop-cli';
```

### Quick Reference

| Export | Type | Description |
|--------|------|-------------|
| `createMultiShopCLI` | Function | Creates CLI context with operations |
| `runMultiShopManager` | Function | Runs interactive CLI manager |
| `createNewShop` | Function | Creates a new shop programmatically |
| `startDevelopmentWorkflow` | Function | Starts dev server for a shop |
| `ContextualDev` | Class | Branch detection and routing |
| `Initializer` | Class | Project initialization |
| Error Classes | Classes | Custom error hierarchy |
| Type Definitions | Types | TypeScript interfaces and types |
| Validation Functions | Functions | Type guards and validators |

## Core Functions

### createMultiShopCLI

Creates a CLI context with all operations available.

```typescript
function createMultiShopCLI(cwd?: string): CLIContext
```

**Parameters:**
- `cwd` (optional) - Working directory path (defaults to `process.cwd()`)

**Returns:** `CLIContext` object with:
- `deps` - Dependencies (cwd, shopsDir, credentialsDir)
- `shopOps` - Shop operations (load, save, list, delete)
- `credOps` - Credential operations (load, save)
- `devOps` - Development operations (startDev)

**Example:**
```typescript
import { createMultiShopCLI } from '@shopdevs/multi-shop-cli';

const context = createMultiShopCLI('/path/to/theme');

// Use operations
const result = await context.shopOps.listShops();
if (result.success) {
  console.log('Shops:', result.data);
}
```

### runMultiShopManager

Runs the interactive CLI manager.

```typescript
async function runMultiShopManager(cwd?: string): Promise<void>
```

**Parameters:**
- `cwd` (optional) - Working directory path (defaults to `process.cwd()`)

**Returns:** Promise that resolves when CLI exits

**Example:**
```typescript
import { runMultiShopManager } from '@shopdevs/multi-shop-cli';

// Run interactive manager
await runMultiShopManager('/path/to/theme');
```

### createNewShop

Creates a new shop configuration programmatically.

```typescript
async function createNewShop(context: CLIContext): Promise<void>
```

**Parameters:**
- `context` - CLI context from `createMultiShopCLI()`

**Example:**
```typescript
import { createMultiShopCLI, createNewShop } from '@shopdevs/multi-shop-cli';

const context = createMultiShopCLI();
await createNewShop(context);
```

### startDevelopmentWorkflow

Starts the development workflow (contextual dev).

```typescript
async function startDevelopmentWorkflow(context: CLIContext): Promise<void>
```

**Parameters:**
- `context` - CLI context from `createMultiShopCLI()`

**Example:**
```typescript
import { createMultiShopCLI, startDevelopmentWorkflow } from '@shopdevs/multi-shop-cli';

const context = createMultiShopCLI();
await startDevelopmentWorkflow(context);
```

## Classes

### ContextualDev

Handles branch detection and contextual routing.

```typescript
import { ContextualDev } from '@shopdevs/multi-shop-cli';

const contextualDev = new ContextualDev(process.cwd());
await contextualDev.start();
```

See [Shop Manager API](./shop-manager.md) for detailed usage.

### Initializer

Handles project initialization.

```typescript
import { Initializer } from '@shopdevs/multi-shop-cli';

const initializer = new Initializer(process.cwd());
await initializer.initialize();
```

## Error Handling

All errors extend the base `ShopError` class:

```typescript
import {
  ShopError,
  ShopConfigurationError,
  ShopValidationError,
  ShopCredentialError,
  ShopBranchError,
  ShopCommandError,
  ShopNetworkError
} from '@shopdevs/multi-shop-cli';

try {
  await context.shopOps.loadConfig('shop-a');
} catch (error) {
  if (error instanceof ShopConfigurationError) {
    console.error('Configuration error:', error.message);
  } else if (error instanceof ShopValidationError) {
    console.error('Validation error:', error.message);
  }
}
```

## Type Definitions

See [Types Reference](./types.md) for complete type definitions.

## Validation

See [Validation Reference](./validation.md) for validation rules and type guards.

## Links

- [Shop Manager API](./shop-manager.md) - Detailed operations API
- [Validation API](./validation.md) - Validation rules and type guards
- [Types Reference](./types.md) - TypeScript type definitions
- [CLI Documentation](../guides/getting-started.md) - CLI usage guide

## Package Metadata

```typescript
import { VERSION, PACKAGE_NAME } from '@shopdevs/multi-shop-cli';

console.log(`${PACKAGE_NAME} v${VERSION}`);
```

## Best Practices

1. **Always use Result types** - Check `result.success` before accessing `result.data`
2. **Handle errors properly** - Use specific error classes for different scenarios
3. **Use type guards** - Validate input with provided type guard functions
4. **Clean up resources** - Ensure proper cleanup in error scenarios
5. **Use dependency injection** - Pass `CLIContext` to maintain testability

## Next Steps

- Read [Shop Manager API](./shop-manager.md) for detailed operations
- Check [Validation API](./validation.md) for input validation
- See [Types Reference](./types.md) for all TypeScript types
- Follow [Getting Started Guide](../guides/getting-started.md) for CLI usage
