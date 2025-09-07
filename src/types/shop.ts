/**
 * Type definitions for shop management
 */

export interface ShopConfig {
  readonly shopId: string;
  readonly name: string;
  readonly shopify: ShopifyConfig;
  readonly metadata?: ShopMetadata;
}

export interface ShopifyConfig {
  readonly stores: {
    readonly production: ShopifyStore;
    readonly staging: ShopifyStore;
  };
  readonly authentication: AuthenticationConfig;
}

export interface ShopifyStore {
  readonly domain: string;
  readonly branch: string;
  readonly themeId?: string;
}

export interface AuthenticationConfig {
  readonly method: AuthenticationMethod;
  readonly notes?: AuthenticationNotes;
}

export type AuthenticationMethod = 'theme-access-app' | 'manual-tokens';

export interface AuthenticationNotes {
  readonly themeId?: string;
  readonly themeAccessApp?: string;
  readonly manualTokens?: string;
  readonly credentials?: string;
}

export interface ShopMetadata {
  readonly description?: string;
  readonly tags?: readonly string[];
  readonly created?: string;
  readonly lastModified?: string;
}

export interface ShopCredentials {
  readonly developer: string;
  readonly shopify: ShopifyCredentials;
  readonly notes?: string;
  readonly _metadata?: CredentialMetadata;
}

export interface ShopifyCredentials {
  readonly stores: {
    readonly production: StoreCredentials;
    readonly staging: StoreCredentials;
  };
}

export interface StoreCredentials {
  readonly themeToken: string;
}

export interface CredentialMetadata {
  readonly created: string;
  readonly version: string;
  readonly checksum: string;
}

export type Environment = 'production' | 'staging';

// ShopCreationData, BranchInfo, ShopValidationResult, ValidationError removed
// These were defined but never used in the actual implementation

// PerformanceMetrics and MemoryDelta removed - not used in implementation

export interface SecurityAuditReport {
  readonly timestamp: string;
  readonly shops: readonly ShopSecurityAudit[];
  readonly issues: readonly SecurityIssue[];
  readonly recommendations: readonly string[];
}

export interface ShopSecurityAudit {
  readonly shopId: string;
  readonly filePermissions: string;
  readonly lastModified: string;
  readonly hasProduction: boolean;
  readonly hasStaging: boolean;
  readonly integrityValid: boolean;
}

export interface SecurityIssue {
  readonly level: 'error' | 'warning' | 'info';
  readonly shopId?: string;
  readonly message: string;
  readonly recommendation: string;
}

// CLI and command types
export interface CLIOptions {
  readonly verbose?: boolean;
  readonly debug?: boolean;
  readonly dryRun?: boolean;
  readonly force?: boolean;
}

// Logger interface
export interface Logger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
  flush(): Promise<void>;
  startOperation(name: string, context?: Record<string, unknown>): (result: string, meta?: Record<string, unknown>) => void;
}

// Performance Monitor interface
export interface PerformanceMonitor {
  startOperation(name: string, context?: Record<string, unknown>): string;
  endOperation(operationId: string, result?: unknown, error?: Error): void;
  getPerformanceSummary(): {
    uptime: number;
    memoryUsage: NodeJS.MemoryUsage;
    activeOperations: number;
    recentOperations: number;
    averageDuration: number;
  };
  cleanup(): Promise<void>;
}


export interface ShopManagerOptions {
  readonly cwd?: string;
  readonly logger?: Logger;
  readonly performanceMonitor?: PerformanceMonitor;
}

// GitRepository, GitOperationOptions, ErrorContext removed - not used in implementation

// Branded types removed - they were defined but never used for actual type safety

// Simple validation functions (no branded types needed)
export const isValidShopId = (value: string): boolean => {
  return /^[a-z0-9-]+$/.test(value) && value.length >= 1 && value.length <= 50;
};

export const isValidDomain = (value: string): boolean => {
  return value.endsWith('.myshopify.com') && value.length > '.myshopify.com'.length;
};

export const isValidThemeToken = (value: string, authMethod: AuthenticationMethod): boolean => {
  if (!value || value.length < 10) return false;
  if (authMethod === 'manual-tokens') {
    return value.startsWith('shptka_');
  }
  return true;
};

export const isValidBranchName = (value: string): boolean => {
  const invalidPatterns = [
    /^\.|\/\.|\.\.|@\{/,  // No leading dots, no /./, no .., no @{
    /\s|~|\^|:|\?|\*|\[/, // No spaces or special chars
    /\/$/,                // No trailing slash
    /\.lock$/             // No .lock suffix
  ];

  return !invalidPatterns.some(pattern => pattern.test(value)) && value.length <= 250;
};