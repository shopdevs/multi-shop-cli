# Performance Guide

Complete guide to CLI tool performance optimization, benchmarks, and monitoring.

## Overview

This guide covers the **performance of the multi-shop CLI tool itself** - how fast commands execute, memory usage, and startup time. This ensures the tool doesn't slow down your development workflow.

**What this guide covers:**
- ✅ CLI command execution speed
- ✅ File operation performance
- ✅ Memory usage optimization
- ✅ CLI startup time

**What this guide does NOT cover:**
- ❌ Shopify theme performance (page speed, Lighthouse scores)
- ❌ Storefront rendering performance
- ❌ Theme JavaScript/CSS optimization

For theme performance optimization, see [Shopify's Theme Performance Guide](https://shopify.dev/docs/storefronts/themes/best-practices/performance).

---

ShopDevs Multi-Shop is designed for fast CLI performance with minimal overhead.

## Performance Budgets

### CLI Startup Time

**Target:** < 100ms from command to execution

```bash
# Measure startup time
pnpm run perf:startup

# Example output:
# Startup time: 85 ms
```

**Factors:**
- Module loading time
- File system initialization
- Configuration parsing

### Command Execution

**Targets by command:**

| Command | Target | Description |
|---------|--------|-------------|
| `--version` | < 50ms | Version display |
| `--help` | < 100ms | Help text display |
| `list shops` | < 200ms | List all shops |
| `dev` | < 500ms | Start dev server |
| `create shop` | < 1s | Interactive shop creation |

### File Operations

**Targets:**

| Operation | Target | Description |
|-----------|--------|-------------|
| Read config | < 10ms | Single shop config |
| Write config | < 20ms | Single shop config |
| List shops | < 50ms per 10 shops | Scale linearly |
| Read credentials | < 10ms | Single credential file |

### Memory Usage

**Targets:**

| Scenario | Target | Description |
|----------|--------|-------------|
| CLI idle | < 50MB | After startup |
| Dev server | < 100MB | During development |
| List 50 shops | < 75MB | Listing operations |

## Measuring Performance

### Startup Performance

Measure CLI startup time:

```bash
# Basic measurement
pnpm run perf:startup

# Detailed measurement with Node profiling
node --prof dist/bin/multi-shop.js --version
node --prof-process isolate-*.log > profile.txt
```

### Command Performance

Measure individual commands:

```bash
# Version command
pnpm run perf:version

# Time any command
time npx multi-shop --help
time npx multi-shop
```

### Memory Profiling

Profile memory usage:

```bash
# Run with memory profiling
node --inspect dist/bin/multi-shop.js

# In Chrome DevTools:
# 1. Open chrome://inspect
# 2. Click "inspect" on the Node process
# 3. Go to Memory tab
# 4. Take heap snapshot
```

### Performance Tests

Run automated performance tests:

```bash
# Run performance test suite
pnpm run test:perf

# Example output:
# ✓ CLI startup < 100ms (85ms)
# ✓ Load 50 shop configs < 500ms (342ms)
# ✓ List shops < 50ms (28ms)
# ✓ Memory usage < 100MB (67MB)
```

## Performance Test Suite

### Startup Performance Test

```typescript
import { describe, it, expect } from 'vitest';
import { createMultiShopCLI } from '@shopdevs/multi-shop-cli';

describe('Performance: Startup', () => {
  it('should start CLI in < 100ms', () => {
    const start = Date.now();
    const context = createMultiShopCLI();
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(100);
  });
});
```

### Operation Performance Test

```typescript
describe('Performance: Operations', () => {
  it('should list 50 shops in < 500ms', async () => {
    const context = createMultiShopCLI(testDir);

    // Create 50 test shops
    for (let i = 0; i < 50; i++) {
      await createTestShop(context, `shop-${i}`);
    }

    // Measure list performance
    const start = Date.now();
    const result = await context.shopOps.listShops();
    const duration = Date.now() - start;

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(50);
    expect(duration).toBeLessThan(500);
  });

  it('should load config in < 10ms', async () => {
    const context = createMultiShopCLI(testDir);
    await createTestShop(context, 'test-shop');

    const start = Date.now();
    const result = await context.shopOps.loadConfig('test-shop');
    const duration = Date.now() - start;

    expect(result.success).toBe(true);
    expect(duration).toBeLessThan(10);
  });
});
```

### Memory Performance Test

```typescript
describe('Performance: Memory', () => {
  it('should use < 100MB memory', async () => {
    const context = createMultiShopCLI(testDir);

    // Create 50 shops
    for (let i = 0; i < 50; i++) {
      await createTestShop(context, `shop-${i}`);
    }

    // Load all shops
    await context.shopOps.listShops();

    // Check memory usage
    const usage = process.memoryUsage();
    const heapUsedMB = usage.heapUsed / 1024 / 1024;

    expect(heapUsedMB).toBeLessThan(100);
  });
});
```

## Optimization Techniques

### 1. Lazy Loading

Load modules only when needed:

```typescript
// Good: Lazy import
async function runDev() {
  const { startDevelopment } = await import('./dev-operations.js');
  return startDevelopment();
}

// Avoid: Eager import
import { startDevelopment } from './dev-operations.js';
```

### 2. Efficient File Operations

Use streaming for large files:

```typescript
// Good: Streaming for large operations
import { createReadStream } from 'fs';

const stream = createReadStream('large-file.json');
// Process in chunks

// Avoid: Loading entire file
const data = await fs.readFile('large-file.json', 'utf-8');
```

### 3. Caching

Cache frequently accessed data:

```typescript
// Good: Cache shop list
class ShopCache {
  private cache: string[] | null = null;

  async listShops(): Promise<string[]> {
    if (this.cache) return this.cache;

    const shops = await readShopDir();
    this.cache = shops;
    return shops;
  }

  invalidate(): void {
    this.cache = null;
  }
}
```

### 4. Parallel Operations

Use parallelism where appropriate:

```typescript
// Good: Parallel loading
const results = await Promise.all([
  loadConfig('shop-a'),
  loadConfig('shop-b'),
  loadConfig('shop-c')
]);

// Avoid: Sequential loading
const resultA = await loadConfig('shop-a');
const resultB = await loadConfig('shop-b');
const resultC = await loadConfig('shop-c');
```

### 5. Minimize Dependencies

Keep dependency tree small:

```bash
# Check dependency size
pnpm run size-check

# Analyze bundle
npx vite-bundle-visualizer
```

## Performance Monitoring

### Built-in Monitoring

Monitor operations during development:

```typescript
import { createMultiShopCLI } from '@shopdevs/multi-shop-cli';

const context = createMultiShopCLI();

// Start operation monitoring
const start = Date.now();

// Perform operation
await context.shopOps.listShops();

// Log duration
const duration = Date.now() - start;
console.log(`Operation took ${duration}ms`);
```

### Performance Metrics

Track key metrics:

```typescript
interface PerformanceMetrics {
  operationName: string;
  startTime: number;
  endTime: number;
  duration: number;
  memoryUsed: number;
  success: boolean;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];

  startOperation(name: string): string {
    const id = `${name}-${Date.now()}`;
    this.metrics.push({
      operationName: name,
      startTime: Date.now(),
      endTime: 0,
      duration: 0,
      memoryUsed: process.memoryUsage().heapUsed,
      success: false
    });
    return id;
  }

  endOperation(id: string, success: boolean): void {
    const metric = this.metrics.find(m => m.operationName === id);
    if (metric) {
      metric.endTime = Date.now();
      metric.duration = metric.endTime - metric.startTime;
      metric.success = success;
    }
  }

  getMetrics(): PerformanceMetrics[] {
    return this.metrics;
  }

  getSummary(): {
    totalOperations: number;
    averageDuration: number;
    slowestOperation: PerformanceMetrics | null;
  } {
    return {
      totalOperations: this.metrics.length,
      averageDuration:
        this.metrics.reduce((sum, m) => sum + m.duration, 0) / this.metrics.length,
      slowestOperation: this.metrics.reduce(
        (slowest, m) => (m.duration > (slowest?.duration || 0) ? m : slowest),
        null as PerformanceMetrics | null
      )
    };
  }
}
```

## Scalability

### Shop Limits

Performance characteristics by shop count:

| Shops | List Time | Memory | Notes |
|-------|-----------|--------|-------|
| 1-10 | < 50ms | < 60MB | Optimal |
| 11-25 | < 100ms | < 70MB | Good |
| 26-50 | < 200ms | < 85MB | Acceptable |
| 51-100 | < 500ms | < 100MB | Workable |
| 100+ | Variable | Variable | Consider optimization |

### Large Shop Setups

For teams with many shops (50+):

**1. Use Shop Groups:**
```
shops/
├── active/
│   ├── shop-a.config.json
│   └── shop-b.config.json
├── archived/
│   └── old-shop.config.json
└── credentials/
```

**2. Implement Filtering:**
```bash
# List only active shops
ls shops/active/*.config.json
```

**3. Lazy Load Configurations:**
```typescript
// Only load configs when needed
async function loadShopWhenNeeded(shopId: string) {
  if (!cache.has(shopId)) {
    const config = await loadConfig(shopId);
    cache.set(shopId, config);
  }
  return cache.get(shopId);
}
```

## Optimization Checklist

Use this checklist to optimize performance:

**Code Optimization:**
- [ ] Lazy load modules
- [ ] Use efficient file operations
- [ ] Implement caching where appropriate
- [ ] Use parallel operations
- [ ] Minimize dependencies

**Testing:**
- [ ] Run performance tests
- [ ] Profile startup time
- [ ] Profile memory usage
- [ ] Test with realistic shop counts
- [ ] Benchmark against targets

**Monitoring:**
- [ ] Track operation durations
- [ ] Monitor memory usage
- [ ] Log slow operations
- [ ] Set up performance alerts

## Performance Tips

### For Developers

1. **Use staging for testing** - Staging environments typically faster
2. **Close unused dev servers** - Free up resources
3. **Limit concurrent operations** - Don't run multiple dev servers simultaneously
4. **Use fast storage** - SSD recommended for shops/ directory
5. **Keep shops/ clean** - Archive old shops

### For Teams

1. **Archive unused shops** - Move to separate directory
2. **Use shop groups** - Organize by status (active/staging/archived)
3. **Document shop lifecycle** - Clear creation and archival process
4. **Regular cleanup** - Remove unused shops monthly
5. **Monitor performance** - Track metrics over time

### For CI/CD

1. **Cache dependencies** - Use npm/pnpm cache
2. **Parallelize tests** - Run tests in parallel where possible
3. **Use matrix testing** - Test across Node versions efficiently
4. **Optimize Docker images** - Use multi-stage builds
5. **Monitor build times** - Track and optimize slow builds

## Troubleshooting Performance

### Slow Startup

**Symptoms:**
- CLI takes > 200ms to start
- `--version` command slow

**Solutions:**
```bash
# Profile startup
node --prof dist/bin/multi-shop.js --version
node --prof-process isolate-*.log

# Check dependency size
npm ls --depth=0

# Update dependencies
npm update
```

### Slow Operations

**Symptoms:**
- Listing shops takes > 500ms
- Loading configs slow

**Solutions:**
```bash
# Check shop count
ls shops/*.config.json | wc -l

# Archive old shops
mkdir shops/archived
mv shops/old-*.config.json shops/archived/

# Clear cache
rm -rf node_modules/.cache
```

### High Memory Usage

**Symptoms:**
- Memory usage > 200MB
- Out of memory errors

**Solutions:**
```bash
# Profile memory
node --inspect dist/bin/multi-shop.js

# Check for memory leaks
node --trace-gc dist/bin/multi-shop.js

# Reduce concurrent operations
# Run one dev server at a time
```

## Benchmarking

### Running Benchmarks

Create custom benchmarks:

```typescript
import Benchmark from 'benchmark';
import { createMultiShopCLI } from '@shopdevs/multi-shop-cli';

const suite = new Benchmark.Suite();

suite
  .add('loadConfig', async () => {
    const context = createMultiShopCLI();
    await context.shopOps.loadConfig('test-shop');
  })
  .add('listShops', async () => {
    const context = createMultiShopCLI();
    await context.shopOps.listShops();
  })
  .on('cycle', (event: any) => {
    console.log(String(event.target));
  })
  .on('complete', function() {
    console.log('Fastest is ' + this.filter('fastest').map('name'));
  })
  .run({ async: true });
```

## See Also

- [Testing Guide](./testing-guide.md) - Performance testing
- [Security Guide](./security-guide.md) - Security without performance trade-offs
- [API Documentation](../api/index.md) - API performance characteristics
- [Troubleshooting](./troubleshooting.md) - Performance issues
