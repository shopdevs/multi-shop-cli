import { note } from "@clack/prompts";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

interface VersionInfo {
  current: string;
  status: string;
  updateCmd?: string;
}

interface Tool {
  name: string;
  command?: string;
  package?: string;
  current?: string;
  updateCmd?: string;
  installCmd?: string;
}

/**
 * Checks versions of development tools and packages
 */
export class VersionChecker {

  async checkVersions(): Promise<void> {
    note("Checking versions of key tools and packages", "📋 Version Check");
    
    const tools: Tool[] = [
      { name: "Shopify CLI", command: "shopify version", updateCmd: "pnpm update -g @shopify/cli", installCmd: "pnpm add -g @shopify/cli" },
      { name: "@shopdevs/multi-shop-cli", package: "@shopdevs/multi-shop-cli", current: this.getLocalPackageVersion(), updateCmd: "pnpm update -D @shopdevs/multi-shop-cli" },
      { name: "Node.js", current: process.version },
      { name: "pnpm", command: "pnpm --version", updateCmd: "npm install -g pnpm@latest", installCmd: "npm install -g pnpm" }
    ];

    console.log(`\n📋 Tool Versions:`);
    
    for (const tool of tools) {
      const result = await this.checkSingleVersion(tool);
      this.displayVersion(tool.name, result);
    }
  }

  private async checkSingleVersion(tool: Tool): Promise<VersionInfo> {
    // Handle tools with known current version
    if (tool.current) {
      if (tool.package) {
        return this.checkPackageVersion(tool);
      } else {
        return { current: tool.current, status: "✅ Up to date" };
      }
    }

    // Handle tools that need command execution
    if (tool.command) {
      return this.checkCommandVersion(tool);
    }

    return { current: "Unknown", status: "❌ Check failed" };
  }

  private checkPackageVersion(tool: Tool): VersionInfo {
    try {
      const latestVersion = execSync(`npm view ${tool.package} version`, {
        encoding: 'utf8',
        timeout: 5000
      }).trim().replace(/"/g, '');

      if (tool.current === latestVersion) {
        return { current: tool.current, status: "✅ Up to date" };
      } else {
        return { 
          current: `Local: ${tool.current}, NPM: ${latestVersion}`, 
          status: "⚠️ Update available", 
          ...(tool.updateCmd && { updateCmd: tool.updateCmd })
        };
      }
    } catch {
      return { 
        current: tool.current!, 
        status: "❌ Update check failed", 
        ...(tool.updateCmd && { updateCmd: tool.updateCmd })
      };
    }
  }

  private checkCommandVersion(tool: Tool): VersionInfo {
    try {
      const version = execSync(tool.command!, {
        encoding: 'utf8',
        timeout: 5000
      }).trim();

      return { 
        current: version, 
        status: "✅ Up to date", 
        ...(tool.updateCmd && { updateCmd: tool.updateCmd })
      };
    } catch {
      const cmd = tool.installCmd || tool.updateCmd;
      return { 
        current: "Not installed", 
        status: "❌ Not installed", 
        ...(cmd && { updateCmd: cmd })
      };
    }
  }

  private getLocalPackageVersion(): string {
    try {
      const output = execSync('pnpm list @shopdevs/multi-shop-cli --depth=0 --json', {
        encoding: 'utf8',
        timeout: 5000
      });
      
      const listResult = JSON.parse(output);
      const version = listResult.dependencies?.['@shopdevs/multi-shop-cli']?.version;
      
      return version || "Not installed locally";
    } catch {
      return "Not installed locally";
    }
  }

  private displayVersion(toolName: string, result: VersionInfo): void {
    console.log(`\n${toolName}:`);
    console.log(`  Version: ${result.current}`);
    console.log(`  Status: ${result.status}`);
    if (result.updateCmd) {
      console.log(`  Update: ${result.updateCmd}`);
    }
  }
}