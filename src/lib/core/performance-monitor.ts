/**
 * Performance monitoring and budget tracking for CLI operations
 */

export const PERFORMANCE_BUDGETS = {
  startup: 100,        // ms - CLI startup time
  simpleCommand: 200,  // ms - list, version, help
  fileOperation: 500,  // ms - config load/save
  networkOperation: 5000, // ms - version check, gh CLI
  totalSession: 30000  // ms - interactive session timeout
} as const;

export type PerformanceBudgetKey = keyof typeof PERFORMANCE_BUDGETS;

export interface PerformanceEntry {
  readonly id: string;
  readonly name: string;
  readonly startTime: number;
  readonly endTime?: number | undefined;
  readonly duration?: number | undefined;
  readonly budget?: number | undefined;
  readonly exceeded?: boolean | undefined;
  readonly context?: Record<string, unknown> | undefined;
}

export interface PerformanceViolation {
  readonly operation: string;
  readonly duration: number;
  readonly budget: number;
  readonly exceedance: number;
  readonly timestamp: string;
}

export interface PerformanceSummary {
  readonly uptime: number;
  readonly memoryUsage: NodeJS.MemoryUsage;
  readonly activeOperations: number;
  readonly completedOperations: number;
  readonly totalOperations: number;
  readonly averageDuration: number;
  readonly violations: readonly PerformanceViolation[];
}

export class PerformanceMonitor {
  private operations: Map<string, PerformanceEntry> = new Map();
  private violations: PerformanceViolation[] = [];
  private startupTime: number = Date.now();

  /**
   * Start tracking an operation
   * @param name Operation name
   * @param context Optional context data
   * @returns Operation ID for ending the operation
   */
  startOperation(name: string, context?: Record<string, unknown>): string {
    const id = `${name}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const budget = this.getBudget(name);

    const entry: PerformanceEntry = {
      id,
      name,
      startTime: performance.now(),
      budget,
      context
    };

    this.operations.set(id, entry);
    return id;
  }

  /**
   * End tracking an operation
   * @param id Operation ID from startOperation
   * @param _result Optional result data (reserved for future use)
   * @param _error Optional error if operation failed (reserved for future use)
   */
  endOperation(id: string, _result?: unknown, _error?: Error): void {
    const entry = this.operations.get(id);
    if (!entry) {
      return; // Operation not found
    }

    const endTime = performance.now();
    const duration = endTime - entry.startTime;

    const updatedEntry: PerformanceEntry = {
      ...entry,
      endTime,
      duration,
      exceeded: entry.budget ? duration > entry.budget : false
    };

    this.operations.set(id, updatedEntry);

    // Check against budget
    if (entry.budget && duration > entry.budget) {
      this.violations.push({
        operation: entry.name,
        duration,
        budget: entry.budget,
        exceedance: duration - entry.budget,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): PerformanceSummary {
    const completedOps = Array.from(this.operations.values()).filter(op => op.duration !== undefined);
    const activeOps = Array.from(this.operations.values()).filter(op => op.duration === undefined);

    const totalDuration = completedOps.reduce((sum, op) => sum + (op.duration ?? 0), 0);
    const avgDuration = completedOps.length > 0 ? totalDuration / completedOps.length : 0;

    return {
      uptime: Date.now() - this.startupTime,
      memoryUsage: process.memoryUsage(),
      activeOperations: activeOps.length,
      completedOperations: completedOps.length,
      totalOperations: this.operations.size,
      averageDuration: avgDuration,
      violations: this.violations
    };
  }

  /**
   * Get all violations
   */
  getViolations(): readonly PerformanceViolation[] {
    return this.violations;
  }

  /**
   * Check if there are any violations
   */
  hasViolations(): boolean {
    return this.violations.length > 0;
  }

  /**
   * Clear all tracked operations and violations
   */
  async cleanup(): Promise<void> {
    this.operations.clear();
    this.violations = [];
  }

  /**
   * Get budget for operation type
   */
  private getBudget(operationType: string): number | undefined {
    // Map operation types to budgets
    const budgetMap: Record<string, PerformanceBudgetKey> = {
      'startup': 'startup',
      'init_command': 'simpleCommand',
      'shop_management': 'simpleCommand',
      'list': 'simpleCommand',
      'version': 'simpleCommand',
      'help': 'simpleCommand',
      'load_config': 'fileOperation',
      'save_config': 'fileOperation',
      'load_credentials': 'fileOperation',
      'save_credentials': 'fileOperation',
      'version_check': 'networkOperation',
      'security_audit': 'simpleCommand',
      'contextual_development': 'totalSession'
    };

    const budgetKey = budgetMap[operationType];
    return budgetKey ? PERFORMANCE_BUDGETS[budgetKey] : undefined;
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();
