/**
 * Simple logging for CLI tools
 * Replaces the over-engineered 362-line Logger with basic needs
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export class SimpleLogger {
  private level: LogLevel;

  constructor(level: LogLevel = 'info') {
    this.level = process.env['LOG_LEVEL'] as LogLevel || level;
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    if (this.shouldLog('debug')) {
      console.log(`🔍 ${message}`, meta && Object.keys(meta).length > 0 ? meta : '');
    }
  }

  info(message: string, meta?: Record<string, unknown>): void {
    if (this.shouldLog('info')) {
      console.log(`ℹ️  ${message}`, meta && Object.keys(meta).length > 0 ? meta : '');
    }
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    if (this.shouldLog('warn')) {
      console.warn(`⚠️  ${message}`, meta && Object.keys(meta).length > 0 ? meta : '');
    }
  }

  error(message: string, meta?: Record<string, unknown>): void {
    if (this.shouldLog('error')) {
      console.error(`❌ ${message}`, meta && Object.keys(meta).length > 0 ? meta : '');
    }
  }

  startOperation(operation: string, context?: Record<string, unknown>): (result?: string, meta?: Record<string, unknown>) => void {
    this.debug(`Started: ${operation}`, context);
    return (result = 'success', meta) => {
      this.debug(`Completed: ${operation} (${result})`, meta);
    };
  }

  async flush(): Promise<void> {
    // Simple logger doesn't need flushing
    return Promise.resolve();
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };
    return levels[level] >= levels[this.level];
  }
}

// Export singleton for consistency with existing code
export const logger = new SimpleLogger();