# 📦 Publishing ShopDevs Multi-Shop to NPM

Complete guide to publishing and maintaining the ShopDevs Multi-Shop NPM package.

## 🚀 Quick Publish (First Time)

```bash
# 1. Ensure you're logged into NPM
npm whoami  # Check if logged in
npm login   # If not logged in

# 2. Run quality checks
pnpm run validate

# 3. Build the package
pnpm run build

# 4. Publish
npm publish
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
# Creates: shopdevs-multi-shop-x.x.x.tgz

# Test in separate directory
cd /tmp
mkdir test-install && cd test-install
npm init -y
npm install /path/to/shopdevs-multi-shop-x.x.x.tgz

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

### Version Commands
```bash
# Patch release (bug fixes)
npm version patch
# 1.0.0 → 1.0.1

# Minor release (new features)
npm version minor  
# 1.0.1 → 1.1.0

# Major release (breaking changes)
npm version major
# 1.1.0 → 2.0.0
```

### Pre-Release Versions
```bash
# Beta versions for testing
npm version prerelease --preid=beta
# 1.0.0 → 1.0.1-beta.0

# Publish beta for testing
npm publish --tag beta

# Install beta version
pnpm add -D shopdevs-multi-shop@beta
```

---

## 📤 Publishing Process

### First-Time Publishing

1. **Create NPM Account** (if needed)
```bash
# Create account at npmjs.com
npm adduser
```

2. **Verify Package Name Available**
```bash
npm view shopdevs-multi-shop
# Should return 404 if name is available
```

3. **Publish Initial Version**
```bash
# Ensure version is 1.0.0 in package.json
pnpm run validate  # Final quality check
pnpm run build     # Build for distribution
npm publish        # Publish to NPM registry
```

### Regular Updates

```bash
# 1. Update version
npm version patch  # or minor/major

# 2. Quality gate
pnpm run validate

# 3. Build
pnpm run build

# 4. Publish
npm publish

# 5. Create git tag
git push --follow-tags
```

---

## 🔍 Post-Publishing Verification

### 1. Verify Package is Live
```bash
# Check package exists on NPM
npm view shopdevs-multi-shop

# Check specific version
npm view shopdevs-multi-shop@1.0.0

# View all versions
npm view shopdevs-multi-shop versions --json
```

### 2. Test Installation
```bash
# Test fresh installation
cd /tmp && mkdir test-fresh && cd test-fresh
npm init -y
pnpm add -D shopdevs-multi-shop

# Test CLI functionality
npx multi-shop --help
npx multi-shop --version
```

### 3. Test in Real Project
```bash
# Test in actual Shopify theme
cd /path/to/shopify-theme
pnpm add -D shopdevs-multi-shop@latest
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
npm dist-tag add shopdevs-multi-shop@1.0.0 stable
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
npm view shopdevs-multi-shop@latest
```

---

## 📊 Package Analytics

### Monitor Package Usage
```bash
# Check download stats
npm view shopdevs-multi-shop

# Check dependents (who's using your package)
# Visit: https://www.npmjs.com/package/shopdevs-multi-shop?activeTab=dependents
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
      - 'v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          registry-url: 'https://registry.npmjs.org'
      
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
npm view shopdevs-multi-shop

# Try alternative names:
# @your-org/multi-shop
# shopdevs-multi-shop-v2
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
npm view shopdevs-multi-shop

# Monitor downloads
# https://npm-stat.com/charts.html?package=shopdevs-multi-shop

# Check for issues
# Monitor GitHub issues and NPM feedback
```

The package is now ready to transform any Shopify theme into a sophisticated multi-shop development system!