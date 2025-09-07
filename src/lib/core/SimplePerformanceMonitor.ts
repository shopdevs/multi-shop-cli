import { config } from "./Config.js";

/**
 * Simple performance monitoring focused on actual CLI needs
 * No arbitrary thresholds, just basic timing and memory tracking
 */
export class SimplePerformanceMonitor {
  private operations = new Map<string, { startTime: number; name: string }>();
  private completedOperations: Array<{ name: string; duration: number; timestamp: number }> = [];

  /**
   * Start timing an operation
   */
  startOperation(name: string, context?: Record<string, unknown>): string {
    const operationId = `${name}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    
    this.operations.set(operationId, {
      startTime: performance.now(),
      name
    });

    return operationId;
  }

  /**
   * End timing an operation
   */
  endOperation(operationId: string, result?: unknown, error?: Error): void {
    const operation = this.operations.get(operationId);
    
    if (!operation) {
      return; // Operation not found, ignore silently
    }

    const duration = performance.now() - operation.startTime;
    
    // Store completed operation
    this.completedOperations.push({
      name: operation.name,
      duration: Math.round(duration),
      timestamp: Date.now()
    });

    // Keep only recent operations
    if (this.completedOperations.length > config.performance.maxMetricsRetention) {
      this.completedOperations = this.completedOperations.slice(-config.performance.maxMetricsRetention);
    }

    // Clean up
    this.operations.delete(operationId);
  }

  /**
   * Get basic performance summary for diagnostics
   */
  getPerformanceSummary(): {
    uptime: number;
    memoryUsage: NodeJS.MemoryUsage;
    activeOperations: number;
    recentOperations: number;
    averageDuration: number;
  } {
    const recentOps = this.completedOperations.slice(-10); // Last 10 operations
    const avgDuration = recentOps.length > 0 
      ? Math.round(recentOps.reduce((sum, op) => sum + op.duration, 0) / recentOps.length)
      : 0;

    return {
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      activeOperations: this.operations.size,
      recentOperations: this.completedOperations.length,
      averageDuration: avgDuration
    };
  }

  /**
   * Clean up resources
   */
  cleanup(): Promise<void> {
    this.operations.clear();
    this.completedOperations = [];
    return Promise.resolve();
  }
}

// Export singleton instance
export const performanceMonitor = new SimplePerformanceMonitor();