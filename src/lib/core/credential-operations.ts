import fs from "fs";
import path from "path";
import type { ShopCredentials } from "../../types/shop.js";
import type { Dependencies, Result, CredentialOperations } from "./types.js";

/**
 * Pure functional credential operations
 */

export const createCredentialOperations = (deps: Dependencies): CredentialOperations => ({
  loadCredentials: (shopId: string) => loadCredentials(deps, shopId),
  saveCredentials: (shopId: string, credentials: ShopCredentials) => saveCredentials(deps, shopId, credentials)
});

const loadCredentials = async (deps: Dependencies, shopId: string): Promise<Result<ShopCredentials | null>> => {
  try {
    const credPath = getCredentialPath(deps, shopId);
    
    if (!fs.existsSync(credPath)) {
      return { success: true, data: null };
    }

    const rawData = fs.readFileSync(credPath, "utf8");
    const credentials = JSON.parse(rawData);

    if (!credentials?.shopify?.stores) {
      return { success: false, error: `Invalid credential format for ${shopId}` };
    }

    return { success: true, data: credentials };
  } catch (error) {
    return { 
      success: false, 
      error: `Failed to load credentials: ${error instanceof Error ? error.message : String(error)}` 
    };
  }
};

const saveCredentials = async (deps: Dependencies, shopId: string, credentials: ShopCredentials): Promise<Result<void>> => {
  try {
    ensureCredentialsDirectory(deps);

    const credPath = getCredentialPath(deps, shopId);
    
    const secureCredentials = {
      ...credentials,
      _metadata: {
        created: new Date().toISOString(),
        version: "1.0.0"
      }
    };

    fs.writeFileSync(credPath, JSON.stringify(secureCredentials, null, 2));
    
    // Set secure permissions where supported
    try {
      fs.chmodSync(credPath, 0o600);
    } catch {
      // Ignored on Windows
    }

    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: `Failed to save credentials: ${error instanceof Error ? error.message : String(error)}` 
    };
  }
};

const getCredentialPath = (deps: Dependencies, shopId: string): string => {
  // Validate and sanitize shopId
  const sanitizedShopId = shopId.replace(/[^a-z0-9-]/gi, '');
  if (sanitizedShopId !== shopId || sanitizedShopId.length === 0 || sanitizedShopId.length > 50) {
    throw new Error('Shop ID contains invalid characters');
  }
  
  const credentialPath = path.join(deps.credentialsDir, `${sanitizedShopId}.credentials.json`);
  
  // Ensure path is within credentials directory
  const resolvedPath = path.resolve(credentialPath);
  const resolvedCredentialsDir = path.resolve(deps.credentialsDir);
  
  if (!resolvedPath.startsWith(resolvedCredentialsDir)) {
    throw new Error('Invalid credential path');
  }
  
  return credentialPath;
};

const ensureCredentialsDirectory = (deps: Dependencies): void => {
  if (!fs.existsSync(deps.credentialsDir)) {
    fs.mkdirSync(deps.credentialsDir, { recursive: true });
    
    // Set directory permissions where supported
    try {
      fs.chmodSync(deps.credentialsDir, 0o700);
    } catch {
      // Ignored on Windows
    }
  }
};