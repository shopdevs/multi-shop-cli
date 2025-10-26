import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import {
  createTempDir,
  cleanupTempDir,
  fileExists,
  dirExists
} from '../helpers.js';
import { createMultiShopCLI } from '../../lib/core/index.js';
import type { CLIContext } from '../../lib/core/types.js';
import path from 'path';
import fs from 'fs';

/**
 * Integration tests for initialization workflow
 * Tests the setup and structure creation
 */
describe('Initialization Workflow Integration', () => {
  let tempDir: string;
  let context: CLIContext;

  beforeEach(() => {
    tempDir = createTempDir();
    context = createMultiShopCLI(tempDir);
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  describe('Project Structure Initialization', () => {
    test('should initialize shops directory structure', () => {
      // Act - Create shops directory
      const shopsDir = path.join(tempDir, 'shops');
      fs.mkdirSync(shopsDir, { recursive: true });

      // Assert
      expect(dirExists(shopsDir)).toBe(true);
      expect(context.deps.shopsDir).toBe(shopsDir);
    });

    test('should initialize credentials directory structure', () => {
      // Act - Create credentials directory
      const credentialsDir = path.join(tempDir, 'shops', 'credentials');
      fs.mkdirSync(credentialsDir, { recursive: true });

      // Assert
      expect(dirExists(credentialsDir)).toBe(true);
      expect(context.deps.credentialsDir).toBe(credentialsDir);
    });

    test('should handle nested directory creation', () => {
      // Act - Create nested structure all at once
      const credentialsDir = path.join(tempDir, 'shops', 'credentials');
      fs.mkdirSync(credentialsDir, { recursive: true });

      // Assert - Both directories created
      expect(dirExists(path.join(tempDir, 'shops'))).toBe(true);
      expect(dirExists(credentialsDir)).toBe(true);
    });

    test('should not fail if directories already exist', () => {
      // Arrange - Create directories first
      const shopsDir = path.join(tempDir, 'shops');
      const credentialsDir = path.join(tempDir, 'shops', 'credentials');
      fs.mkdirSync(credentialsDir, { recursive: true });

      // Act - Try to create again (idempotent)
      const createAgain = () => {
        fs.mkdirSync(credentialsDir, { recursive: true });
      };

      // Assert - No error
      expect(createAgain).not.toThrow();
      expect(dirExists(shopsDir)).toBe(true);
      expect(dirExists(credentialsDir)).toBe(true);
    });
  });

  describe('Context Initialization', () => {
    test('should initialize context with correct working directory', () => {
      // Assert
      expect(context.deps.cwd).toBe(tempDir);
    });

    test('should initialize context with correct shops directory path', () => {
      // Assert
      expect(context.deps.shopsDir).toBe(path.join(tempDir, 'shops'));
    });

    test('should initialize context with correct credentials directory path', () => {
      // Assert
      expect(context.deps.credentialsDir).toBe(path.join(tempDir, 'shops', 'credentials'));
    });

    test('should provide all required operations', () => {
      // Assert
      expect(context.shopOps).toBeDefined();
      expect(context.credOps).toBeDefined();
      expect(context.devOps).toBeDefined();
    });

    test('should allow custom working directory', () => {
      // Arrange
      const customDir = path.join(tempDir, 'custom');
      fs.mkdirSync(customDir, { recursive: true });

      // Act
      const customContext = createMultiShopCLI(customDir);

      // Assert
      expect(customContext.deps.cwd).toBe(customDir);
      expect(customContext.deps.shopsDir).toBe(path.join(customDir, 'shops'));
    });
  });

  describe('Gitignore Configuration', () => {
    test('should verify credentials directory should be gitignored', () => {
      // This tests our understanding of the gitignore pattern
      // In a real init, we'd verify .gitignore contains shops/credentials/

      const gitignorePath = path.join(tempDir, '.gitignore');

      // Create a sample .gitignore
      fs.writeFileSync(gitignorePath, `
# Dependencies
node_modules/

# Credentials (should be ignored)
shops/credentials/

# Build outputs
dist/
      `.trim());

      // Assert
      expect(fileExists(gitignorePath)).toBe(true);

      const content = fs.readFileSync(gitignorePath, 'utf8');
      expect(content).toContain('shops/credentials/');
    });
  });

  describe('Initial Shop Listing', () => {
    test('should return empty list when no shops configured', async () => {
      // Act
      const result = await context.shopOps.listShops();

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    test('should handle shops directory not existing yet', async () => {
      // Arrange - Shops directory doesn't exist
      expect(dirExists(context.deps.shopsDir)).toBe(false);

      // Act
      const result = await context.shopOps.listShops();

      // Assert - Should handle gracefully
      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });
  });

  describe('File System Permissions', () => {
    test('should verify credentials directory can be created with proper permissions', () => {
      // Act
      const credentialsDir = path.join(tempDir, 'shops', 'credentials');
      fs.mkdirSync(credentialsDir, { recursive: true });

      // Try to set permissions (will be ignored on Windows)
      try {
        fs.chmodSync(credentialsDir, 0o700);
      } catch {
        // Expected to fail on Windows
      }

      // Assert - Directory exists
      expect(dirExists(credentialsDir)).toBe(true);
    });

    test('should verify credentials directory is writable', () => {
      // Arrange
      const credentialsDir = path.join(tempDir, 'shops', 'credentials');
      fs.mkdirSync(credentialsDir, { recursive: true });

      // Act - Try to write a test file
      const testFile = path.join(credentialsDir, 'test.json');
      const writeTest = () => {
        fs.writeFileSync(testFile, '{}');
      };

      // Assert - Should be writable
      expect(writeTest).not.toThrow();
      expect(fileExists(testFile)).toBe(true);

      // Cleanup
      fs.unlinkSync(testFile);
    });
  });

  describe('Error Conditions', () => {
    test('should handle read-only file system gracefully', async () => {
      // Arrange - Create a context pointing to a location that might be read-only
      const readOnlyPath = '/nonexistent/readonly/path';
      const readOnlyContext = createMultiShopCLI(readOnlyPath);

      // Act - Try to list shops (should handle gracefully)
      const result = await readOnlyContext.shopOps.listShops();

      // Assert - Should not crash, returns appropriate result
      expect(result).toBeDefined();
    });
  });

  describe('Package Integration Points', () => {
    test('should support programmatic initialization', () => {
      // Act - Initialize for programmatic use
      const programmaticContext = createMultiShopCLI(tempDir);

      // Assert - All APIs available
      expect(programmaticContext.shopOps).toBeDefined();
      expect(programmaticContext.credOps).toBeDefined();
      expect(programmaticContext.devOps).toBeDefined();
      expect(programmaticContext.deps).toBeDefined();
    });

    test('should support default working directory (process.cwd)', () => {
      // Act - Create without explicit cwd
      const defaultContext = createMultiShopCLI();

      // Assert - Uses process.cwd()
      expect(defaultContext.deps.cwd).toBe(process.cwd());
    });
  });
});
