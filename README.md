# 🚀 ShopDevs Multi-Shop

[![CI](https://github.com/shopdevs/multi-shop/actions/workflows/ci.yml/badge.svg)](https://github.com/shopdevs/multi-shop/actions/workflows/ci.yml)
[![npm version](https://badge.fury.io/js/@shopdevs%2Fmulti-shop-cli.svg)](https://www.npmjs.com/package/@shopdevs/multi-shop-cli)
[![codecov](https://codecov.io/gh/shopdevs/multi-shop/branch/main/graph/badge.svg)](https://codecov.io/gh/shopdevs/multi-shop)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> Contextual development and automated shop management for multi-shop Shopify themes

## What is Multi-Shop?

Transform any Shopify theme into a sophisticated multi-shop system with **contextual development** that adapts to your branch context and **automated shop syncing** that keeps all your stores in sync safely.

**Perfect for teams managing multiple Shopify stores** with Dawn theme, custom themes, or any existing Shopify theme that needs multi-shop capabilities.

### ✨ Key Features

- **🧠 Contextual Development** - One command (`pnpm run dev`) adapts to your branch context
- **🤖 Automated Shop Syncing** - PRs auto-created when main updates  
- **🔐 Secure Credentials** - Developer-specific tokens stored locally only
- **🎨 Shop Isolation** - Complete separation between shop customizations
- **⚡ Modern GitHub Flow** - Simple, PR-based development workflow
- **🧪 Interactive Testing** - Test against real Shopify preview themes

---

## 🏁 Quick Start

### Installation

```bash
# Add to your theme project and initialize immediately
cd your-shopify-theme
pnpm add -D @shopdevs/multi-shop-cli && npx multi-shop init
```

This creates:
- `shops/` directory for shop configurations
- GitHub workflow for automated shop syncing
- Updated package.json with multi-shop scripts
- Secure credential storage setup

### Set Up Your Shops

```bash
# Create all your shops interactively
pnpm run shop
# → Create New Shop

# For each shop, you'll configure:
# 1. Shop ID (e.g., fitness-store)
# 2. Display name (e.g., "Fitness Store") 
# 3. Production domain (e.g., fitness-store.myshopify.com)
# 4. Staging domain (e.g., staging-fitness-store.myshopify.com)
# 5. Authentication method (theme-access-app recommended)

# Repeat for all shops:
# → shop-a (Shop A)
# → shop-b (Shop B) 
# → shop-c (Shop C)
# → shop-d (Shop D)
```

### Start Development

```bash
# Use pnpm scripts (recommended)
pnpm run dev
# → Contextual development that adapts to your branch

# Or use npx directly  
npx multi-shop dev
```

---

## 🚀 Complete Setup for Multiple Shops

Here's the step-by-step process to set up multi-shop on a new Shopify theme (example shows 4 shops, but you can use any number):

### Step 1: Initialize Project

```bash
cd your-shopify-theme
pnpm add -D @shopdevs/multi-shop-cli && npx multi-shop init
```

### Step 2: Create All 4 Shop Configurations

```bash
pnpm run shop
# → Create New Shop

# Shop A
# Shop ID: shop-a
# Name: Shop A
# Production: shop-a.myshopify.com  
# Staging: staging-shop-a.myshopify.com
# Auth: theme-access-app

# Shop B  
# Shop ID: shop-b
# Name: Shop B
# Production: shop-b.myshopify.com
# Staging: staging-shop-b.myshopify.com
# Auth: theme-access-app

# Shop C
# Shop ID: shop-c  
# Name: Shop C
# Production: shop-c.myshopify.com
# Staging: staging-shop-c.myshopify.com
# Auth: theme-access-app

# Shop D
# Shop ID: shop-d
# Name: Shop D  
# Production: shop-d.myshopify.com
# Staging: staging-shop-d.myshopify.com
# Auth: theme-access-app
```

### Step 3: Set Up Credentials (Each Developer)

Each developer needs to set up their own theme access tokens:

```bash
# Create credential files manually:
shops/credentials/shop-a.credentials.json
shops/credentials/shop-b.credentials.json  
shops/credentials/shop-c.credentials.json
shops/credentials/shop-d.credentials.json
```

Example credential file format:
```json
// shops/credentials/shop-a.credentials.json
{
  "developer": "your-name",
  "shopify": {
    "stores": {
      "production": { "themeToken": "your-shop-a-production-password" },
      "staging": { "themeToken": "your-shop-a-staging-password" }
    }
  },
  "notes": "Theme access app credentials for shop-a"
}
```

### Step 4: GitHub Branches (Automated!)

When creating each shop, you'll be prompted:

```bash
# During shop creation:
# "Create GitHub branches for this shop?"
# → Yes, create branches automatically (Recommended)

# This automatically creates:
# shop-a/main and shop-a/staging
# shop-b/main and shop-b/staging  
# shop-c/main and shop-c/staging
# shop-d/main and shop-d/staging

# If you chose "No" during setup, create manually:
git checkout -b shop-a/main && git push -u origin shop-a/main
git checkout -b shop-a/staging && git push -u origin shop-a/staging
# Repeat for other shops...
```

### Step 5: Connect Branches to Shopify Themes

For each shop, connect the Git branches to Shopify themes:

1. **Shopify Admin** → your-shop.myshopify.com → Online Store → Themes
2. **Add theme** → Connect from GitHub
3. **Select branch**: `shop-a/main` (for production) or `shop-a/staging`
4. **Repeat for all shops** (branches already created automatically!)

### Step 6: Verify Setup

```bash
# Check all shops are configured
pnpm run shop → List Shops
# Should show your configured shops (e.g., shop-a, shop-b, shop-c, shop-d)

# Check branches exist
git branch -r
# Should show: origin/shop-a/main, origin/shop-a/staging, etc.

# Check credential files exist (each developer)
ls shops/credentials/
# Should show your shop credential files (e.g., shop-a.credentials.json, shop-b.credentials.json)
```

### Step 7: Start Developing!

```bash
# Test contextual development
git checkout -b feature/new-header
pnpm run dev
# → Select shop for testing: shop-a, shop-b, shop-c, or shop-d
# → Select environment: staging (recommended) or production
# → Shopify CLI starts with selected shop's credentials

# Test different shops with same code
pnpm run dev  # Try different shop contexts
# Same feature code, different shop contexts!
```

---

## 🛠️ How It Works

### Contextual Development

The system detects your branch context and adapts automatically:

**Feature Branches** (like `feature/new-carousel`):
```bash
pnpm run dev
# → Prompts for shop context
# → Prompts for environment (staging/production)  
# → Your code stays on feature branch
# → Testing happens against selected shop
```

**Shop Branches** (like `shop-a/custom-checkout`):
```bash
pnpm run dev  
# → Auto-detects "shop-a" 
# → Skips shop selection
# → Starts development immediately
```

### Automated Shop Syncing (GitHub Flow)

When you merge features to main:
1. **Use Tools → Sync Shops**: Select shops and create PRs `main → shop-*/staging`
2. **Each shop team reviews** their shop-specific PRs  
3. **Shop teams create final PRs**: `shop-a/staging → shop-a/main`, `shop-b/staging → shop-b/main`, etc.

### Campaign Management (Per Shop)

```bash
# Create promo for specific shop
pnpm run shop → Campaign Tools → Create Promo Branch
# → Select shop: shop-a
# → Promo name: summer-sale
# → Creates: shop-a/promo-summer-sale

# Connect promo theme in Shopify admin (shop-a only)
# → Add theme → Connect from GitHub → shop-a/promo-summer-sale

# Launch promo (shop-a only)
# → Publish theme or use Launchpad app

# Push content back to shop main (keeps shop-a/main current)
pnpm run shop → Campaign Tools → Push Promo to Main
# → Creates PR: shop-a/promo-summer-sale → shop-a/main
```

---

## 📋 Development Workflow

### Core Feature Development (GitHub Flow)

```bash
# 1. Create feature from main
git checkout main && git checkout -b feature/new-component

# 2. Contextual development
pnpm run dev  # Select shop context for testing

# 3. Test across shops  
pnpm run dev  # Try different shop contexts

# 4. Sync with latest main (if needed)
pnpm run sync-main

# 5. Create PR directly to main (GitHub Flow)
gh pr create --base main --title "Add new component"

# 6. After merge → Auto-created shop sync PRs
```

### Shop-Specific Development

```bash
# 1. Create shop branch
git checkout shop-a/main
git checkout -b shop-a/custom-feature

# 2. Auto-detected development
pnpm run dev  # Auto-detects shop-a context

# 3. Create shop PR
gh pr create --base shop-a/main --title "Custom feature for Shop A"
```

---

## 🏗️ Architecture

### Branch Strategy

```
main (core theme)
├── feature/carousel-fix         # Contextual development
├── hotfix/critical-bug          # Emergency fixes
│
├── shop-a/main                  # Connected to shop-a
│   ├── shop-a/staging           # Connected to staging-shop-a  
│   └── shop-a/promo-summer      # Campaign branches
│
├── shop-b/main                  # Connected to shop-b
│   ├── shop-b/staging           # Connected to staging-shop-b
│   └── shop-b/promo-holiday     # Campaign branches
│
├── shop-c/main                  # Connected to shop-c
│   └── shop-c/staging           # Connected to staging-shop-c
│
└── shop-d/main                  # Connected to shop-d
    └── shop-d/staging           # Connected to staging-shop-d
```

### Security Model

**Shop Configuration** (committed):
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
  }
  // ⚠️ NO theme tokens stored here
}
```

**Developer Credentials** (local only):
```json  
// shops/credentials/shop-a.credentials.json (NOT committed)
{
  "developer": "your-name",
  "shopify": {
    "stores": {
      "production": { "themeToken": "your-personal-production-password" },
      "staging": { "themeToken": "your-personal-staging-password" }
    }
  },
  "notes": "Theme access app credentials for shop-a"
}
```

---

## 🧪 Testing

### Interactive Testing with Real Themes

```bash
# Start dev server
pnpm run dev  # Get preview URL

# Run comprehensive tests
pnpm test:integration     # Shopping flow tests
pnpm test:visual         # Visual regression tests  
pnpm test:accessibility  # WCAG compliance tests
pnpm test:performance    # Core Web Vitals tests

# Test shop sync PRs
pnpm run test:pr         # Comprehensive PR testing
```

All tests use **real Shopify preview themes** instead of mocks, providing realistic testing conditions.

---

## 🔧 Troubleshooting

### Common Setup Issues

**"No shops configured yet"**
```bash
# Make sure you've created shop configurations:
pnpm run shop → Create New Shop
# Check: ls shops/ should show *.config.json files
```

**"No credentials found for shop-x"**  
```bash
# Create credential file manually:
# shops/credentials/shop-x.credentials.json
# Get theme tokens from Shopify admin or theme access app
```

**"Shopify CLI not found"**
```bash
# Install Shopify CLI globally:
pnpm add -g @shopify/cli

# Verify installation:
shopify version
```

**"Permission denied" (Unix/Linux/macOS)**
```bash
# Fix credential file permissions:
chmod 600 shops/credentials/*.credentials.json
```

### Workflow Issues

**"Can't connect theme to GitHub branch"**
- Ensure branch exists: `git branch -r | grep shop-a/main`
- Check Shopify admin → Themes → Add theme → Connect from GitHub
- Verify repository connection in Shopify

**"Development server won't start"**
```bash
# Check your credentials and domain:
pnpm run shop → List Shops
# Verify tokens are correct in credential files
```

**"Feature branch not detecting context"**
```bash
# Check branch name pattern:
git branch --show-current
# Should be: feature/name or shop-a/name for auto-detection
```

---

## 📚 Documentation

Comprehensive guides included:
- **Getting Started** - 5-minute setup
- **Contextual Development** - Core workflow innovation
- **Shop Management** - Creating and managing shops
- **Campaign Workflows** - Promo and content management
- **Testing Guide** - Interactive testing approach

---

## 🤝 Contributing

This package provides proven multi-shop workflow patterns for any Shopify theme development team.

### Development

```bash
git clone https://github.com/shopdevs/multi-shop.git
cd multi-shop
npm install
npm test
```

### Publishing

```bash
npm version patch
npm publish
```

---

## 📄 License

MIT © [ShopDevs](https://shopdevs.com)

---

## 🙏 Acknowledgments

- Built for modern multi-shop Shopify development workflows
- Inspired by the need for better multi-shop Shopify development workflows
- Powered by [@clack/prompts](https://www.npmjs.com/package/@clack/prompts) for beautiful CLI experiences