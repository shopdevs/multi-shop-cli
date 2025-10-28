import Ajv, { type ValidateFunction } from "ajv";
import { ShopValidationError } from "../errors/ShopError.js";
import type { ShopConfig, ShopCredentials, AuthenticationMethod } from "../../types/shop.js";
import {
  SHOP_ID_RULES,
  SHOP_NAME_RULES,
  DOMAIN_RULES,
  BRANCH_NAME_RULES,
  THEME_TOKEN_RULES,
  AUTHENTICATION_METHODS,
  isValidShopId,
  isValidDomain,
  isValidThemeToken
} from "../core/validation-schemas.js";

/**
 * Validates shop configurations using JSON Schema with centralized validation rules
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

    // Use centralized validation rules
    this.shopConfigSchema = {
      type: "object",
      required: ["shopId", "name", "shopify"],
      additionalProperties: false,
      properties: {
        shopId: {
          type: "string",
          pattern: SHOP_ID_RULES.patternString,
          minLength: SHOP_ID_RULES.minLength,
          maxLength: SHOP_ID_RULES.maxLength,
          description: SHOP_ID_RULES.description
        },
        name: {
          type: "string",
          minLength: SHOP_NAME_RULES.minLength,
          maxLength: SHOP_NAME_RULES.maxLength,
          description: SHOP_NAME_RULES.description
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
                      pattern: DOMAIN_RULES.patternString,
                      description: "Production Shopify store domain"
                    },
                    branch: {
                      type: "string",
                      pattern: BRANCH_NAME_RULES.productionPatternString,
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
                      pattern: DOMAIN_RULES.patternString,
                      description: "Staging Shopify store domain (can be same as production)"
                    },
                    branch: {
                      type: "string",
                      pattern: BRANCH_NAME_RULES.stagingPatternString,
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
                  enum: [AUTHENTICATION_METHODS.themeAccessApp, AUTHENTICATION_METHODS.manualTokens],
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
                      minLength: THEME_TOKEN_RULES.minLength,
                      description: THEME_TOKEN_RULES.description
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
      const errors = (this.validateShopConfig.errors || []).map((error: { instancePath?: string; dataPath?: string; message?: string; data?: unknown; schema?: unknown }) => ({
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
      const errors = (this.validateCredentials.errors || []).map((error: { instancePath?: string; dataPath?: string; message?: string; data?: unknown }) => ({
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
   * Validates shop ID format using centralized rules
   * @param shopId - Shop identifier
   * @throws ShopValidationError If invalid
   * @returns Valid shop ID
   */
  validateShopId(shopId: unknown): string {
    if (!isValidShopId(shopId)) {
      throw new ShopValidationError(
        SHOP_ID_RULES.description,
        'shopId',
        shopId
      );
    }

    return shopId;
  }

  /**
   * Validates Shopify store domain format using centralized rules
   * @param domain - Store domain
   * @param type - Domain type (production/staging)
   * @throws ShopValidationError If invalid
   * @returns Valid domain
   */
  validateStoreDomain(domain: unknown, type: 'production' | 'staging' = 'production'): string {
    if (!isValidDomain(domain)) {
      throw new ShopValidationError(
        `${type} ${DOMAIN_RULES.description}`,
        'domain',
        domain
      );
    }

    return domain;
  }

  /**
   * Validates theme token format using centralized rules
   * @param token - Theme token
   * @param authMethod - Authentication method
   * @throws ShopValidationError If invalid
   * @returns Valid token
   */
  validateThemeToken(token: unknown, authMethod: AuthenticationMethod): string {
    if (!isValidThemeToken(token, authMethod)) {
      throw new ShopValidationError(
        THEME_TOKEN_RULES.prefixDescription,
        'themeToken',
        token
      );
    }

    return token;
  }
}
