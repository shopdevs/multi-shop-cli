import fs from "fs";
import path from "path";
import crypto from "crypto";
import { ShopCredentialError, ShopConfigurationError } from "../errors/ShopError.js";
import type { ShopCredentials, SecurityAuditReport } from "../../types/shop.js";
import { config } from "./Config.js";

/**
 * Enterprise-grade security manager for credential handling
 * Implements security best practices for sensitive data
 */
export class SecurityManager {
  private readonly credentialsDir: string;
  private readonly encryptionKey: string;

  constructor(credentialsDir: string) {
    this.credentialsDir = credentialsDir;
    this.encryptionKey = this.getOrCreateEncryptionKey();
  }

  /**
   * Securely loads credentials with integrity validation
   * @param shopId - Shop identifier
   * @returns Credentials or null if not found
   * @throws ShopCredentialError If corruption detected
   */
  loadCredentials(shopId: string): ShopCredentials | null {
    try {
      const credPath = this.getCredentialPath(shopId);
      
      if (!fs.existsSync(credPath)) {
        return null;
      }

      const rawData = fs.readFileSync(credPath, "utf8");
      const credentials = JSON.parse(rawData);

      // Validate credential structure
      this.validateCredentialStructure(credentials, shopId);

      // Check for potential credential corruption
      this.validateCredentialIntegrity(credentials, shopId);

      return credentials;
    } catch (error) {
      if (error instanceof ShopCredentialError) {
        throw error;
      }
      
      throw new ShopCredentialError(
        `Failed to load credentials for ${shopId}`,
        shopId,
        null,
        { originalError: error.message }
      );
    }
  }

  /**
   * Securely saves credentials with integrity protection
   * @param shopId - Shop identifier  
   * @param credentials - Credential data
   * @throws ShopCredentialError If save fails
   */
  saveCredentials(shopId: string, credentials: ShopCredentials): void {
    try {
      // Ensure credentials directory exists with proper permissions
      this.ensureCredentialsDirectory();

      // Validate before saving
      this.validateCredentialStructure(credentials, shopId);

      // Add integrity metadata
      const secureCredentials = {
        ...credentials,
        _metadata: {
          created: new Date().toISOString(),
          version: "1.0.0",
          checksum: this.calculateChecksum(credentials)
        }
      };

      const credPath = this.getCredentialPath(shopId);
      
      // Write file first, then set permissions (cross-platform compatible)
      fs.writeFileSync(credPath, JSON.stringify(secureCredentials, null, 2));
      
      // Set restricted permissions (works on Unix-like systems, ignored on Windows)
      try {
        fs.chmodSync(credPath, 0o600); // rw------- (owner read/write only)
      } catch (error) {
        // Permissions may not be supported on all platforms (e.g., Windows)
        // This is not a critical failure for functionality
        this.logger?.warn?.('Could not set file permissions', {
          file: credPath,
          error: error instanceof Error ? error.message : String(error)
        });
      }

      // Verify write success
      if (!fs.existsSync(credPath)) {
        throw new ShopCredentialError(
          `Failed to verify credential file was written for ${shopId}`,
          shopId,
          'write_error',
          { path: credPath }
        );
      }

      // Log successful save (using proper logging interface when available)
      if (typeof console !== 'undefined') {
        console.log(`   🔐 Securely saved to: shops/credentials/${shopId}.credentials.json`);
      }
      
    } catch (error) {
      throw new ShopCredentialError(
        `Failed to save credentials for ${shopId}`,
        shopId,
        null,
        { originalError: error.message }
      );
    }
  }

  /**
   * Gets theme token with security validation
   * @param shopId - Shop identifier
   * @param environment - Environment (staging/production)
   * @returns Theme token or null if not found
   * @throws ShopCredentialError If security validation fails
   */
  getThemeToken(shopId: string, environment: 'production' | 'staging'): string | null {
    const credentials = this.loadCredentials(shopId);
    
    if (!credentials) {
      return null;
    }

    const token = credentials.shopify?.stores?.[environment]?.themeToken;
    
    if (!token) {
      return null;
    }

    // Validate token format for security
    this.validateTokenFormat(token, shopId, environment);

    return token;
  }

  /**
   * Sanitizes credential data for logging (removes sensitive info)
   * @param credentials - Credential object
   * @returns Sanitized version safe for logging
   */
  sanitizeForLogging(credentials: ShopCredentials | null): ShopCredentials | null {
    if (!credentials) return null;

    const sanitized = JSON.parse(JSON.stringify(credentials));
    
    // Mask sensitive tokens
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
   * Audits credential security across all shops
   * @returns Security audit report
   */
  auditCredentialSecurity(): SecurityAuditReport {
    const report = {
      timestamp: new Date().toISOString(),
      shops: [],
      issues: [],
      recommendations: []
    };

    try {
      if (!fs.existsSync(this.credentialsDir)) {
        report.issues.push({
          level: "info",
          message: "No credentials directory found",
          recommendation: "Run shop setup to create credentials"
        });
        return report;
      }

      const credFiles = fs.readdirSync(this.credentialsDir)
        .filter(file => file.endsWith('.credentials.json'));

      credFiles.forEach(file => {
        const shopId = file.replace('.credentials.json', '');
        const credPath = path.join(this.credentialsDir, file);
        
        try {
          const stats = fs.statSync(credPath);
          const credentials = this.loadCredentials(shopId);

          const shopAudit = {
            shopId,
            filePermissions: (stats.mode & parseInt('777', 8)).toString(8),
            lastModified: stats.mtime.toISOString(),
            hasProduction: !!credentials?.shopify?.stores?.production?.themeToken,
            hasStaging: !!credentials?.shopify?.stores?.staging?.themeToken,
            integrityValid: true
          };

          // Check file permissions
          if ((stats.mode & parseInt('077', 8)) !== 0) {
            report.issues.push({
              level: "warning",
              shopId,
              message: `Credential file has overly permissive permissions: ${shopAudit.filePermissions}`,
              recommendation: "Fix permissions with: chmod 600 shops/credentials/" + file
            });
          }

          // Check token freshness (warn if older than 6 months)
          const sixMonthsAgo = new Date();
          sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
          if (stats.mtime < sixMonthsAgo) {
            report.issues.push({
              level: "info",
              shopId,
              message: "Credentials are older than 6 months",
              recommendation: "Consider rotating theme access tokens for security"
            });
          }

          report.shops.push(shopAudit);

        } catch (error) {
          report.issues.push({
            level: "error",
            shopId,
            message: `Failed to audit credentials: ${error.message}`,
            recommendation: "Recreate credentials for this shop"
          });
        }
      });

      // Generate recommendations
      if (report.issues.length === 0) {
        report.recommendations.push("✅ All credential security checks passed");
      } else {
        report.recommendations.push(
          `Found ${report.issues.length} security issues that should be addressed`
        );
      }

    } catch (error) {
      report.issues.push({
        level: "error",
        message: `Security audit failed: ${error.message}`,
        recommendation: "Contact support if this persists"
      });
    }

    return report;
  }

  // ================== PRIVATE METHODS ==================

  private getCredentialPath(shopId: string): string {
    // Validate shopId to prevent path traversal attacks
    if (!shopId || typeof shopId !== 'string') {
      throw new ShopCredentialError('Invalid shop ID provided', shopId, 'validation');
    }
    
    // Remove any path traversal attempts
    const sanitizedShopId = shopId.replace(/[^a-z0-9-]/gi, '');
    if (sanitizedShopId !== shopId) {
      throw new ShopCredentialError(
        'Shop ID contains invalid characters - only letters, numbers and hyphens allowed',
        shopId,
        'validation'
      );
    }
    
    // Validate length
    if (sanitizedShopId.length === 0 || sanitizedShopId.length > 50) {
      throw new ShopCredentialError(
        'Shop ID must be between 1-50 characters',
        shopId,
        'validation'
      );
    }
    
    const credentialPath = path.join(this.credentialsDir, `${sanitizedShopId}.credentials.json`);
    
    // Ensure the resolved path is still within credentials directory
    const resolvedPath = path.resolve(credentialPath);
    const resolvedCredentialsDir = path.resolve(this.credentialsDir);
    
    if (!resolvedPath.startsWith(resolvedCredentialsDir)) {
      throw new ShopCredentialError(
        'Invalid credential path - potential path traversal attempt',
        shopId,
        'security'
      );
    }
    
    return credentialPath;
  }

  private ensureCredentialsDirectory(): void {
    if (!fs.existsSync(this.credentialsDir)) {
      fs.mkdirSync(this.credentialsDir, { recursive: true });
      
      // Set directory permissions (Unix-like systems only)
      try {
        fs.chmodSync(this.credentialsDir, 0o700); // rwx------ (owner only)
      } catch (error) {
        // Permissions may not be supported on Windows
        // Not a critical failure
      }
    } else {
      // Try to fix permissions on existing directory
      try {
        const stats = fs.statSync(this.credentialsDir);
        // Only check permissions on Unix-like systems
        if (process.platform !== 'win32' && (stats.mode & parseInt('077', 8)) !== 0) {
          fs.chmodSync(this.credentialsDir, 0o700);
        }
      } catch (error) {
        // Ignore permission errors - not critical for functionality
      }
    }
  }

  private validateCredentialStructure(credentials: unknown, shopId: string): void {
    if (!credentials || typeof credentials !== 'object') {
      throw new ShopCredentialError(
        `Invalid credentials structure for ${shopId}`,
        shopId,
        null,
        { receivedType: typeof credentials }
      );
    }

    if (!credentials.shopify?.stores) {
      throw new ShopCredentialError(
        `Missing Shopify store credentials for ${shopId}`,
        shopId,
        null,
        { structure: Object.keys(credentials) }
      );
    }
  }

  private validateCredentialIntegrity(credentials: ShopCredentials, shopId: string): void {
    // Validate credential structure and content
    const stores = credentials.shopify?.stores;
    
    if (!stores || typeof stores !== 'object') {
      throw new ShopCredentialError(
        `Invalid credential structure for ${shopId}`,
        shopId,
        'validation',
        { issue: "Missing or invalid stores object" }
      );
    }
    
    const environments = ['production', 'staging'] as const;
    environments.forEach(env => {
      const store = stores[env];
      
      if (!store) {
        throw new ShopCredentialError(
          `Missing ${env} store credentials for ${shopId}`,
          shopId,
          env,
          { issue: `${env} store configuration missing` }
        );
      }
      
      const token = store.themeToken;
      
      if (!token || typeof token !== 'string') {
        throw new ShopCredentialError(
          `Invalid or missing theme token for ${shopId} ${env}`,
          shopId,
          env,
          { issue: "Theme token must be a non-empty string" }
        );
      }

      // Validate token format (basic checks)
      if (token.length < config.security.minTokenLength) {
        throw new ShopCredentialError(
          `Theme token too short for ${shopId} ${env}`,
          shopId,
          env,
          { tokenLength: token.length, minLength: config.security.minTokenLength }
        );
      }

      if (token.length > config.security.maxTokenLength) {
        throw new ShopCredentialError(
          `Theme token too long for ${shopId} ${env}`,
          shopId,
          env,
          { tokenLength: token.length, maxLength: config.security.maxTokenLength }
        );
      }

      // Check for obvious corruption (control characters, newlines)
      if (/[\x00-\x1f\x7f]/.test(token)) {
        throw new ShopCredentialError(
          `Token contains invalid characters for ${shopId} ${env}`,
          shopId,
          env,
          { issue: "Token contains control characters" }
        );
      }
    });
    
    // Validate metadata if present
    if (credentials._metadata) {
      const metadata = credentials._metadata;
      if (metadata.checksum && typeof metadata.checksum === 'string') {
        const calculatedChecksum = this.calculateChecksum({
          developer: credentials.developer,
          shopify: credentials.shopify,
          notes: credentials.notes
        });
        
        if (metadata.checksum !== calculatedChecksum) {
          throw new ShopCredentialError(
            `Credential integrity check failed for ${shopId}`,
            shopId,
            'integrity',
            { 
              issue: "Checksum mismatch - credentials may have been tampered with",
              expected: calculatedChecksum,
              actual: metadata.checksum
            }
          );
        }
      }
    }
  }

  private validateTokenFormat(token: string, shopId: string, environment: string): void {
    if (!token || typeof token !== 'string') {
      throw new ShopCredentialError(
        `Invalid token format for ${shopId} ${environment}`,
        shopId,
        environment,
        { tokenType: typeof token }
      );
    }

    // Check for whitespace (tokens should not contain spaces or newlines)
    if (/\s/.test(token)) {
      throw new ShopCredentialError(
        `Token contains whitespace for ${shopId} ${environment}`,
        shopId,
        environment,
        { issue: "Tokens should not contain spaces or line breaks" }
      );
    }
  }

  private calculateChecksum(data: unknown): string {
    const hash = crypto.createHash('sha256');
    hash.update(JSON.stringify(data, null, 0));
    return hash.digest('hex').substring(0, 16);
  }

  private getOrCreateEncryptionKey(): string {
    // Note: This is for future encryption implementation
    // Currently credentials are stored as plain JSON with file permissions
    const keyPath = path.join(this.credentialsDir, '.key');
    
    if (fs.existsSync(keyPath)) {
      try {
        const key = fs.readFileSync(keyPath, 'utf8');
        if (key.length !== 64) { // 32 bytes = 64 hex characters
          throw new ShopCredentialError(
            'Invalid encryption key length',
            'system',
            'key_validation_error',
            { expectedLength: 64, actualLength: key.length }
          );
        }
        return key;
      } catch (error) {
        throw new ShopCredentialError(
          'Failed to read encryption key',
          'system',
          'key_read_error',
          { error: error instanceof Error ? error.message : String(error) }
        );
      }
    }

    // Generate new key for future encryption features
    const key = crypto.randomBytes(32).toString('hex');
    
    try {
      this.ensureCredentialsDirectory();
      fs.writeFileSync(keyPath, key);
      
      // Set file permissions after creation (cross-platform safe)
      try {
        fs.chmodSync(keyPath, 0o600);
      } catch (permError) {
        // Permission setting failed - not critical on Windows
      }
      
      // Verify write was successful
      if (!fs.existsSync(keyPath)) {
        throw new ShopCredentialError(
          'Encryption key file was not created',
          'system',
          'key_create_error',
          { keyPath }
        );
      }
      
      return key;
    } catch (error) {
      throw new ShopCredentialError(
        'Failed to create encryption key - credentials directory may not be writable',
        'system',
        'key_create_error',
        { 
          error: error instanceof Error ? error.message : String(error),
          keyPath,
          credentialsDir: this.credentialsDir
        }
      );
    }
  }
}