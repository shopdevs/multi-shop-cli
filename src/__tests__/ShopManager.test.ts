import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { ShopManager } from '../lib/ShopManager.js';
import type { ShopConfig } from '../types/shop.js';
import fs from 'fs';

// Mock file system
vi.mock('fs');

describe('ShopManager', () => {
  let shopManager: ShopManager;
  const mockCwd = '/test/project';

  beforeEach(() => {
    // Create fresh instance for each test
    shopManager = new ShopManager({ cwd: mockCwd });
    
    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic Shop Operations', () => {
    test('should load shop configuration', () => {
      const mockConfig = createMockShopConfig();
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockConfig));

      const config = shopManager.loadShopConfig('test-shop');

      expect(config.shopId).toBe('test-shop');
      expect(fs.readFileSync).toHaveBeenCalled();
    });

    test('should list shops', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue(['shop-a.config.json', 'shop-b.config.json']);

      const shops = shopManager.listShops();

      expect(shops).toEqual(['shop-a', 'shop-b']);
    });
  });


});