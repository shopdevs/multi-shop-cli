# 🔄 Multi-Shop Development Workflows

Complete guide to the multi-shop development workflows supported by ShopDevs Multi-Shop.

## 📋 Overview

This system supports two distinct development patterns:

1. **Core Feature Development** - Non-shop-specific features and bugfixes (GitHub Flow)
2. **Shop-Specific Development** - Shop customizations, campaigns, and promos

---

## 🛠️ Core Feature Development Workflow (GitHub Flow)

For features that apply to all shops (components, bugfixes, core functionality):

### Branch Flow
```
feature/your-feature → main → shop-*/staging → shop-*/main
```

### Step-by-Step Process

#### 1. Create Feature Branch
```bash
git checkout main
git pull origin main
git checkout -b feature/carousel-fix
```

#### 2. Develop with Contextual Testing
```bash
pnpm run dev
# → Detects feature branch
# → Prompts: "Select shop for testing"
# → Choose: shop-a (staging)
# → Shopify CLI starts with shop-a staging credentials
```

Test the same code against different shops:
```bash
pnpm run dev
# → Choose: shop-b (staging)  
# → Test same feature in different shop context
```

#### 3. Create PR to Main (GitHub Flow)
```bash
git add . && git commit -m "Fix carousel responsive issues"
git push -u origin feature/carousel-fix

# Direct to main (GitHub Flow):
gh pr create --base main --title "Fix carousel responsive issues"

# Or get instructions:
multi-shop workflow feature
# → Shows exact PR commands
```

#### 4. Main Review & Merge
- Team reviews PR: `feature/carousel-fix → main`
- After approval and merge to main

#### 5. Auto-Deploy to Shops (Optional GitHub Action)
After merge to main, either:

**Option A: GitHub Action (if configured)**
```yaml
# .github/workflows/shop-sync.yml automatically creates:
# main → shop-a/staging
# main → shop-b/staging  
# main → shop-c/staging
```

**Option B: Manual PRs**
```bash
multi-shop workflow deploy
# → Shows commands for creating shop PRs:
# gh pr create --base shop-a/staging --head main --title "Deploy carousel fix"
# gh pr create --base shop-b/staging --head main --title "Deploy carousel fix"
```

#### 6. Shop Team Review
Each shop team reviews their staging PR:
- `main → shop-a/staging` (approved by shop-a team)
- `main → shop-b/staging` (approved by shop-b team)

#### 7. Deploy to Shop Production
After staging approval:
```bash
gh pr create --base shop-a/main --head shop-a/staging --title "Deploy carousel fix to shop-a production"
gh pr create --base shop-b/main --head shop-b/staging --title "Deploy carousel fix to shop-b production"
```

---

## 🎯 Shop-Specific Development Workflow

For shop customizations, campaigns, and promos:

### Customization Flow
```
shop-a/main → shop-a/custom-feature → shop-a/main
```

### Promo Flow  
```
shop-a/main → shop-a/promo-sale → [Shopify content] → shop-a/main
```

### Step-by-Step Process

#### Shop Customization

1. **Create Shop Branch**
```bash
git checkout shop-a/main
git pull origin shop-a/main
git checkout -b shop-a/custom-fitness-calculator
```

2. **Auto-Detected Development**
```bash
pnpm run dev
# → Auto-detects: shop-a
# → Automatically starts dev server for shop-a staging
# → No shop selection needed!
```

3. **Create Shop-Specific PR**
```bash
gh pr create --base shop-a/main --title "Add fitness calculator for shop-a"
```

#### Campaign/Promo Workflow

1. **Start Promo Campaign**
```bash
pnpm run shop
# → Campaign Tools → Create Promo Branch
# → Select shop: shop-a
# → Promo name: summer-fitness-sale
# → Creates: shop-a/promo-summer-fitness-sale
```

2. **Connect to Shopify Theme**
```bash
# Shopify Admin → shop-a store → Themes → Add theme
# → Connect from GitHub  
# → Branch: shop-a/promo-summer-fitness-sale
# → Theme name: "Summer Fitness Sale"
```

3. **Customize in Shopify**
- Use Shopify Theme Customizer to add sale banners, pricing, etc.
- GitHub integration automatically syncs content back to `shop-a/promo-summer-fitness-sale`

4. **Launch Promo**
```bash
# Option A: Launchpad app (automated)
# Option B: Shopify Admin → Publish theme manually
```

5. **Push Promo Content to Main**
After promo launches, keep main current:
```bash
pnpm run shop  
# → Campaign Tools → Push Promo to Main
# → Creates PR: shop-a/promo-summer-fitness-sale → shop-a/main
# → Review shows content-only changes
# → Merge after review
```

6. **Republish Main**
```bash
# Shopify Admin → Publish shop-a/main theme
# → Now main is current with promo content
```

7. **End Promo (Optional)**
```bash
pnpm run shop
# → Campaign Tools → End Promo
# → Creates: shop-a/end-promo-summer-fitness-sale
# → Based on current shop-a/main (includes code updates)
# → Remove promo-specific content
# → Create Shopify theme from end-promo branch
# → Publish when ready
```

---

## 🔀 Contextual Development Details

### Smart Branch Detection

The `pnpm run dev` command automatically detects your context:

| Branch Pattern | Behavior | Example |
|----------------|----------|---------|
| `main` | Feature workflow | Choose shop for testing |
| `feature/*` | **Contextual development** | Choose shop for testing |
| `hotfix/*` | Feature workflow | Choose shop for testing |
| `shop-a/*` | **Auto-detected shop** | Start shop-a immediately |
| `shop-a/promo-*` | **Auto-detected shop** | Start shop-a immediately |

### Shop Context Selection

When on feature branches, you'll be prompted:

```bash
pnpm run dev
# 🚀 Contextual Development
# 
# Current branch: feature/carousel-fix
# 
# Select shop for testing:
# ❯ shop-a (Fitness Store)
#   shop-b (Beauty Store)  
#   shop-c (Electronics Store)
#
# Select environment:
# ❯ staging (recommended)
#   production (live store)
#
# 🔗 Starting Shopify CLI...
# shopify theme dev --store=staging-shop-a
```

### Credential Management

Each developer has their own credentials:
```bash
shops/credentials/shop-a.credentials.json  # Your personal tokens
shops/credentials/shop-b.credentials.json  # Your personal tokens
```

These are **never committed** - each developer sets up their own.

---

## 🎯 Quick Reference

### Common Commands

```bash
# Contextual development (works anywhere)
pnpm run dev

# Shop management
pnpm run shop

# Sync feature with main  
pnpm run sync-main

# Test PR workflows
pnpm run test:pr

# Security audit
multi-shop audit
```

### Branch Naming Conventions

```bash
# Core features (apply to all brands)
feature/carousel-improvements
hotfix/critical-security-fix
bugfix/checkout-flow-issue

# Shop-specific (only for one shop)
shop-a/custom-fitness-section
shop-b/beauty-quiz-feature

# Campaigns (temporary promotions)
shop-a/promo-summer-sale
shop-b/promo-holiday-2024

# Promo endings (content cleanup)
shop-a/end-promo-summer-sale
```

---

## 🔧 Configuration

### Shop Configuration
```json
// shops/shop-a.config.json (committed)
{
  "shopId": "shop-a",
  "name": "Fitness Store",
  "shopify": {
    "stores": {
      "production": {
        "domain": "fitness-store.myshopify.com",
        "branch": "shop-a/main"
      },
      "staging": {
        "domain": "staging-fitness-store.myshopify.com", 
        "branch": "shop-a/staging"
      }
    },
    "authentication": {
      "method": "theme-access-app"
    }
  }
}
```

### Developer Credentials
```json
// shops/credentials/shop-a.credentials.json (local only)
{
  "developer": "your-name",
  "shopify": {
    "stores": {
      "production": { "themeToken": "your-production-password" },
      "staging": { "themeToken": "your-staging-password" }
    }
  },
  "notes": "Theme access app credentials for shop-a"
}
```

---

## 🚀 The Magic

### One Command, Smart Context
```bash
pnpm run dev  # Always works, adapts to your branch
```

**On `feature/carousel-fix`:**
- Prompts for shop selection
- Tests your feature across different brands
- Code stays on feature branch

**On `shop-a/custom-section`:**
- Auto-detects shop-a
- Starts immediately with shop-a credentials
- No shop selection needed

**On `shop-a/promo-summer-sale`:**
- Auto-detects shop-a promo context
- Starts with shop-a credentials
- Connected to promo theme in Shopify

This is **contextual development** - the same command behaves intelligently based on where you are in the workflow.