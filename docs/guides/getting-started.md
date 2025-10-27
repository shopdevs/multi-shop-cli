# Getting Started

Complete guide to setting up and using ShopDevs Multi-Shop CLI.

## What is Multi-Shop?

ShopDevs Multi-Shop transforms any Shopify theme into a sophisticated multi-shop system with contextual development and automated shop management. Perfect for teams managing multiple Shopify stores.

## Prerequisites

Before you begin, ensure you have:

- **Node.js 18+** and **npm 8+** or **pnpm 9+**
- **Git** installed and configured
- **Shopify CLI** installed globally (`npm install -g @shopify/cli`)
- An existing **Shopify theme** project
- Access to your **Shopify stores** (admin access)
- **GitHub repository** for your theme

## Quick Install

Add Multi-Shop to your theme and initialize:

```bash
cd your-shopify-theme
pnpm add -D @shopdevs/multi-shop-cli && npx multi-shop init
```

This creates:
- `shops/` directory for configurations
- GitHub workflow for automated syncing
- Updated `package.json` with scripts
- Secure credential storage setup

## Step-by-Step Setup

### Step 1: Initialize Project

Navigate to your theme directory and run initialization:

```bash
cd your-shopify-theme
npx multi-shop init
```

You'll see:
```
🚀 Initializing ShopDevs Multi-Shop

Creating directory structure...
✓ Created shops/ directory
✓ Created shops/credentials/ directory

Setting up GitHub workflow...
✓ Created .github/workflows/shop-sync.yml

Updating package.json...
✓ Added multi-shop scripts

✅ Initialization complete!

Next steps:
1. Create your first shop: pnpm run shop
2. Set up credentials for each developer
3. Start development: pnpm run dev
```

### Step 2: Create Your First Shop

Run the shop manager:

```bash
pnpm run shop
# Select: Create New Shop
```

You'll be prompted for:

**Shop ID** (lowercase alphanumeric with hyphens):
```
? Shop ID: shop-a
```

**Shop Name** (human-readable):
```
? Shop name: Shop A
```

**Production Domain** (your-shop.myshopify.com):
```
? Production domain: shop-a.myshopify.com
```

**Staging Domain** (staging domain):
```
? Staging domain: staging-shop-a.myshopify.com
```

**Authentication Method**:
```
? Authentication method:
❯ theme-access-app (recommended)
  manual-tokens
```

**Create GitHub Branches?**
```
? Create GitHub branches?
❯ Yes, create branches automatically (Recommended)
  No, I'll create them manually
```

If you select "Yes", the tool automatically creates and pushes:
- `shop-a/main` (for production)
- `shop-a/staging` (for staging)

### Step 3: Create More Shops

Repeat the shop creation for each of your stores:

```bash
pnpm run shop
# → Create New Shop

# Shop B
# ID: shop-b
# Name: Shop B
# Production: shop-b.myshopify.com
# Staging: staging-shop-b.myshopify.com

# Shop C
# ID: shop-c
# Name: Shop C
# Production: shop-c.myshopify.com
# Staging: staging-shop-c.myshopify.com
```

### Step 4: Set Up Developer Credentials

Each developer needs to create their own credential files.

**Option A: Theme Access App (Recommended)**

1. Install Theme Access app in each Shopify store
2. Generate tokens for production and staging
3. Create credential file:

```bash
# Create file: shops/credentials/shop-a.credentials.json
```

```json
{
  "developer": "your-name",
  "shopify": {
    "stores": {
      "production": {
        "themeToken": "tkat_abc123xyz_production_token_here"
      },
      "staging": {
        "themeToken": "tkat_def456uvw_staging_token_here"
      }
    }
  },
  "notes": "Theme Access app credentials - generated via email link"
}
```

**Option B: Custom App Access Token**

1. Create a custom app in your Shopify Admin:
   - Go to **Settings** → **Apps and sales channels** → **Develop apps**
   - Click **Create an app**, name it (e.g., "Theme Development")
   - Click **Configure Admin API scopes**
   - Enable: `read_themes` and `write_themes`
   - Save and install the app
2. Get the Admin API access token
3. Create credential file with access tokens:

```json
{
  "developer": "your-name",
  "shopify": {
    "stores": {
      "production": {
        "themeToken": "shpat_your_admin_api_token"
      },
      "staging": {
        "themeToken": "shpat_your_staging_admin_api_token"
      }
    }
  },
  "notes": "Custom app access tokens"
}
```

**Note:** Theme Access app (Option A) is recommended for most teams. Custom apps are for advanced use cases or CI/CD automation.

**Security:** These files are automatically git-ignored and never committed.

Repeat for each shop:
```
shops/credentials/shop-a.credentials.json
shops/credentials/shop-b.credentials.json
shops/credentials/shop-c.credentials.json
```

### Step 5: Connect Git Branches to Shopify

For each shop, connect the Git branches to Shopify themes:

1. **Shopify Admin** → your-shop.myshopify.com → **Online Store** → **Themes**
2. Click **Add theme** → **Connect from GitHub**
3. Select your repository
4. Select branch: `shop-a/main` (for production) or `shop-a/staging`
5. Click **Connect**
6. **Repeat for all shops and branches**

### Step 6: Verify Setup

Check that everything is configured:

```bash
# List all shops
pnpm run shop
# → List Shops

# Should show your shops:
# shop-a (Shop A)
# shop-b (Shop B)
# shop-c (Shop C)

# Check Git branches exist
git branch -r
# Should show:
# origin/shop-a/main
# origin/shop-a/staging
# origin/shop-b/main
# origin/shop-b/staging
# ...

# Check credential files (each developer)
ls shops/credentials/
# Should show:
# shop-a.credentials.json
# shop-b.credentials.json
# shop-c.credentials.json
```

## First Development Session

Now you're ready to start developing!

### Feature Development

Create a feature branch and test it across shops:

```bash
# Create feature branch
git checkout main
git checkout -b feature/new-header

# Start contextual development
pnpm run dev
```

You'll see:
```
🚀 Contextual Development

Current branch: feature/new-header

Select shop for testing:
❯ shop-a (Shop A)
  shop-b (Shop B)
  shop-c (Shop C)

Select environment:
❯ staging (recommended)
  production (live store)

🔗 Starting Shopify CLI...
shopify theme dev --store=staging-shop-a.myshopify.com
```

**Key Point:** Your code stays on `feature/new-header`, but you can test it against any shop context!

### Test Different Shops

Test the same feature in different shop contexts:

```bash
# Exit current dev server (Ctrl+C)
pnpm run dev
# → Select shop-b this time
# → Test same feature code in shop-b context
```

### Shop-Specific Development

When working on shop-specific customizations:

```bash
# Create shop branch
git checkout shop-a/main
git checkout -b shop-a/custom-section

# Start development
pnpm run dev
```

You'll see:
```
🚀 Contextual Development

Current branch: shop-a/custom-section
Detected shop: shop-a

Select environment:
❯ staging (recommended)
  production (live store)

🔗 Starting Shopify CLI...
shopify theme dev --store=staging-shop-a.myshopify.com
```

**Key Point:** Shop context auto-detected from branch name!

## Available Commands

### CLI Commands

```bash
# Interactive shop manager
pnpm run shop

# Contextual development
pnpm run dev

# List all shops
pnpm run shop → List Shops

# Create new shop
pnpm run shop → Create New Shop

# Edit shop
pnpm run shop → Edit Shop

# Delete shop
pnpm run shop → Delete Shop

# Campaign tools
pnpm run shop → Campaign Tools

# Tools menu
pnpm run shop → Tools
```

### Direct npx Commands

```bash
# Initialize project
npx multi-shop init

# Interactive manager
npx multi-shop

# Development
npx multi-shop dev

# Version info
npx multi-shop --version

# Help
npx multi-shop --help
```

## Common Workflows

### Core Feature Development

```bash
# 1. Create feature from main
git checkout main && git checkout -b feature/carousel-fix

# 2. Test across shops
pnpm run dev  # Select shop-a (staging)
pnpm run dev  # Select shop-b (staging)

# 3. Create PR to main
gh pr create --base main --title "Fix carousel"

# 4. After PR is reviewed and merged to main
git checkout main && git pull

# 5. Sync changes to all shop staging branches
pnpm run shop
# → Select: Tools
# → Select: Sync Shops

# 🚨 The CLI will automatically detect content files!
# If content files detected in cross-shop sync (main → shop-a):
#   - Shows STRICT WARNING
#   - Lists content files that would be overwritten
#   - Requires confirmation to proceed
#
# ℹ️ If syncing within same shop (shop-a/main → shop-a/staging):
#   - Shows SOFT INFO only
#   - Content changes are normal
#   - No blocking, proceeds automatically
#
# → This creates PRs: main → shop-a/staging, main → shop-b/staging, etc.

# 6. Review and merge shop staging PRs
# Each shop team reviews their staging PR and merges when ready

# 7. Deploy to production (optional)
# After testing in staging, create PRs from staging to main for each shop:
gh pr create --base shop-a/main --head shop-a/staging --title "Deploy carousel fix to shop-a"
gh pr create --base shop-b/main --head shop-b/staging --title "Deploy carousel fix to shop-b"
```

**What Sync Shops Does:**
- Automatically creates PRs from `main` to all shop staging branches
- Includes all commits since last sync
- Adds helpful PR description
- Allows each shop team to review before deploying

### Shop Customization

```bash
# 1. Create shop branch
git checkout shop-a/main
git checkout -b shop-a/fitness-calculator

# 2. Development (auto-detected)
pnpm run dev

# 3. Create shop PR
gh pr create --base shop-a/main --title "Add calculator"
```

### Campaign/Promo

```bash
# 1. Create promo branch
pnpm run shop → Campaign Tools → Create Promo Branch
# → shop-a → promo name: summer-sale

# 2. Connect to Shopify theme
# Shopify Admin → Add theme → Connect from GitHub → shop-a/promo-summer-sale

# 3. Customize in Shopify admin
# Theme Customizer auto-syncs back to branch

# 4. Launch promo
# Publish theme or use Launchpad app

# 5. Push to main (keeps main current)
pnpm run shop → Campaign Tools → Push Promo to Main
```

## Troubleshooting

### "No shops configured yet"

**Problem:** You haven't created any shop configurations.

**Solution:**
```bash
pnpm run shop → Create New Shop
```

### "No credentials found"

**Problem:** You haven't set up developer credentials.

**Solution:** Create credential file manually:
```bash
# Create: shops/credentials/shop-a.credentials.json
# See "Set Up Developer Credentials" section above
```

### "Shopify CLI not found"

**Problem:** Shopify CLI not installed globally.

**Solution:**
```bash
npm install -g @shopify/cli
shopify version  # Verify installation
```

### "Permission denied" (Unix/macOS/Linux)

**Problem:** Credential file permissions too loose.

**Solution:**
```bash
chmod 600 shops/credentials/*.credentials.json
```

### "Can't connect theme to GitHub"

**Problem:** Branch doesn't exist or GitHub integration not configured.

**Solution:**
1. Check branch exists: `git branch -r | grep shop-a/main`
2. Push if needed: `git push -u origin shop-a/main`
3. Verify GitHub connection in Shopify Admin → Settings

## Next Steps

Now that you're set up, explore:

- **[Testing Guide](./testing-guide.md)** - Learn testing strategies
- **[Security Guide](./security-guide.md)** - Understand credential security
- **[Performance Guide](./performance.md)** - Optimize your setup
- **[Troubleshooting Guide](./troubleshooting.md)** - Fix common issues
- **[API Documentation](../api/index.md)** - Programmatic usage

## Best Practices

1. **Use staging environment** for testing (recommended)
2. **Test features across shops** before merging
3. **Keep credentials secure** (never commit)
4. **Use GitHub Flow** for core features
5. **Use shop branches** for shop-specific work
6. **Create PRs** for all changes (enables review)
7. **Use Tools → Sync Shops** to deploy to all shops

## Getting Help

- **Documentation:** Read the complete guides
- **Issues:** [GitHub Issues](https://github.com/shopdevs/multi-shop/issues)
- **Examples:** See `/examples` directory
- **CLI Help:** `npx multi-shop --help`

Welcome to multi-shop development!
