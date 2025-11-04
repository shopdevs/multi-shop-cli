import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { createTempDir, cleanupTempDir } from '../helpers.js';
import { loadGlobalSettings, saveGlobalSettings, getDefaultContentProtection } from '../../lib/core/global-settings.js';
import type { GlobalSettings } from '../../types/shop.js';
import fs from 'fs';
import path from 'path';

describe('global-settings', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
    // Create shops directory for settings
    const shopsDir = path.join(tempDir, 'shops');
    if (!fs.existsSync(shopsDir)) {
      fs.mkdirSync(shopsDir, { recursive: true });
    }
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  describe('loadGlobalSettings', () => {
    test('returns default settings when file does not exist', async () => {
      // Act
      const result = await loadGlobalSettings(tempDir);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.contentProtection.defaultMode).toBe('strict');
      expect(result.data?.contentProtection.applyToNewShops).toBe(true);
    });

    test('loads existing settings from file', async () => {
      // Arrange
      const settings: GlobalSettings = {
        contentProtection: {
          defaultMode: 'warn',
          defaultVerbosity: 'quiet',
          applyToNewShops: false
        },
        version: '1.0.0'
      };

      const settingsPath = path.join(tempDir, 'shops', 'settings.json');
      fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));

      // Act
      const result = await loadGlobalSettings(tempDir);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.contentProtection.defaultMode).toBe('warn');
      expect(result.data?.contentProtection.defaultVerbosity).toBe('quiet');
      expect(result.data?.contentProtection.applyToNewShops).toBe(false);
    });

    test('handles corrupted settings file', async () => {
      // Arrange
      const settingsPath = path.join(tempDir, 'shops', 'settings.json');
      fs.writeFileSync(settingsPath, '{ invalid json }');

      // Act
      const result = await loadGlobalSettings(tempDir);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('saveGlobalSettings', () => {
    test('saves settings to file', async () => {
      // Arrange
      const settings: GlobalSettings = {
        contentProtection: {
          defaultMode: 'strict',
          defaultVerbosity: 'verbose',
          applyToNewShops: true
        },
        version: '1.0.0'
      };

      // Act
      const result = await saveGlobalSettings(tempDir, settings);

      // Assert
      expect(result.success).toBe(true);

      const settingsPath = path.join(tempDir, 'shops', 'settings.json');
      expect(fs.existsSync(settingsPath)).toBe(true);

      const savedSettings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      expect(savedSettings.contentProtection.defaultMode).toBe('strict');
    });

    test('overwrites existing settings', async () => {
      // Arrange
      const oldSettings: GlobalSettings = {
        contentProtection: {
          defaultMode: 'off',
          defaultVerbosity: 'quiet',
          applyToNewShops: false
        },
        version: '1.0.0'
      };

      await saveGlobalSettings(tempDir, oldSettings);

      const newSettings: GlobalSettings = {
        contentProtection: {
          defaultMode: 'strict',
          defaultVerbosity: 'verbose',
          applyToNewShops: true
        },
        version: '1.0.0'
      };

      // Act
      const result = await saveGlobalSettings(tempDir, newSettings);

      // Assert
      expect(result.success).toBe(true);

      const settingsPath = path.join(tempDir, 'shops', 'settings.json');
      const savedSettings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      expect(savedSettings.contentProtection.defaultMode).toBe('strict');
    });
  });

  describe('getDefaultContentProtection', () => {
    test('returns default values when no settings file', async () => {
      // Act
      const defaults = await getDefaultContentProtection(tempDir);

      // Assert
      expect(defaults.defaultMode).toBe('strict');
      expect(defaults.defaultVerbosity).toBe('verbose');
      expect(defaults.applyToNewShops).toBe(true);
    });

    test('returns configured values when settings exist', async () => {
      // Arrange
      const settings: GlobalSettings = {
        contentProtection: {
          defaultMode: 'warn',
          defaultVerbosity: 'quiet',
          applyToNewShops: false
        },
        version: '1.0.0'
      };

      await saveGlobalSettings(tempDir, settings);

      // Act
      const defaults = await getDefaultContentProtection(tempDir);

      // Assert
      expect(defaults.defaultMode).toBe('warn');
      expect(defaults.defaultVerbosity).toBe('quiet');
      expect(defaults.applyToNewShops).toBe(false);
    });
  });
});
