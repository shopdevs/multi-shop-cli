/**
 * Test helper utilities for ShopDevs Multi-Shop tests
 */

import fs from 'fs';
import path from 'path';
import { tmpdir } from 'os';
import type { ShopConfig, ShopCredentials } from '../types/shop.js';

/**
 * Creates a temporary directory for testing
 * @returns Path to temp directory
 */
export const createTempDir = (): string => {
  const tempPath = path.join(tmpdir(), `multi-shop-test-${Date.now()}-${Math.random().toString(36).substring(7)}`);
  fs.mkdirSync(tempPath, { recursive: true });
  return tempPath;
};

/**
 * Cleans up a temporary directory
 * @param dirPath Path to directory to remove
 */
export const cleanupTempDir = (dirPath: string): void => {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
};

/**
 * Creates a mock shop configuration
 * @param shopId Shop identifier
 * @param overrides Optional overrides for config properties
 * @returns Mock ShopConfig object
 */
export const createMockShopConfig = (
  shopId: string = 'test-shop',
  overrides: Partial<ShopConfig> = {}
): ShopConfig => {
  return {
    shopId,
    name: `Test Shop ${shopId}`,
    shopify: {
      stores: {
        production: {
          domain: `${shopId}.myshopify.com`,
          branch: `${shopId}/main`
        },
        staging: {
          domain: `staging-${shopId}.myshopify.com`,
          branch: `${shopId}/staging`
        }
      },
      authentication: {
        method: 'theme-access-app'
      }
    },
    ...overrides
  };
};

/**
 * Creates mock shop credentials
 * @param shopId Shop identifier
 * @param overrides Optional overrides for credential properties
 * @returns Mock ShopCredentials object
 */
export const createMockCredentials = (
  shopId: string = 'test-shop',
  overrides: Partial<ShopCredentials> = {}
): ShopCredentials => {
  return {
    developer: 'test-developer',
    shopify: {
      stores: {
        production: {
          themeToken: `prod-token-${shopId}`
        },
        staging: {
          themeToken: `staging-token-${shopId}`
        }
      }
    },
    notes: 'Test credentials - do not use in production',
    ...overrides
  };
};

/**
 * Sets up a test project structure with shops directory
 * @param tempDir Base temp directory
 * @returns Object with paths
 */
export const setupTestProject = (tempDir: string) => {
  const shopsDir = path.join(tempDir, 'shops');
  const credentialsDir = path.join(shopsDir, 'credentials');

  fs.mkdirSync(shopsDir, { recursive: true });
  fs.mkdirSync(credentialsDir, { recursive: true });

  return {
    projectDir: tempDir,
    shopsDir,
    credentialsDir
  };
};

/**
 * Writes a shop config to the filesystem
 * @param shopsDir Shops directory path
 * @param shopId Shop identifier
 * @param config Shop configuration
 */
export const writeShopConfig = (
  shopsDir: string,
  shopId: string,
  config: ShopConfig
): void => {
  const configPath = path.join(shopsDir, `${shopId}.config.json`);
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
};

/**
 * Writes shop credentials to the filesystem
 * @param credentialsDir Credentials directory path
 * @param shopId Shop identifier
 * @param credentials Shop credentials
 */
export const writeShopCredentials = (
  credentialsDir: string,
  shopId: string,
  credentials: ShopCredentials
): void => {
  const credPath = path.join(credentialsDir, `${shopId}.credentials.json`);
  fs.writeFileSync(credPath, JSON.stringify(credentials, null, 2));

  // Set secure permissions where supported
  try {
    fs.chmodSync(credPath, 0o600);
  } catch {
    // Ignored on Windows
  }
};

/**
 * Reads a shop config from the filesystem
 * @param shopsDir Shops directory path
 * @param shopId Shop identifier
 * @returns Shop configuration or null if not found
 */
export const readShopConfig = (
  shopsDir: string,
  shopId: string
): ShopConfig | null => {
  const configPath = path.join(shopsDir, `${shopId}.config.json`);

  if (!fs.existsSync(configPath)) {
    return null;
  }

  const rawData = fs.readFileSync(configPath, 'utf8');
  return JSON.parse(rawData) as ShopConfig;
};

/**
 * Reads shop credentials from the filesystem
 * @param credentialsDir Credentials directory path
 * @param shopId Shop identifier
 * @returns Shop credentials or null if not found
 */
export const readShopCredentials = (
  credentialsDir: string,
  shopId: string
): ShopCredentials | null => {
  const credPath = path.join(credentialsDir, `${shopId}.credentials.json`);

  if (!fs.existsSync(credPath)) {
    return null;
  }

  const rawData = fs.readFileSync(credPath, 'utf8');
  return JSON.parse(rawData) as ShopCredentials;
};

/**
 * Creates a complete test shop setup
 * @param tempDir Base temp directory
 * @param shopId Shop identifier
 * @returns Paths and objects for testing
 */
export const createTestShop = (tempDir: string, shopId: string = 'test-shop') => {
  const paths = setupTestProject(tempDir);
  const config = createMockShopConfig(shopId);
  const credentials = createMockCredentials(shopId);

  writeShopConfig(paths.shopsDir, shopId, config);
  writeShopCredentials(paths.credentialsDir, shopId, credentials);

  return {
    ...paths,
    config,
    credentials,
    shopId
  };
};

/**
 * Waits for a specified amount of time
 * @param ms Milliseconds to wait
 */
export const wait = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Checks if a file exists
 * @param filePath Path to file
 * @returns True if file exists
 */
export const fileExists = (filePath: string): boolean => {
  return fs.existsSync(filePath);
};

/**
 * Checks if a directory exists
 * @param dirPath Path to directory
 * @returns True if directory exists
 */
export const dirExists = (dirPath: string): boolean => {
  return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
};

/**
 * Gets file permissions as octal string
 * @param filePath Path to file
 * @returns Permission string (e.g., "600") or null if not supported
 */
export const getFilePermissions = (filePath: string): string | null => {
  try {
    const stats = fs.statSync(filePath);
    const mode = (stats.mode & parseInt('777', 8)).toString(8);
    return mode;
  } catch {
    return null;
  }
};

/**
 * Mock function factory for testing
 * @returns Mock function with call tracking
 */
export const createMockFunction = <T extends (...args: any[]) => any>() => {
  const calls: Array<Parameters<T>> = [];
  let returnValue: ReturnType<T> | undefined;

  const mockFn = ((...args: Parameters<T>) => {
    calls.push(args);
    return returnValue;
  }) as T & { calls: Array<Parameters<T>>; mockReturnValue: (value: ReturnType<T>) => void };

  mockFn.calls = calls;
  mockFn.mockReturnValue = (value: ReturnType<T>) => {
    returnValue = value;
  };

  return mockFn;
};
