import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

/**
 * Enterprise-grade logging system with structured logging
 * Implements observability best practices
 */
export class Logger {
  constructor(options = {}) {
    this.level = options.level || process.env.LOG_LEVEL || 'info';
    this.enableFile = options.enableFile !== false;
    this.logDir = options.logDir || path.join(process.cwd(), '.multi-shop', 'logs');
    this.maxLogFiles = options.maxLogFiles || 10;
    this.maxLogSize = options.maxLogSize || 10 * 1024 * 1024; // 10MB
    
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
   * @param {string} message - Error message
   * @param {Object} meta - Additional context
   */
  error(message, meta = {}) {
    this.log('error', message, meta);
  }

  /**
   * Logs warning with context  
   * @param {string} message - Warning message
   * @param {Object} meta - Additional context
   */
  warn(message, meta = {}) {
    this.log('warn', message, meta);
  }

  /**
   * Logs info with context
   * @param {string} message - Info message  
   * @param {Object} meta - Additional context
   */
  info(message, meta = {}) {
    this.log('info', message, meta);
  }

  /**
   * Logs debug with context
   * @param {string} message - Debug message
   * @param {Object} meta - Additional context
   */
  debug(message, meta = {}) {
    this.log('debug', message, meta);
  }

  /**
   * Logs operation start for performance tracking
   * @param {string} operation - Operation name
   * @param {Object} meta - Additional context
   * @returns {Function} End function to call when operation completes
   */
  startOperation(operation, meta = {}) {
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
   * @param {string} event - Security event type
   * @param {Object} meta - Security context
   */
  security(event, meta = {}) {
    this.log('warn', `SECURITY: ${event}`, {
      type: 'security_event',
      event,
      ...meta
    });
  }

  /**
   * Logs performance metrics
   * @param {string} metric - Metric name
   * @param {number} value - Metric value
   * @param {string} unit - Metric unit
   * @param {Object} meta - Additional context
   */
  metric(metric, value, unit = 'count', meta = {}) {
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
  log(level, message, meta = {}) {
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
  outputToConsole(level, message, meta) {
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
  outputToFile(logEntry) {
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
  ensureLogDirectory() {
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
  rotateLogsIfNeeded() {
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
  getLogDate() {
    return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  }

  /**
   * Generates unique operation ID for tracking
   * @private
   */
  generateOperationId() {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Creates child logger with additional context
   * @param {Object} context - Additional context for all logs
   * @returns {Logger} Child logger instance
   */
  child(context = {}) {
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
  flush() {
    // For future async logging implementation
    return Promise.resolve();
  }

  /**
   * Gets log statistics for monitoring
   * @returns {Object} Log statistics
   */
  getStats() {
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
  formatBytes(bytes) {
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