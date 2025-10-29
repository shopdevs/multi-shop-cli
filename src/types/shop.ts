/**
 * Type definitions for shop management
 */

export interface ShopConfig {
  readonly shopId: string;
  readonly name: string;
  readonly shopify: ShopifyConfig;
  readonly metadata?: ShopMetadata;
  readonly contentProtection?: ContentProtectionConfig;
}

export interface ContentProtectionConfig {
  readonly enabled: boolean;
  readonly mode: ContentProtectionMode;
  readonly verbosity: ContentProtectionVerbosity;
}

export type ContentProtectionMode = 'strict' | 'warn' | 'off';
export type ContentProtectionVerbosity = 'verbose' | 'quiet';

export interface GlobalSettings {
  readonly contentProtection: {
    readonly defaultMode: ContentProtectionMode;
    readonly defaultVerbosity: ContentProtectionVerbosity;
    readonly applyToNewShops: boolean;
  };
  readonly version: string;
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

/**
 * Type guards and validation functions
 *
 * These are re-exported from the centralized validation-schemas module
 * to maintain backward compatibility and provide convenient access.
 */

export {
  isValidShopId,
  isValidDomain,
  isValidBranchName,
  isValidThemeToken
} from '../lib/core/validation-schemas.js';