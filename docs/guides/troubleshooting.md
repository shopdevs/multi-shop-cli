# Troubleshooting Guide

Complete guide to debugging and resolving common issues.

## Quick Diagnosis

Start here for common issues:

| Symptom | Likely Cause | Quick Fix |
|---------|--------------|-----------|
| "No shops configured" | No shops created | Run `pnpm run shop` → Create New Shop |
| "No credentials found" | Missing credential file | Create `shops/credentials/SHOP.credentials.json` |
| "Shopify CLI not found" | CLI not installed | Run `npm install -g @shopify/cli` |
| "Permission denied" | Wrong file permissions | Run `chmod 600 shops/credentials/*.json` |
| "Invalid shop ID" | Wrong format | Use lowercase with hyphens: `shop-a` |
| "Branch not found" | Branch doesn't exist | Run `git branch -r | grep SHOP` |
| Dev server won't start | Credentials or domain issue | Check credentials and domain in config |

## Setup Issues

### "No shops configured yet"

**Symptom:**
```bash
$ pnpm run dev
⚠ No shops configured yet. Create your first shop:
   pnpm run shop
```

**Cause:** No shop configuration files exist.

**Solution:**
```bash
# Create your first shop
pnpm run shop
# → Select: Create New Shop
# → Follow prompts

# Verify shops exist
ls shops/*.config.json
```

### "No credentials found for shop-x"

**Symptom:**
```bash
$ pnpm run dev
❌ No credentials found for shop-a
   Create: shops/credentials/shop-a.credentials.json
```

**Cause:** Developer hasn't created credential file yet.

**Solution:**
```bash
# Create credential file
vim shops/credentials/shop-a.credentials.json
```

```json
{
  "developer": "your-name",
  "shopify": {
    "stores": {
      "production": {
        "themeToken": "your-production-token"
      },
      "staging": {
        "themeToken": "your-staging-token"
      }
    }
  },
  "notes": "Theme access app credentials"
}
```

**Verify:**
```bash
# Check file exists
ls shops/credentials/shop-a.credentials.json

# Check file is valid JSON
cat shops/credentials/shop-a.credentials.json | jq .
```

### "Shopify CLI not found"

**Symptom:**
```bash
$ pnpm run dev
❌ Shopify CLI not found
   Install: npm install -g @shopify/cli
```

**Cause:** Shopify CLI not installed globally.

**Solution:**
```bash
# Install Shopify CLI globally
npm install -g @shopify/cli

# Or with pnpm
pnpm add -g @shopify/cli

# Verify installation
shopify version
# Should show: 3.x.x or higher
```

### "Permission denied" (Unix/macOS/Linux)

**Symptom:**
```bash
$ pnpm run dev
❌ Error: EACCES: permission denied
```

**Cause:** Credential files have wrong permissions.

**Solution:**
```bash
# Fix permissions (owner read/write only)
chmod 600 shops/credentials/*.credentials.json

# Verify permissions
ls -la shops/credentials/
# Should show: -rw-------
```

### "Directory not found: shops/"

**Symptom:**
```bash
$ pnpm run shop
❌ Error: Directory not found: shops/
```

**Cause:** Project not initialized.

**Solution:**
```bash
# Initialize project
npx multi-shop init

# Verify directory structure
ls -la shops/
# Should show:
# drwxr-xr-x  shops/
# drwx------  shops/credentials/
```

## Configuration Issues

### "Invalid shop ID"

**Symptom:**
```bash
$ pnpm run shop
❌ Invalid shop ID: "Shop-A"
   Must be lowercase alphanumeric with hyphens
```

**Cause:** Shop ID doesn't match pattern.

**Valid formats:**
- `shop-a` ✓
- `my-store` ✓
- `test-123` ✓

**Invalid formats:**
- `Shop-A` ✗ (uppercase)
- `-shop` ✗ (leading hyphen)
- `shop_a` ✗ (underscore)
- `shop a` ✗ (space)

**Solution:** Use valid format when creating shop.

### "Invalid domain"

**Symptom:**
```bash
❌ Invalid domain: "shop.com"
   Must end with .myshopify.com
```

**Cause:** Domain doesn't match Shopify format.

**Valid formats:**
- `shop-a.myshopify.com` ✓
- `staging-shop.myshopify.com` ✓

**Invalid formats:**
- `shop.com` ✗ (wrong suffix)
- `shop.shopify.com` ✗ (wrong suffix)
- `.myshopify.com` ✗ (no subdomain)

**Solution:** Use full Shopify domain format.

### "Configuration file corrupted"

**Symptom:**
```bash
❌ Failed to parse configuration file
   File: shops/shop-a.config.json
```

**Cause:** JSON syntax error in config file.

**Solution:**
```bash
# Validate JSON
cat shops/shop-a.config.json | jq .

# If invalid, fix syntax or recreate
pnpm run shop → Edit Shop → shop-a
```

## Git and Branch Issues

### "Branch not found"

**Symptom:**
```bash
❌ Branch not found: shop-a/main
```

**Cause:** Git branch doesn't exist.

**Solution:**
```bash
# Check if branch exists locally
git branch | grep shop-a/main

# Check if branch exists remotely
git branch -r | grep shop-a/main

# Create branch if needed
git checkout -b shop-a/main
git push -u origin shop-a/main
```

### "Can't connect theme to GitHub"

**Symptom:** In Shopify Admin, can't find branch when connecting theme.

**Causes:**
1. Branch doesn't exist
2. Branch not pushed to remote
3. GitHub integration not configured

**Solution:**
```bash
# 1. Verify branch exists and is pushed
git branch -r | grep shop-a/main
# If not found:
git checkout -b shop-a/main
git push -u origin shop-a/main

# 2. Verify GitHub connection in Shopify Admin
# Settings → Apps and sales channels → GitHub → Configure

# 3. Reconnect repository if needed
# Shopify Admin → Online Store → Themes → Add theme → Connect from GitHub
```

### "Branch detection not working"

**Symptom:** Contextual dev not detecting shop from branch.

**Cause:** Branch name doesn't match expected pattern.

**Expected patterns:**
- `shop-a/main` - Auto-detects shop-a
- `shop-a/staging` - Auto-detects shop-a
- `shop-a/feature-name` - Auto-detects shop-a
- `feature/name` - Prompts for shop selection

**Solution:**
```bash
# Check current branch
git branch --show-current

# Rename branch if needed
git branch -m old-name shop-a/feature-name
```

## Development Server Issues

### Dev server won't start

**Symptom:**
```bash
$ pnpm run dev
❌ Failed to start development server
```

**Common causes:**

**1. Invalid credentials:**
```bash
# Check credentials exist and are valid
cat shops/credentials/shop-a.credentials.json | jq .

# Test credentials manually
shopify theme dev --store=shop-a.myshopify.com --password=YOUR_TOKEN
```

**2. Wrong domain:**
```bash
# Check domain in config
cat shops/shop-a.config.json | jq .shopify.stores.staging.domain

# Verify domain exists in Shopify Admin
# Admin → Online Store → Domains
```

**3. Port already in use:**
```bash
# Check if port 9292 is in use
lsof -i :9292

# Kill process if needed
kill -9 PID

# Or use different port
shopify theme dev --port=9293
```

**4. Shopify CLI outdated:**
```bash
# Check version
shopify version

# Update if needed
npm update -g @shopify/cli
```

### "Store not found"

**Symptom:**
```bash
❌ Error: Store not found: shop-a.myshopify.com
```

**Causes:**
1. Domain typo in configuration
2. Store doesn't exist
3. Store URL changed

**Solution:**
```bash
# 1. Verify domain in config
cat shops/shop-a.config.json | jq .shopify.stores.production.domain

# 2. Check store exists
# Log into: shop-a.myshopify.com/admin

# 3. Update domain if changed
pnpm run shop → Edit Shop → shop-a → Update domain
```

### "Theme token invalid"

**Symptom:**
```bash
❌ Authentication failed: Invalid theme token
```

**Causes:**
1. Token expired
2. Token revoked
3. Wrong token for store

**Solution:**
```bash
# 1. Generate new token
# Shopify Admin → Themes → ... → Edit code
# Copy password from URL: ?key=PASSWORD

# Or use Theme Access app:
# Install app → Generate token

# 2. Update credentials
vim shops/credentials/shop-a.credentials.json

# 3. Test new token
pnpm run dev
```

## Credential Issues

### "Credentials leaked in Git"

**Symptom:** Credential file accidentally committed.

**Immediate actions:**
```bash
# 1. Remove from staging
git reset HEAD shops/credentials/*.credentials.json

# 2. Verify .gitignore
cat .gitignore | grep credentials
# Should contain: shops/credentials/

# 3. Rotate compromised credentials
# Generate new tokens in Shopify Admin
# Update credential files
# Revoke old tokens

# 4. Remove from history (if committed)
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch shops/credentials/*.credentials.json" \
  --prune-empty --tag-name-filter cat -- --all

# 5. Force push (coordinate with team!)
git push --force --all
```

### "Wrong permissions on credentials"

**Symptom:**
```bash
⚠ Warning: Insecure file permissions on credentials
   File: shops/credentials/shop-a.credentials.json (644)
   Expected: 600
```

**Solution:**
```bash
# Fix permissions (Unix/macOS/Linux)
chmod 600 shops/credentials/*.credentials.json

# Verify
ls -la shops/credentials/
# Should show: -rw-------
```

## Workflow Issues

### "Feature branch not syncing"

**Symptom:** Changes not appearing in shop branches.

**Cause:** Using feature branches, not shop branches.

**Explanation:**
- Feature branches (`feature/name`) stay separate
- Shop branches (`shop-a/main`) get updates via PRs
- Use "Tools → Sync Shops" to create sync PRs

**Solution:**
```bash
# 1. Merge feature to main
gh pr create --base main --title "Your feature"
# Get PR merged

# 2. Use Tools → Sync Shops to create PRs
pnpm run shop → Tools → Sync Shops
# → Select shops to sync
# → Creates PRs: main → shop-a/staging, main → shop-b/staging

# 3. Shop teams review and merge their PRs
```

### "Promo content not in main"

**Symptom:** Promo changes not reflected in main branch.

**Cause:** Promo branches don't auto-merge to main.

**Solution:**
```bash
# Use Campaign Tools to create PR
pnpm run shop → Campaign Tools → Push Promo to Main
# → Select shop: shop-a
# → Select promo: summer-sale
# → Creates PR: shop-a/promo-summer-sale → shop-a/main

# Review and merge PR
# Republish shop-a/main theme to keep it current
```

## Testing Issues

### Tests failing

**Symptom:**
```bash
$ pnpm test
❌ Tests failing
```

**Common causes:**

**1. Missing test dependencies:**
```bash
# Install all dependencies
pnpm install

# Verify installation
pnpm ls vitest
```

**2. Test fixtures missing:**
```bash
# Check test fixtures exist
ls src/__tests__/fixtures/

# Recreate if needed
pnpm run test:setup
```

**3. Environment issues:**
```bash
# Check Node version
node --version
# Should be: 18.x or higher

# Clean and reinstall
rm -rf node_modules
pnpm install
```

### Coverage not generating

**Symptom:**
```bash
$ pnpm test
✓ Tests pass but no coverage/
```

**Solution:**
```bash
# Install coverage tools
pnpm install --save-dev @vitest/coverage-v8

# Run with coverage
pnpm test

# Verify coverage directory
ls coverage/
```

## Performance Issues

### Slow CLI startup

**Symptom:** CLI takes > 200ms to start.

**Solution:**
```bash
# Profile startup
pnpm run perf:startup

# Update dependencies
pnpm update

# Clear npm cache
npm cache clean --force

# Reinstall
rm -rf node_modules
pnpm install
```

### High memory usage

**Symptom:** Memory usage > 200MB.

**Solution:**
```bash
# Check shop count
ls shops/*.config.json | wc -l

# Archive old shops
mkdir shops/archived
mv shops/old-*.config.json shops/archived/

# Restart dev server
```

## Platform-Specific Issues

### Windows Issues

**Path separators:**
```bash
# Use forward slashes or path.join()
# Good:
const configPath = path.join('shops', 'shop-a.config.json');

# Avoid:
const configPath = 'shops\\shop-a.config.json';
```

**Line endings:**
```bash
# Configure Git for Windows
git config --global core.autocrlf true
```

**Permissions:**
```bash
# Windows doesn't support 600 permissions
# Credentials protected via NTFS ACLs instead
```

### macOS Issues

**Shopify CLI not in PATH:**
```bash
# Add to .zshrc or .bashrc
export PATH="$PATH:$HOME/.npm-global/bin"

# Or reinstall
npm install -g @shopify/cli
```

**File watching issues:**
```bash
# Increase file watch limit
echo kern.maxfiles=65536 | sudo tee -a /etc/sysctl.conf
echo kern.maxfilesperproc=65536 | sudo tee -a /etc/sysctl.conf
sudo sysctl -w kern.maxfiles=65536
sudo sysctl -w kern.maxfilesperproc=65536
```

### Linux Issues

**Permission denied on /usr/local:**
```bash
# Use user-level npm install
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc

# Reinstall CLI
npm install -g @shopify/cli
```

## Getting Help

### Debug Mode

Enable debug logging:

```bash
# Set debug environment variable
DEBUG=multi-shop:* pnpm run dev

# Or use verbose flag
npx multi-shop --verbose
```

### Collect Diagnostic Information

When reporting issues:

```bash
# System info
node --version
npm --version
shopify version

# Package info
npx multi-shop --version

# Configuration (sanitized)
ls shops/*.config.json
ls shops/credentials/  # Don't share credential contents!

# Git status
git status
git branch --show-current
```

### Where to Get Help

**Documentation:**
- [Getting Started Guide](./getting-started.md)
- [API Documentation](../api/index.md)
- [Security Guide](./security-guide.md)

**Community:**
- [GitHub Issues](https://github.com/shopdevs/multi-shop/issues)
- [Discussions](https://github.com/shopdevs/multi-shop/discussions)

**Support:**
- Email: support@shopdevs.com
- Security: security@shopdevs.com

### Reporting Bugs

Include in bug reports:

1. **Description:** What happened vs. what you expected
2. **Steps to reproduce:** Exact commands run
3. **Environment:** OS, Node version, package version
4. **Logs:** Relevant error messages (sanitize credentials!)
5. **Configuration:** Shop count, branch strategy (no credentials!)

**Example bug report:**
```markdown
**Description:** Dev server fails to start for shop-a

**Steps to reproduce:**
1. pnpm run dev
2. Select shop-a
3. Select staging

**Environment:**
- OS: macOS 14.0
- Node: 20.10.0
- Package: @shopdevs/multi-shop-cli@2.0.10
- Shopify CLI: 3.52.0

**Error:**
❌ Failed to start development server
Error: Store not found: shop-a.myshopify.com

**Configuration:**
- 5 shops configured
- Using theme-access-app authentication
- Branch: feature/new-component
```

## Prevention

Avoid common issues:

1. **Follow setup guide** - Complete all initialization steps
2. **Test on staging first** - Catch issues before production
3. **Keep credentials secure** - Never commit, use 600 permissions
4. **Update regularly** - Keep CLI and Shopify CLI current
5. **Use validation** - Run `multi-shop audit` regularly
6. **Document setup** - Team documentation prevents issues
7. **Monitor performance** - Track metrics over time

## See Also

- [Getting Started Guide](./getting-started.md) - Setup instructions
- [Security Guide](./security-guide.md) - Security best practices
- [Testing Guide](./testing-guide.md) - Testing strategies
- [Performance Guide](./performance.md) - Performance optimization
