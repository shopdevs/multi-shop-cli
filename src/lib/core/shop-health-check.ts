import { select, isCancel, note } from "@clack/prompts";
import { execSync } from "child_process";
import type { CLIContext, Result } from "./types.js";
import { validateShopConfig, validateDomain } from "./validation.js";
import fs from "fs";
import path from "path";

/**
 * Shop health check - Diagnostic tool for verifying shop configuration
 */

interface HealthCheckResult {
  readonly shopId: string;
  readonly checks: {
    readonly config: CheckStatus;
    readonly credentials: CheckStatus;
    readonly branches: CheckStatus;
    readonly contentProtection: CheckStatus;
  };
  readonly warnings: string[];
  readonly errors: string[];
  readonly recommendations: string[];
}

interface CheckStatus {
  readonly status: 'pass' | 'warn' | 'fail' | 'info';
  readonly message: string;
  readonly details?: string[];
}

export const handleHealthCheck = async (context: CLIContext): Promise<Result<void>> => {
  const healthChoice = await select({
    message: "Health Check:",
    options: [
      { value: "single", label: "Check Single Shop", hint: "Detailed check for one shop" },
      { value: "all", label: "Check All Shops", hint: "Quick check for all shops" }
    ]
  });

  if (isCancel(healthChoice)) return { success: false, error: "Cancelled" };

  if (healthChoice === "single") {
    return checkSingleShop(context);
  } else {
    return checkAllShops(context);
  }
};

const checkSingleShop = async (context: CLIContext): Promise<Result<void>> => {
  const shopsResult = await context.shopOps.listShops();

  if (!shopsResult.success || !shopsResult.data?.length) {
    note("No shops configured yet", "⚠️ Error");
    return { success: false, error: "No shops configured" };
  }

  const shopId = await selectShop(shopsResult.data);
  if (!shopId) return { success: false, error: "No shop selected" };

  const healthResult = await performHealthCheck(context, shopId);
  displayDetailedHealth(healthResult);

  return { success: true };
};

const checkAllShops = async (context: CLIContext): Promise<Result<void>> => {
  const shopsResult = await context.shopOps.listShops();

  if (!shopsResult.success || !shopsResult.data?.length) {
    note("No shops configured yet", "⚠️ Error");
    return { success: false, error: "No shops configured" };
  }

  note(`Checking health for ${shopsResult.data.length} shops...`, "🏥 Health Check");

  for (const shopId of shopsResult.data) {
    const healthResult = await performHealthCheck(context, shopId);
    displayCompactHealth(healthResult);
  }

  return { success: true };
};

const performHealthCheck = async (context: CLIContext, shopId: string): Promise<HealthCheckResult> => {
  const warnings: string[] = [];
  const errors: string[] = [];
  const recommendations: string[] = [];

  // Check 1: Configuration
  const configCheck = await checkConfiguration(context, shopId, errors, warnings);

  // Check 2: Credentials
  const credentialsCheck = await checkCredentials(context, shopId, errors, warnings, recommendations);

  // Check 3: Git Branches
  const branchesCheck = await checkBranches(shopId, errors, warnings, recommendations);

  // Check 4: Content Protection
  const protectionCheck = await checkContentProtection(context, shopId);

  return {
    shopId,
    checks: {
      config: configCheck,
      credentials: credentialsCheck,
      branches: branchesCheck,
      contentProtection: protectionCheck
    },
    warnings,
    errors,
    recommendations
  };
};

const checkConfiguration = async (
  context: CLIContext,
  shopId: string,
  errors: string[],
  warnings: string[]
): Promise<CheckStatus> => {
  try {
    const configResult = await context.shopOps.loadConfig(shopId);

    if (!configResult.success || !configResult.data) {
      errors.push("Config file missing or invalid");
      return { status: 'fail', message: 'Config file missing or invalid' };
    }

    const config = configResult.data;

    // Validate config structure
    const validationResult = await validateShopConfig(config, shopId);
    if (!validationResult.success) {
      errors.push(`Config validation failed: ${validationResult.error}`);
      return { status: 'fail', message: `Validation failed: ${validationResult.error}` };
    }

    // Check domains
    const prodDomainValid = validateDomain(config.shopify.stores.production.domain);
    const stagingDomainValid = validateDomain(config.shopify.stores.staging.domain);

    if (!prodDomainValid.success || !stagingDomainValid.success) {
      warnings.push("Invalid domain format");
      return { status: 'warn', message: 'Domain format issues detected' };
    }

    return {
      status: 'pass',
      message: 'Configuration valid',
      details: [
        `Production: ${config.shopify.stores.production.domain}`,
        `Staging: ${config.shopify.stores.staging.domain}`,
        `Auth: ${config.shopify.authentication.method}`
      ]
    };
  } catch (error) {
    errors.push(`Config check failed: ${error instanceof Error ? error.message : String(error)}`);
    return { status: 'fail', message: 'Config check failed' };
  }
};

const checkCredentials = async (
  context: CLIContext,
  shopId: string,
  errors: string[],
  warnings: string[],
  recommendations: string[]
): Promise<CheckStatus> => {
  try {
    const credResult = await context.credOps.loadCredentials(shopId);

    if (!credResult.success || !credResult.data) {
      errors.push("No credentials configured");
      recommendations.push(`Create credentials: shops/credentials/${shopId}.credentials.json`);
      return { status: 'fail', message: 'Credentials missing' };
    }

    const creds = credResult.data;
    const hasProd = Boolean(creds.shopify?.stores?.production?.themeToken);
    const hasStaging = Boolean(creds.shopify?.stores?.staging?.themeToken);

    if (!hasProd || !hasStaging) {
      warnings.push("Missing tokens");
      if (!hasProd) recommendations.push("Add production token");
      if (!hasStaging) recommendations.push("Add staging token");
      return { status: 'warn', message: 'Some tokens missing' };
    }

    // Check file permissions (Unix/macOS only)
    if (process.platform !== 'win32') {
      const credPath = path.join(context.deps.credentialsDir, `${shopId}.credentials.json`);
      if (fs.existsSync(credPath)) {
        const stats = fs.statSync(credPath);
        const mode = (stats.mode & parseInt('777', 8)).toString(8);

        if (mode !== '600') {
          warnings.push(`Insecure permissions: ${mode}`);
          recommendations.push(`Run: chmod 600 shops/credentials/${shopId}.credentials.json`);
          return {
            status: 'warn',
            message: `Permissions too open (${mode})`,
            details: ['Production token present', 'Staging token present']
          };
        }
      }
    }

    return {
      status: 'pass',
      message: 'Credentials configured',
      details: [
        '✅ Production token present',
        '✅ Staging token present',
        process.platform !== 'win32' ? '✅ File permissions: 600' : 'ℹ️  Windows (permissions N/A)'
      ]
    };
  } catch (error) {
    errors.push(`Credentials check failed: ${error instanceof Error ? error.message : String(error)}`);
    return { status: 'fail', message: 'Credentials check failed' };
  }
};

const checkBranches = async (
  shopId: string,
  errors: string[],
  warnings: string[],
  recommendations: string[]
): Promise<CheckStatus> => {
  try {
    const mainBranch = `${shopId}/main`;
    const stagingBranch = `${shopId}/staging`;

    const mainExists = checkBranchExists(mainBranch);
    const stagingExists = checkBranchExists(stagingBranch);

    if (!mainExists || !stagingExists) {
      if (!mainExists) {
        errors.push(`Branch ${mainBranch} not found`);
        recommendations.push(`Create and push: git checkout -b ${mainBranch} && git push -u origin ${mainBranch}`);
      }
      if (!stagingExists) {
        errors.push(`Branch ${stagingBranch} not found`);
        recommendations.push(`Create and push: git checkout -b ${stagingBranch} && git push -u origin ${stagingBranch}`);
      }
      return { status: 'fail', message: 'Required branches missing' };
    }

    // Check if branches are in sync
    try {
      const behind = execSync(`git rev-list --count ${stagingBranch}..${mainBranch} 2>/dev/null || echo "0"`, {
        encoding: 'utf8'
      }).trim();

      if (parseInt(behind) > 0) {
        warnings.push(`${stagingBranch} is ${behind} commits behind ${mainBranch}`);
        recommendations.push(`Consider syncing: Create PR from ${mainBranch} to ${stagingBranch}`);
        return {
          status: 'warn',
          message: `Branches out of sync (${behind} commits behind)`,
          details: [`${mainBranch} exists`, `${stagingBranch} exists`]
        };
      }
    } catch {
      // Can't check sync status (branches might not have common ancestor)
    }

    return {
      status: 'pass',
      message: 'Git branches configured',
      details: [`${mainBranch} exists`, `${stagingBranch} exists`]
    };
  } catch (error) {
    errors.push(`Branch check failed: ${error instanceof Error ? error.message : String(error)}`);
    return { status: 'fail', message: 'Branch check failed' };
  }
};

const checkContentProtection = async (context: CLIContext, shopId: string): Promise<CheckStatus> => {
  try {
    const configResult = await context.shopOps.loadConfig(shopId);

    if (!configResult.success || !configResult.data) {
      return { status: 'info', message: 'Cannot check (config unavailable)' };
    }

    const protection = configResult.data.contentProtection;

    if (!protection || !protection.enabled) {
      return {
        status: 'info',
        message: 'Disabled',
        details: ['💡 Enable in: Tools → Content Protection']
      };
    }

    return {
      status: 'pass',
      message: `Enabled (${protection.mode} mode, ${protection.verbosity})`,
      details: [
        `Mode: ${protection.mode}`,
        `Verbosity: ${protection.verbosity}`,
        '🛡️ Shop content protected from cross-shop overwrites'
      ]
    };
  } catch {
    return { status: 'info', message: 'Cannot check (error)' };
  }
};

// Helper functions
const checkBranchExists = (branchName: string): boolean => {
  try {
    execSync(`git rev-parse --verify origin/${branchName}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
};

const selectShop = async (shops: string[]): Promise<string | null> => {
  const shopChoice = await select({
    message: "Select shop to check:",
    options: shops.map(shop => ({ value: shop, label: shop }))
  });

  return isCancel(shopChoice) ? null : String(shopChoice);
};

const displayDetailedHealth = (result: HealthCheckResult): void => {
  console.log('\n');
  note(`Health Check Results: ${result.shopId}`, '🏥 Health Check');

  console.log('\n📋 Configuration:');
  displayCheck(result.checks.config);

  console.log('\n🔑 Credentials:');
  displayCheck(result.checks.credentials);

  console.log('\n🌿 Git Branches:');
  displayCheck(result.checks.branches);

  console.log('\n🛡️ Content Protection:');
  displayCheck(result.checks.contentProtection);

  // Overall status
  const hasErrors = result.errors.length > 0;
  const hasWarnings = result.warnings.length > 0;

  console.log('\n📊 Overall Status:');
  if (hasErrors) {
    console.log(`  ❌ ISSUES FOUND (${result.errors.length} error${result.errors.length === 1 ? '' : 's'})`);
  } else if (hasWarnings) {
    console.log(`  ⚠️  WARNINGS (${result.warnings.length} warning${result.warnings.length === 1 ? '' : 's'})`);
  } else {
    console.log(`  ✅ HEALTHY`);
  }

  // Recommendations
  if (result.recommendations.length > 0) {
    console.log('\n💡 Recommendations:');
    result.recommendations.forEach(rec => console.log(`  • ${rec}`));
  }

  console.log();
};

const displayCompactHealth = (result: HealthCheckResult): void => {
  const hasErrors = result.errors.length > 0;
  const hasWarnings = result.warnings.length > 0;

  let status = '✅';
  if (hasErrors) status = '❌';
  else if (hasWarnings) status = '⚠️';

  const summary = [
    result.checks.config.status !== 'pass' ? 'config' : null,
    result.checks.credentials.status !== 'pass' ? 'creds' : null,
    result.checks.branches.status !== 'pass' ? 'branches' : null
  ].filter(Boolean).join(', ');

  console.log(`  ${status} ${result.shopId}${summary ? ` (${summary})` : ''}`);

  if (result.recommendations.length > 0 && result.recommendations.length <= 2) {
    result.recommendations.forEach(rec => console.log(`      💡 ${rec}`));
  }
};

const displayCheck = (check: CheckStatus): void => {
  const icon = {
    'pass': '✅',
    'warn': '⚠️',
    'fail': '❌',
    'info': 'ℹ️'
  }[check.status];

  console.log(`  ${icon} ${check.message}`);

  if (check.details) {
    check.details.forEach(detail => {
      console.log(`     ${detail}`);
    });
  }
};
