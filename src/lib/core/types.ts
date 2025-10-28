/**
 * Core functional types and dependency injection patterns
 */

export interface Dependencies {
  readonly cwd: string;
  readonly shopsDir: string;
  readonly credentialsDir: string;
}

export interface Result<T> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: string;
}

export interface CLIContext {
  readonly deps: Dependencies;
  readonly shopOps: ShopOperations;
  readonly credOps: CredentialOperations; 
  readonly devOps: DevOperations;
}

export interface ShopOperations {
  readonly loadConfig: (shopId: string) => Promise<Result<import("../../types/shop.js").ShopConfig>>;
  readonly saveConfig: (shopId: string, config: import("../../types/shop.js").ShopConfig) => Promise<Result<void>>;
  readonly listShops: () => Promise<Result<string[]>>;
  readonly deleteShop: (shopId: string) => Promise<Result<void>>;
}

export interface CredentialOperations {
  readonly loadCredentials: (shopId: string) => Promise<Result<import("../../types/shop.js").ShopCredentials | null>>;
  readonly saveCredentials: (shopId: string, credentials: import("../../types/shop.js").ShopCredentials) => Promise<Result<void>>;
}

export interface DevOperations {
  readonly startDev: (shopId: string, environment: 'production' | 'staging') => Promise<Result<void>>;
}

export interface GitOperations {
  readonly getCurrentBranch: () => Promise<Result<string>>;
  readonly createBranch: (branchName: string) => Promise<Result<void>>;
  readonly pushBranch: (branchName: string) => Promise<Result<void>>;
}