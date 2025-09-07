import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

/**
 * Enterprise-grade logging system with structured logging
 * Implements observability best practices
 */
interface LoggerOptions {
  level?: string;
  enableFile?: boolean;
  logDir?: string;
  maxLogFiles?: number;
  maxLogSize?: number;
  context?: Record<string, unknown>;
}

export class Logger {
  private readonly level: string;
  private readonly enableFile: boolean;
  private readonly logDir: string;
  private readonly maxLogFiles: number;
  private readonly maxLogSize: number;
  private readonly levels: Record<string, number>;
  private readonly currentLevel: number;
  private readonly context: Record<string, unknown>;

  constructor(options: LoggerOptions = {}) {
    this.level = options.level || process.env['LOG_LEVEL'] || 'info';
    this.enableFile = options.enableFile !== false;
    this.logDir = options.logDir || path.join(process.cwd(), '.multi-shop', 'logs');
    this.maxLogFiles = options.maxLogFiles || 10;
    this.maxLogSize = options.maxLogSize || 10 * 1024 * 1024; // 10MB
    this.context = options.context || {};
    
    this.levels = {
      error: 0,
      warn: 1, 
      info: 2,
      debug: 3,
      trace: 4
    };

    this.currentLevel = this.levels[this.level] ?? this.levels.info;

    if (this.enableFile) {
      this.ensureLogDirectory();
      this.rotateLogsIfNeeded();
    }
  }

  /**
   * Logs error with context
   * @param message - Error message
   * @param meta - Additional context
   */
  error(message: string, meta: Record<string, unknown> = {}): void {
    this.log('error', message, meta);
  }

  /**
   * Logs warning with context  
   * @param message - Warning message
   * @param meta - Additional context
   */
  warn(message: string, meta: Record<string, unknown> = {}): void {
    this.log('warn', message, meta);
  }

  /**
   * Logs info with context
   * @param message - Info message  
   * @param meta - Additional context
   */
  info(message: string, meta: Record<string, unknown> = {}): void {
    this.log('info', message, meta);
  }

  /**
   * Logs debug with context
   * @param message - Debug message
   * @param meta - Additional context
   */
  debug(message: string, meta: Record<string, unknown> = {}): void {
    this.log('debug', message, meta);
  }

  /**
   * Logs operation start for performance tracking
   * @param operation - Operation name
   * @param meta - Additional context
   * @returns End function to call when operation completes
   */
  startOperation(operation: string, meta: Record<string, unknown> = {}): (result?: string, endMeta?: Record<string, unknown>) => void {
    const startTime = process.hrtime.bigint();
    const operationId = this.generateOperationId();

    this.info(`Operation started: ${operation}`, { 
      operationId,
      operation,
      ...meta 
    });

    return (result = 'success', endMeta = {}) => {
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds

      this.info(`Operation completed: ${operation}`, {
        operationId,
        operation,
        result,
        durationMs: duration,
        ...endMeta
      });
    };
  }

  /**
   * Logs security events with high priority
   * @param event - Security event type
   * @param meta - Security context
   */
  security(event: string, meta: Record<string, unknown> = {}): void {
    this.log('warn', `SECURITY: ${event}`, {
      type: 'security_event',
      event,
      ...meta
    });
  }

  /**
   * Logs performance metrics
   * @param metric - Metric name
   * @param value - Metric value
   * @param unit - Metric unit
   * @param meta - Additional context
   */
  metric(metric: string, value: number, unit: string = 'count', meta: Record<string, unknown> = {}): void {
    this.log('info', `METRIC: ${metric}`, {
      type: 'performance_metric',
      metric,
      value,
      unit,
      ...meta
    });
  }

  /**
   * Main logging method with structured output
   * @private
   */
  private log(level: string, message: string, meta: Record<string, unknown> = {}): void {
    if (this.levels[level] > this.currentLevel) {
      return; // Skip if below current log level
    }

    const logEntry = {
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      message,
      pid: process.pid,
      ...meta
    };

    // Console output (formatted for readability)
    this.outputToConsole(level, message, meta);

    // File output (structured JSON)
    if (this.enableFile) {
      this.outputToFile(logEntry);
    }
  }

  /**
   * Outputs formatted log to console
   * @private
   */
  private outputToConsole(level: string, message: string, meta: Record<string, unknown>): void {
    const timestamp = new Date().toLocaleTimeString();
    const colors = {
      error: '\x1b[31m', // Red
      warn: '\x1b[33m',  // Yellow  
      info: '\x1b[36m',  // Cyan
      debug: '\x1b[37m', // White
      trace: '\x1b[90m'  // Gray
    };

    const reset = '\x1b[0m';
    const color = colors[level] || colors.info;

    let output = `${color}[${timestamp}] ${level.toUpperCase()}${reset} ${message}`;

    // Add structured metadata for important logs
    if (Object.keys(meta).length > 0 && this.currentLevel >= this.levels.debug) {
      output += `\n  ${JSON.stringify(meta, null, 2)}`;
    }

    console.log(output);
  }

  /**
   * Outputs structured log to file
   * @private
   */
  private outputToFile(logEntry: Record<string, unknown>): void {
    try {
      const logFile = path.join(this.logDir, `multi-shop-${this.getLogDate()}.log`);
      const logLine = JSON.stringify(logEntry) + '\n';
      
      fs.appendFileSync(logFile, logLine);
    } catch (error) {
      // Fail silently for file logging to avoid logging loops
      console.error(`Failed to write to log file: ${error.message}`);
    }
  }

  /**
   * Ensures log directory exists with proper permissions
   * @private
   */
  private ensureLogDirectory(): void {
    try {
      if (!fs.existsSync(this.logDir)) {
        fs.mkdirSync(this.logDir, { 
          recursive: true,
          mode: 0o755 // rwxr-xr-x
        });
      }
    } catch (error) {
      console.error(`Failed to create log directory: ${error.message}`);
    }
  }

  /**
   * Rotates log files to prevent disk space issues
   * @private
   */
  private rotateLogsIfNeeded(): void {
    try {
      if (!fs.existsSync(this.logDir)) return;

      const logFiles = fs.readdirSync(this.logDir)
        .filter(file => file.endsWith('.log'))
        .map(file => ({
          name: file,
          path: path.join(this.logDir, file),
          stats: fs.statSync(path.join(this.logDir, file))
        }))
        .sort((a, b) => b.stats.mtime - a.stats.mtime); // Newest first

      // Remove old log files if we have too many
      if (logFiles.length > this.maxLogFiles) {
        logFiles.slice(this.maxLogFiles).forEach(file => {
          fs.unlinkSync(file.path);
        });
      }

      // Check current log file size
      const currentLogFile = path.join(this.logDir, `multi-shop-${this.getLogDate()}.log`);
      if (fs.existsSync(currentLogFile)) {
        const stats = fs.statSync(currentLogFile);
        if (stats.size > this.maxLogSize) {
          // Archive current log
          const archiveName = `multi-shop-${this.getLogDate()}-${Date.now()}.log`;
          fs.renameSync(currentLogFile, path.join(this.logDir, archiveName));
        }
      }
    } catch (error) {
      console.error(`Failed to rotate logs: ${error.message}`);
    }
  }

  /**
   * Gets log date string for file naming
   * @private
   */
  private getLogDate(): string {
    return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  }

  /**
   * Generates unique operation ID for tracking
   * @private
   */
  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Creates child logger with additional context
   * @param context - Additional context for all logs
   * @returns Child logger instance
   */
  child(context: Record<string, unknown> = {}): Logger {
    return new Logger({
      level: this.level,
      enableFile: this.enableFile,
      logDir: this.logDir,
      context: { ...this.context, ...context }
    });
  }

  /**
   * Flushes any pending log operations
   * Useful for graceful shutdowns
   */
  async flush(): Promise<void> {
    // Currently all logging is synchronous, but this method
    // provides a consistent interface for future async implementations
    return Promise.resolve();
  }

  /**
   * Gets log statistics for monitoring
   * @returns Log statistics
   */
  getStats(): Record<string, unknown> {
    try {
      if (!fs.existsSync(this.logDir)) {
        return { totalLogs: 0, totalSize: 0, files: [] };
      }

      const logFiles = fs.readdirSync(this.logDir)
        .filter(file => file.endsWith('.log'))
        .map(file => {
          const filePath = path.join(this.logDir, file);
          const stats = fs.statSync(filePath);
          return {
            name: file,
            size: stats.size,
            modified: stats.mtime.toISOString()
          };
        });

      const totalSize = logFiles.reduce((sum, file) => sum + file.size, 0);

      return {
        totalLogs: logFiles.length,
        totalSize,
        totalSizeHuman: this.formatBytes(totalSize),
        files: logFiles
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Formats bytes for human-readable output
   * @private
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Export singleton instance for convenience
export const logger = new Logger();
export default Logger;