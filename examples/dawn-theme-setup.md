# Adding Multi-Shop to Dawn Theme

> Step-by-step guide for adding ShopDevs Multi-Shop to Shopify's Dawn theme

## Overview

This example shows how to add multi-shop capabilities to the popular Dawn theme, enabling you to manage multiple Shopify stores from a single codebase.

---

## Prerequisites

- Shopify's Dawn theme (or fork)
- Node.js 18+
- Git repository set up
- Multiple Shopify stores to manage

---

## Setup Process

### 1. Install in Dawn Theme

```bash
# Clone Dawn theme (or use your existing Dawn setup)
git clone https://github.com/Shopify/dawn.git my-multi-shop-dawn
cd my-multi-shop-dawn

# Initialize as Node.js project (Dawn doesn't have package.json by default)
npm init -y

# Install multi-shop package
pnpm add -D shopdevs-multi-shop

# Initialize multi-shop
npx multi-shop init
```

### 2. Create Your Shops

```bash
# Launch shop manager
pnpm run shop

# Create first shop
# → Create New Shop
# → Name: "Fitness Store"
# → Shop ID: "fitness-store"  
# → Production: fitness-store.myshopify.com
# → Staging: staging-fitness-store.myshopify.com
# → Auth: Theme Access App

# Create second shop
# → Create New Shop  
# → Name: "Beauty Store"
# → Shop ID: "beauty-store"
# → Production: beauty-store.myshopify.com
# → Staging: staging-beauty-store.myshopify.com
# → Auth: Theme Access App
```

### 3. Connect Branches to Shopify

For each shop, connect the Git branches to Shopify themes:

#### Fitness Store
1. **Shopify Admin** → fitness-store.myshopify.com → Online Store → Themes
2. **Add theme** → Connect from GitHub
3. **Select branch**: `fitness-store/main`
4. **Theme name**: "Fitness Store Main"

Repeat for staging: `fitness-store/staging` → staging-fitness-store.myshopify.com

#### Beauty Store  
1. **Shopify Admin** → beauty-store.myshopify.com → Online Store → Themes
2. **Add theme** → Connect from GitHub
3. **Select branch**: `beauty-store/main`
4. **Theme name**: "Beauty Store Main"

Repeat for staging: `beauty-store/staging` → staging-beauty-store.myshopify.com

### 4. Start Development

```bash
# Create a new feature
git checkout main
git checkout -b feature/add-testimonials-section

# Start contextual development  
pnpm run dev
# → Select shop: fitness-store
# → Select environment: staging
# → Development server starts
# → Test your changes on Fitness Store staging

# Test same feature on Beauty Store
pnpm run dev
# → Select shop: beauty-store  
# → Select environment: staging
# → Same code, different shop context
```

---

## Example Workflows

### Adding a New Section to Both Stores

```bash
# 1. Create feature branch
git checkout -b feature/hero-banner-v2

# 2. Add new section file
# Create: sections/hero-banner-v2.liquid

# 3. Test on Fitness Store
pnpm run dev → fitness-store → staging
# Preview: https://staging-fitness-store.myshopify.com?preview_theme_id=...

# 4. Test on Beauty Store  
pnpm run dev → beauty-store → staging
# Preview: https://staging-beauty-store.myshopify.com?preview_theme_id=...

# 5. Run tests
pnpm run test:integration  # Test shopping flows
pnpm run test:visual      # Test layout consistency

# 6. Create PR
gh pr create --base main --title "Add hero banner v2 section"

# 7. After merge → Auto-created shop sync PRs
# GitHub Action creates:
# - main → fitness-store/staging  
# - main → beauty-store/staging

# 8. Shop teams review and deploy to production
```

### Store-Specific Customization

```bash
# 1. Create shop-specific branch  
git checkout -b fitness-store/custom-workout-calculator

# 2. Add fitness-specific features
# Only for Fitness Store

# 3. Test (auto-detects fitness-store context)
pnpm run dev
# → Auto-detects: fitness-store
# → Starts immediately on fitness store

# 4. Create shop-specific PR
gh pr create --base fitness-store/main --title "Add workout calculator"
```

### Campaign Management

```bash
# 1. Create promo for Fitness Store
pnpm run shop → Campaign Tools → Create Promo Branch
# → Select: fitness-store
# → Promo name: summer-fitness-sale
# → Creates: fitness-store/promo-summer-fitness-sale

# 2. Connect promo to Shopify theme
# Shopify Admin → Add theme → Connect from GitHub
# → Branch: fitness-store/promo-summer-fitness-sale

# 3. Customize in Shopify admin  
# Add sale banners, update pricing, etc.

# 4. Launch promo theme
# Shopify Admin → Publish theme

# 5. Push content back to main (keeps main current)
pnpm run shop → Campaign Tools → Push Promo to Main
# Creates PR: fitness-store/promo-summer-fitness-sale → fitness-store/main
```

---

## Dawn Theme Considerations

### File Structure Compatibility

Dawn theme structure works perfectly with multi-shop:
- ✅ Standard Shopify theme structure
- ✅ Liquid templates and sections
- ✅ Asset organization  
- ✅ Configuration files

### Customization Patterns

```liquid
<!-- Example: Shop-specific features in Dawn -->
{% if shop.domain contains 'fitness-store' %}
  {% render 'workout-calculator' %}
{% elsif shop.domain contains 'beauty-store' %}
  {% render 'skin-type-quiz' %}
{% endif %}
```

### Performance Considerations

Dawn is already optimized, multi-shop adds:
- ✅ **No runtime overhead** - Shop detection happens at development time
- ✅ **Same bundle size** - No additional JavaScript in production
- ✅ **Git-based isolation** - Clean separation without performance cost

---

This approach lets you **test the package thoroughly** with Dawn and other themes before eventually replacing your integrated Horizon Meyer setup with the proven package version!