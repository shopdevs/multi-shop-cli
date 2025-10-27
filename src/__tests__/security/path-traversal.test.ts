/**
 * Security tests for path traversal protection
 * Tests that shop IDs cannot be used to escape the credentials directory
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { createTempDir, cleanupTempDir, createMockCredentials } from '../helpers.js';
import { createCredentialOperations } from '../../lib/core/credential-operations.js';
import type { Dependencies } from '../../lib/core/types.js';

describe('Path Traversal Security', () => {
  let tempDir: string;
  let shopsDir: string;
  let credentialsDir: string;
  let deps: Dependencies;

  beforeEach(() => {
    tempDir = createTempDir();
    shopsDir = path.join(tempDir, 'shops');
    credentialsDir = path.join(shopsDir, 'credentials');

    fs.mkdirSync(shopsDir, { recursive: true });
    fs.mkdirSync(credentialsDir, { recursive: true });

    deps = {
      cwd: tempDir,
      shopsDir,
      credentialsDir
    };
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  describe('Shop ID sanitization', () => {
    test('rejects shop IDs with parent directory traversal (../)', async () => {
      const credOps = createCredentialOperations(deps);
      const maliciousShopId = '../../../etc/passwd';
      const credentials = createMockCredentials('test-shop');

      const result = await credOps.saveCredentials(maliciousShopId, credentials);

      expect(result.success).toBe(false);
      expect(result.error).toContain('invalid characters');
    });

    test('rejects shop IDs with single parent directory (..)', async () => {
      const credOps = createCredentialOperations(deps);
      const maliciousShopId = '..';
      const credentials = createMockCredentials('test-shop');

      const result = await credOps.saveCredentials(maliciousShopId, credentials);

      expect(result.success).toBe(false);
      expect(result.error).toContain('invalid characters');
    });

    test('rejects shop IDs with double dots in middle', async () => {
      const credOps = createCredentialOperations(deps);
      const maliciousShopId = 'shop..id';
      const credentials = createMockCredentials('test-shop');

      const result = await credOps.saveCredentials(maliciousShopId, credentials);

      expect(result.success).toBe(false);
      expect(result.error).toContain('invalid characters');
    });

    test('rejects shop IDs with forward slashes', async () => {
      const credOps = createCredentialOperations(deps);
      const maliciousShopId = 'shop/id';
      const credentials = createMockCredentials('test-shop');

      const result = await credOps.saveCredentials(maliciousShopId, credentials);

      expect(result.success).toBe(false);
      expect(result.error).toContain('invalid characters');
    });

    test('rejects shop IDs with backslashes (Windows path traversal)', async () => {
      const credOps = createCredentialOperations(deps);
      const maliciousShopId = 'shop\\id';
      const credentials = createMockCredentials('test-shop');

      const result = await credOps.saveCredentials(maliciousShopId, credentials);

      expect(result.success).toBe(false);
      expect(result.error).toContain('invalid characters');
    });

    test('rejects absolute paths (Unix)', async () => {
      const credOps = createCredentialOperations(deps);
      const maliciousShopId = '/etc/passwd';
      const credentials = createMockCredentials('test-shop');

      const result = await credOps.saveCredentials(maliciousShopId, credentials);

      expect(result.success).toBe(false);
      expect(result.error).toContain('invalid characters');
    });

    test('rejects absolute paths (Windows)', async () => {
      const credOps = createCredentialOperations(deps);
      const maliciousShopId = 'C:\\Windows\\System32';
      const credentials = createMockCredentials('test-shop');

      const result = await credOps.saveCredentials(maliciousShopId, credentials);

      expect(result.success).toBe(false);
      expect(result.error).toContain('invalid characters');
    });

    test('rejects shop IDs with special characters', async () => {
      const credOps = createCredentialOperations(deps);
      const specialChars = ['@', '#', '$', '%', '^', '&', '*', '(', ')', '+', '=', '[', ']', '{', '}', '|', ';', ':', "'", '"', '<', '>', '?', ',', '`', '~'];

      for (const char of specialChars) {
        const maliciousShopId = `shop${char}id`;
        const credentials = createMockCredentials('test-shop');

        const result = await credOps.saveCredentials(maliciousShopId, credentials);

        expect(result.success).toBe(false);
        expect(result.error).toContain('invalid characters');
      }
    });

    test('rejects shop IDs starting with dot (.credentials.json)', async () => {
      const credOps = createCredentialOperations(deps);
      const maliciousShopId = '.credentials.json';
      const credentials = createMockCredentials('test-shop');

      const result = await credOps.saveCredentials(maliciousShopId, credentials);

      expect(result.success).toBe(false);
      expect(result.error).toContain('invalid characters');
    });

    test('rejects empty shop IDs', async () => {
      const credOps = createCredentialOperations(deps);
      const maliciousShopId = '';
      const credentials = createMockCredentials('test-shop');

      const result = await credOps.saveCredentials(maliciousShopId, credentials);

      expect(result.success).toBe(false);
      expect(result.error).toContain('invalid characters');
    });

    test('rejects shop IDs exceeding max length (50 chars)', async () => {
      const credOps = createCredentialOperations(deps);
      const maliciousShopId = 'a'.repeat(51);
      const credentials = createMockCredentials('test-shop');

      const result = await credOps.saveCredentials(maliciousShopId, credentials);

      expect(result.success).toBe(false);
      expect(result.error).toContain('invalid characters');
    });

    test('accepts valid shop IDs', async () => {
      const credOps = createCredentialOperations(deps);
      const validShopIds = ['shop-a', 'test-shop-123', 'my-store', 'shop1', 'a'];

      for (const shopId of validShopIds) {
        const credentials = createMockCredentials(shopId);
        const result = await credOps.saveCredentials(shopId, credentials);

        expect(result.success).toBe(true);

        // Verify file was created in correct location
        const expectedPath = path.join(credentialsDir, `${shopId}.credentials.json`);
        expect(fs.existsSync(expectedPath)).toBe(true);
      }
    });
  });

  describe('Path resolution stays within bounds', () => {
    test('credential path stays within credentials directory for valid shop ID', async () => {
      const credOps = createCredentialOperations(deps);
      const shopId = 'valid-shop';
      const credentials = createMockCredentials(shopId);

      const result = await credOps.saveCredentials(shopId, credentials);

      expect(result.success).toBe(true);

      // Verify path stays within credentials directory
      const expectedPath = path.join(credentialsDir, `${shopId}.credentials.json`);
      const resolvedPath = path.resolve(expectedPath);
      const resolvedCredentialsDir = path.resolve(credentialsDir);

      expect(resolvedPath.startsWith(resolvedCredentialsDir)).toBe(true);
      expect(fs.existsSync(resolvedPath)).toBe(true);
    });

    test('credential path cannot escape to parent directory', async () => {
      const credOps = createCredentialOperations(deps);
      const maliciousShopId = '../escape';
      const credentials = createMockCredentials('test-shop');

      const result = await credOps.saveCredentials(maliciousShopId, credentials);

      expect(result.success).toBe(false);

      // Verify no file was created outside credentials directory
      const potentialEscapePath = path.join(shopsDir, 'escape.credentials.json');
      expect(fs.existsSync(potentialEscapePath)).toBe(false);
    });

    test('credential path cannot escape to system directories', async () => {
      const credOps = createCredentialOperations(deps);
      const maliciousShopId = '../../../etc/malicious';
      const credentials = createMockCredentials('test-shop');

      const result = await credOps.saveCredentials(maliciousShopId, credentials);

      expect(result.success).toBe(false);

      // Verify no file was created in system directories
      // We can't check /etc/malicious on all systems, but we verified the operation failed
      expect(result.error).toContain('invalid characters');
    });
  });

  describe('Load credentials path traversal', () => {
    test('rejects loading credentials with path traversal', async () => {
      const credOps = createCredentialOperations(deps);
      const maliciousShopId = '../../../etc/passwd';

      const result = await credOps.loadCredentials(maliciousShopId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('invalid characters');
    });

    test('rejects loading credentials with special characters', async () => {
      const credOps = createCredentialOperations(deps);
      const maliciousShopId = 'shop@malicious';

      const result = await credOps.loadCredentials(maliciousShopId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('invalid characters');
    });

    test('returns null for non-existent valid shop ID', async () => {
      const credOps = createCredentialOperations(deps);
      const shopId = 'non-existent-shop';

      const result = await credOps.loadCredentials(shopId);

      expect(result.success).toBe(true);
      expect(result.data).toBe(null);
    });

    test('loads credentials successfully for valid shop ID', async () => {
      const credOps = createCredentialOperations(deps);
      const shopId = 'valid-shop';
      const credentials = createMockCredentials(shopId);

      // First save credentials
      const saveResult = await credOps.saveCredentials(shopId, credentials);
      expect(saveResult.success).toBe(true);

      // Then load them
      const loadResult = await credOps.loadCredentials(shopId);

      expect(loadResult.success).toBe(true);
      expect(loadResult.data).toBeDefined();
      expect(loadResult.data?.developer).toBe('test-developer');
    });
  });

  describe('Real file system verification', () => {
    test('verifies files are created only within credentials directory', async () => {
      const credOps = createCredentialOperations(deps);
      const shopId = 'test-shop';
      const credentials = createMockCredentials(shopId);

      await credOps.saveCredentials(shopId, credentials);

      // List all files in temp directory structure
      const allFiles: string[] = [];
      const walkDir = (dir: string) => {
        const files = fs.readdirSync(dir);
        files.forEach(file => {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);
          if (stat.isDirectory()) {
            walkDir(filePath);
          } else {
            allFiles.push(filePath);
          }
        });
      };
      walkDir(tempDir);

      // Verify only one credential file exists and it's in the correct location
      const credentialFiles = allFiles.filter(f => f.endsWith('.credentials.json'));
      expect(credentialFiles).toHaveLength(1);
      expect(credentialFiles[0]).toBe(path.join(credentialsDir, `${shopId}.credentials.json`));
    });

    test('verifies malicious shop IDs create no files', async () => {
      const credOps = createCredentialOperations(deps);
      const maliciousShopIds = [
        '../../../etc/passwd',
        '..',
        '../escape',
        'shop/id',
        'shop\\id',
        '/etc/passwd',
        '.credentials.json'
      ];

      for (const shopId of maliciousShopIds) {
        const credentials = createMockCredentials('test-shop');
        await credOps.saveCredentials(shopId, credentials);
      }

      // List all files in temp directory structure
      const allFiles: string[] = [];
      const walkDir = (dir: string) => {
        const files = fs.readdirSync(dir);
        files.forEach(file => {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);
          if (stat.isDirectory()) {
            walkDir(filePath);
          } else {
            allFiles.push(filePath);
          }
        });
      };
      walkDir(tempDir);

      // Verify no credential files were created
      const credentialFiles = allFiles.filter(f => f.endsWith('.credentials.json'));
      expect(credentialFiles).toHaveLength(0);
    });
  });
});
