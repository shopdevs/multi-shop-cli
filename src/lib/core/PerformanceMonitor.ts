import { performance } from "perf_hooks";
import { logger } from "./Logger.js";

/**
 * Enterprise performance monitoring and optimization
 * Tracks CLI performance for continuous improvement
 */
export class PerformanceMonitor {
  constructor() {
    this.operations = new Map();
    this.metrics = {
      commandExecution: [],
      memoryUsage: [],
      gitOperations: [],
      fileOperations: []
    };
    
    // Start memory monitoring
    this.startMemoryMonitoring();
  }

  /**
   * Starts timing an operation
   * @param {string} operationName - Name of operation
   * @param {Object} context - Additional context
   * @returns {string} Operation ID for ending
   */
  startOperation(operationName, context = {}) {
    const operationId = `${operationName}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    
    const operation = {
      id: operationId,
      name: operationName,
      startTime: performance.now(),
      startMemory: process.memoryUsage(),
      context
    };

    this.operations.set(operationId, operation);
    
    logger.debug(`Performance: Started ${operationName}`, { 
      operationId,
      context 
    });

    return operationId;
  }

  /**
   * Ends timing an operation and records metrics
   * @param {string} operationId - Operation ID from startOperation
   * @param {Object} result - Operation result context
   */
  endOperation(operationId, result = {}) {
    const operation = this.operations.get(operationId);
    
    if (!operation) {
      logger.warn(`Performance: Operation not found: ${operationId}`);
      return;
    }

    const endTime = performance.now();
    const endMemory = process.memoryUsage();
    const duration = endTime - operation.startTime;

    const metrics = {
      id: operationId,
      name: operation.name,
      duration: Math.round(duration * 100) / 100, // Round to 2 decimal places
      startTime: operation.startTime,
      endTime,
      memoryDelta: {
        heapUsed: endMemory.heapUsed - operation.startMemory.heapUsed,
        heapTotal: endMemory.heapTotal - operation.startMemory.heapTotal,
        external: endMemory.external - operation.startMemory.external
      },
      context: operation.context,
      result
    };

    // Store metrics by category
    this.categorizeAndStoreMetrics(metrics);

    // Log performance if slow or memory-intensive
    this.logPerformanceIssues(metrics);

    // Clean up operation tracking
    this.operations.delete(operationId);

    logger.debug(`Performance: Completed ${operation.name}`, metrics);
  }

  /**
   * Records command execution metrics
   * @param {string} command - Command executed
   * @param {number} duration - Execution time in ms
   * @param {number} exitCode - Command exit code
   * @param {Object} context - Additional context
   */
  recordCommandExecution(command, duration, exitCode, context = {}) {
    const metric = {
      timestamp: Date.now(),
      command,
      duration,
      exitCode,
      success: exitCode === 0,
      ...context
    };

    this.metrics.commandExecution.push(metric);
    
    // Keep only last 100 command metrics
    if (this.metrics.commandExecution.length > 100) {
      this.metrics.commandExecution.shift();
    }

    logger.metric('command_execution_time', duration, 'ms', {
      command,
      exitCode,
      success: exitCode === 0
    });
  }

  /**
   * Records Git operation performance
   * @param {string} operation - Git operation type
   * @param {number} duration - Duration in ms
   * @param {boolean} success - Whether operation succeeded
   * @param {Object} context - Additional context
   */
  recordGitOperation(operation, duration, success, context = {}) {
    const metric = {
      timestamp: Date.now(),
      operation,
      duration,
      success,
      ...context
    };

    this.metrics.gitOperations.push(metric);
    
    // Keep only last 50 git metrics
    if (this.metrics.gitOperations.length > 50) {
      this.metrics.gitOperations.shift();
    }

    logger.metric('git_operation_time', duration, 'ms', {
      operation,
      success
    });
  }

  /**
   * Gets performance summary for reporting
   * @returns {Object} Performance summary
   */
  getPerformanceSummary() {
    const summary = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      activeOperations: this.operations.size,
      metrics: {}
    };

    // Command execution summary
    if (this.metrics.commandExecution.length > 0) {
      const commands = this.metrics.commandExecution;
      const avgDuration = commands.reduce((sum, cmd) => sum + cmd.duration, 0) / commands.length;
      const successRate = commands.filter(cmd => cmd.success).length / commands.length;
      
      summary.metrics.commands = {
        total: commands.length,
        averageDuration: Math.round(avgDuration),
        successRate: Math.round(successRate * 100) / 100,
        slowestCommand: commands.reduce((max, cmd) => 
          cmd.duration > (max?.duration || 0) ? cmd : max, null
        )
      };
    }

    // Git operation summary
    if (this.metrics.gitOperations.length > 0) {
      const gitOps = this.metrics.gitOperations;
      const avgDuration = gitOps.reduce((sum, op) => sum + op.duration, 0) / gitOps.length;
      const successRate = gitOps.filter(op => op.success).length / gitOps.length;
      
      summary.metrics.git = {
        total: gitOps.length,
        averageDuration: Math.round(avgDuration),
        successRate: Math.round(successRate * 100) / 100
      };
    }

    return summary;
  }

  /**
   * Cleans up performance monitoring
   */
  cleanup() {
    this.operations.clear();
    this.stopMemoryMonitoring();
  }

  // ================== PRIVATE METHODS ==================

  categorizeAndStoreMetrics(metrics) {
    const { name } = metrics;
    
    if (name.includes('git') || name.includes('branch')) {
      this.metrics.gitOperations.push(metrics);
    } else if (name.includes('file') || name.includes('config')) {
      this.metrics.fileOperations.push(metrics);
    }

    // Trim old metrics
    Object.keys(this.metrics).forEach(key => {
      if (this.metrics[key].length > 100) {
        this.metrics[key] = this.metrics[key].slice(-50); // Keep last 50
      }
    });
  }

  logPerformanceIssues(metrics) {
    const { duration, name, memoryDelta } = metrics;

    // Log slow operations (>2 seconds)
    if (duration > 2000) {
      logger.warn(`Slow operation detected: ${name}`, {
        duration: `${duration}ms`,
        threshold: '2000ms',
        suggestion: 'Consider optimizing this operation'
      });
    }

    // Log high memory usage (>50MB increase)
    if (memoryDelta.heapUsed > 50 * 1024 * 1024) {
      logger.warn(`High memory usage detected: ${name}`, {
        memoryIncrease: this.formatBytes(memoryDelta.heapUsed),
        threshold: '50MB',
        suggestion: 'Check for memory leaks'
      });
    }
  }

  startMemoryMonitoring() {
    this.memoryInterval = setInterval(() => {
      const usage = process.memoryUsage();
      this.metrics.memoryUsage.push({
        timestamp: Date.now(),
        ...usage
      });

      // Keep only last 60 memory readings (5 minutes at 5-second intervals)
      if (this.metrics.memoryUsage.length > 60) {
        this.metrics.memoryUsage.shift();
      }

      // Alert on high memory usage (>500MB)
      if (usage.heapUsed > 500 * 1024 * 1024) {
        logger.warn('High memory usage detected', {
          heapUsed: this.formatBytes(usage.heapUsed),
          threshold: '500MB'
        });
      }
    }, 5000); // Every 5 seconds

    // Cleanup on process exit
    process.on('exit', () => this.stopMemoryMonitoring());
    process.on('SIGINT', () => this.stopMemoryMonitoring());
    process.on('SIGTERM', () => this.stopMemoryMonitoring());
  }

  stopMemoryMonitoring() {
    if (this.memoryInterval) {
      clearInterval(this.memoryInterval);
      this.memoryInterval = null;
    }
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();
export default PerformanceMonitor;