import fs from "fs";
import path from "path";
import crypto from "crypto";
import { ShopCredentialError, ShopConfigurationError } from "../errors/ShopError.js";

/**
 * Enterprise-grade security manager for credential handling
 * Implements security best practices for sensitive data
 */
export class SecurityManager {
  constructor(credentialsDir) {
    this.credentialsDir = credentialsDir;
    this.encryptionKey = this.getOrCreateEncryptionKey();
  }

  /**
   * Securely loads credentials with integrity validation
   * @param {string} shopId - Shop identifier
   * @returns {Object|null} Credentials or null if not found
   * @throws {ShopCredentialError} If corruption detected
   */
  loadCredentials(shopId) {
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
   * @param {string} shopId - Shop identifier  
   * @param {Object} credentials - Credential data
   * @throws {ShopCredentialError} If save fails
   */
  saveCredentials(shopId, credentials) {
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
      
      // Write with restricted permissions (600)
      fs.writeFileSync(credPath, JSON.stringify(secureCredentials, null, 2), {
        mode: 0o600 // rw------- (owner read/write only)
      });

      // Verify write success
      if (!fs.existsSync(credPath)) {
        throw new Error("Failed to verify credential file was written");
      }

      console.log(`   🔐 Securely saved to: shops/credentials/${shopId}.credentials.json`);
      
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
   * @param {string} shopId - Shop identifier
   * @param {string} environment - Environment (staging/production)
   * @returns {string|null} Theme token or null if not found
   * @throws {ShopCredentialError} If security validation fails
   */
  getThemeToken(shopId, environment) {
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
   * @param {Object} credentials - Credential object
   * @returns {Object} Sanitized version safe for logging
   */
  sanitizeForLogging(credentials) {
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
   * @returns {Object} Security audit report
   */
  auditCredentialSecurity() {
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

  getCredentialPath(shopId) {
    return path.join(this.credentialsDir, `${shopId}.credentials.json`);
  }

  ensureCredentialsDirectory() {
    if (!fs.existsSync(this.credentialsDir)) {
      fs.mkdirSync(this.credentialsDir, { 
        recursive: true,
        mode: 0o700 // rwx------ (owner only)
      });
    }

    // Verify directory permissions
    const stats = fs.statSync(this.credentialsDir);
    if ((stats.mode & parseInt('077', 8)) !== 0) {
      fs.chmodSync(this.credentialsDir, 0o700);
    }
  }

  validateCredentialStructure(credentials, shopId) {
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

  validateCredentialIntegrity(credentials, shopId) {
    // Check for suspicious modifications
    const stores = credentials.shopify.stores;
    
    Object.keys(stores).forEach(env => {
      const token = stores[env]?.themeToken;
      
      if (token && token.includes('<script>')) {
        throw new ShopCredentialError(
          `Potential credential corruption detected for ${shopId}`,
          shopId,
          env,
          { issue: "Script injection detected in token" }
        );
      }

      if (token && token.length > 1000) {
        throw new ShopCredentialError(
          `Abnormally long token detected for ${shopId}`,
          shopId,
          env,
          { tokenLength: token.length }
        );
      }
    });
  }

  validateTokenFormat(token, shopId, environment) {
    if (!token || typeof token !== 'string') {
      throw new ShopCredentialError(
        `Invalid token format for ${shopId} ${environment}`,
        shopId,
        environment,
        { tokenType: typeof token }
      );
    }

    // Check for obvious security issues
    if (token.includes(' ') || token.includes('\n')) {
      throw new ShopCredentialError(
        `Token contains invalid characters for ${shopId} ${environment}`,
        shopId,
        environment,
        { issue: "Whitespace detected in token" }
      );
    }
  }

  calculateChecksum(data) {
    const hash = crypto.createHash('sha256');
    hash.update(JSON.stringify(data, null, 0));
    return hash.digest('hex').substring(0, 16);
  }

  getOrCreateEncryptionKey() {
    // For future encryption implementation
    const keyPath = path.join(this.credentialsDir, '.key');
    
    if (fs.existsSync(keyPath)) {
      return fs.readFileSync(keyPath, 'utf8');
    }

    // Generate new key for future encryption features
    const key = crypto.randomBytes(32).toString('hex');
    try {
      fs.writeFileSync(keyPath, key, { mode: 0o600 });
    } catch {
      // If we can't write key file, continue without it
    }
    
    return key;
  }
}