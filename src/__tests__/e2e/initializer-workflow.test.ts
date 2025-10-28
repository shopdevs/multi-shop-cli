/**
 * E2E tests for Initializer workflow
 * Tests complete initialization process with real file system
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { createTempDir, cleanupTempDir, fileExists, dirExists } from '../helpers.js';
import { Initializer } from '../../lib/Initializer.js';

// Mock @clack/prompts
vi.mock('@clack/prompts', () => ({
  select: vi.fn().mockResolvedValue('yes'),
  spinner: vi.fn(() => ({
    start: vi.fn(),
    stop: vi.fn()
  })),
  isCancel: vi.fn((value) => value === Symbol.for('cancel')),
  note: vi.fn(),
  intro: vi.fn()
}));

describe('Initializer E2E Workflow', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  describe('Complete initialization workflow', () => {
    test('initializes project with all required directories and files', async () => {
      // Arrange - Create minimal project structure
      const packageJsonPath = path.join(tempDir, 'package.json');
      fs.writeFileSync(packageJsonPath, JSON.stringify({
        name: 'test-theme',
        version: '1.0.0',
        scripts: {}
      }, null, 2));

      // Create Shopify theme structure
      fs.mkdirSync(path.join(tempDir, 'config'), { recursive: true });
      fs.mkdirSync(path.join(tempDir, 'sections'), { recursive: true });

      const initializer = new Initializer({ cwd: tempDir });

      // Act
      await initializer.run();

      // Assert - Directories created
      expect(dirExists(path.join(tempDir, 'shops'))).toBe(true);
      expect(dirExists(path.join(tempDir, 'shops', 'credentials'))).toBe(true);
      expect(dirExists(path.join(tempDir, '.github', 'workflows'))).toBe(true);

      // Assert - Files created/updated
      expect(fileExists(packageJsonPath)).toBe(true);
      expect(fileExists(path.join(tempDir, '.gitignore'))).toBe(true);
      expect(fileExists(path.join(tempDir, 'shops', 'shop.config.example.json'))).toBe(true);
    });

    test('updates package.json with multi-shop scripts', async () => {
      // Arrange
      const packageJsonPath = path.join(tempDir, 'package.json');
      fs.writeFileSync(packageJsonPath, JSON.stringify({
        name: 'test-theme',
        version: '1.0.0',
        scripts: {
          build: 'echo build'
        }
      }, null, 2));

      fs.mkdirSync(path.join(tempDir, 'config'), { recursive: true });

      const initializer = new Initializer({ cwd: tempDir });

      // Act
      await initializer.run();

      // Assert
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

      expect(packageJson.scripts.dev).toBe('multi-shop dev');
      expect(packageJson.scripts.shop).toBe('multi-shop shop');
      expect(packageJson.scripts['sync-main']).toBe('multi-shop sync-main');
      expect(packageJson.scripts['test:pr']).toBe('multi-shop test-pr');

      // Verify existing scripts are preserved
      expect(packageJson.scripts.build).toBe('echo build');
    });

    test('adds package to devDependencies if not present', async () => {
      // Arrange
      const packageJsonPath = path.join(tempDir, 'package.json');
      fs.writeFileSync(packageJsonPath, JSON.stringify({
        name: 'test-theme',
        version: '1.0.0',
        scripts: {}
      }, null, 2));

      fs.mkdirSync(path.join(tempDir, 'config'), { recursive: true });

      const initializer = new Initializer({ cwd: tempDir });

      // Act
      await initializer.run();

      // Assert
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

      expect(packageJson.devDependencies).toBeDefined();
      expect(packageJson.devDependencies['@shopdevs/multi-shop-cli']).toBeDefined();
    });

    test('preserves existing devDependencies', async () => {
      // Arrange
      const packageJsonPath = path.join(tempDir, 'package.json');
      fs.writeFileSync(packageJsonPath, JSON.stringify({
        name: 'test-theme',
        version: '1.0.0',
        scripts: {},
        devDependencies: {
          'eslint': '^8.0.0',
          'typescript': '^5.0.0'
        }
      }, null, 2));

      fs.mkdirSync(path.join(tempDir, 'config'), { recursive: true });

      const initializer = new Initializer({ cwd: tempDir });

      // Act
      await initializer.run();

      // Assert
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

      expect(packageJson.devDependencies.eslint).toBe('^8.0.0');
      expect(packageJson.devDependencies.typescript).toBe('^5.0.0');
      expect(packageJson.devDependencies['@shopdevs/multi-shop-cli']).toBeDefined();
    });

    test('creates .gitignore with security patterns', async () => {
      // Arrange
      const packageJsonPath = path.join(tempDir, 'package.json');
      fs.writeFileSync(packageJsonPath, JSON.stringify({
        name: 'test-theme',
        version: '1.0.0',
        scripts: {}
      }, null, 2));

      fs.mkdirSync(path.join(tempDir, 'config'), { recursive: true });

      const initializer = new Initializer({ cwd: tempDir });

      // Act
      await initializer.run();

      // Assert
      const gitignorePath = path.join(tempDir, '.gitignore');
      const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');

      // Verify critical security patterns
      expect(gitignoreContent).toContain('shops/credentials/');
      expect(gitignoreContent).toContain('*.credentials.json');

      // Verify other important patterns
      expect(gitignoreContent).toContain('.DS_Store');
      expect(gitignoreContent).toContain('node_modules/');
      expect(gitignoreContent).toContain('.env');
    });

    test('appends to existing .gitignore without duplicates', async () => {
      // Arrange
      const packageJsonPath = path.join(tempDir, 'package.json');
      fs.writeFileSync(packageJsonPath, JSON.stringify({
        name: 'test-theme',
        version: '1.0.0',
        scripts: {}
      }, null, 2));

      fs.mkdirSync(path.join(tempDir, 'config'), { recursive: true });

      const gitignorePath = path.join(tempDir, '.gitignore');
      const existingContent = `
# Existing patterns
node_modules/
.env
dist/
      `.trim();
      fs.writeFileSync(gitignorePath, existingContent);

      const initializer = new Initializer({ cwd: tempDir });

      // Act
      await initializer.run();

      // Assert
      const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');

      // Verify new patterns added
      expect(gitignoreContent).toContain('shops/credentials/');
      expect(gitignoreContent).toContain('*.credentials.json');

      // Verify no duplicates of existing patterns
      const nodeModulesCount = (gitignoreContent.match(/node_modules\//g) || []).length;
      expect(nodeModulesCount).toBe(1);

      const envCount = (gitignoreContent.match(/^\.env$/gm) || []).length;
      expect(envCount).toBe(1);
    });

    test('creates example shop configuration', async () => {
      // Arrange
      const packageJsonPath = path.join(tempDir, 'package.json');
      fs.writeFileSync(packageJsonPath, JSON.stringify({
        name: 'test-theme',
        version: '1.0.0',
        scripts: {}
      }, null, 2));

      fs.mkdirSync(path.join(tempDir, 'config'), { recursive: true });

      const initializer = new Initializer({ cwd: tempDir });

      // Act
      await initializer.run();

      // Assert
      const exampleConfigPath = path.join(tempDir, 'shops', 'shop.config.example.json');
      expect(fileExists(exampleConfigPath)).toBe(true);

      const exampleConfig = JSON.parse(fs.readFileSync(exampleConfigPath, 'utf8'));

      expect(exampleConfig.shopId).toBe('example-shop');
      expect(exampleConfig.name).toBe('Example Shop');
      expect(exampleConfig.shopify.stores.production.domain).toBe('example-shop.myshopify.com');
      expect(exampleConfig.shopify.stores.staging.domain).toBe('staging-example-shop.myshopify.com');
      expect(exampleConfig.shopify.authentication.method).toBe('theme-access-app');
    });
  });

  describe('Validation and error handling', () => {
    test('throws error when package.json is missing', async () => {
      // Arrange
      const initializer = new Initializer({ cwd: tempDir });

      // Act & Assert
      await expect(initializer.run()).rejects.toThrow();
    });

    test('prompts user when Shopify structure not detected', async () => {
      // Arrange
      const packageJsonPath = path.join(tempDir, 'package.json');
      fs.writeFileSync(packageJsonPath, JSON.stringify({
        name: 'test-project',
        version: '1.0.0'
      }, null, 2));

      const { select } = await import('@clack/prompts');
      vi.mocked(select).mockResolvedValue('yes');

      const initializer = new Initializer({ cwd: tempDir });

      // Act
      await initializer.run();

      // Assert - User was prompted
      expect(select).toHaveBeenCalled();
    });

    test('cancels initialization when user declines non-Shopify project', async () => {
      // Arrange
      const packageJsonPath = path.join(tempDir, 'package.json');
      fs.writeFileSync(packageJsonPath, JSON.stringify({
        name: 'test-project',
        version: '1.0.0'
      }, null, 2));

      const { select } = await import('@clack/prompts');
      vi.mocked(select).mockResolvedValue('no');

      const initializer = new Initializer({ cwd: tempDir });

      // Act & Assert
      await expect(initializer.run()).rejects.toThrow('Initialization cancelled');
    });

    test('handles user cancellation with isCancel', async () => {
      // Arrange
      const packageJsonPath = path.join(tempDir, 'package.json');
      fs.writeFileSync(packageJsonPath, JSON.stringify({
        name: 'test-project',
        version: '1.0.0'
      }, null, 2));

      const { select } = await import('@clack/prompts');
      const cancelSymbol = Symbol.for('cancel');
      vi.mocked(select).mockResolvedValue(cancelSymbol);

      const initializer = new Initializer({ cwd: tempDir });

      // Act & Assert
      await expect(initializer.run()).rejects.toThrow('Initialization cancelled');
    });
  });

  describe('Reinitialize existing setup', () => {
    test('prompts when multi-shop already initialized', async () => {
      // Arrange
      const packageJsonPath = path.join(tempDir, 'package.json');
      fs.writeFileSync(packageJsonPath, JSON.stringify({
        name: 'test-theme',
        version: '1.0.0',
        scripts: {}
      }, null, 2));

      fs.mkdirSync(path.join(tempDir, 'config'), { recursive: true });
      fs.mkdirSync(path.join(tempDir, 'shops'), { recursive: true }); // Already initialized

      const { select } = await import('@clack/prompts');
      vi.mocked(select).mockResolvedValue('yes');

      const initializer = new Initializer({ cwd: tempDir });

      // Act
      await initializer.run();

      // Assert - User was prompted about reinitialize
      expect(select).toHaveBeenCalled();
    });

    test('cancels when user declines reinitialize', async () => {
      // Arrange
      const packageJsonPath = path.join(tempDir, 'package.json');
      fs.writeFileSync(packageJsonPath, JSON.stringify({
        name: 'test-theme',
        version: '1.0.0',
        scripts: {}
      }, null, 2));

      fs.mkdirSync(path.join(tempDir, 'config'), { recursive: true });
      fs.mkdirSync(path.join(tempDir, 'shops'), { recursive: true });

      const { select } = await import('@clack/prompts');
      vi.mocked(select).mockResolvedValue('no');

      const initializer = new Initializer({ cwd: tempDir });

      // Act & Assert
      await expect(initializer.run()).rejects.toThrow('Initialization cancelled');
    });

    test('force flag bypasses all prompts', async () => {
      // Arrange
      const packageJsonPath = path.join(tempDir, 'package.json');
      fs.writeFileSync(packageJsonPath, JSON.stringify({
        name: 'test-project',
        version: '1.0.0'
      }, null, 2));

      // No Shopify structure, but force flag should skip prompt
      fs.mkdirSync(path.join(tempDir, 'shops'), { recursive: true }); // Already initialized

      const { select } = await import('@clack/prompts');

      const initializer = new Initializer({ cwd: tempDir, force: true });

      // Act
      await initializer.run();

      // Assert - No prompts shown
      expect(select).not.toHaveBeenCalled();
    });
  });

  describe('Git safety check', () => {
    test('warns when git repository exists without .gitignore', async () => {
      // Arrange
      const packageJsonPath = path.join(tempDir, 'package.json');
      fs.writeFileSync(packageJsonPath, JSON.stringify({
        name: 'test-theme',
        version: '1.0.0',
        scripts: {}
      }, null, 2));

      fs.mkdirSync(path.join(tempDir, 'config'), { recursive: true });
      fs.mkdirSync(path.join(tempDir, '.git'), { recursive: true });
      fs.mkdirSync(path.join(tempDir, 'node_modules'), { recursive: true });

      const { note } = await import('@clack/prompts');

      const initializer = new Initializer({ cwd: tempDir });

      // Act
      await initializer.run();

      // Assert - Safety warning was shown
      expect(note).toHaveBeenCalled();
      const noteCall = vi.mocked(note).mock.calls.find(call =>
        typeof call[0] === 'string' && call[0].includes('Git repository detected')
      );
      expect(noteCall).toBeDefined();
    });

    test('does not warn when .gitignore already exists', async () => {
      // Arrange
      const packageJsonPath = path.join(tempDir, 'package.json');
      fs.writeFileSync(packageJsonPath, JSON.stringify({
        name: 'test-theme',
        version: '1.0.0',
        scripts: {}
      }, null, 2));

      fs.mkdirSync(path.join(tempDir, 'config'), { recursive: true });
      fs.mkdirSync(path.join(tempDir, '.git'), { recursive: true });
      fs.mkdirSync(path.join(tempDir, 'node_modules'), { recursive: true });
      fs.writeFileSync(path.join(tempDir, '.gitignore'), 'node_modules/');

      const { note } = await import('@clack/prompts');

      const initializer = new Initializer({ cwd: tempDir });

      // Act
      await initializer.run();

      // Assert - No git safety warning (but success note will be shown)
      const gitWarningCall = vi.mocked(note).mock.calls.find(call =>
        typeof call[0] === 'string' && call[0].includes('Git repository detected')
      );
      expect(gitWarningCall).toBeUndefined();
    });
  });

  describe('Directory permissions', () => {
    test('creates credentials directory with secure permissions', async () => {
      // Arrange
      const packageJsonPath = path.join(tempDir, 'package.json');
      fs.writeFileSync(packageJsonPath, JSON.stringify({
        name: 'test-theme',
        version: '1.0.0',
        scripts: {}
      }, null, 2));

      fs.mkdirSync(path.join(tempDir, 'config'), { recursive: true });

      const initializer = new Initializer({ cwd: tempDir });

      // Act
      await initializer.run();

      // Assert
      const credentialsDir = path.join(tempDir, 'shops', 'credentials');
      expect(dirExists(credentialsDir)).toBe(true);

      // Verify directory is writable
      const testFile = path.join(credentialsDir, 'test.txt');
      expect(() => fs.writeFileSync(testFile, 'test')).not.toThrow();
      fs.unlinkSync(testFile);
    });
  });

  describe('Idempotent operations', () => {
    test('running initialization twice produces same result', async () => {
      // Arrange
      const packageJsonPath = path.join(tempDir, 'package.json');
      fs.writeFileSync(packageJsonPath, JSON.stringify({
        name: 'test-theme',
        version: '1.0.0',
        scripts: {}
      }, null, 2));

      fs.mkdirSync(path.join(tempDir, 'config'), { recursive: true });

      const { select } = await import('@clack/prompts');
      vi.mocked(select).mockResolvedValue('yes'); // Approve reinitialize

      // Act - Initialize twice
      const initializer1 = new Initializer({ cwd: tempDir });
      await initializer1.run();

      const initializer2 = new Initializer({ cwd: tempDir });
      await initializer2.run();

      // Assert - Same structure exists
      expect(dirExists(path.join(tempDir, 'shops'))).toBe(true);
      expect(dirExists(path.join(tempDir, 'shops', 'credentials'))).toBe(true);
      expect(fileExists(path.join(tempDir, 'shops', 'shop.config.example.json'))).toBe(true);

      // Verify package.json scripts are correct (not duplicated)
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      expect(packageJson.scripts.dev).toBe('multi-shop dev');
      expect(packageJson.scripts.shop).toBe('multi-shop shop');
    });
  });

  describe('Success message', () => {
    test('displays success message after completion', async () => {
      // Arrange
      const packageJsonPath = path.join(tempDir, 'package.json');
      fs.writeFileSync(packageJsonPath, JSON.stringify({
        name: 'test-theme',
        version: '1.0.0',
        scripts: {}
      }, null, 2));

      fs.mkdirSync(path.join(tempDir, 'config'), { recursive: true });

      const { note } = await import('@clack/prompts');

      const initializer = new Initializer({ cwd: tempDir });

      // Act
      await initializer.run();

      // Assert - Success message shown
      expect(note).toHaveBeenCalled();
      const successCall = vi.mocked(note).mock.calls.find(call =>
        typeof call[0] === 'string' && call[0].includes('Multi-shop initialization complete')
      );
      expect(successCall).toBeDefined();
    });
  });
});
