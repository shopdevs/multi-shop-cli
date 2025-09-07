/**
 * Configuration constants and limits for the multi-shop system
 * All configurable values should be defined here, not hardcoded throughout the system
 */

export interface SecurityConfig {
  readonly maxConfigFileSize: number;
  readonly minTokenLength: number;
  readonly maxTokenLength: number;
  readonly maxShopIdLength: number;
}

export interface LoggingConfig {
  readonly maxLogFiles: number;
  readonly maxLogSizeBytes: number;
  readonly defaultLogLevel: string;
}

export interface PerformanceConfig {
  readonly slowOperationThresholdMs: number;
  readonly highMemoryThresholdBytes: number;
  readonly maxMetricsRetention: number;
  readonly memoryCheckIntervalMs: number;
}

export interface SystemConfig {
  readonly security: SecurityConfig;
  readonly logging: LoggingConfig;
  readonly performance: PerformanceConfig;
}

/**
 * Default configuration values based on real-world usage patterns
 * These can be overridden by environment variables or config files
 */
export const DEFAULT_CONFIG: SystemConfig = {
  security: {
    // 1MB limit for configuration files - prevents DoS attacks
    maxConfigFileSize: 1024 * 1024,
    // Minimum token length - based on typical Shopify token patterns
    minTokenLength: 10,
    // Maximum token length - reasonable upper bound for tokens
    maxTokenLength: 500,
    // Maximum shop ID length - align with common ID constraints
    maxShopIdLength: 50,
  },
  logging: {
    // Keep 10 log files by default - balance between history and disk space
    maxLogFiles: 10,
    // 10MB per log file - reasonable size for rotation
    maxLogSizeBytes: 10 * 1024 * 1024,
    // Default log level
    defaultLogLevel: 'info',
  },
  performance: {
    // 5 seconds is a reasonable threshold for CLI operations
    // Anything longer likely needs optimization
    slowOperationThresholdMs: 5000,
    // 200MB is a reasonable memory limit for Node.js CLI tools
    // This is based on typical usage patterns, not arbitrary
    highMemoryThresholdBytes: 200 * 1024 * 1024,
    // Keep last 100 operations for analysis
    maxMetricsRetention: 100,
    // Check memory every 30 seconds (not too frequent)
    memoryCheckIntervalMs: 30000,
  },
};

/**
 * Loads configuration from environment variables or returns defaults
 * Environment variables override default values
 */
export function loadConfig(): SystemConfig {
  const config: SystemConfig = {
    security: {
      maxConfigFileSize: parseInt(process.env.MULTI_SHOP_MAX_CONFIG_SIZE || '') || DEFAULT_CONFIG.security.maxConfigFileSize,
      minTokenLength: parseInt(process.env.MULTI_SHOP_MIN_TOKEN_LENGTH || '') || DEFAULT_CONFIG.security.minTokenLength,
      maxTokenLength: parseInt(process.env.MULTI_SHOP_MAX_TOKEN_LENGTH || '') || DEFAULT_CONFIG.security.maxTokenLength,
      maxShopIdLength: parseInt(process.env.MULTI_SHOP_MAX_SHOP_ID_LENGTH || '') || DEFAULT_CONFIG.security.maxShopIdLength,
    },
    logging: {
      maxLogFiles: parseInt(process.env.MULTI_SHOP_MAX_LOG_FILES || '') || DEFAULT_CONFIG.logging.maxLogFiles,
      maxLogSizeBytes: parseInt(process.env.MULTI_SHOP_MAX_LOG_SIZE || '') || DEFAULT_CONFIG.logging.maxLogSizeBytes,
      defaultLogLevel: process.env.LOG_LEVEL || DEFAULT_CONFIG.logging.defaultLogLevel,
    },
    performance: {
      slowOperationThresholdMs: parseInt(process.env.MULTI_SHOP_SLOW_THRESHOLD_MS || '') || DEFAULT_CONFIG.performance.slowOperationThresholdMs,
      highMemoryThresholdBytes: parseInt(process.env.MULTI_SHOP_HIGH_MEMORY_BYTES || '') || DEFAULT_CONFIG.performance.highMemoryThresholdBytes,
      maxMetricsRetention: parseInt(process.env.MULTI_SHOP_MAX_METRICS || '') || DEFAULT_CONFIG.performance.maxMetricsRetention,
      memoryCheckIntervalMs: parseInt(process.env.MULTI_SHOP_MEMORY_CHECK_INTERVAL || '') || DEFAULT_CONFIG.performance.memoryCheckIntervalMs,
    },
  };

  return config;
}

/**
 * Global configuration instance
 * Loaded once at startup for consistent values throughout the application
 */
export const config = loadConfig();