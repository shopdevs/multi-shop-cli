import Ajv, { type ValidateFunction } from "ajv";
import { ShopValidationError } from "../errors/ShopError.js";
import type { ShopConfig, ShopCredentials, AuthenticationMethod } from "../../types/shop.js";

/**
 * Validates shop configurations using JSON Schema
 */
export class ShopConfigValidator {
  private readonly ajv: Ajv;
  private readonly validateShopConfig: ValidateFunction;
  private readonly validateCredentials: ValidateFunction;
  private readonly shopConfigSchema: object;
  private readonly credentialSchema: object;

  constructor() {
    this.ajv = new Ajv({ 
      allErrors: true, 
      verbose: true,
      strict: false 
    });
    
    this.shopConfigSchema = {
      type: "object",
      required: ["shopId", "name", "shopify"],
      additionalProperties: false,
      properties: {
        shopId: {
          type: "string",
          pattern: "^[a-z0-9-]+$",
          minLength: 1,
          maxLength: 50,
          description: "Unique shop identifier (lowercase, dashes only)"
        },
        name: {
          type: "string", 
          minLength: 1,
          maxLength: 100,
          description: "Human-readable shop name"
        },
        shopify: {
          type: "object",
          required: ["stores"],
          properties: {
            stores: {
              type: "object",
              required: ["production", "staging"],
              properties: {
                production: {
                  type: "object",
                  required: ["domain", "branch"],
                  properties: {
                    domain: {
                      type: "string",
                      pattern: "^[a-z0-9-]+\\.myshopify\\.com$",
                      description: "Production Shopify store domain"
                    },
                    branch: {
                      type: "string",
                      pattern: "^[a-z0-9-]+/main$",
                      description: "Git branch connected to production store"
                    }
                  }
                },
                staging: {
                  type: "object", 
                  required: ["domain", "branch"],
                  properties: {
                    domain: {
                      type: "string",
                      pattern: "^staging-[a-z0-9-]+\\.myshopify\\.com$",
                      description: "Staging Shopify store domain"
                    },
                    branch: {
                      type: "string",
                      pattern: "^[a-z0-9-]+/staging$", 
                      description: "Git branch connected to staging store"
                    }
                  }
                }
              }
            },
            authentication: {
              type: "object",
              properties: {
                method: {
                  type: "string",
                  enum: ["theme-access-app", "manual-tokens"],
                  description: "Authentication method for theme access"
                }
              }
            }
          }
        }
      }
    };

    this.credentialSchema = {
      type: "object",
      required: ["developer", "shopify"],
      additionalProperties: false,
      properties: {
        developer: {
          type: "string",
          minLength: 1,
          description: "Developer username"
        },
        shopify: {
          type: "object",
          required: ["stores"],
          properties: {
            stores: {
              type: "object",
              patternProperties: {
                "^(production|staging)$": {
                  type: "object",
                  required: ["themeToken"],
                  properties: {
                    themeToken: {
                      type: "string",
                      minLength: 10,
                      description: "Theme access token or password"
                    }
                  }
                }
              }
            }
          }
        },
        notes: {
          type: "string",
          description: "Security reminder notes"
        }
      }
    };

    this.validateShopConfig = this.ajv.compile(this.shopConfigSchema);
    this.validateCredentials = this.ajv.compile(this.credentialSchema);
  }

  /**
   * Validates shop configuration against schema
   * @param config - Shop configuration object
   * @param shopId - Shop ID for error context
   * @throws ShopValidationError If validation fails
   * @returns Valid configuration
   */
  validateConfig(config: unknown, shopId: string): ShopConfig {
    const isValid = this.validateShopConfig(config);
    
    if (!isValid) {
      const errors = (this.validateShopConfig.errors || []).map((error: any) => ({
        field: error.instancePath || error.dataPath,
        message: error.message,
        value: error.data,
        schema: error.schema
      }));

      throw new ShopValidationError(
        `Shop configuration validation failed for ${shopId}`,
        'config',
        config,
        { validationErrors: errors }
      );
    }

    return config as ShopConfig;
  }

  /**
   * Validates credential structure
   * @param credentials - Credential object
   * @param shopId - Shop ID for error context  
   * @throws ShopValidationError If validation fails
   * @returns Valid credentials
   */
  validateCredentialsStructure(credentials: unknown, shopId: string): ShopCredentials {
    const isValid = this.validateCredentials(credentials);
    
    if (!isValid) {
      const errors = (this.validateCredentials.errors || []).map((error: any) => ({
        field: error.instancePath || error.dataPath,
        message: error.message,
        value: error.data
      }));

      throw new ShopValidationError(
        `Credential validation failed for ${shopId}`,
        'credentials',
        credentials,
        { validationErrors: errors }
      );
    }

    return credentials as ShopCredentials;
  }

  /**
   * Validates shop ID format
   * @param shopId - Shop identifier
   * @throws ShopValidationError If invalid
   * @returns Valid shop ID
   */
  validateShopId(shopId: unknown): string {
    if (!shopId || typeof shopId !== 'string') {
      throw new ShopValidationError('Shop ID is required', 'shopId', shopId);
    }

    if (!/^[a-z0-9-]+$/.test(shopId)) {
      throw new ShopValidationError(
        'Shop ID must contain only lowercase letters, numbers, and dashes',
        'shopId', 
        shopId
      );
    }

    if (shopId.length < 1 || shopId.length > 50) {
      throw new ShopValidationError(
        'Shop ID must be between 1 and 50 characters',
        'shopId',
        shopId
      );
    }

    return shopId;
  }

  /**
   * Validates Shopify store domain format
   * @param domain - Store domain
   * @param type - Domain type (production/staging)
   * @throws ShopValidationError If invalid
   * @returns Valid domain
   */
  validateStoreDomain(domain: unknown, type: 'production' | 'staging' = 'production'): string {
    if (!domain || typeof domain !== 'string') {
      throw new ShopValidationError(`${type} domain is required`, 'domain', domain);
    }

    if (!domain.endsWith('.myshopify.com')) {
      throw new ShopValidationError(
        `${type} domain must end with .myshopify.com`,
        'domain',
        domain
      );
    }

    // Note: Staging domain can be same as production (for unpublished theme staging)

    return domain;
  }

  /**
   * Validates theme token format
   * @param token - Theme token
   * @param authMethod - Authentication method
   * @throws ShopValidationError If invalid
   * @returns Valid token
   */
  validateThemeToken(token: unknown, authMethod: AuthenticationMethod): string {
    if (!token || typeof token !== 'string') {
      throw new ShopValidationError('Theme token is required', 'themeToken', token);
    }

    if (authMethod === 'manual-tokens' && !token.startsWith('shptka_')) {
      throw new ShopValidationError(
        'Manual theme tokens must start with "shptka_"',
        'themeToken',
        token
      );
    }

    if (token.length < 10) {
      throw new ShopValidationError(
        'Theme token appears to be too short',
        'themeToken',
        token
      );
    }

    return token;
  }
}