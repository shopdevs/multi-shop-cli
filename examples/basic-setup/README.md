# Basic Setup Example

Complete example of a basic multi-shop setup with 2 shops.

## Overview

This example demonstrates:
- Setting up 2 shops (fitness store and beauty store)
- Creating shop configurations
- Setting up developer credentials
- Connecting GitHub branches to Shopify
- Running contextual development workflows

## Scenario

**Company:** Example Commerce
**Shops:** 2 Shopify stores
- Fitness Store (fitness products)
- Beauty Store (beauty products)

**Goals:**
- Maintain one theme codebase for both stores
- Allow shop-specific customizations
- Enable contextual development and testing

## Prerequisites

- Shopify theme project (Dawn or custom)
- 2 Shopify stores with admin access
- GitHub repository for theme
- Node.js 18+, pnpm 9+
- Shopify CLI installed globally

## Step-by-Step Setup

### 1. Initialize Project

```bash
cd your-shopify-theme
pnpm add -D @shopdevs/multi-shop-cli
npx multi-shop init
```

**What this does:**
- Creates `shops/` directory structure
- Adds GitHub workflow for shop syncing
- Updates `package.json` with scripts
- Sets up `.gitignore` for credentials

### 2. Create Fitness Store Configuration

```bash
pnpm run shop
# → Create New Shop
```

**Prompts and responses:**
```
? Shop ID: fitness-store
? Shop name: Fitness Store
? Production domain: fitness-store.myshopify.com
? Staging domain: staging-fitness-store.myshopify.com
? Authentication method: theme-access-app
? Create GitHub branches?: Yes, create branches automatically
```

**Creates:**
- `shops/fitness-store.config.json`
- Git branches: `fitness-store/main`, `fitness-store/staging`

### 3. Create Beauty Store Configuration

```bash
pnpm run shop
# → Create New Shop
```

**Prompts and responses:**
```
? Shop ID: beauty-store
? Shop name: Beauty Store
? Production domain: beauty-store.myshopify.com
? Staging domain: staging-beauty-store.myshopify.com
? Authentication method: theme-access-app
? Create GitHub branches?: Yes, create branches automatically
```

**Creates:**
- `shops/beauty-store.config.json`
- Git branches: `beauty-store/main`, `beauty-store/staging`

### 4. Set Up Developer Credentials

Each developer creates their own credential files:

**Fitness Store credentials:**
```bash
# Create: shops/credentials/fitness-store.credentials.json
```

```json
{
  "developer": "john-doe",
  "shopify": {
    "stores": {
      "production": {
        "themeToken": "tkat_fitness_prod_token"
      },
      "staging": {
        "themeToken": "tkat_fitness_staging_token"
      }
    }
  },
  "notes": "Theme access app tokens for Fitness Store"
}
```

**Beauty Store credentials:**
```bash
# Create: shops/credentials/beauty-store.credentials.json
```

```json
{
  "developer": "john-doe",
  "shopify": {
    "stores": {
      "production": {
        "themeToken": "tkat_beauty_prod_token"
      },
      "staging": {
        "themeToken": "tkat_beauty_staging_token"
      }
    }
  },
  "notes": "Theme access app tokens for Beauty Store"
}
```

**Security:** These files are git-ignored and never committed.

### 5. Connect Branches to Shopify

For each shop, connect the Git branches to Shopify themes:

**Fitness Store:**
1. Go to: fitness-store.myshopify.com/admin
2. Online Store → Themes → Add theme → Connect from GitHub
3. Select branch: `fitness-store/main` (for production theme)
4. Repeat for staging: Select branch `fitness-store/staging`

**Beauty Store:**
1. Go to: beauty-store.myshopify.com/admin
2. Online Store → Themes → Add theme → Connect from GitHub
3. Select branch: `beauty-store/main` (for production theme)
4. Repeat for staging: Select branch `beauty-store/staging`

### 6. Verify Setup

```bash
# List all shops
pnpm run shop
# → List Shops

# Output:
# fitness-store (Fitness Store)
# beauty-store (Beauty Store)

# Check Git branches
git branch -r
# Output:
# origin/fitness-store/main
# origin/fitness-store/staging
# origin/beauty-store/main
# origin/beauty-store/staging

# Check credentials exist
ls shops/credentials/
# Output:
# fitness-store.credentials.json
# beauty-store.credentials.json
```

## Development Workflows

### Core Feature Development

Develop a feature that applies to both stores:

```bash
# 1. Create feature branch from main
git checkout main
git pull origin main
git checkout -b feature/product-carousel

# 2. Make your changes
# Edit theme files...

# 3. Test in Fitness Store context
pnpm run dev
# → Select: fitness-store
# → Select: staging
# Preview: https://fitness-store.myshopify.com/?preview_theme_id=...

# 4. Test in Beauty Store context
pnpm run dev
# → Select: beauty-store
# → Select: staging
# Preview: https://beauty-store.myshopify.com/?preview_theme_id=...

# 5. Create PR to main (GitHub Flow)
git add .
git commit -m "Add product carousel component"
git push -u origin feature/product-carousel
gh pr create --base main --title "Add product carousel"

# 6. After merge, sync to shops
pnpm run shop → Tools → Sync Shops
# → Select both shops
# → Creates PRs: main → fitness-store/staging, main → beauty-store/staging

# 7. Shop teams review and merge their PRs
```

### Shop-Specific Customization

Add a custom section only for Fitness Store:

```bash
# 1. Create shop-specific branch
git checkout fitness-store/main
git pull origin fitness-store/main
git checkout -b fitness-store/workout-tracker

# 2. Make changes (only for this shop)
# Add sections/workout-tracker.liquid
# Update fitness-store specific styles

# 3. Test (auto-detects fitness-store)
pnpm run dev
# Auto-selects fitness-store
# → Select: staging

# 4. Create PR to shop main
git add .
git commit -m "Add workout tracker for Fitness Store"
git push -u origin fitness-store/workout-tracker
gh pr create --base fitness-store/main --title "Add workout tracker"

# 5. After merge to fitness-store/main, promote to production
gh pr create --base fitness-store/main --head fitness-store/staging
```

### Promo Campaign

Run a sale promotion for Beauty Store:

```bash
# 1. Create promo branch
pnpm run shop → Campaign Tools → Create Promo Branch
# → Select: beauty-store
# → Promo name: spring-sale-2024

# 2. Connect promo theme in Shopify
# beauty-store.myshopify.com/admin → Themes → Add theme
# → Connect from GitHub → beauty-store/promo-spring-sale-2024

# 3. Customize in Shopify Admin
# Use Theme Customizer to add sale banners, pricing changes
# Changes auto-sync back to beauty-store/promo-spring-sale-2024

# 4. Launch promo (publish theme)
# Or use Launchpad app for scheduled launch

# 5. After promo ends, push content to main
pnpm run shop → Campaign Tools → Push Promo to Main
# Creates PR: beauty-store/promo-spring-sale-2024 → beauty-store/main

# 6. Review and merge PR
# Republish beauty-store/main to keep it current
```

## Directory Structure

After complete setup:

```
your-shopify-theme/
├── .github/
│   └── workflows/
│       └── shop-sync.yml
├── shops/
│   ├── fitness-store.config.json
│   ├── beauty-store.config.json
│   └── credentials/
│       ├── fitness-store.credentials.json  # git-ignored
│       └── beauty-store.credentials.json   # git-ignored
├── assets/
├── config/
├── layout/
├── sections/
├── snippets/
├── templates/
├── package.json
└── .gitignore
```

## Git Branch Structure

```
main (core theme)
├── feature/product-carousel
├── feature/checkout-improvements
│
├── fitness-store/main           # Connected to fitness-store.myshopify.com
│   ├── fitness-store/staging    # Connected to staging-fitness-store.myshopify.com
│   └── fitness-store/workout-tracker
│
└── beauty-store/main            # Connected to beauty-store.myshopify.com
    ├── beauty-store/staging     # Connected to staging-beauty-store.myshopify.com
    └── beauty-store/promo-spring-sale-2024
```

## Configuration Files

### fitness-store.config.json

```json
{
  "shopId": "fitness-store",
  "name": "Fitness Store",
  "shopify": {
    "stores": {
      "production": {
        "domain": "fitness-store.myshopify.com",
        "branch": "fitness-store/main"
      },
      "staging": {
        "domain": "staging-fitness-store.myshopify.com",
        "branch": "fitness-store/staging"
      }
    },
    "authentication": {
      "method": "theme-access-app"
    }
  },
  "metadata": {
    "description": "Fitness and wellness products",
    "tags": ["fitness", "health"],
    "created": "2024-01-15"
  }
}
```

### beauty-store.config.json

```json
{
  "shopId": "beauty-store",
  "name": "Beauty Store",
  "shopify": {
    "stores": {
      "production": {
        "domain": "beauty-store.myshopify.com",
        "branch": "beauty-store/main"
      },
      "staging": {
        "domain": "staging-beauty-store.myshopify.com",
        "branch": "beauty-store/staging"
      }
    },
    "authentication": {
      "method": "theme-access-app"
    }
  },
  "metadata": {
    "description": "Beauty and cosmetics products",
    "tags": ["beauty", "cosmetics"],
    "created": "2024-01-15"
  }
}
```

## Team Collaboration

### New Developer Onboarding

When a new developer joins:

```bash
# 1. Clone repository
git clone https://github.com/your-org/your-theme.git
cd your-theme

# 2. Install dependencies
pnpm install

# 3. Create credential files
# Create shops/credentials/fitness-store.credentials.json
# Create shops/credentials/beauty-store.credentials.json
# (Get tokens from Theme Access app)

# 4. Start developing
pnpm run dev
```

### Adding a Third Shop

To add another shop later:

```bash
# 1. Create new shop
pnpm run shop → Create New Shop
# → ID: electronics-store
# → Name: Electronics Store
# → Domain: electronics-store.myshopify.com
# → Staging: staging-electronics-store.myshopify.com

# 2. Set up credentials
# Create shops/credentials/electronics-store.credentials.json

# 3. Connect branches to Shopify
# electronics-store.myshopify.com/admin → Themes → Connect from GitHub

# 4. Start developing
pnpm run dev
# → Now shows 3 shops to select from
```

## Common Commands

```bash
# Contextual development
pnpm run dev

# Shop management
pnpm run shop

# List shops
pnpm run shop → List Shops

# Edit shop
pnpm run shop → Edit Shop

# Campaign tools
pnpm run shop → Campaign Tools

# Tools menu
pnpm run shop → Tools → Sync Shops
```

## Troubleshooting

### Can't find shops

```bash
# Check shops directory exists
ls shops/

# Recreate if needed
npx multi-shop init
```

### Credentials not working

```bash
# Verify credential file format
cat shops/credentials/fitness-store.credentials.json | jq .

# Test manually with Shopify CLI
shopify theme dev --store=fitness-store.myshopify.com --password=YOUR_TOKEN
```

### Branches not showing in Shopify

```bash
# Verify branches exist and are pushed
git branch -r | grep fitness-store

# Push if needed
git push -u origin fitness-store/main
git push -u origin fitness-store/staging
```

## Next Steps

- Read [Getting Started Guide](../../docs/guides/getting-started.md)
- See [Enterprise Setup Example](../enterprise-setup/README.md) for larger teams
- See [CI Integration Example](../ci-integration/README.md) for automation
- Check [API Documentation](../../docs/api/index.md) for programmatic usage

## Support

- [Documentation](../../docs/)
- [GitHub Issues](https://github.com/shopdevs/multi-shop-cli/issues)
- Email: support@shopdevs.com
