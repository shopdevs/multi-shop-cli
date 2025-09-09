# 📦 NPM Package Versioning Guide

**Complete guide to semantic versioning and publishing workflows for ShopDevs Multi-Shop**

This covers modern NPM best practices for 2024/2025.

---

## 🎯 Semantic Versioning (SemVer) Overview

We follow [Semantic Versioning 2.0.0](https://semver.org/) strictly:

**Version Format: `MAJOR.MINOR.PATCH`**

- **PATCH** (`1.0.1`) - Bug fixes, documentation updates, security patches
- **MINOR** (`1.1.0`) - New features that are backward compatible
- **MAJOR** (`2.0.0`) - Breaking changes, API changes, removing features

### **Examples for Multi-Shop Package:**

| Change | Version Impact | Example |
|--------|----------------|---------|
| Fix shop creation bug | **PATCH** | 1.0.0 → 1.0.1 |
| Add new CLI command | **MINOR** | 1.0.1 → 1.1.0 |
| Change shop config format | **MAJOR** | 1.1.0 → 2.0.0 |
| Update documentation | **PATCH** | 1.0.0 → 1.0.1 |
| Add promo automation | **MINOR** | 1.0.1 → 1.1.0 |
| Remove deprecated commands | **MAJOR** | 1.1.0 → 2.0.0 |

---

## 🚀 Release Workflows

### **Automated Releases (Recommended)**

Use our built-in scripts with the required CHANGELOG.md step:

```bash
# Enhanced release scripts with automated changelog prompts:

# For bug fixes and small improvements
pnpm run release:patch  # Prompts for CHANGELOG.md, then 1.0.16 → 1.0.17

# For new features (backward compatible)
pnpm run release:minor  # Prompts for CHANGELOG.md, then 1.0.16 → 1.1.0

# For breaking changes  
pnpm run release:major  # Prompts for CHANGELOG.md, then 1.0.16 → 2.0.0

# Each script will:
# 1. Display CHANGELOG.md update instructions
# 2. Wait for you to update and commit CHANGELOG.md
# 3. Continue with version bump and publish
```

**What the automated scripts do:**
1. ✅ Run quality gates (`pnpm run validate`)
2. ✅ Build the package (`pnpm run build`)
3. ✅ Update version in package.json
4. ✅ Create git commit with version message
5. ✅ Create git tag (e.g., `v1.0.8`)
6. ✅ Publish to NPM registry
7. ✅ Push commit and tags to GitHub

**What you must do manually:**
- ⚠️ **Update CHANGELOG.md** when prompted (script will wait for you)

### **Manual Workflow (If Needed)**

```bash
# 1. Ensure clean git state
git status  # Must be clean
git pull origin main

# 2. Run quality checks
pnpm run validate
pnpm run build

# 3. Update version
npm version patch  # or minor/major

# 4. Publish
npm publish

# 5. Push to GitHub
git push --follow-tags
```

---

## 🔰 First-Time NPM Publishing Setup

### **Step 1: NPM Account and Security**

```bash
# Check if logged in
npm whoami
# If error: "npm ERR! need auth"

# Login (use existing account)
npm login
# OR create new account: npm adduser

# Enable 2FA (essential for 2025)
npm profile enable-2fa auth-and-writes
# Requires authenticator app (Authy, Google Authenticator, etc.)

# Verify profile
npm profile get
```

### **Step 2: Verify Package Configuration**

```bash
# Check package name is available
npm view @shopdevs/multi-shop-cli
# Should return: "npm ERR! 404 Not Found"

# Test what will be published
npm pack --dry-run
# Shows exactly what files will be included

# Check package size
pnpm run size-check
```

### **Step 3: Pre-Publication Tests**

```bash
# Full quality gate
pnpm run validate

# Test local installation
npm pack
# Creates: @shopdevs/multi-shop-cli-1.0.0.tgz

# Test in another directory
cd /tmp && mkdir test-install && cd test-install
npm init -y
npm install /path/to/@shopdevs/multi-shop-cli-1.0.0.tgz
npx multi-shop --version  # Should work
```

### **Step 4: First Publication**

```bash
# Option 1: Use automated script (recommended)
pnpm run release:patch

# Option 2: Manual first publish
pnpm run validate
pnpm run build
npm publish
git push --follow-tags
```

---

## 📈 Version Planning Strategy

### **For Multi-Shop CLI Development**

**Phase 1: Core Functionality (1.0.x)**
- 1.0.0 - Initial release with basic shop management
- 1.0.1 - Bug fixes, documentation improvements
- 1.0.2 - Security patches, cross-platform fixes

**Phase 2: Enhanced Features (1.1.x)**
- 1.1.0 - GitHub Actions automation
- 1.1.1 - Bug fixes for GitHub integration
- 1.1.2 - Performance improvements

**Phase 3: Advanced Workflow (1.2.x)**
- 1.2.0 - Advanced promo management
- 1.2.1 - Workflow optimizations

**Phase 4: Breaking Changes (2.0.x)**
- 2.0.0 - CLI command restructure (if needed)
- 2.0.1 - Migration bug fixes

### **Release Frequency Recommendations**

- **Patch releases** - Weekly/bi-weekly for bug fixes
- **Minor releases** - Monthly for new features
- **Major releases** - Quarterly/annually for breaking changes

---

## 🏷️ Git Tagging Best Practices

### **Tag Format**
```bash
# NPM automatically creates tags like:
v1.0.0   # Initial release
v1.0.1   # Patch release
v1.1.0   # Minor release
v2.0.0   # Major release
```

### **Tag Management**
```bash
# List all tags
git tag -l

# View specific tag
git show v1.0.1

# Delete tag (if mistake within first hour)
git tag -d v1.0.1            # Local
git push origin :refs/tags/v1.0.1  # Remote

# Force re-tag (only if critical error)
git tag -f v1.0.1
git push --force --tags
```

---

## 🔍 NPM Registry Management

### **Package Visibility**
```bash
# Check package info
npm view @shopdevs/multi-shop-cli

# View all versions
npm view @shopdevs/multi-shop-cli versions

# View latest version info
npm view @shopdevs/multi-shop-cli@latest

# View specific version
npm view @shopdevs/multi-shop-cli@1.0.1
```

### **Download Statistics**
```bash
# Check download stats
npm view @shopdevs/multi-shop-cli --json | jq '.downloads'

# Weekly downloads (after package gains traction)
# https://npmcharts.com/compare/@shopdevs/multi-shop-cli
```

### **Package Maintenance**
```bash
# Check for outdated dependencies (monthly)
npm outdated

# Security audit (weekly)
npm audit --audit-level=moderate

# Update dependencies (carefully)
npm update  # Only patch/minor updates
```

---

## ⚠️ Important NPM Publishing Rules (2025)

### **What You CAN'T Undo**
- ❌ **Cannot unpublish after 72 hours**
- ❌ **Cannot republish same version number**
- ❌ **Cannot change package name after publishing**

### **What You CAN Do**
- ✅ **Publish new patch versions** to fix issues
- ✅ **Deprecate versions** with warnings
- ✅ **Transfer ownership** to other NPM users/organizations

### **Emergency Procedures**
```bash
# Deprecate a problematic version (instead of unpublishing)
npm deprecate @shopdevs/multi-shop-cli@1.0.1 "Security issue, please upgrade to 1.0.2+"

# Unpublish (only within 72 hours)
npm unpublish @shopdevs/multi-shop-cli@1.0.1 --force
```

---

## 📋 Pre-Release Checklist

Before every release, ensure:

### **Code Quality**
- [ ] `pnpm run validate` passes (lint + typecheck + test)
- [ ] All TypeScript errors resolved (zero shortcuts)
- [ ] Security audit clean (`npm audit`)
- [ ] Cross-platform tested (Windows/macOS/Linux if possible)

### **Documentation**
- [ ] README.md updated with new features
- [ ] CHANGELOG.md has release notes
- [ ] Breaking changes documented
- [ ] Migration guide provided (for major versions)

### **Testing**
- [ ] Local installation tested (`npm pack` then install)
- [ ] CLI commands work correctly
- [ ] Shop creation and branch automation tested
- [ ] Contextual development tested on different branch types

### **Git State**
- [ ] Working directory clean (`git status`)
- [ ] All changes committed
- [ ] On main branch
- [ ] Synced with remote (`git pull origin main`)

---

## 🎯 Quick Reference

### **Complete Release Process**
```bash
# 1. ALWAYS FIRST: Update CHANGELOG.md manually
# - Move [Unreleased] → [1.0.8] with date
# - Create new [Unreleased] section  
# - Commit: git add CHANGELOG.md && git commit -m "Update CHANGELOG for v1.0.8"

# 2. Run release script:
pnpm run release:patch    # Bug fixes: 1.0.7 → 1.0.8
pnpm run release:minor    # New features: 1.0.7 → 1.1.0
pnpm run release:major    # Breaking changes: 1.0.7 → 2.0.0

# 3. Verify
npm view @shopdevs/multi-shop-cli@latest
```

### **⚠️ Critical Step: CHANGELOG.md**
- **MUST update manually** before any release
- **Scripts don't handle** CHANGELOG.md automatically  
- **Always move [Unreleased]** to versioned section first

### **Emergency Commands**
```bash
# Check package status
npm view @shopdevs/multi-shop-cli dist-tags

# Revert to previous version (for users)
npm install @shopdevs/multi-shop-cli@1.0.0

# Deprecate bad version
npm deprecate @shopdevs/multi-shop-cli@1.0.1 "Please upgrade to 1.0.2"
```

This ensures smooth NPM publishing with modern best practices!