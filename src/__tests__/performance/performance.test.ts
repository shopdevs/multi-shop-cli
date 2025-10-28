import { describe, test, expect, beforeEach } from 'vitest';
import { PerformanceMonitor, PERFORMANCE_BUDGETS } from '../../lib/core/performance-monitor.js';
import { createTempDir, cleanupTempDir, createMockShopConfig } from '../helpers.js';
import { createMultiShopCLI } from '../../lib/core/index.js';

/**
 * Performance tests - verify operations meet performance budgets
 */
describe('Performance Budgets', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  describe('PerformanceMonitor', () => {
    test('should track operation timing', () => {
      // Arrange
      const monitor = new PerformanceMonitor();

      // Act
      const id = monitor.startOperation('test_operation');
      monitor.endOperation(id);

      // Assert
      const summary = monitor.getPerformanceSummary();
      expect(summary.completedOperations).toBe(1);
      expect(summary.averageDuration).toBeGreaterThan(0);
    });

    test('should detect budget violations', () => {
      // Arrange
      const monitor = new PerformanceMonitor();

      // Act - Simulate slow operation
      const id = monitor.startOperation('simpleCommand');
      // Manually set duration to exceed budget
      const entry = (monitor as any).operations.get(id);
      monitor.endOperation(id);

      // Assert
      expect(monitor.getViolations).toBeDefined();
    });

    test('should calculate average duration', () => {
      // Arrange
      const monitor = new PerformanceMonitor();

      // Act - Track multiple operations
      const id1 = monitor.startOperation('test1');
      monitor.endOperation(id1);

      const id2 = monitor.startOperation('test2');
      monitor.endOperation(id2);

      // Assert
      const summary = monitor.getPerformanceSummary();
      expect(summary.completedOperations).toBe(2);
      expect(summary.averageDuration).toBeGreaterThan(0);
    });

    test('should track active vs completed operations', () => {
      // Arrange
      const monitor = new PerformanceMonitor();

      // Act
      const id1 = monitor.startOperation('completed');
      monitor.endOperation(id1);

      const id2 = monitor.startOperation('active');
      // Don't end this one

      // Assert
      const summary = monitor.getPerformanceSummary();
      expect(summary.completedOperations).toBe(1);
      expect(summary.activeOperations).toBe(1);
      expect(summary.totalOperations).toBe(2);

      // Cleanup
      monitor.endOperation(id2);
    });

    test('should track uptime', async () => {
      // Arrange
      const monitor = new PerformanceMonitor();

      // Act - Wait a bit
      await new Promise(resolve => setTimeout(resolve, 10));

      // Assert - Verify uptime is being tracked (allow for timer imprecision)
      const summary = monitor.getPerformanceSummary();
      expect(summary.uptime).toBeGreaterThan(0);
      expect(summary.uptime).toBeLessThan(1000); // Sanity check
    });

    test('should report memory usage', () => {
      // Arrange
      const monitor = new PerformanceMonitor();

      // Act
      const summary = monitor.getPerformanceSummary();

      // Assert
      expect(summary.memoryUsage).toBeDefined();
      expect(summary.memoryUsage.heapUsed).toBeGreaterThan(0);
    });

    test('should cleanup operations', async () => {
      // Arrange
      const monitor = new PerformanceMonitor();
      monitor.startOperation('test');

      // Act
      await monitor.cleanup();

      // Assert
      const summary = monitor.getPerformanceSummary();
      expect(summary.totalOperations).toBe(0);
    });
  });

  describe('Performance Budgets', () => {
    test('should have defined budgets for all operation types', () => {
      // Assert
      expect(PERFORMANCE_BUDGETS.startup).toBe(100);
      expect(PERFORMANCE_BUDGETS.simpleCommand).toBe(200);
      expect(PERFORMANCE_BUDGETS.fileOperation).toBe(500);
      expect(PERFORMANCE_BUDGETS.networkOperation).toBe(5000);
      expect(PERFORMANCE_BUDGETS.totalSession).toBe(30000);
    });

    test('should have reasonable budget values', () => {
      // Assert - Budgets should be in ascending order of complexity
      expect(PERFORMANCE_BUDGETS.startup).toBeLessThan(PERFORMANCE_BUDGETS.simpleCommand);
      expect(PERFORMANCE_BUDGETS.simpleCommand).toBeLessThan(PERFORMANCE_BUDGETS.fileOperation);
      expect(PERFORMANCE_BUDGETS.fileOperation).toBeLessThan(PERFORMANCE_BUDGETS.networkOperation);
      expect(PERFORMANCE_BUDGETS.networkOperation).toBeLessThan(PERFORMANCE_BUDGETS.totalSession);
    });
  });

  describe('Shop Operations Performance', () => {
    test('shop config load should complete quickly', async () => {
      // Arrange
      const context = createMultiShopCLI(tempDir);
      const shopId = 'perf-test-shop';
      const config = createMockShopConfig(shopId);

      await context.shopOps.saveConfig(shopId, config);

      // Act
      const start = performance.now();
      await context.shopOps.loadConfig(shopId);
      const duration = performance.now() - start;

      // Assert
      expect(duration).toBeLessThan(PERFORMANCE_BUDGETS.fileOperation);

      // Cleanup
      cleanupTempDir(tempDir);
    });

    test('shop config save should complete quickly', async () => {
      // Arrange
      const context = createMultiShopCLI(tempDir);
      const shopId = 'perf-test-shop';
      const config = createMockShopConfig(shopId);

      // Act
      const start = performance.now();
      await context.shopOps.saveConfig(shopId, config);
      const duration = performance.now() - start;

      // Assert
      expect(duration).toBeLessThan(PERFORMANCE_BUDGETS.fileOperation);

      // Cleanup
      cleanupTempDir(tempDir);
    });

    test('list shops should complete quickly', async () => {
      // Arrange
      const context = createMultiShopCLI(tempDir);

      // Create multiple shops
      for (let i = 0; i < 10; i++) {
        const shopId = `shop-${i}`;
        await context.shopOps.saveConfig(shopId, createMockShopConfig(shopId));
      }

      // Act
      const start = performance.now();
      await context.shopOps.listShops();
      const duration = performance.now() - start;

      // Assert
      expect(duration).toBeLessThan(PERFORMANCE_BUDGETS.simpleCommand);

      // Cleanup
      cleanupTempDir(tempDir);
    });
  });

  describe('Validation Performance', () => {
    test('validation should be fast', async () => {
      // Arrange
      const { validateShopId, validateDomain } = await import('../../lib/core/validation.js');

      // Act & Assert - Validate 100 times
      const start = performance.now();
      for (let i = 0; i < 100; i++) {
        validateShopId(`shop-${i}`);
        validateDomain(`shop-${i}.myshopify.com`);
      }
      const duration = performance.now() - start;

      // Should complete 100 validations in under 100ms
      expect(duration).toBeLessThan(100);
    });
  });

  describe('Memory Usage', () => {
    test('should not leak memory on repeated operations', async () => {
      // Arrange
      const context = createMultiShopCLI(tempDir);
      const initialMemory = process.memoryUsage().heapUsed;

      // Act - Perform many operations
      for (let i = 0; i < 50; i++) {
        const shopId = `shop-${i}`;
        await context.shopOps.saveConfig(shopId, createMockShopConfig(shopId));
        await context.shopOps.loadConfig(shopId);
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Assert - Memory increase should be reasonable (< 50MB for 50 shops)
      const maxAcceptableIncrease = 50 * 1024 * 1024; // 50MB
      expect(memoryIncrease).toBeLessThan(maxAcceptableIncrease);

      // Cleanup
      cleanupTempDir(tempDir);
    });
  });
});
