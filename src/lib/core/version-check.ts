import { execSync } from "child_process";
import { note } from "@clack/prompts";
import type { Result } from "./types.js";

// Important packages to monitor - update this list as needed
const IMPORTANT_PACKAGES = [
  { name: "@shopdevs/multi-shop-cli", updateCmd: "pnpm update -D @shopdevs/multi-shop-cli" },
  { name: "@shopify/cli", updateCmd: "pnpm update -g @shopify/cli" },
  { name: "pnpm", updateCmd: "npm install -g pnpm@latest" }
] as const;

export const checkVersions = async (): Promise<Result<void>> => {
  note("Checking versions of important packages", "📋 Version Check");
  console.log(`\n📋 Package Versions:`);
  
  for (const pkg of IMPORTANT_PACKAGES) {
    await checkSinglePackage(pkg.name, pkg.updateCmd);
  }

  return { success: true };
};

const checkSinglePackage = async (packageName: string, updateCmd: string): Promise<void> => {
  console.log(`\n${packageName}:`);

  try {
    const installedVersion = getInstalledVersion(packageName);
    const latestVersion = execSync(`npm view ${packageName} version`, { 
      encoding: 'utf8', 
      timeout: 5000 
    }).trim().replace(/"/g, '');

    if (!installedVersion) {
      console.log(`  Status: ❌ Not installed`);
      console.log(`  Install: ${updateCmd}`);
      return;
    }

    if (installedVersion === latestVersion) {
      console.log(`  Version: ${installedVersion}`);
      console.log(`  Status: ✅ Up to date`);
    } else {
      console.log(`  Version: Local: ${installedVersion}, Latest: ${latestVersion}`);
      console.log(`  Status: ⚠️ Update available`);
      console.log(`  Update: ${updateCmd}`);
    }

  } catch {
    console.log(`  Status: ❌ Error checking package`);
  }
};

const getInstalledVersion = (packageName: string): string | null => {
  try {
    switch (packageName) {
      case "@shopdevs/multi-shop-cli":
        return execSync('npx multi-shop --version', { encoding: 'utf8', timeout: 5000 }).trim();
      case "@shopify/cli":
        return execSync('shopify version', { encoding: 'utf8', timeout: 5000 }).trim();
      case "pnpm":
        return execSync('pnpm --version', { encoding: 'utf8', timeout: 5000 }).trim();
      default:
        return null;
    }
  } catch {
    return null;
  }
};