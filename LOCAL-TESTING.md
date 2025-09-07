# 🧪 Local Testing Guide

How to test the ShopDevs Multi-Shop package locally before publishing to NPM.

## 🚀 Quick Local Test

### Method 1: npm link (Recommended for Development)

```bash
# In the package directory (this directory)
pnpm run build                # Build the package first
npm link                      # Create global symlink

# In a test Shopify theme directory
cd /path/to/test-shopify-theme
npm link @shopdevs/multi-shop-cli  # Link to your local package

# Now test it
npx multi-shop --version     # Should show your local version
npx multi-shop init          # Test initialization
pnpm run shop                # Test shop creation
pnpm run dev                 # Test contextual development
```

### Method 2: Local Install with Tarball

```bash
# In the package directory
pnpm run build
npm pack                     # Creates @shopdevs/multi-shop-cli-1.0.0.tgz

# In a test theme directory  
cd /path/to/test-shopify-theme
npm init -y                  # If no package.json exists
pnpm add -D /path/to/@shopdevs/multi-shop-cli/@shopdevs/multi-shop-cli-1.0.0.tgz

# Test the installation
npx multi-shop --version
```

### Method 3: Direct Path Install

```bash
# In a test theme directory
pnpm add -D file:../path/to/@shopdevs/multi-shop-cli

# Test functionality
npx multi-shop init
pnpm run shop
pnpm run dev
```

---

## 🛠️ Complete Local Testing Workflow

### 1. Set Up Test Environment

```bash
# Create a clean test theme directory
cd /tmp
mkdir test-multi-shop-theme
cd test-multi-shop-theme

# Initialize as basic Shopify theme
npm init -y
echo "console.log('Test Shopify theme');" > index.js
git init
git add .
git commit -m "Initial commit"
```

### 2. Install Your Local Package

```bash
# From your package directory
cd /Users/brandt/codes/meyer/@shopdevs/multi-shop-cli
pnpm run build
npm link

# In test theme directory
cd /tmp/test-multi-shop-theme
npm link @shopdevs/multi-shop-cli
```

### 3. Test Core Functionality

```bash
# Test CLI commands
npx multi-shop --version
npx multi-shop --help

# Test initialization
npx multi-shop init
# Should create: shops/ directory, update package.json

# Verify package.json was updated
cat package.json | grep -A 10 '"scripts"'
# Should show: "dev": "multi-shop dev", etc.
```

### 4. Test Shop Management

```bash
# Test shop creation
pnpm run shop
# → Create New Shop
# → Test all the prompts and validation

# Test shop listing
pnpm run shop
# → List Shops
# Should show your created shops

# Verify files were created
ls shops/
ls shops/credentials/
```

### 5. Test Contextual Development

```bash
# Test on main branch
git checkout -b feature/test-feature
pnpm run dev
# → Should prompt for shop selection
# → Test with different shops

# Test on shop-specific branch (if created)
git checkout shop-a/main  # If branch was created
pnpm run dev
# → Should auto-detect shop-a
```

### 6. Test Branch Detection

```bash
# Test different branch patterns
git checkout -b feature/carousel-fix
npx multi-shop dev
# Should detect feature branch

git checkout -b shop-test/custom-feature  
npx multi-shop dev
# Should auto-detect shop-test
```

---

## 🔧 Development Testing Loop

For active development of the package:

```bash
# 1. Make changes to source code
# Edit src/lib/ShopManager.ts or other files

# 2. Rebuild
pnpm run build

# 3. Test in linked project
cd /tmp/test-multi-shop-theme
pnpm run shop  # Test your changes

# 4. Repeat as needed
# Changes are immediately available in linked project
```

---

## 🧪 Test Different Scenarios

### Test Error Handling
```bash
# Test with invalid shop IDs
pnpm run shop
# → Create shop with invalid characters
# → Should show proper validation errors

# Test without git repository
cd /tmp && mkdir no-git-test && cd no-git-test
npm link @shopdevs/multi-shop-cli
npx multi-shop init
# Should handle gracefully
```

### Test Cross-Platform
```bash
# Test file operations
pnpm run shop
# Create shop, check file permissions
ls -la shops/credentials/
# Should show restricted permissions (Unix-like systems)
```

### Test TypeScript Integration
```bash
# In a TypeScript project
echo 'import { ShopManager } from "@shopdevs/multi-shop-cli";' > test.ts
npx tsc --noEmit test.ts
# Should compile without errors
```

---

## 📋 Pre-Publish Test Checklist

Before publishing to NPM, ensure all these work locally:

### Core Functionality
- [ ] `npx multi-shop --version` shows correct version
- [ ] `npx multi-shop --help` shows all commands
- [ ] `npx multi-shop init` creates proper file structure
- [ ] `pnpm run shop` creates shops with validation
- [ ] `pnpm run dev` detects branch context correctly
- [ ] Shop branch auto-creation works
- [ ] Credential file operations work

### Error Scenarios  
- [ ] Invalid shop IDs are rejected
- [ ] Missing git repository handled gracefully
- [ ] Missing Shopify CLI shows helpful message
- [ ] File permission errors handled properly

### Integration Tests
- [ ] Works in fresh theme directory
- [ ] TypeScript imports work correctly
- [ ] Package.json scripts are added properly
- [ ] Cross-platform compatibility (if possible to test)

---

## 🔄 Cleanup After Testing

```bash
# Unlink from test projects
cd /tmp/test-multi-shop-theme
npm unlink @shopdevs/multi-shop-cli

# Unlink global package
cd /Users/brandt/codes/meyer/@shopdevs/multi-shop-cli
npm unlink

# Clean up test directories
rm -rf /tmp/test-multi-shop-theme
rm -rf /tmp/no-git-test

# Remove generated tarball
rm -f @shopdevs/multi-shop-cli-*.tgz
```

---

## 💡 Pro Tips

### Faster Development Testing
```bash
# Use file: protocol for rapid iteration
cd /path/to/test-theme
pnpm add -D file:/Users/brandt/codes/meyer/@shopdevs/multi-shop-cli

# Each time you make changes:
cd /Users/brandt/codes/meyer/@shopdevs/multi-shop-cli
pnpm run build

cd /path/to/test-theme  
pnpm install  # Reinstalls your local changes
```

### Testing with Different Node Versions
```bash
# Using nvm (if available)
nvm use 18
npm link @shopdevs/multi-shop-cli

nvm use 20  
npm link @shopdevs/multi-shop-cli
# Test on different Node versions
```

### Debug Mode Testing
```bash
# Test with debug logging
npx multi-shop --debug init
pnpm run shop --verbose
# See detailed logging output
```

This lets you thoroughly test the package locally before publishing to NPM!