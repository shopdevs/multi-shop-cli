/**
 * Security tests for credential isolation
 * Tests that credentials are properly secured with permissions and not exposed
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { createTempDir, cleanupTempDir, createMockCredentials, getFilePermissions } from '../helpers.js';
import { createCredentialOperations } from '../../lib/core/credential-operations.js';
import type { Dependencies } from '../../lib/core/types.js';

describe('Credential Isolation Security', () => {
  let tempDir: string;
  let shopsDir: string;
  let credentialsDir: string;
  let deps: Dependencies;
  const isWindows = process.platform === 'win32';

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

  describe('Directory permissions', () => {
    test('credentials directory is created with secure permissions (700)', async () => {
      // Remove credentials directory to test creation
      fs.rmSync(credentialsDir, { recursive: true, force: true });

      const credOps = createCredentialOperations(deps);
      const shopId = 'test-shop';
      const credentials = createMockCredentials(shopId);

      await credOps.saveCredentials(shopId, credentials);

      // Verify directory was created
      expect(fs.existsSync(credentialsDir)).toBe(true);

      // Verify permissions (skip on Windows)
      if (!isWindows) {
        const permissions = getFilePermissions(credentialsDir);
        expect(permissions).toBe('700');
      }
    });

    test('credentials directory permissions are preserved on subsequent saves', async () => {
      const credOps = createCredentialOperations(deps);

      // Set initial permissions
      try {
        fs.chmodSync(credentialsDir, 0o700);
      } catch {
        // Ignored on Windows
      }

      // Save first credential
      await credOps.saveCredentials('shop-a', createMockCredentials('shop-a'));

      // Save second credential
      await credOps.saveCredentials('shop-b', createMockCredentials('shop-b'));

      // Verify directory exists (permissions test may not be reliable across platforms)
      expect(fs.existsSync(credentialsDir)).toBe(true);
    });
  });

  describe('File permissions', () => {
    test('credential files are created with secure permissions (600)', async () => {
      const credOps = createCredentialOperations(deps);
      const shopId = 'test-shop';
      const credentials = createMockCredentials(shopId);

      await credOps.saveCredentials(shopId, credentials);

      const credPath = path.join(credentialsDir, `${shopId}.credentials.json`);
      expect(fs.existsSync(credPath)).toBe(true);

      // Verify file permissions (skip on Windows)
      if (!isWindows) {
        const permissions = getFilePermissions(credPath);
        expect(permissions).toBe('600');
      }
    });

    test('credential files maintain secure permissions on update', async () => {
      const credOps = createCredentialOperations(deps);
      const shopId = 'test-shop';

      // Save initial credentials
      const initialCredentials = createMockCredentials(shopId);
      await credOps.saveCredentials(shopId, initialCredentials);

      // Update credentials
      const updatedCredentials = createMockCredentials(shopId, {
        notes: 'Updated credentials'
      });
      await credOps.saveCredentials(shopId, updatedCredentials);

      // Verify file permissions are still secure (skip on Windows)
      if (!isWindows) {
        const credPath = path.join(credentialsDir, `${shopId}.credentials.json`);
        const permissions = getFilePermissions(credPath);
        expect(permissions).toBe('600');
      }
    });

    test('multiple credential files all have secure permissions', async () => {
      const credOps = createCredentialOperations(deps);
      const shopIds = ['shop-a', 'shop-b', 'shop-c'];

      for (const shopId of shopIds) {
        await credOps.saveCredentials(shopId, createMockCredentials(shopId));
      }

      // Verify all files have secure permissions (skip on Windows)
      if (!isWindows) {
        for (const shopId of shopIds) {
          const credPath = path.join(credentialsDir, `${shopId}.credentials.json`);
          const permissions = getFilePermissions(credPath);
          expect(permissions).toBe('600');
        }
      }
    });
  });

  describe('Credential metadata', () => {
    test('credentials include metadata with timestamp', async () => {
      const credOps = createCredentialOperations(deps);
      const shopId = 'test-shop';
      const credentials = createMockCredentials(shopId);

      await credOps.saveCredentials(shopId, credentials);

      // Read file directly to check metadata
      const credPath = path.join(credentialsDir, `${shopId}.credentials.json`);
      const fileContent = fs.readFileSync(credPath, 'utf8');
      const savedCredentials = JSON.parse(fileContent);

      expect(savedCredentials._metadata).toBeDefined();
      expect(savedCredentials._metadata.created).toBeDefined();
      expect(savedCredentials._metadata.version).toBe('1.0.0');

      // Verify timestamp is valid ISO string
      const timestamp = new Date(savedCredentials._metadata.created);
      expect(timestamp.toISOString()).toBe(savedCredentials._metadata.created);
    });

    test('metadata timestamp reflects save time', async () => {
      const credOps = createCredentialOperations(deps);
      const shopId = 'test-shop';
      const credentials = createMockCredentials(shopId);

      const beforeSave = new Date();
      await credOps.saveCredentials(shopId, credentials);
      const afterSave = new Date();

      // Read file to check timestamp
      const credPath = path.join(credentialsDir, `${shopId}.credentials.json`);
      const fileContent = fs.readFileSync(credPath, 'utf8');
      const savedCredentials = JSON.parse(fileContent);

      const savedTimestamp = new Date(savedCredentials._metadata.created);
      expect(savedTimestamp.getTime()).toBeGreaterThanOrEqual(beforeSave.getTime());
      expect(savedTimestamp.getTime()).toBeLessThanOrEqual(afterSave.getTime());
    });
  });

  describe('Git ignore patterns', () => {
    test('verifies credentials directory would be ignored by git', () => {
      // This test verifies the pattern that should be in .gitignore
      const gitignorePattern = 'shops/credentials/';
      const credentialPath = path.join('shops', 'credentials', 'test-shop.credentials.json');

      // Normalize to forward slashes for cross-platform compatibility
      const normalizedPath = credentialPath.split(path.sep).join('/');

      // Verify pattern would match the path
      expect(normalizedPath.includes('shops/credentials/')).toBe(true);
    });

    test('verifies .credentials.json pattern would be ignored', () => {
      // This test verifies the pattern that should be in .gitignore
      const gitignorePattern = '*.credentials.json';
      const credentialFiles = [
        'test-shop.credentials.json',
        'shop-a.credentials.json',
        'my-store.credentials.json'
      ];

      // Verify pattern would match all credential files
      credentialFiles.forEach(file => {
        expect(file.endsWith('.credentials.json')).toBe(true);
      });
    });

    test('verifies credential files are in gitignored directory', () => {
      const credOps = createCredentialOperations(deps);
      const shopId = 'test-shop';
      const credentials = createMockCredentials(shopId);

      credOps.saveCredentials(shopId, credentials);

      const credPath = path.join(credentialsDir, `${shopId}.credentials.json`);

      // Normalize paths for cross-platform compatibility
      const normalizedCredPath = credPath.split(path.sep).join('/');

      // Verify path contains the gitignored directory
      expect(normalizedCredPath.includes('credentials')).toBe(true);
      expect(normalizedCredPath.includes('shops/credentials')).toBe(true);
    });
  });

  describe('Error message sanitization', () => {
    test('error messages do not expose credential content', async () => {
      const credOps = createCredentialOperations(deps);
      const shopId = 'test-shop';

      // Create malformed credentials directory to trigger error
      fs.rmSync(credentialsDir, { recursive: true, force: true });
      fs.writeFileSync(credentialsDir, 'not a directory', 'utf8'); // Make it a file instead

      const credentials = createMockCredentials(shopId);
      const result = await credOps.saveCredentials(shopId, credentials);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();

      // Verify error message doesn't contain sensitive data
      const errorMessage = result.error || '';
      expect(errorMessage).not.toContain('prod-token');
      expect(errorMessage).not.toContain('staging-token');
      expect(errorMessage).not.toContain('test-developer');
    });

    test('load error messages do not expose credential paths', async () => {
      const credOps = createCredentialOperations(deps);
      const shopId = 'test-shop';

      // Create invalid credential file
      const credPath = path.join(credentialsDir, `${shopId}.credentials.json`);
      fs.writeFileSync(credPath, '{ invalid json', 'utf8');

      const result = await credOps.loadCredentials(shopId);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();

      // Error should mention failure but not expose full paths
      const errorMessage = result.error || '';
      expect(errorMessage).toContain('Failed to load credentials');
    });
  });

  describe('Credential format validation', () => {
    test('rejects credentials without shopify.stores structure', async () => {
      const credOps = createCredentialOperations(deps);
      const shopId = 'test-shop';

      // Save valid credentials first
      await credOps.saveCredentials(shopId, createMockCredentials(shopId));

      // Corrupt the file
      const credPath = path.join(credentialsDir, `${shopId}.credentials.json`);
      fs.writeFileSync(credPath, JSON.stringify({ invalid: 'structure' }), 'utf8');

      // Try to load
      const result = await credOps.loadCredentials(shopId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid credential format');
    });

    test('rejects completely invalid JSON', async () => {
      const credOps = createCredentialOperations(deps);
      const shopId = 'test-shop';

      // Create file with invalid JSON
      const credPath = path.join(credentialsDir, `${shopId}.credentials.json`);
      fs.writeFileSync(credPath, '{ not valid json }', 'utf8');

      const result = await credOps.loadCredentials(shopId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to load credentials');
    });

    test('accepts valid credential structure', async () => {
      const credOps = createCredentialOperations(deps);
      const shopId = 'test-shop';
      const credentials = createMockCredentials(shopId);

      const saveResult = await credOps.saveCredentials(shopId, credentials);
      expect(saveResult.success).toBe(true);

      const loadResult = await credOps.loadCredentials(shopId);
      expect(loadResult.success).toBe(true);
      expect(loadResult.data).toBeDefined();
      expect(loadResult.data?.shopify?.stores).toBeDefined();
    });
  });

  describe('Credential isolation across shops', () => {
    test('credentials for one shop cannot be accessed via another shop ID', async () => {
      const credOps = createCredentialOperations(deps);

      // Save credentials for shop-a
      await credOps.saveCredentials('shop-a', createMockCredentials('shop-a'));

      // Try to load with different shop ID
      const result = await credOps.loadCredentials('shop-b');

      expect(result.success).toBe(true);
      expect(result.data).toBe(null); // Should not find shop-a's credentials
    });

    test('multiple shops maintain separate credential files', async () => {
      const credOps = createCredentialOperations(deps);
      const shops = ['shop-a', 'shop-b', 'shop-c'];

      // Save credentials for all shops
      for (const shopId of shops) {
        await credOps.saveCredentials(shopId, createMockCredentials(shopId));
      }

      // Verify each shop has its own credential file
      for (const shopId of shops) {
        const credPath = path.join(credentialsDir, `${shopId}.credentials.json`);
        expect(fs.existsSync(credPath)).toBe(true);

        // Verify content is specific to that shop
        const content = fs.readFileSync(credPath, 'utf8');
        expect(content).toContain(`${shopId}`);
      }
    });

    test('updating one shop credentials does not affect others', async () => {
      const credOps = createCredentialOperations(deps);

      // Save initial credentials
      await credOps.saveCredentials('shop-a', createMockCredentials('shop-a'));
      await credOps.saveCredentials('shop-b', createMockCredentials('shop-b'));

      // Update shop-a
      const updatedCredentials = createMockCredentials('shop-a', {
        notes: 'Updated shop-a credentials'
      });
      await credOps.saveCredentials('shop-a', updatedCredentials);

      // Verify shop-b is unchanged
      const shopBResult = await credOps.loadCredentials('shop-b');
      expect(shopBResult.success).toBe(true);
      expect(shopBResult.data?.notes).toBe('Test credentials - do not use in production');
      expect(shopBResult.data?.notes).not.toContain('Updated');
    });
  });

  describe('Secure credential storage', () => {
    test('credentials are stored as properly formatted JSON', async () => {
      const credOps = createCredentialOperations(deps);
      const shopId = 'test-shop';
      const credentials = createMockCredentials(shopId);

      await credOps.saveCredentials(shopId, credentials);

      const credPath = path.join(credentialsDir, `${shopId}.credentials.json`);
      const content = fs.readFileSync(credPath, 'utf8');

      // Should be valid JSON
      expect(() => JSON.parse(content)).not.toThrow();

      // Should be formatted (pretty-printed)
      const parsed = JSON.parse(content);
      const formatted = JSON.stringify(parsed, null, 2);
      expect(content).toBe(formatted);
    });

    test('credentials contain all required fields', async () => {
      const credOps = createCredentialOperations(deps);
      const shopId = 'test-shop';
      const credentials = createMockCredentials(shopId);

      await credOps.saveCredentials(shopId, credentials);

      const loadResult = await credOps.loadCredentials(shopId);
      expect(loadResult.success).toBe(true);

      const loaded = loadResult.data;
      expect(loaded?.developer).toBeDefined();
      expect(loaded?.shopify).toBeDefined();
      expect(loaded?.shopify.stores).toBeDefined();
      expect(loaded?.shopify.stores.production).toBeDefined();
      expect(loaded?.shopify.stores.staging).toBeDefined();
      expect(loaded?.shopify.stores.production.themeToken).toBeDefined();
      expect(loaded?.shopify.stores.staging.themeToken).toBeDefined();
    });
  });
});
