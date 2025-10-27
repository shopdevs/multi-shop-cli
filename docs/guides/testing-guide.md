# Testing Guide

Complete guide to testing ShopDevs Multi-Shop and themes using multi-shop workflows.

## Overview

ShopDevs Multi-Shop includes comprehensive test coverage across four categories:

1. **Unit Tests** - Individual function and module tests
2. **Integration Tests** - Complete workflow tests
3. **Security Tests** - Security validation and protection
4. **Performance Tests** - Performance benchmarks and monitoring

## Running Tests

### Quick Start

```bash
# Run all tests with coverage
pnpm test

# Watch mode (re-runs on changes)
pnpm run test:watch

# Beautiful UI (recommended for development)
pnpm run test:ui

# Integration tests only
pnpm run test:e2e

# Performance tests
pnpm run test:perf
```

### Coverage Reports

Tests generate coverage reports in `coverage/`:

```bash
# Run tests with coverage
pnpm test

# View coverage report
open coverage/index.html  # macOS
xdg-open coverage/index.html  # Linux
start coverage/index.html  # Windows
```

## Test Structure

### Directory Organization

```
src/__tests__/
├── unit/                           # Unit tests
│   ├── ShopConfigValidator.test.ts
│   ├── ShopError.test.ts
│   ├── shop-creation.test.ts
│   ├── shop-input.test.ts
│   ├── shop-editing.test.ts
│   ├── shop-setup.test.ts
│   ├── shop-sync.test.ts
│   ├── theme-linking.test.ts
│   ├── dev-operations.test.ts
│   ├── cli.test.ts
│   ├── logger.test.ts
│   └── version-check.test.ts
├── integration/                    # Integration tests
│   ├── shop-creation-workflow.test.ts
│   ├── cli-commands.test.ts
│   ├── init-workflow.test.ts
│   └── dev-workflow.test.ts
├── security/                       # Security tests
│   ├── path-traversal.test.ts
│   ├── credential-isolation.test.ts
│   └── input-sanitization.test.ts
├── e2e/                           # End-to-end tests
│   ├── initializer-workflow.test.ts
│   └── contextual-dev-workflow.test.ts
├── performance/                    # Performance tests
│   └── performance.test.ts
├── functional-operations.test.ts   # Functional patterns
├── validation.test.ts              # Validation logic
└── ShopManager.test.ts            # Legacy compatibility
```

## Unit Tests

Unit tests focus on individual functions and modules.

### Writing Unit Tests

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTempDir, cleanupTempDir } from './test-helpers';

describe('Shop Creation', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await createTempDir();
  });

  afterEach(async () => {
    await cleanupTempDir(testDir);
  });

  it('should create valid shop configuration', async () => {
    const config = {
      shopId: 'test-shop',
      name: 'Test Shop',
      shopify: {
        stores: {
          production: {
            domain: 'test-shop.myshopify.com',
            branch: 'test-shop/main'
          },
          staging: {
            domain: 'staging-test-shop.myshopify.com',
            branch: 'test-shop/staging'
          }
        },
        authentication: {
          method: 'theme-access-app' as const
        }
      }
    };

    const result = await saveShopConfig(testDir, config);
    expect(result.success).toBe(true);
  });

  it('should validate shop ID format', () => {
    expect(isValidShopId('shop-a')).toBe(true);
    expect(isValidShopId('SHOP')).toBe(false);
    expect(isValidShopId('-shop')).toBe(false);
  });
});
```

### Test Helpers

Use test helpers for common operations:

```typescript
// Create temporary test directory
const testDir = await createTempDir();

// Create test shop configuration
const config = createTestShopConfig('test-shop');

// Create test credentials
const credentials = createTestCredentials('test-user');

// Cleanup after tests
await cleanupTempDir(testDir);
```

### Running Unit Tests

```bash
# Run all unit tests
pnpm test src/__tests__/unit

# Run specific test file
pnpm test src/__tests__/unit/shop-creation.test.ts

# Watch mode
pnpm run test:watch src/__tests__/unit
```

## Integration Tests

Integration tests verify complete workflows.

### Shop Creation Workflow

```typescript
describe('Shop Creation Workflow', () => {
  it('should create shop end-to-end', async () => {
    const context = createMultiShopCLI(testDir);

    // Create shop
    const config = createTestShopConfig('new-shop');
    const saveResult = await context.shopOps.saveConfig('new-shop', config);
    expect(saveResult.success).toBe(true);

    // Verify saved
    const loadResult = await context.shopOps.loadConfig('new-shop');
    expect(loadResult.success).toBe(true);
    expect(loadResult.data?.shopId).toBe('new-shop');

    // List shops
    const listResult = await context.shopOps.listShops();
    expect(listResult.success).toBe(true);
    expect(listResult.data).toContain('new-shop');

    // Delete shop
    const deleteResult = await context.shopOps.deleteShop('new-shop');
    expect(deleteResult.success).toBe(true);
  });
});
```

### Development Workflow

```typescript
describe('Development Workflow', () => {
  it('should start dev server with credentials', async () => {
    const context = createMultiShopCLI(testDir);

    // Create shop and credentials
    await setupTestShop(context, 'test-shop');

    // Start development (mock Shopify CLI)
    const devResult = await context.devOps.startDev('test-shop', 'staging');
    expect(devResult.success).toBe(true);
  });
});
```

### Running Integration Tests

```bash
# Run all integration tests
pnpm test src/__tests__/integration

# Run specific workflow
pnpm test src/__tests__/integration/shop-creation-workflow.test.ts
```

## Security Tests

Security tests validate credential protection and input sanitization.

### Path Traversal Protection

```typescript
describe('Path Traversal Protection', () => {
  it('should reject path traversal attempts', async () => {
    const context = createMultiShopCLI(testDir);

    // Attempt path traversal
    const result = await context.shopOps.loadConfig('../../../etc/passwd');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid shop ID');
  });

  it('should reject absolute paths', async () => {
    const context = createMultiShopCLI(testDir);

    const result = await context.shopOps.loadConfig('/etc/passwd');
    expect(result.success).toBe(false);
  });
});
```

### Credential Isolation

```typescript
describe('Credential Isolation', () => {
  it('should store credentials with secure permissions', async () => {
    const context = createMultiShopCLI(testDir);
    const credentials = createTestCredentials('test-user');

    const result = await context.credOps.saveCredentials('test-shop', credentials);
    expect(result.success).toBe(true);

    // Check file permissions (Unix/Linux/macOS)
    if (process.platform !== 'win32') {
      const stats = await fs.stat(
        path.join(testDir, 'shops/credentials/test-shop.credentials.json')
      );
      expect(stats.mode & 0o777).toBe(0o600);  // Owner read/write only
    }
  });

  it('should not expose credentials in errors', async () => {
    const context = createMultiShopCLI(testDir);

    try {
      await context.credOps.loadCredentials('nonexistent');
    } catch (error) {
      expect(error.message).not.toContain('shptka_');
      expect(error.message).not.toContain('password');
    }
  });
});
```

### Input Sanitization

```typescript
describe('Input Sanitization', () => {
  it('should sanitize shop IDs', () => {
    expect(isValidShopId('shop-a')).toBe(true);
    expect(isValidShopId('<script>')).toBe(false);
    expect(isValidShopId('shop; rm -rf /')).toBe(false);
  });

  it('should sanitize domains', () => {
    expect(isValidDomain('shop.myshopify.com')).toBe(true);
    expect(isValidDomain('evil.com')).toBe(false);
    expect(isValidDomain('shop.myshopify.com; curl evil.com')).toBe(false);
  });
});
```

### Running Security Tests

```bash
# Run all security tests
pnpm test src/__tests__/security

# Run specific security test
pnpm test src/__tests__/security/path-traversal.test.ts
```

## Performance Tests

Performance tests ensure the CLI remains fast and efficient.

### Startup Time

```typescript
describe('Performance', () => {
  it('should start CLI quickly', async () => {
    const start = Date.now();
    const context = createMultiShopCLI(testDir);
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(100);  // < 100ms startup
  });
});
```

### Operation Performance

```typescript
describe('Operation Performance', () => {
  it('should list shops efficiently', async () => {
    const context = createMultiShopCLI(testDir);

    // Create 50 shops
    for (let i = 0; i < 50; i++) {
      await setupTestShop(context, `shop-${i}`);
    }

    // Measure list performance
    const start = Date.now();
    const result = await context.shopOps.listShops();
    const duration = Date.now() - start;

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(50);
    expect(duration).toBeLessThan(500);  // < 500ms for 50 shops
  });
});
```

### Running Performance Tests

```bash
# Run performance tests
pnpm run test:perf

# Benchmark startup time
pnpm run perf:startup

# Benchmark version command
pnpm run perf:version
```

## End-to-End Tests

E2E tests verify complete user workflows.

### Initializer Workflow

```typescript
describe('Initializer E2E', () => {
  it('should initialize project completely', async () => {
    const initializer = new Initializer(testDir);
    await initializer.initialize();

    // Verify directory structure
    expect(await fs.pathExists(path.join(testDir, 'shops'))).toBe(true);
    expect(await fs.pathExists(path.join(testDir, 'shops/credentials'))).toBe(true);

    // Verify gitignore
    const gitignore = await fs.readFile(
      path.join(testDir, '.gitignore'),
      'utf-8'
    );
    expect(gitignore).toContain('shops/credentials/');

    // Verify workflow
    expect(
      await fs.pathExists(
        path.join(testDir, '.github/workflows/shop-sync.yml')
      )
    ).toBe(true);
  });
});
```

### Running E2E Tests

```bash
# Run all E2E tests
pnpm run test:e2e

# Run specific E2E test
pnpm test src/__tests__/e2e/initializer-workflow.test.ts
```

## Testing Your Theme

### Contextual Testing

Test your theme changes across multiple shops:

```bash
# Create feature branch
git checkout -b feature/new-component

# Test in shop-a context
pnpm run dev
# → Select shop-a (staging)

# Test in shop-b context
pnpm run dev
# → Select shop-b (staging)

# Test in shop-c context
pnpm run dev
# → Select shop-c (staging)
```

### Visual Testing

Use Shopify preview URLs for visual testing:

```bash
# Start dev server
pnpm run dev

# You'll get preview URL:
# http://127.0.0.1:9292
# Preview: https://your-shop.myshopify.com/?preview_theme_id=123456789

# Test in browser:
# - Desktop viewport
# - Mobile viewport
# - Tablet viewport
# - Different page types
# - Cart and checkout flows
```

### Automated Theme Testing

Create automated tests for your theme:

```typescript
// test/theme/homepage.test.ts
import { describe, it, expect } from 'vitest';
import { chromium } from 'playwright';

describe('Homepage', () => {
  it('should load successfully', async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();

    await page.goto('http://127.0.0.1:9292');

    const title = await page.title();
    expect(title).toBeTruthy();

    await browser.close();
  });
});
```

## Test Coverage Requirements

Aim for these coverage targets:

- **Overall:** 80%+
- **Core Operations:** 90%+
- **Security:** 100%
- **Validation:** 100%

Check coverage:

```bash
pnpm test

# Coverage summary displayed:
# Statements   : 85%
# Branches     : 82%
# Functions    : 87%
# Lines        : 85%
```

## Continuous Integration

Tests run automatically in CI:

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20, 22]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
      - run: pnpm install
      - run: pnpm run validate
      - run: pnpm test
```

## Best Practices

1. **Write tests first** (TDD) for new features
2. **Use descriptive test names** that explain the scenario
3. **Isolate tests** with beforeEach/afterEach cleanup
4. **Mock external dependencies** (Shopify CLI, GitHub API)
5. **Test error cases** as thoroughly as success cases
6. **Keep tests fast** (< 1s per test ideally)
7. **Use test helpers** to reduce duplication
8. **Test across platforms** (Windows, macOS, Linux)

## Debugging Tests

### Debug Mode

Run tests with debugging enabled:

```bash
# Node.js debugging
node --inspect node_modules/vitest/vitest.js run

# VSCode debugging
# Add to .vscode/launch.json:
{
  "type": "node",
  "request": "launch",
  "name": "Debug Tests",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["test"],
  "console": "integratedTerminal"
}
```

### Verbose Output

Enable verbose test output:

```bash
# Verbose mode
pnpm test -- --reporter=verbose

# Debug logging
DEBUG=multi-shop:* pnpm test
```

## Writing Custom Tests

### Test Helpers

Create test helpers for common patterns:

```typescript
// test/helpers.ts
export async function createTestShop(
  context: CLIContext,
  shopId: string
): Promise<void> {
  const config = {
    shopId,
    name: `Test ${shopId}`,
    shopify: {
      stores: {
        production: {
          domain: `${shopId}.myshopify.com`,
          branch: `${shopId}/main`
        },
        staging: {
          domain: `staging-${shopId}.myshopify.com`,
          branch: `${shopId}/staging`
        }
      },
      authentication: { method: 'theme-access-app' as const }
    }
  };

  await context.shopOps.saveConfig(shopId, config);
}
```

### Custom Matchers

Create custom matchers for domain-specific assertions:

```typescript
// test/matchers.ts
expect.extend({
  toBeValidShopId(received: string) {
    const pass = isValidShopId(received);
    return {
      pass,
      message: () =>
        pass
          ? `Expected ${received} not to be valid shop ID`
          : `Expected ${received} to be valid shop ID`
    };
  }
});

// Usage
expect('shop-a').toBeValidShopId();
expect('SHOP').not.toBeValidShopId();
```

## See Also

- [Security Guide](./security-guide.md) - Security best practices
- [Performance Guide](./performance.md) - Performance optimization
- [API Documentation](../api/index.md) - API reference
- [Troubleshooting](./troubleshooting.md) - Debug common issues
