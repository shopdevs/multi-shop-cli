import path from "path";
import { createShopOperations } from "./shop-operations.js";
import { createCredentialOperations } from "./credential-operations.js";
import { createDevOperations } from "./dev-operations.js";
import { runCLI } from "./cli.js";
import type { Dependencies, CLIContext } from "./types.js";

/**
 * Functional entry point with dependency injection
 */

export const createMultiShopCLI = (cwd: string = process.cwd()): CLIContext => {
  const deps: Dependencies = {
    cwd,
    shopsDir: path.join(cwd, "shops"),
    credentialsDir: path.join(cwd, "shops/credentials")
  };

  return {
    deps,
    shopOps: createShopOperations(deps),
    credOps: createCredentialOperations(deps),
    devOps: createDevOperations(deps)
  };
};

export const runMultiShopManager = async (cwd?: string): Promise<void> => {
  const context = createMultiShopCLI(cwd);
  await runCLI(context);
};

// Export types for external use
export type { CLIContext, Dependencies, Result } from "./types.js";