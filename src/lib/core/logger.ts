/**
 * Simple logging for CLI tools
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const createLogger = (level: LogLevel = 'info'): {
  debug: (message: string, meta?: Record<string, unknown>) => void;
  info: (message: string, meta?: Record<string, unknown>) => void;
  warn: (message: string, meta?: Record<string, unknown>) => void;
  error: (message: string, meta?: Record<string, unknown>) => void;
  startOperation: (operation: string, context?: Record<string, unknown>) => (result?: string, meta?: Record<string, unknown>) => void;
  flush: () => Promise<void>;
} => {
  const logLevel = (process.env['LOG_LEVEL'] as LogLevel) || level;
  
  const shouldLog = (targetLevel: LogLevel): boolean => {
    const levels: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };
    return levels[targetLevel] >= levels[logLevel];
  };

  return {
    debug: (message: string, meta?: Record<string, unknown>) => {
      if (shouldLog('debug')) {
        console.log(`🔍 ${message}`, meta && Object.keys(meta).length > 0 ? meta : '');
      }
    },

    info: (message: string, meta?: Record<string, unknown>) => {
      if (shouldLog('info')) {
        console.log(`ℹ️  ${message}`, meta && Object.keys(meta).length > 0 ? meta : '');
      }
    },

    warn: (message: string, meta?: Record<string, unknown>) => {
      if (shouldLog('warn')) {
        console.warn(`⚠️  ${message}`, meta && Object.keys(meta).length > 0 ? meta : '');
      }
    },

    error: (message: string, meta?: Record<string, unknown>) => {
      if (shouldLog('error')) {
        console.error(`❌ ${message}`, meta && Object.keys(meta).length > 0 ? meta : '');
      }
    },

    startOperation: (_operation: string, _context?: Record<string, unknown>) => {
      return (_result?: string, _meta?: Record<string, unknown>) => {
        // Simple operation tracking
      };
    },

    flush: async () => Promise.resolve()
  };
};

export const logger = createLogger();
export type Logger = ReturnType<typeof createLogger>;