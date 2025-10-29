import fs from 'fs';
import path from 'path';
import type { GlobalSettings } from '../../types/shop.js';
import type { Result } from './types.js';

/**
 * Global settings operations for multi-shop configuration
 */

const DEFAULT_SETTINGS: GlobalSettings = {
  contentProtection: {
    defaultMode: 'strict',
    defaultVerbosity: 'verbose',
    applyToNewShops: true
  },
  version: '1.0.0'
};

export const loadGlobalSettings = async (cwd: string): Promise<Result<GlobalSettings>> => {
  try {
    const settingsPath = path.join(cwd, 'settings.json');

    if (!fs.existsSync(settingsPath)) {
      return { success: true, data: DEFAULT_SETTINGS };
    }

    const rawSettings = fs.readFileSync(settingsPath, 'utf8');
    const settings = JSON.parse(rawSettings) as GlobalSettings;

    return { success: true, data: settings };
  } catch (error) {
    return {
      success: false,
      error: `Failed to load global settings: ${error instanceof Error ? error.message : String(error)}`
    };
  }
};

export const saveGlobalSettings = async (cwd: string, settings: GlobalSettings): Promise<Result<void>> => {
  try {
    const settingsPath = path.join(cwd, 'settings.json');
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `Failed to save global settings: ${error instanceof Error ? error.message : String(error)}`
    };
  }
};

export const getDefaultContentProtection = async (cwd: string): Promise<GlobalSettings['contentProtection']> => {
  const settingsResult = await loadGlobalSettings(cwd);

  if (!settingsResult.success || !settingsResult.data) {
    return DEFAULT_SETTINGS.contentProtection;
  }

  return settingsResult.data.contentProtection;
};
