# Content vs Code Philosophy

**Critical concept for multi-shop theme management**

## ✨ Automatic Content Detection (Built-In Safeguard)

**Good news:** The multi-shop CLI automatically detects content file changes and warns you!

### How It Works

When you run **Tools → Sync Shops**, the CLI intelligently detects:

**🚨 Cross-Shop Sync** (STRICT warnings + confirmation required):
- `main` → `shop-a/staging`
- `feature/test` → `my-store/staging`
- `shop-a/main` → `shop-b/staging` (different shops!)

**ℹ️ Within-Shop Sync** (SOFT info only, no blocking):
- `shop-a/main` → `shop-a/staging`
- `my-awesome-shop/promo` → `my-awesome-shop/main`
- `that-other-shop/custom` → `that-other-shop/staging`

**Works for ANY shop name!** The script extracts the shop prefix dynamically.

### What You'll See

**Cross-Shop Sync Example:**
```
🚨 WARNING: Content files detected in cross-shop sync!

You're syncing from main/feature branch to shop-specific branches.
The following files contain SHOP-SPECIFIC CONTENT and will OVERWRITE
shop customizations made in the Shopify Theme Editor:

  ⚠️  config/settings_data.json
  ⚠️  templates/index.json

🚨 CRITICAL RECOMMENDATIONS:
  1. Review PR carefully before merging
  2. DO NOT merge changes to content files
  3. ONLY merge code files (.liquid, .css, .js)

Continue creating PRs? (Review carefully before merging!)
❯ Yes, create PRs (I'll review content files before merging)
  No, cancel sync (Let me handle this manually)
```

**Within-Shop Sync Example:**
```
ℹ️  INFO: Content files detected (normal for within-shop sync)

You're syncing within the same shop. Content file changes are expected:

  📝 config/settings_data.json

This is normal workflow for:
  - Deploying shop-specific features to staging
  - Testing shop customizations

No action needed - proceed with PR creation.
```

---

## The Problem

Shopify themes contain both **code** (structure, logic) and **content** (settings, text, customizations). When managing multiple shops from one codebase, you must carefully separate these concerns.

## Content Files vs Code Files

### Content Files (Shop-Specific) ⚠️

These files contain shop-specific customizations made in the Shopify Theme Editor and should **NOT** be synced across shops:

**❌ DO NOT sync these files from main to shop branches:**

```
config/
├── settings_data.json          ⚠️ Theme settings (colors, fonts, layouts)
└── markets.json               ⚠️ Market-specific customizations (if present)

templates/
├── *.json files               ⚠️ Template configurations
├── index.json                 ⚠️ Homepage layout
├── product.json               ⚠️ Product page layout
└── collection.json            ⚠️ Collection page layout

sections/
└── *.json files (if present)  ⚠️ Section-specific settings

locales/
└── *.json files               ⚠️ Translations and text content
```

**Why these are shop-specific:**
- Modified by merchants/shop teams in Theme Editor
- Contain brand-specific colors, fonts, text
- Customized per shop's brand identity
- Overwriting these = losing shop customization

### Code Files (Shared Across Shops) ✅

These files contain theme structure and logic that **SHOULD** be synced:

**✅ Safe to sync from main to shop branches:**

```
layouts/
└── *.liquid                   ✅ Theme structure

templates/
└── *.liquid                   ✅ Page templates

sections/
└── *.liquid                   ✅ Section code

snippets/
└── *.liquid                   ✅ Reusable components

assets/
├── *.css                      ✅ Stylesheets
├── *.js                       ✅ JavaScript
└── *.svg, *.png, etc.         ✅ Static assets

config/
└── settings_schema.json       ✅ Settings definition (not values)
```

**Why these should be shared:**
- Define theme functionality
- Bug fixes apply to all shops
- New features benefit all shops
- Code improvements shared across shops

---

## Recommended Strategies

### Strategy 1: Gitignore Content Files (Recommended)

**Create shop-specific .gitignore patterns:**

```gitignore
# In shop-a/main and shop-a/staging branches only:
# .gitignore-shop-specific

# Shop-specific content (DO NOT sync from main)
config/settings_data.json
config/markets.json
templates/*.json
locales/*.json

# Keep code files tracked
!config/settings_schema.json
```

**Workflow:**
1. Main branch: No gitignore for content (it's the "base" theme)
2. Shop branches: Add .gitignore for content files
3. When syncing main → shop: Only code files merge, content preserved

**Pros:**
- ✅ Simple to implement
- ✅ Prevents accidental overwrites
- ✅ Clear separation

**Cons:**
- ⚠️ Requires discipline (must add .gitignore to shop branches)
- ⚠️ Can't see shop-specific content in git

### Strategy 2: Manual Review (Current Approach)

**How it works:**
1. Run Tools → Sync Shops (creates PR)
2. **Manually review** the PR diff
3. **Do NOT merge** changes to content files
4. Only merge code file updates

**Pros:**
- ✅ Full visibility into changes
- ✅ Flexibility to cherry-pick

**Cons:**
- ⚠️ Requires manual vigilance
- ⚠️ Easy to accidentally merge content
- ⚠️ Doesn't scale with many shops

### Strategy 3: Separate Code/Content Branches (Advanced)

**Branch structure:**
```
main-code/                    # Pure code, no content
├── shop-a/code              # Code for shop-a
└── shop-a/content           # Content for shop-a (separate)
```

**Workflow:**
1. Develop code in `main-code`
2. Sync `main-code` → `shop-a/code`
3. Manually merge `shop-a/code` + `shop-a/content` → `shop-a/main`

**Pros:**
- ✅ Clean separation
- ✅ Clear content ownership

**Cons:**
- ⚠️ Complex branch management
- ⚠️ Doesn't match Shopify's GitHub integration model

---

## Recommended Approach for Multi-Shop

### For Teams Using GitHub Integration

**Use Strategy 2 (Manual Review) with these safeguards:**

1. **Add .gitattributes for merge strategy:**
   ```gitattributes
   # .gitattributes in shop branches
   config/settings_data.json merge=ours
   templates/*.json merge=ours
   locales/*.json merge=ours
   ```
   This tells Git to prefer the shop branch version during merges.

2. **Create PR template with checklist:**
   ```markdown
   ## ⚠️ Content File Review

   This PR syncs code from main. Review these files carefully:

   - [ ] config/settings_data.json - ⚠️ DO NOT MERGE (shop-specific)
   - [ ] templates/*.json - ⚠️ DO NOT MERGE (shop-specific)
   - [ ] locales/*.json - ⚠️ DO NOT MERGE (shop-specific)
   - [ ] .liquid files - ✅ SAFE TO MERGE (code)
   - [ ] .css/.js files - ✅ SAFE TO MERGE (code)
   ```

3. **Use GitHub CODEOWNERS:**
   ```
   # .github/CODEOWNERS in shop branches
   config/settings_data.json @shop-a-team
   templates/*.json @shop-a-team
   ```

### For Teams NOT Using GitHub Integration

**Use Strategy 1 (Gitignore Content) - cleaner:**

1. Add content files to .gitignore on shop branches
2. Content lives only in Shopify (pulled from Shopify when needed)
3. Code syncs cleanly from main → shop branches
4. Use `shopify theme pull` to get content when needed

---

## What Multi-Shop Script Should Do

### Current Behavior (Risky)
```bash
pnpm run shop → Tools → Sync Shops
# Creates PR: main → shop-a/staging
# Includes EVERYTHING (code + content)
# ⚠️ Risk of overwriting shop customizations
```

### Proposed Enhancement

**Add warnings when JSON files detected in sync:**

```bash
pnpm run shop → Tools → Sync Shops

🚨 WARNING: Content files detected in diff!

The following files contain shop-specific CONTENT and may overwrite
shop customizations if merged:

⚠️  config/settings_data.json (412 lines changed)
⚠️  templates/index.json (28 lines changed)
⚠️  locales/en.default.json (156 lines changed)

These files should be reviewed carefully before merging.
Consider using:
  1. Git merge strategy: git merge main --no-commit
  2. Cherry-pick code files only
  3. Use .gitattributes: merge=ours for content files

✅ Safe to merge (code files):
  sections/header.liquid
  assets/theme.css
  snippets/product-card.liquid

Continue creating PR? (y/N)
```

---

## Best Practices

### 1. Establish Content Ownership

**Document which team owns content for each shop:**
```
shop-a/: Shop A marketing team owns content
shop-b/: Shop B merchandising team owns content
main/: No content owner (base theme only)
```

### 2. Use Branch Protection

**Protect content files in shop branches:**
```yaml
# .github/branch-protection.yml
shop-*/main:
  required_reviews: 2  # Require shop team review
  codeowners_review: true  # Require CODEOWNERS approval
```

### 3. Content Pull Workflow

**When shop needs fresh content from Shopify:**
```bash
# On shop-a/staging branch
shopify theme pull --only=config/settings_data.json
shopify theme pull --only=templates/*.json

git add config/ templates/
git commit -m "Update content from Shopify Theme Editor"
git push
```

### 4. Code-Only Syncing

**Ideal workflow (requires script enhancement):**
```bash
pnpm run shop → Tools → Sync Code Only
# Creates PR with ONLY code files (.liquid, .css, .js)
# Excludes all .json content files
# Safe to merge without review
```

---

## Migration Guide

### If You Already Have Content Mixed

**Step 1: Identify content files**
```bash
# Find all JSON files that might be content
find config templates sections locales -name "*.json"
```

**Step 2: For each shop branch, decide strategy**
```bash
# Option A: Gitignore content on shop branches
git checkout shop-a/main
echo "config/settings_data.json" >> .gitignore
git add .gitignore && git commit -m "Gitignore shop-specific content"

# Option B: Add .gitattributes merge strategy
echo "config/settings_data.json merge=ours" >> .gitattributes
git add .gitattributes && git commit -m "Protect shop-specific content"
```

**Step 3: Document in README**
```markdown
## ⚠️ Content Management

This theme separates CODE (shared) from CONTENT (shop-specific):

- Code files (.liquid, .css, .js): Synced from main
- Content files (.json): Shop-specific, DO NOT sync from main

See CONTENT-PHILOSOPHY.md for details.
```

---

## Summary

**The Challenge:**
- Shopify themes mix code and content in the same repository
- Multi-shop workflows require syncing code without overwriting content
- Current Sync Shops feature doesn't distinguish between them

**The Solution:**
1. **Gitignore content files** on shop branches (cleanest)
2. **Manual review** with .gitattributes protection
3. **Enhanced script** to warn about content files
4. **Team discipline** with CODEOWNERS and branch protection

**Recommended for Most Teams:**
- Use .gitattributes `merge=ours` strategy for content files
- Add PR template warning about content review
- Manually review all PRs before merging

**For Advanced Teams:**
- Gitignore content on shop branches
- Pull content from Shopify when needed
- Script enhancement to exclude JSON files from sync
