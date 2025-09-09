import { runMultiShopManager, createMultiShopCLI } from "./core/index.js";
import type { ShopManagerOptions } from "../types/shop.js";

/**
 * Shop manager entry point
 */
export const createShopManager = (options: ShopManagerOptions = {}) => {
  const cwd = options.cwd ?? process.cwd();
  
  return {
    run: () => runMultiShopManager(cwd),
    
    loadShopConfig: async (shopId: string) => {
      const context = createMultiShopCLI(cwd);
      const result = await context.shopOps.loadConfig(shopId);
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      return result.data!;
    },

    listShops: async () => {
      const context = createMultiShopCLI(cwd);
      const result = await context.shopOps.listShops();
      
      return result.success ? result.data || [] : [];
    },

    getShopCount: async () => {
      const context = createMultiShopCLI(cwd);
      const result = await context.shopOps.listShops();
      
      return result.success ? result.data?.length || 0 : 0;
    }
  };
};

// Compatibility class wrapper (temporary)
export class ShopManager {
  private readonly manager: ReturnType<typeof createShopManager>;

  constructor(options: ShopManagerOptions = {}) {
    this.manager = createShopManager(options);
  }

  async run() { return this.manager.run(); }
  async loadShopConfig(shopId: string) { return this.manager.loadShopConfig(shopId); }
  async listShops() { return this.manager.listShops(); }
  async getShopCount() { return this.manager.getShopCount(); }
}