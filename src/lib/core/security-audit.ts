import fs from 'fs';
import path from 'path';
import type { Dependencies, Result } from './types.js';
import type { SecurityAuditReport, ShopSecurityAudit, SecurityIssue } from '../../types/shop.js';

/**
 * Security audit operations for shop configurations and credentials
 */

export const runSecurityAudit = async (deps: Dependencies): Promise<Result<SecurityAuditReport>> => {
  const issues: SecurityIssue[] = [];
  const shopAudits: ShopSecurityAudit[] = [];

  // Check credential directory permissions
  if (fs.existsSync(deps.credentialsDir)) {
    const stats = fs.statSync(deps.credentialsDir);
    const mode = (stats.mode & parseInt('777', 8)).toString(8);

    if (mode !== '700' && process.platform !== 'win32') {
      issues.push({
        level: 'warning',
        message: `Credential directory has permissive permissions: ${mode}`,
        recommendation: `Run: chmod 700 ${deps.credentialsDir}`
      });
    }
  } else {
    issues.push({
      level: 'info',
      message: 'Credential directory does not exist yet',
      recommendation: 'Run "multi-shop shop" to create your first shop'
    });
  }

  // Audit each shop's credentials
  const shopsResult = await listShops(deps);
  if (shopsResult.success && shopsResult.data) {
    for (const shopId of shopsResult.data) {
      const audit = await auditShopCredentials(deps, shopId);
      shopAudits.push(audit);

      if (!audit.integrityValid) {
        issues.push({
          level: 'warning',
          shopId,
          message: 'Credential file exists but metadata is missing',
          recommendation: 'Credentials are valid but consider regenerating to add metadata'
        });
      }

      if (audit.filePermissions !== 'none' && audit.filePermissions !== '600' && process.platform !== 'win32') {
        issues.push({
          level: 'warning',
          shopId,
          message: `Credential file has permissive permissions: ${audit.filePermissions}`,
          recommendation: `Run: chmod 600 ${path.join(deps.credentialsDir, shopId + '.credentials.json')}`
        });
      }
    }
  }

  // Check for credentials in git
  const gitignoreCheck = await checkGitignore(deps);
  if (!gitignoreCheck) {
    issues.push({
      level: 'error',
      message: 'Credentials directory pattern not found in .gitignore',
      recommendation: 'Add "shops/credentials/" to .gitignore to prevent credential leaks'
    });
  }

  // Check for credential files in git history
  const gitHistoryCheck = await checkGitHistory(deps);
  if (!gitHistoryCheck) {
    issues.push({
      level: 'warning',
      message: 'Potential credential files detected in git history',
      recommendation: 'Review git history: git log --all --full-history -- "shops/credentials/"'
    });
  }

  return {
    success: true,
    data: {
      timestamp: new Date().toISOString(),
      shops: shopAudits,
      issues,
      recommendations: generateRecommendations(issues)
    }
  };
};

const auditShopCredentials = async (
  deps: Dependencies,
  shopId: string
): Promise<ShopSecurityAudit> => {
  const credPath = path.join(deps.credentialsDir, `${shopId}.credentials.json`);

  if (!fs.existsSync(credPath)) {
    return {
      shopId,
      filePermissions: 'none',
      lastModified: 'never',
      hasProduction: false,
      hasStaging: false,
      integrityValid: false
    };
  }

  const stats = fs.statSync(credPath);
  const mode = (stats.mode & parseInt('777', 8)).toString(8);

  const rawData = fs.readFileSync(credPath, 'utf8');
  const credentials = JSON.parse(rawData);

  // Verify integrity if metadata exists
  const integrityValid = credentials._metadata?.created ? true : false;

  return {
    shopId,
    filePermissions: mode,
    lastModified: stats.mtime.toISOString(),
    hasProduction: Boolean(credentials.shopify?.stores?.production?.themeToken),
    hasStaging: Boolean(credentials.shopify?.stores?.staging?.themeToken),
    integrityValid
  };
};

const listShops = async (deps: Dependencies): Promise<Result<string[]>> => {
  try {
    if (!fs.existsSync(deps.shopsDir)) {
      return { success: true, data: [] };
    }

    const shops = fs
      .readdirSync(deps.shopsDir)
      .filter(file => file.endsWith(".config.json") && !file.includes("example"))
      .map(file => file.replace(".config.json", ""));

    return { success: true, data: shops };
  } catch (error) {
    return {
      success: false,
      error: `Failed to list shops: ${error instanceof Error ? error.message : String(error)}`
    };
  }
};

const checkGitignore = async (deps: Dependencies): Promise<boolean> => {
  const gitignorePath = path.join(deps.cwd, '.gitignore');

  if (!fs.existsSync(gitignorePath)) {
    return false;
  }

  const content = fs.readFileSync(gitignorePath, 'utf8');

  // Check for various patterns that would ignore credentials
  const patterns = [
    'shops/credentials/',
    'shops/credentials',
    '**/credentials/',
    'credentials/'
  ];

  return patterns.some(pattern => content.includes(pattern));
};

const checkGitHistory = async (deps: Dependencies): Promise<boolean> => {
  try {
    const { execSync } = await import('child_process');

    // Check if we're in a git repo
    if (!fs.existsSync(path.join(deps.cwd, '.git'))) {
      return true; // Not a git repo, can't check history
    }

    // Check for credential files in git history
    const result = execSync(
      'git log --all --full-history --pretty=format:"%H" -- "shops/credentials/" 2>/dev/null || echo ""',
      { cwd: deps.cwd, encoding: 'utf8', timeout: 5000 }
    );

    // If no commits found, credentials were never committed (good)
    return result.trim().length === 0;
  } catch {
    // If git command fails, assume safe
    return true;
  }
};

const generateRecommendations = (issues: SecurityIssue[]): readonly string[] => {
  const recommendations: string[] = [];

  const errorIssues = issues.filter(i => i.level === 'error');
  const warningIssues = issues.filter(i => i.level === 'warning');

  if (errorIssues.length > 0) {
    recommendations.push('CRITICAL: Fix error-level issues immediately');
    errorIssues.forEach(issue => {
      recommendations.push(`  - ${issue.message}: ${issue.recommendation}`);
    });
  }

  if (warningIssues.length > 0) {
    recommendations.push('Address warning-level issues when possible');
  }

  if (issues.length === 0) {
    recommendations.push('✅ No security issues detected - excellent!');
  }

  return recommendations;
};

export const formatAuditReport = (report: SecurityAuditReport): string => {
  const lines: string[] = [];

  lines.push('\n🔒 Security Audit Report');
  lines.push(`📅 Generated: ${new Date(report.timestamp).toLocaleString()}`);
  lines.push('');

  // Shop audits
  if (report.shops.length > 0) {
    lines.push(`📦 Shops Audited: ${report.shops.length}`);
    lines.push('');

    report.shops.forEach(shop => {
      lines.push(`  ${shop.shopId}:`);
      lines.push(`    Permissions: ${shop.filePermissions}`);
      lines.push(`    Production Token: ${shop.hasProduction ? '✅' : '❌'}`);
      lines.push(`    Staging Token: ${shop.hasStaging ? '✅' : '❌'}`);
      lines.push(`    Integrity: ${shop.integrityValid ? '✅' : '⚠️'}`);
      lines.push('');
    });
  } else {
    lines.push('📦 No shops configured yet');
    lines.push('');
  }

  // Issues
  if (report.issues.length > 0) {
    lines.push(`⚠️  Issues Found: ${report.issues.length}`);
    lines.push('');

    const errorIssues = report.issues.filter(i => i.level === 'error');
    const warningIssues = report.issues.filter(i => i.level === 'warning');
    const infoIssues = report.issues.filter(i => i.level === 'info');

    if (errorIssues.length > 0) {
      lines.push('🔴 Errors:');
      errorIssues.forEach(issue => {
        lines.push(`  - ${issue.message}`);
        lines.push(`    → ${issue.recommendation}`);
      });
      lines.push('');
    }

    if (warningIssues.length > 0) {
      lines.push('🟡 Warnings:');
      warningIssues.forEach(issue => {
        lines.push(`  - ${issue.message}`);
        lines.push(`    → ${issue.recommendation}`);
      });
      lines.push('');
    }

    if (infoIssues.length > 0) {
      lines.push('ℹ️  Information:');
      infoIssues.forEach(issue => {
        lines.push(`  - ${issue.message}`);
        if (issue.recommendation) {
          lines.push(`    → ${issue.recommendation}`);
        }
      });
      lines.push('');
    }
  } else {
    lines.push('✅ No issues detected!');
    lines.push('');
  }

  // Recommendations
  if (report.recommendations.length > 0) {
    lines.push('💡 Recommendations:');
    report.recommendations.forEach(rec => {
      lines.push(`  ${rec}`);
    });
  }

  return lines.join('\n');
};
