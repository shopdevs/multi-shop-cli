/**
 * Core type definitions for shop management
 * Provides comprehensive type safety for the entire system
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

export interface ShopCreationData {
  readonly shopId: string;
  readonly name: string;
  readonly productionDomain: string;
  readonly stagingDomain: string;
  readonly authMethod: AuthenticationMethod;
  readonly productionToken: string;
  readonly stagingToken: string;
}

export interface BranchInfo {
  readonly name: string;
  readonly exists: boolean;
  readonly local: boolean;
  readonly remote: boolean;
  readonly current: boolean;
}

export interface ShopValidationResult {
  readonly valid: boolean;
  readonly errors: readonly ValidationError[];
}

export interface ValidationError {
  readonly field: string;
  readonly message: string;
  readonly value?: unknown;
  readonly code?: string;
}

// Performance and monitoring types
export interface PerformanceMetrics {
  readonly operationId: string;
  readonly name: string;
  readonly duration: number;
  readonly startTime: number;
  readonly endTime: number;
  readonly memoryDelta: MemoryDelta;
  readonly context: Record<string, unknown>;
  readonly result: unknown;
}

export interface MemoryDelta {
  readonly heapUsed: number;
  readonly heapTotal: number;
  readonly external: number;
}

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
  endOperation(operationId: string, result?: unknown, error?: Error): PerformanceMetrics;
  getPerformanceSummary(): PerformanceSummary;
  cleanup(): Promise<void>;
}

export interface PerformanceSummary {
  readonly uptime: number;
  readonly memoryUsage: NodeJS.MemoryUsage;
  readonly activeOperations: number;
  readonly metrics: {
    commands?: {
      total: number;
      averageDuration: number;
      successRate: number;
    };
  };
}

export interface ShopManagerOptions {
  readonly cwd?: string;
  readonly logger?: Logger;
  readonly performanceMonitor?: PerformanceMonitor;
}

// Git operation types
export interface GitRepository {
  readonly remoteUrl: string;
  readonly currentCommit: string;
  readonly currentBranch: string;
  readonly isClean: boolean;
}

export interface GitOperationOptions {
  readonly cwd?: string;
  readonly timeout?: number;
  readonly silent?: boolean;
}

// Error types
export interface ErrorContext {
  readonly code: string;
  readonly timestamp: string;
  readonly details: Record<string, unknown>;
  readonly stack?: string;
}

// Utility types
export type NonEmptyString = string & { readonly __brand: 'NonEmptyString' };
export type ShopId = string & { readonly __brand: 'ShopId' };
export type DomainName = string & { readonly __brand: 'DomainName' };
export type ThemeToken = string & { readonly __brand: 'ThemeToken' };
export type BranchName = string & { readonly __brand: 'BranchName' };

// Type guards
export const isValidShopId = (value: string): value is ShopId => {
  return /^[a-z0-9-]+$/.test(value) && value.length >= 1 && value.length <= 50;
};

export const isValidDomain = (value: string): value is DomainName => {
  return value.endsWith('.myshopify.com') && value.length > '.myshopify.com'.length;
};

export const isValidThemeToken = (value: string, authMethod: AuthenticationMethod): value is ThemeToken => {
  if (!value || value.length < 10) return false;
  if (authMethod === 'manual-tokens') {
    return value.startsWith('shptka_');
  }
  return true;
};

export const isValidBranchName = (value: string): value is BranchName => {
  const invalidPatterns = [
    /^\.|\/\.|\.\.|@\{/,  // No leading dots, no /./, no .., no @{
    /\s|~|\^|:|\?|\*|\[/, // No spaces or special chars
    /\/$/,                // No trailing slash
    /\.lock$/             // No .lock suffix
  ];

  return !invalidPatterns.some(pattern => pattern.test(value)) && value.length <= 250;
};