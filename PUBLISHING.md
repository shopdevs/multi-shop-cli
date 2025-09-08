# 📦 Publishing ShopDevs Multi-Shop to NPM

Complete guide to publishing and maintaining the ShopDevs Multi-Shop NPM
package.

## 🚀 Quick Publish (First Time)

```bash
# 1. Ensure you're logged into NPM
npm whoami  # Check if logged in
npm login   # If not logged in

# 2. Ensure clean git state
git status  # Should be clean
git pull origin main

# 3. Use built-in release scripts (recommended)
pnpm run release:patch  # For bug fixes (1.0.0 → 1.0.1)
# This automatically: validates, builds, versions, publishes, pushes tags

# OR manually:
pnpm run validate  # lint + typecheck + test
pnpm run build     # TypeScript compilation
npm publish        # Publish to NPM
git push --follow-tags  # Push version tag
```

---

## 📋 Pre-Publishing Checklist

Before publishing, ensure everything is ready:

### 1. Code Quality ✅

```bash
# Run all quality checks
pnpm run validate
# This runs: lint + typecheck + test

# Check for vulnerabilities
npm audit --audit-level=high

# Verify build works
pnpm run build
ls dist/  # Should show compiled JS files
```

### 2. Documentation ✅

- [ ] README.md updated with current features
- [ ] WORKFLOWS.md reflects actual workflow
- [ ] CLAUDE.md has current architecture
- [ ] Examples work with current version
- [ ] Troubleshooting section complete

### 3. Package Configuration ✅

```bash
# Check package.json fields
grep -A 20 '"name"' package.json

# Verify version number
grep '"version"' package.json

# Check files that will be published
cat .npmignore
# Should exclude: src/, tests/, dev configs
# Should include: dist/, README.md, LICENSE, etc.
```

### 4. Test Installation ✅

```bash
# Test local installation
npm pack
# Creates: @shopdevs/multi-shop-cli-x.x.x.tgz

# Test in separate directory
cd /tmp
mkdir test-install && cd test-install
npm init -y
npm install /path/to/@shopdevs/multi-shop-cli-x.x.x.tgz

# Test CLI works
npx multi-shop --help
npx multi-shop --version
```

---

## 🏷️ Version Management

### Semantic Versioning

- **Patch** (`1.0.1`) - Bug fixes, documentation updates
- **Minor** (`1.1.0`) - New features, backward compatible
- **Major** (`2.0.0`) - Breaking changes

### Version Commands (NPM Best Practice)

**Use the built-in scripts for automated workflows:**

```bash
# Patch release (bug fixes, documentation updates)
pnpm run release:patch
# 1.0.0 → 1.0.1 → validates → builds → publishes → pushes tag

# Minor release (new features, backward compatible)
pnpm run release:minor
# 1.0.1 → 1.1.0 → validates → builds → publishes → pushes tag

# Major release (breaking changes)
pnpm run release:major
# 1.1.0 → 2.0.0 → validates → builds → publishes → pushes tag
```

**Manual versioning (if needed):**

```bash
# Just update version (no publish)
npm version patch --no-git-tag-version  # Updates package.json only
npm version minor --no-git-tag-version
npm version major --no-git-tag-version

# Then publish manually
pnpm run validate && pnpm run build
npm publish
git add package.json && git commit -m "Release v1.0.1"
git tag v1.0.1 && git push --follow-tags
```

### Pre-Release Versions

```bash
# Beta versions for testing
npm version prerelease --preid=beta
# 1.0.0 → 1.0.1-beta.0

# Publish beta for testing
npm publish --tag beta

# Install beta version
pnpm add -D @shopdevs/multi-shop-cli@beta
```

---

## 📤 Publishing Process

### First-Time NPM Publishing Setup

#### 1. **NPM Account Setup**

```bash
# Check if you have an account
npm whoami
# If not logged in: "npm ERR! need auth"

# Create account (if needed)
# Visit https://www.npmjs.com/signup
# Or: npm adduser

# Login to existing account
npm login
# Enter username, password, email
# Enter OTP if 2FA is enabled (recommended)
```

#### 2. **Enable 2FA (Highly Recommended)**

```bash
# Enable two-factor authentication
npm profile enable-2fa auth-and-writes

# This requires 2FA for:
# - Login (auth)
# - Publishing packages (writes)
```

#### 3. **Verify Package Name Available**

```bash
npm view @shopdevs/multi-shop-cli
# Should return 404 if name is available
# If taken, you'll see existing package info

# Check alternative names if needed:
# npm view @your-username/multi-shop
# npm view @shopdevs/multi-shop-cli-v2
```

#### 4. **First Publication**

```bash
# Ensure version is 1.0.0 in package.json
grep '"version"' package.json

# Use the automated release script
pnpm run release:patch  # Will be 1.0.0 → 1.0.1 on first run
```

#### 5. **Verify Publication**

```bash
# Check your package is live
npm view @shopdevs/multi-shop-cli
npm view @shopdevs/multi-shop-cli@latest

# Check it installs correctly
cd /tmp && mkdir test-install && cd test-install
npm init -y
pnpm add -D @shopdevs/multi-shop-cli
npx multi-shop --version
```

### Regular Updates (Recommended Workflow)

**For your typical release cycle:**

```bash
# 1. Ensure clean git state
git status  # Should show "working tree clean"
git pull origin main

# 2. Update CHANGELOG.md (REQUIRED MANUAL STEP)
# Edit CHANGELOG.md:
# - Move [Unreleased] content to new version section [1.0.8]
# - Add current date: ## [1.0.8] - 2025-09-07  
# - Create new empty [Unreleased] section at top
# - Save the file
git add CHANGELOG.md && git commit -m "Update CHANGELOG for v1.0.8"

# 3. Choose appropriate release type:

# PATCH - Bug fixes, documentation updates, small improvements
pnpm run release:patch  # 1.0.7 → 1.0.8

# MINOR - New features, backward compatible changes
pnpm run release:minor  # 1.0.7 → 1.1.0

# MAJOR - Breaking changes, API changes
pnpm run release:major  # 1.0.7 → 2.0.0

# 4. Verify publication
npm view @shopdevs/multi-shop-cli@latest
```

**What the automated scripts do:**

1. Run `npm run validate` (lint + typecheck + test)
2. Run `npm run build` (TypeScript compilation)
3. Update version in package.json
4. Create git commit with version
5. Create git tag (e.g., v1.0.1)
6. Publish to NPM registry
7. Push commit and tags to GitHub

---

## 🔰 NPM Publishing Guide

Modern publishing best practices:

### **1. Understanding NPM Package Lifecycle**

```bash
# Development (local)
pnpm install           # Install dependencies
pnpm run dev          # Development mode
pnpm run test         # Run tests
pnpm run build        # Build for distribution

# Publishing (public)
npm version patch     # Update version
npm publish          # Publish to registry
```

### **2. Modern NPM Security Practices (2024/2025)**

```bash
# Essential security setup
npm profile enable-2fa auth-and-writes  # Enable 2FA
npm profile get                         # Verify your profile
npm audit                               # Check dependencies
```

### **3. Package Naming**

- ✅ `@shopdevs/multi-shop-cli` - Scoped package name with clear CLI designation

### **4. Version Strategy**

```bash
# Alpha/Beta testing (before 1.0.0)
npm version prerelease --preid=alpha  # 0.1.0-alpha.0
npm publish --tag alpha

# Stable releases (after 1.0.0)
npm version patch   # Bug fixes: 1.0.0 → 1.0.1
npm version minor   # New features: 1.0.1 → 1.1.0
npm version major   # Breaking changes: 1.1.0 → 2.0.0
```

### **5. Modern NPM Commands You Should Know**

```bash
# Check what will be published
npm pack --dry-run

# Check package info
npm view @shopdevs/multi-shop-cli

# Check download stats (after publishing)
npm view @shopdevs/multi-shop-cli --json | grep downloads

# Unpublish (only within 72 hours, use carefully!)
npm unpublish @shopdevs/multi-shop-cli@1.0.1
```

### **6. Git Tag Integration (Modern Standard)**

```bash
# NPM automatically creates git tags when versioning
npm version patch  # Creates v1.0.1 tag

# Push tags to GitHub (important!)
git push --follow-tags

# View tags
git tag -l
git show v1.0.1
```

---

## 🔍 Post-Publishing Verification

### 1. Verify Package is Live

```bash
# Check package exists on NPM
npm view @shopdevs/multi-shop-cli

# Check specific version
npm view @shopdevs/multi-shop-cli@1.0.0

# View all versions
npm view @shopdevs/multi-shop-cli versions --json
```

### 2. Test Installation

```bash
# Test fresh installation
cd /tmp && mkdir test-fresh && cd test-fresh
npm init -y
pnpm add -D @shopdevs/multi-shop-cli

# Test CLI functionality
npx multi-shop --help
npx multi-shop --version
```

### 3. Test in Real Project

```bash
# Test in actual Shopify theme
cd /path/to/shopify-theme
pnpm add -D @shopdevs/multi-shop-cli@latest
npx multi-shop init

# Verify scripts were added
grep "multi-shop" package.json
```

---

## 🛠️ Package Maintenance

### Regular Updates

**Monthly Tasks:**

```bash
# Check for outdated dependencies
npm outdated

# Update dependencies (careful with breaking changes)
npm update

# Security audit
npm audit --audit-level=moderate
```

**Quarterly Tasks:**

```bash
# Review package size
pnpm run size-check

# Update Node.js version requirements (if needed)
# Edit package.json engines field

# Review and update documentation
```

### Handling Issues

**Bug Reports:**

1. Reproduce issue locally
2. Create test case
3. Fix bug
4. `npm version patch`
5. `npm publish`

**Feature Requests:**

1. Discuss in GitHub issues
2. Implement feature
3. Update documentation
4. `npm version minor`
5. `npm publish`

**Breaking Changes:**

1. Document migration path
2. Update major version
3. `npm version major`
4. `npm publish`
5. Update documentation with migration guide

---

## 🔐 Security Best Practices

### NPM Account Security

```bash
# Enable 2FA on NPM account
npm profile enable-2fa auth-and-writes

# Use access tokens for CI/CD
npm token create --read-only   # For testing
npm token create --cidr=0.0.0.0/0  # For publishing (restrict IP if possible)
```

### Package Security

- **Never commit credentials** to the repository
- **Use .npmignore** to exclude sensitive files
- **Regular security audits** with `npm audit`
- **Monitor dependencies** for vulnerabilities
- **Review all dependencies** before adding new ones

### Publishing Security

```bash
# Dry run first
npm publish --dry-run

# Check what files will be published
npm pack --dry-run

# Use specific version tags for important releases
npm dist-tag add @shopdevs/multi-shop-cli@1.0.0 stable
```

---

## 🎯 Release Workflow

### Complete Release Process

```bash
# 1. Ensure clean working directory
git status  # Should be clean

# 2. Pull latest changes
git pull origin main

# 3. Run full test suite
pnpm run validate
pnpm run test:e2e  # If available

# 4. Update version
npm version patch  # or minor/major

# 5. Update CHANGELOG.md
# Add release notes for the new version

# 6. Build and publish
pnpm run build
npm publish

# 7. Push changes and tags
git push --follow-tags

# 8. Create GitHub release
gh release create v1.0.1 --notes "Bug fixes and improvements"

# 9. Verify publication
npm view @shopdevs/multi-shop-cli@latest
```

---

## 📊 Package Analytics

### Monitor Package Usage

```bash
# Check download stats
npm view @shopdevs/multi-shop-cli

# Check dependents (who's using your package)
# Visit: https://www.npmjs.com/package/@shopdevs/multi-shop-cli?activeTab=dependents
```

### Success Metrics

- **Weekly downloads**
- **GitHub stars and forks**
- **Issue reports and resolution time**
- **Community contributions**

---

## 🔄 Continuous Integration

### GitHub Actions (Optional)

Create `.github/workflows/publish.yml`:

```yaml
name: Publish Package

on:
  push:
    tags:
      - "v*"

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "18"
          registry-url: "https://registry.npmjs.org"

      - name: Install dependencies
        run: pnpm install

      - name: Run quality checks
        run: pnpm run validate

      - name: Build
        run: pnpm run build

      - name: Publish
        run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

---

## 🆘 Troubleshooting Publishing

### Common Issues

**"Package name already exists"**

```bash
# Check if name is taken
npm view @shopdevs/multi-shop-cli

# Try alternative names:
# @your-org/multi-shop
# @shopdevs/multi-shop-cli-v2
```

**"Authentication failed"**

```bash
# Re-login to NPM
npm logout
npm login

# Check authentication
npm whoami
```

**"Files missing from package"**

```bash
# Check .npmignore
cat .npmignore

# Test what gets included
npm pack --dry-run
```

**"CLI not executable after install"**

```bash
# Check bin field in package.json
grep -A 3 '"bin"' package.json

# Verify executable permissions
ls -la dist/bin/multi-shop.js
```

---

## 🎉 After Publishing

### Announce Release

- **GitHub Releases** - Create release notes
- **Documentation** - Update any external docs
- **Community** - Share with Shopify dev community
- **Team** - Notify team members of new version

### Monitor Health

```bash
# Check package health
npm view @shopdevs/multi-shop-cli

# Monitor downloads
# https://npm-stat.com/charts.html?package=@shopdevs/multi-shop-cli

# Check for issues
# Monitor GitHub issues and NPM feedback
```

The package is now ready to transform any Shopify theme into a sophisticated
multi-shop development system!
