# 🚀 ShopDevs Multi-Shop

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
# Add to your theme project
pnpm add -D shopdevs-multi-shop
```

### Initialize in Your Theme

```bash
cd your-shopify-theme
npx multi-shop init
```

This creates:
- `shops/` directory for shop configurations
- GitHub workflow for automated shop syncing
- Updated package.json with multi-shop scripts
- Secure credential storage setup

### Create Your First Shop

```bash
# Use pnpm scripts (recommended)
pnpm run shop
# → Create New Shop
# → Follow interactive setup

# Or use npx directly
npx multi-shop shop
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

## 🛠️ How It Works

### Contextual Development

The system detects your branch context and adapts automatically:

**Feature Branches** (like `WEB-123-new-carousel`):
```bash
npm run dev
# → Prompts for shop context
# → Prompts for environment (staging/production)  
# → Your code stays on feature branch
# → Testing happens against selected shop
```

**Shop Branches** (like `shop-a/custom-checkout`):
```bash
npm run dev  
# → Auto-detects "shop-a" 
# → Skips shop selection
# → Starts development immediately
```

### Automated Shop Syncing (GitHub Flow)

When you merge features to main:
1. **GitHub Action automatically creates PRs**: `main → shop-a/staging, main → shop-b/staging`
2. **Shop teams review and approve** shop-specific PRs
3. **Shop teams create final PRs**: `shop-a/staging → shop-a/main`

### Campaign Management

```bash
# Create promo campaign  
npm run shop → Campaign Tools → Create Promo Branch

# Launch promo theme in Shopify admin

# Push content back to main (keeps main current)
npm run shop → Campaign Tools → Push Promo to Main
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
│   └── shop-a/promo-spring-sale # Campaign branches
│
└── shop-b/main                  # Connected to shop-b
    ├── shop-b/staging           # Connected to staging-shop-b
    └── shop-b/promo-holiday     # Campaign branches
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

## 📚 Documentation

Comprehensive guides included:
- **Getting Started** - 5-minute setup
- **Contextual Development** - Core workflow innovation
- **Shop Management** - Creating and managing shops
- **Campaign Workflows** - Promo and content management
- **Testing Guide** - Interactive testing approach

---

## 🤝 Contributing

This package extracts the multi-shop innovations from [Horizon Meyer](https://github.com/MeyerCorporation/horizon-meyer) to make them available to any Shopify theme.

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

- Built on innovations from [Horizon Meyer](https://github.com/MeyerCorporation/horizon-meyer)
- Inspired by the need for better multi-shop Shopify development workflows
- Powered by [@clack/prompts](https://www.npmjs.com/package/@clack/prompts) for beautiful CLI experiences