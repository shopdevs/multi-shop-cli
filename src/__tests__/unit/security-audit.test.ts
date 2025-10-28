import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import {
  createTempDir,
  cleanupTempDir,
  setupTestProject,
  writeShopConfig,
  writeShopCredentials,
  createMockShopConfig,
  createMockCredentials
} from '../helpers.js';
import { runSecurityAudit, formatAuditReport } from '../../lib/core/security-audit.js';
import type { Dependencies } from '../../lib/core/types.js';
import fs from 'fs';
import path from 'path';

/**
 * Unit tests for security audit functionality
 */
describe('Security Audit', () => {
  let tempDir: string;
  let deps: Dependencies;

  beforeEach(() => {
    tempDir = createTempDir();
    const paths = setupTestProject(tempDir);
    deps = {
      cwd: tempDir,
      shopsDir: paths.shopsDir,
      credentialsDir: paths.credentialsDir
    };
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  describe('runSecurityAudit', () => {
    test('should return success for empty project', async () => {
      // Act
      const result = await runSecurityAudit(deps);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.shops).toEqual([]);
    });

    test('should audit shops with credentials', async () => {
      // Arrange
      const shopId = 'test-shop';
      writeShopConfig(deps.shopsDir, shopId, createMockShopConfig(shopId));
      writeShopCredentials(deps.credentialsDir, shopId, createMockCredentials(shopId));

      // Act
      const result = await runSecurityAudit(deps);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.shops).toHaveLength(1);
      expect(result.data?.shops[0]?.shopId).toBe(shopId);
    });

    test('should verify credential file permissions', async () => {
      // Arrange
      const shopId = 'test-shop';
      writeShopConfig(deps.shopsDir, shopId, createMockShopConfig(shopId));
      writeShopCredentials(deps.credentialsDir, shopId, createMockCredentials(shopId));

      // Act
      const result = await runSecurityAudit(deps);

      // Assert
      expect(result.success).toBe(true);
      const shopAudit = result.data?.shops.find(s => s.shopId === shopId);
      expect(shopAudit).toBeDefined();
      expect(shopAudit?.filePermissions).toBeDefined();
    });

    test('should detect missing credentials', async () => {
      // Arrange - Config exists but no credentials
      const shopId = 'no-creds-shop';
      writeShopConfig(deps.shopsDir, shopId, createMockShopConfig(shopId));

      // Act
      const result = await runSecurityAudit(deps);

      // Assert
      expect(result.success).toBe(true);
      const shopAudit = result.data?.shops.find(s => s.shopId === shopId);
      expect(shopAudit?.shopId).toBe(shopId);
      expect(shopAudit?.filePermissions).toBe('none');
      expect(shopAudit?.hasProduction).toBe(false);
      expect(shopAudit?.hasStaging).toBe(false);
    });

    test('should check gitignore for credentials pattern', async () => {
      // Arrange - No .gitignore
      // Act
      const result = await runSecurityAudit(deps);

      // Assert
      expect(result.success).toBe(true);
      const gitignoreIssue = result.data?.issues.find(i =>
        i.message.includes('gitignore') || i.message.includes('.gitignore')
      );
      expect(gitignoreIssue).toBeDefined();
      expect(gitignoreIssue?.level).toBe('error');
    });

    test('should pass when gitignore properly configured', async () => {
      // Arrange - Create proper .gitignore
      const gitignorePath = path.join(deps.cwd, '.gitignore');
      fs.writeFileSync(gitignorePath, `
node_modules/
dist/
shops/credentials/
      `.trim());

      // Act
      const result = await runSecurityAudit(deps);

      // Assert
      expect(result.success).toBe(true);
      const gitignoreIssue = result.data?.issues.find(i =>
        i.message.includes('gitignore') || i.message.includes('.gitignore')
      );
      expect(gitignoreIssue).toBeUndefined(); // No issue when properly configured
    });

    test('should audit multiple shops', async () => {
      // Arrange
      const shopIds = ['shop-a', 'shop-b', 'shop-c'];
      for (const shopId of shopIds) {
        writeShopConfig(deps.shopsDir, shopId, createMockShopConfig(shopId));
        writeShopCredentials(deps.credentialsDir, shopId, createMockCredentials(shopId));
      }

      // Act
      const result = await runSecurityAudit(deps);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.shops).toHaveLength(3);
      expect(result.data?.shops.map(s => s.shopId)).toEqual(expect.arrayContaining(shopIds));
    });

    test('should verify production and staging tokens', async () => {
      // Arrange
      const shopId = 'test-shop';
      writeShopConfig(deps.shopsDir, shopId, createMockShopConfig(shopId));
      writeShopCredentials(deps.credentialsDir, shopId, createMockCredentials(shopId));

      // Act
      const result = await runSecurityAudit(deps);

      // Assert
      const shopAudit = result.data?.shops[0];
      expect(shopAudit?.hasProduction).toBe(true);
      expect(shopAudit?.hasStaging).toBe(true);
    });

    test('should detect missing staging credentials', async () => {
      // Arrange
      const shopId = 'partial-creds';
      writeShopConfig(deps.shopsDir, shopId, createMockShopConfig(shopId));
      const partialCreds = createMockCredentials(shopId);
      // Remove staging token
      const credsWithoutStaging = {
        ...partialCreds,
        shopify: {
          stores: {
            production: partialCreds.shopify.stores.production,
            staging: { themeToken: '' } // Empty staging token
          }
        }
      };
      writeShopCredentials(deps.credentialsDir, shopId, credsWithoutStaging);

      // Act
      const result = await runSecurityAudit(deps);

      // Assert
      const shopAudit = result.data?.shops[0];
      expect(shopAudit?.hasProduction).toBe(true);
      expect(shopAudit?.hasStaging).toBe(false);
    });

    test('should include timestamp in report', async () => {
      // Act
      const result = await runSecurityAudit(deps);

      // Assert
      expect(result.data?.timestamp).toBeDefined();
      expect(new Date(result.data?.timestamp ?? '').getTime()).toBeLessThanOrEqual(Date.now());
    });

    test('should generate recommendations', async () => {
      // Act
      const result = await runSecurityAudit(deps);

      // Assert
      expect(result.data?.recommendations).toBeDefined();
      expect(Array.isArray(result.data?.recommendations)).toBe(true);
    });

    test('should categorize issues by level', async () => {
      // Arrange - Create problematic setup (no gitignore)
      const shopId = 'test-shop';
      writeShopConfig(deps.shopsDir, shopId, createMockShopConfig(shopId));

      // Act
      const result = await runSecurityAudit(deps);

      // Assert
      expect(result.data?.issues).toBeDefined();
      const errorIssues = result.data?.issues.filter(i => i.level === 'error');
      expect(errorIssues!.length).toBeGreaterThan(0); // Should have gitignore error
    });
  });

  describe('formatAuditReport', () => {
    test('should format report with no shops', async () => {
      // Arrange
      const result = await runSecurityAudit(deps);

      // Act
      const formatted = formatAuditReport(result.data!);

      // Assert
      expect(formatted).toContain('Security Audit Report');
      expect(formatted).toContain('No shops configured');
    });

    test('should format report with shops', async () => {
      // Arrange
      const shopId = 'test-shop';
      writeShopConfig(deps.shopsDir, shopId, createMockShopConfig(shopId));
      writeShopCredentials(deps.credentialsDir, shopId, createMockCredentials(shopId));

      const result = await runSecurityAudit(deps);

      // Act
      const formatted = formatAuditReport(result.data!);

      // Assert
      expect(formatted).toContain('Security Audit Report');
      expect(formatted).toContain(shopId);
      expect(formatted).toContain('Permissions');
      expect(formatted).toContain('Production Token');
      expect(formatted).toContain('Staging Token');
    });

    test('should format error issues', async () => {
      // Arrange - No gitignore
      const result = await runSecurityAudit(deps);

      // Act
      const formatted = formatAuditReport(result.data!);

      // Assert
      expect(formatted).toContain('Issues Found');
      expect(formatted).toContain('Errors');
    });

    test('should format recommendations', async () => {
      // Arrange
      const result = await runSecurityAudit(deps);

      // Act
      const formatted = formatAuditReport(result.data!);

      // Assert
      expect(formatted).toContain('Recommendations');
    });

    test('should show clean report when no issues', async () => {
      // Arrange - Proper gitignore, shop config, and credentials with metadata
      const gitignorePath = path.join(deps.cwd, '.gitignore');
      fs.writeFileSync(gitignorePath, 'shops/credentials/\n');

      const shopId = 'test-shop';
      writeShopConfig(deps.shopsDir, shopId, createMockShopConfig(shopId));

      // Write credentials with metadata for clean audit
      const credsWithMetadata = {
        ...createMockCredentials(shopId),
        _metadata: {
          created: new Date().toISOString(),
          version: '1.0.0'
        }
      };
      const credPath = path.join(deps.credentialsDir, `${shopId}.credentials.json`);
      fs.writeFileSync(credPath, JSON.stringify(credsWithMetadata, null, 2));
      // Set proper file permissions (600)
      fs.chmodSync(credPath, 0o600);
      // Set proper directory permissions (700)
      fs.chmodSync(deps.credentialsDir, 0o700);

      const result = await runSecurityAudit(deps);

      // Act
      const formatted = formatAuditReport(result.data!);

      // Assert
      expect(formatted).toContain('No issues detected');
    });
  });

  describe('Integrity Checking', () => {
    test('should mark credentials without metadata as not integrity valid', async () => {
      // Arrange - Credentials without _metadata
      const shopId = 'old-format-shop';
      writeShopConfig(deps.shopsDir, shopId, createMockShopConfig(shopId));
      const oldCreds = {
        developer: 'test-dev',
        shopify: {
          stores: {
            production: { themeToken: 'token1' },
            staging: { themeToken: 'token2' }
          }
        }
      };
      const credPath = path.join(deps.credentialsDir, `${shopId}.credentials.json`);
      fs.writeFileSync(credPath, JSON.stringify(oldCreds, null, 2));

      // Act
      const result = await runSecurityAudit(deps);

      // Assert
      const shopAudit = result.data?.shops.find(s => s.shopId === shopId);
      expect(shopAudit?.integrityValid).toBe(false);
    });

    test('should mark credentials with metadata as integrity valid', async () => {
      // Arrange - Write both config and credentials with metadata
      const shopId = 'new-format-shop';
      writeShopConfig(deps.shopsDir, shopId, createMockShopConfig(shopId));

      const credsWithMetadata = {
        ...createMockCredentials(shopId),
        _metadata: {
          created: new Date().toISOString(),
          version: '1.0.0'
        }
      };
      const credPath = path.join(deps.credentialsDir, `${shopId}.credentials.json`);
      fs.writeFileSync(credPath, JSON.stringify(credsWithMetadata, null, 2));

      // Act
      const result = await runSecurityAudit(deps);

      // Assert
      const shopAudit = result.data?.shops.find(s => s.shopId === shopId);
      expect(shopAudit).toBeDefined();
      expect(shopAudit?.integrityValid).toBe(true);
    });
  });

  describe('Recommendation Generation', () => {
    test('should recommend gitignore update when missing', async () => {
      // Act
      const result = await runSecurityAudit(deps);

      // Assert
      expect(result.data?.recommendations.some(r =>
        r.includes('gitignore') || r.includes('.gitignore')
      )).toBe(true);
    });

    test('should show success message when no critical issues', async () => {
      // Arrange - Proper setup with gitignore and a shop
      const gitignorePath = path.join(deps.cwd, '.gitignore');
      fs.writeFileSync(gitignorePath, 'shops/credentials/\n');

      // Initialize git repo to pass git history check
      fs.mkdirSync(path.join(deps.cwd, '.git'), { recursive: true });

      // Act
      const result = await runSecurityAudit(deps);

      // Assert
      expect(result.success).toBe(true);
      // Should have recommendations (even if just success message)
      expect(result.data?.recommendations.length).toBeGreaterThan(0);
    });
  });
});
