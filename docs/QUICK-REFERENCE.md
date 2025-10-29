# Quick Reference

Fast reference for common tasks and commands.

## Installation

```bash
# Install and initialize
cd your-shopify-theme
pnpm add -D @shopdevs/multi-shop-cli && npx multi-shop init
```

## Common Commands

### CLI Commands

```bash
# Interactive shop manager
pnpm run shop

# Contextual development
pnpm run dev

# Direct commands
npx multi-shop              # Interactive manager
npx multi-shop dev          # Start dev server
npx multi-shop init         # Initialize project
npx multi-shop --version    # Show version
npx multi-shop --help       # Show help
```

### Shop Management

```bash
# Create new shop
pnpm run shop → Create New Shop

# List all shops
pnpm run shop → List Shops

# Edit shop configuration
pnpm run shop → Edit Shop

# Delete shop
pnpm run shop → Delete Shop
```

### Campaign Tools (NEW in v2.3.0)

```bash
# Create promo branch (shop-a/main → shop-a/promo-NAME)
pnpm run shop → Campaign Tools → Create Promo Branch

# List all active campaign branches
pnpm run shop → Campaign Tools → List Active Promos

# Push promo content back to shop main
pnpm run shop → Campaign Tools → Push Promo to Main

# End campaign and cleanup
pnpm run shop → Campaign Tools → End Promo
```

### Tools Menu

```bash
# Sync shops (create PRs)
pnpm run shop → Tools → Sync Shops

# Verify shop configuration
pnpm run shop → Tools → Health Check

# Configure content protection
pnpm run shop → Tools → Content Protection

# Link themes to GitHub
pnpm run shop → Tools → Link Themes

# Check package versions
pnpm run shop → Tools → Version Check

# Run security audit
npx multi-shop audit
```

## Configuration Files

### Shop Configuration (Committed)

```json
// shops/shop-a.config.json
{
  "shopId": "shop-a",
  "name": "Shop A",
  "shopify": {
    "stores": {
      "production": {
        "domain": "shop-a.myshopify.com",
        "branch": "shop-a/main"
      },
      "staging": {
        "domain": "staging-shop-a.myshopify.com",
        "branch": "shop-a/staging"
      }
    },
    "authentication": {
      "method": "theme-access-app"
    }
  },
  "contentProtection": {
    "enabled": true,
    "mode": "strict",
    "verbosity": "verbose"
  }
}
```

### Global Settings (Root)

```json
// settings.json (NEW in v2.3.0)
{
  "contentProtection": {
    "defaultMode": "strict",
    "defaultVerbosity": "verbose",
    "applyToNewShops": true
  },
  "version": "1.0.0"
}
```

### Developer Credentials (Local Only)

```json
// shops/credentials/shop-a.credentials.json
{
  "developer": "your-name",
  "shopify": {
    "stores": {
      "production": { "themeToken": "your-prod-token" },
      "staging": { "themeToken": "your-staging-token" }
    }
  },
  "notes": "Theme access app credentials"
}
```

## Workflows

### Core Feature Development

```bash
# 1. Create feature branch
git checkout main && git checkout -b feature/new-component

# 2. Test across shops
pnpm run dev  # Select different shops

# 3. Create PR to main
gh pr create --base main --title "Add new component"

# 4. After merge, sync to shops
pnpm run shop → Tools → Sync Shops
# ⚠️  CLI automatically detects content files
# 🚨 STRICT warning if syncing from main (requires confirmation)
# ℹ️  SOFT info if syncing within same shop (no blocking)
```

### Shop-Specific Development

```bash
# 1. Create shop branch
git checkout shop-a/main && git checkout -b shop-a/custom-feature

# 2. Auto-detected development
pnpm run dev

# 3. Create shop PR
gh pr create --base shop-a/main --title "Custom feature"
```

### Campaign/Promo Workflow

```bash
# 1. Create promo branch
pnpm run shop → Campaign Tools → Create Promo Branch

# 2. Connect to Shopify theme
# Shopify Admin → Themes → Add theme → Connect from GitHub

# 3. Customize in Shopify admin
# Changes auto-sync back to branch

# 4. Launch promo
# Publish theme or use Launchpad app

# 5. After campaign: Push content back to main
pnpm run shop → Campaign Tools → Push Promo to Main

# 6. Cleanup campaign branch
pnpm run shop → Campaign Tools → End Promo
```

## Branch Naming

```bash
# Core features
feature/carousel-fix
hotfix/critical-bug
bugfix/checkout-issue

# Shop-specific
shop-a/custom-section
shop-b/beauty-quiz

# Campaigns
shop-a/promo-summer-sale
shop-b/promo-holiday-2024

# Promo endings
shop-a/end-promo-summer-sale
```

## Git Commands

```bash
# Check current branch
git branch --show-current

# List all branches
git branch -a

# Switch branches
git checkout shop-a/main

# Create new branch
git checkout -b feature/new-feature

# Push branch
git push -u origin feature/new-feature

# Pull latest
git pull origin main
```

## GitHub CLI Commands

```bash
# Create PR
gh pr create --base main --title "Title"

# List PRs
gh pr list

# View PR
gh pr view 123

# Merge PR
gh pr merge 123

# Check status
gh pr status
```

## Validation Rules

### Shop ID

- Lowercase alphanumeric with hyphens
- No leading or trailing hyphens
- Examples: `shop-a`, `my-store-123`

### Domain

- Must end with `.myshopify.com`
- Examples: `shop-a.myshopify.com`

### Branch Name

- Production: `shop-id/main`
- Staging: `shop-id/staging`
- Custom: `shop-id/any-name`

### Theme Token

- Theme access app: `tkat_...`
- Manual tokens: `shptka_...`
- Minimum 10 characters

## Testing

```bash
# Run all tests
pnpm test

# Watch mode
pnpm run test:watch

# Test UI
pnpm run test:ui

# Coverage
pnpm test --coverage

# Integration tests
pnpm run test:e2e

# Performance tests
pnpm run test:perf
```

## Security

```bash
# Security audit
pnpm run security:audit

# Check credentials
npx multi-shop audit

# Fix file permissions (Unix/macOS/Linux)
chmod 600 shops/credentials/*.credentials.json

# Verify .gitignore
cat .gitignore | grep credentials
```

## Troubleshooting

### Common Fixes

```bash
# No shops configured
pnpm run shop → Create New Shop

# No credentials found
# Create: shops/credentials/SHOP.credentials.json

# Shopify CLI not found
npm install -g @shopify/cli

# Permission denied (Unix/macOS/Linux)
chmod 600 shops/credentials/*.credentials.json

# Branch not found
git push -u origin shop-a/main

# Dev server won't start
# Check credentials and domain in config
```

### Debug Mode

```bash
# Enable debug logging
DEBUG=multi-shop:* pnpm run dev

# Verbose mode
npx multi-shop --verbose
```

## Performance

```bash
# Check startup time
pnpm run perf:startup

# Performance tests
pnpm run test:perf

# Check package size
pnpm run size-check
```

## Programmatic API (Advanced)

For custom build scripts or automation, you can use multi-shop as a library:

```typescript
// Example: Custom deployment script
import { createMultiShopCLI } from '@shopdevs/multi-shop-cli';

const context = createMultiShopCLI();
const shops = await context.shopOps.listShops();
// Your custom logic here...
```

**Use cases:**
- Custom build/deployment scripts
- Extending with your own tooling
- Integration with other automation

**See:** [API Documentation](./api/index.md) for complete programmatic usage

## Environment Variables

```bash
# Debug mode
DEBUG=multi-shop:*

# Custom working directory
CWD=/path/to/theme

# GitHub token for CI/CD
GITHUB_TOKEN=ghp_...

# Shopify CLI tokens
SHOPIFY_CLI_THEME_TOKEN=...
```

## File Locations

```
your-theme/
├── shops/
│   ├── shop-a.config.json       # Shop config (committed)
│   ├── shop-b.config.json
│   └── credentials/
│       ├── shop-a.credentials.json  # Credentials (local only)
│       └── shop-b.credentials.json
├── .github/
│   └── workflows/
│       └── shop-sync.yml        # Auto-sync workflow
├── package.json                 # With multi-shop scripts
└── .gitignore                   # Excludes credentials/
```

## Links

- **[Full Documentation](./README.md)** - Complete docs
- **[Getting Started](./guides/getting-started.md)** - Setup guide
- **[API Reference](./api/index.md)** - API docs
- **[Examples](../examples/)** - Real-world examples
- **[GitHub](https://github.com/shopdevs/multi-shop-cli)** - Repository

## Support

- **Documentation:** [docs/](./README.md)
- **Issues:** [GitHub Issues](https://github.com/shopdevs/multi-shop-cli/issues)
- **Email:** support@shopdevs.com
- **Security:** security@shopdevs.com

---

**Version:** 2.0.10
**Last Updated:** 2025-10-27
