import fs from "fs";
import path from "path";
import crypto from "crypto";
import { ShopCredentialError } from "../errors/ShopError.js";
import type { ShopCredentials } from "../../types/shop.js";

/**
 * Manages shop credentials with secure file operations
 */
export class SecurityManager {
  private readonly credentialsDir: string;

  constructor(credentialsDir: string) {
    this.credentialsDir = credentialsDir;
    this.ensureCredentialsDirectory();
  }

  /**
   * Load credentials for a shop
   */
  loadCredentials(shopId: string): ShopCredentials | null {
    try {
      const credPath = this.getCredentialPath(shopId);
      
      if (!fs.existsSync(credPath)) {
        return null;
      }

      const rawData = fs.readFileSync(credPath, "utf8");
      const credentials = JSON.parse(rawData);

      // Validate structure
      if (!credentials?.shopify?.stores) {
        throw new ShopCredentialError(
          `Invalid credential format for ${shopId}`,
          shopId,
          'invalid_format'
        );
      }

      return credentials as ShopCredentials;
    } catch (error) {
      if (error instanceof ShopCredentialError) {
        throw error;
      }
      
      throw new ShopCredentialError(
        `Failed to load credentials for ${shopId}`,
        shopId,
        'load_error',
        { originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Save credentials securely
   */
  saveCredentials(shopId: string, credentials: ShopCredentials): void {
    try {
      this.ensureCredentialsDirectory();

      const credPath = this.getCredentialPath(shopId);
      
      // Add metadata
      const secureCredentials = {
        ...credentials,
        _metadata: {
          created: new Date().toISOString(),
          version: "1.0.0"
        }
      };

      // Write file
      fs.writeFileSync(credPath, JSON.stringify(secureCredentials, null, 2));
      
      // Set secure permissions where supported
      try {
        fs.chmodSync(credPath, 0o600);
      } catch {
        // Ignored on Windows
      }

      console.log(`🔐 Saved credentials: shops/credentials/${shopId}.credentials.json`);
      
    } catch (error) {
      throw new ShopCredentialError(
        `Failed to save credentials for ${shopId}`,
        shopId,
        'save_error',
        { originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Get theme token for shop and environment
   */
  getThemeToken(shopId: string, environment: 'production' | 'staging'): string | null {
    const credentials = this.loadCredentials(shopId);
    
    if (!credentials) {
      return null;
    }

    return credentials.shopify?.stores?.[environment]?.themeToken || null;
  }

  /**
   * Sanitize credentials for logging (remove sensitive data)
   */
  sanitizeForLogging(credentials: ShopCredentials | null): ShopCredentials | null {
    if (!credentials) return null;

    const sanitized = JSON.parse(JSON.stringify(credentials));
    
    // Mask theme tokens
    if (sanitized.shopify?.stores) {
      Object.keys(sanitized.shopify.stores).forEach(env => {
        if (sanitized.shopify.stores[env].themeToken) {
          const token = sanitized.shopify.stores[env].themeToken;
          sanitized.shopify.stores[env].themeToken = 
            `${token.substring(0, 8)}${'*'.repeat(Math.max(0, token.length - 8))}`;
        }
      });
    }

    return sanitized;
  }


  /**
   * Get secure file path for shop credentials
   */
  private getCredentialPath(shopId: string): string {
    // Validate shopId to prevent path traversal
    if (!shopId || typeof shopId !== 'string') {
      throw new ShopCredentialError('Invalid shop ID provided', shopId, 'validation');
    }
    
    // Sanitize shop ID
    const sanitizedShopId = shopId.replace(/[^a-z0-9-]/gi, '');
    if (sanitizedShopId !== shopId || sanitizedShopId.length === 0 || sanitizedShopId.length > 50) {
      throw new ShopCredentialError(
        'Shop ID contains invalid characters - only letters, numbers and hyphens allowed',
        shopId,
        'validation'
      );
    }
    
    const credentialPath = path.join(this.credentialsDir, `${sanitizedShopId}.credentials.json`);
    
    // Ensure path is within credentials directory
    const resolvedPath = path.resolve(credentialPath);
    const resolvedCredentialsDir = path.resolve(this.credentialsDir);
    
    if (!resolvedPath.startsWith(resolvedCredentialsDir)) {
      throw new ShopCredentialError(
        'Invalid credential path',
        shopId,
        'security'
      );
    }
    
    return credentialPath;
  }

  /**
   * Ensure credentials directory exists with proper permissions
   */
  private ensureCredentialsDirectory(): void {
    if (!fs.existsSync(this.credentialsDir)) {
      fs.mkdirSync(this.credentialsDir, { recursive: true });
      
      // Set directory permissions where supported
      try {
        fs.chmodSync(this.credentialsDir, 0o700);
      } catch {
        // Ignored on Windows
      }
    }
  }
}