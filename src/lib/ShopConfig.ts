import fs from "fs";
import path from "path";
import type { ShopConfig } from "../types/shop.js";
import { ShopConfigValidator } from "./validators/ShopConfigValidator.js";
import { ShopConfigurationError } from "./errors/ShopError.js";
import { config as systemConfig } from "./core/Config.js";

/**
 * Handles shop configuration file operations
 * Focused solely on loading, saving, and validating shop configs
 */
export class ShopConfigManager {
  private readonly shopsDir: string;
  private readonly validator: ShopConfigValidator;

  constructor(cwd: string = process.cwd()) {
    this.shopsDir = path.join(cwd, "shops");
    this.validator = new ShopConfigValidator();
    this.ensureShopsDir();
  }

  /**
   * Load and validate shop configuration
   */
  load(shopId: string): ShopConfig {
    try {
      this.validator.validateShopId(shopId);
      
      const configPath = path.join(this.shopsDir, `${shopId}.config.json`);
      if (!fs.existsSync(configPath)) {
        throw new ShopConfigurationError(`Shop configuration not found: ${shopId}`, shopId);
      }

      const rawConfig = fs.readFileSync(configPath, "utf8");
      
      // Validate config size
      if (rawConfig.length > systemConfig.security.maxConfigFileSize) {
        throw new ShopConfigurationError(
          `Configuration file too large: ${shopId}`,
          shopId,
          { size: rawConfig.length, limit: systemConfig.security.maxConfigFileSize }
        );
      }
      
      let config: unknown;
      try {
        config = JSON.parse(rawConfig);
      } catch (error) {
        throw new ShopConfigurationError(
          `Invalid JSON in configuration file: ${shopId}`,
          shopId,
          { error: error instanceof Error ? error.message : String(error) }
        );
      }
      
      if (!config || typeof config !== 'object' || Array.isArray(config)) {
        throw new ShopConfigurationError(
          `Configuration must be a JSON object: ${shopId}`,
          shopId,
          { type: typeof config, isArray: Array.isArray(config) }
        );
      }

      return this.validator.validateConfig(config, shopId);
    } catch (error) {
      if (error instanceof ShopConfigurationError) {
        throw error;
      }
      
      throw new ShopConfigurationError(
        `Failed to load shop configuration: ${shopId}`,
        shopId,
        { originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Save shop configuration with validation
   */
  save(shopId: string, config: ShopConfig): void {
    try {
      this.validator.validateShopId(shopId);
      this.validator.validateConfig(config, shopId);
      
      const configPath = path.join(this.shopsDir, `${shopId}.config.json`);
      
      if (!fs.existsSync(this.shopsDir)) {
        fs.mkdirSync(this.shopsDir, { recursive: true });
      }
      
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      
      if (!fs.existsSync(configPath)) {
        throw new Error(`File was not created: ${configPath}`);
      }
      
    } catch (error) {
      throw new ShopConfigurationError(
        `Failed to save shop configuration: ${shopId}`,
        shopId,
        { 
          originalError: error instanceof Error ? error.message : String(error),
          configPath: path.join(this.shopsDir, `${shopId}.config.json`),
          shopsDir: this.shopsDir,
          shopsDirExists: fs.existsSync(this.shopsDir),
          configData: config
        }
      );
    }
  }

  /**
   * List all configured shops
   */
  list(): string[] {
    try {
      if (!fs.existsSync(this.shopsDir)) {
        return [];
      }

      return fs
        .readdirSync(this.shopsDir)
        .filter(file => file.endsWith(".config.json") && file !== "shop.config.example.json")
        .map(file => file.replace(".config.json", ""));
    } catch (error) {
      return [];
    }
  }

  /**
   * Get count of configured shops
   */
  count(): number {
    return this.list().length;
  }

  /**
   * Delete shop configuration
   */
  delete(shopId: string): void {
    const configPath = path.join(this.shopsDir, `${shopId}.config.json`);
    if (fs.existsSync(configPath)) {
      fs.unlinkSync(configPath);
    }
  }

  private ensureShopsDir(): void {
    if (!fs.existsSync(this.shopsDir)) {
      fs.mkdirSync(this.shopsDir, { recursive: true });
    }
  }
}