# Security Guide

Complete guide to security features, credential management, and best practices.

## Overview

ShopDevs Multi-Shop implements multiple layers of security to protect your Shopify credentials and prevent unauthorized access. This guide covers all security features and best practices.

## Security Model

### Principle: Separation of Configuration and Credentials

**Configuration Files** (committed to Git):
```
shops/shop-a.config.json       ✓ Safe to commit
shops/shop-b.config.json       ✓ Safe to commit
```

**Credential Files** (local only, never committed):
```
shops/credentials/shop-a.credentials.json    ✗ Never committed
shops/credentials/shop-b.credentials.json    ✗ Never committed
```

### Why This Matters

- **Team Collaboration:** Configurations are shared across the team
- **Developer Privacy:** Each developer uses their own credentials
- **Security:** Credentials never leave local machines
- **Audit Trail:** Configuration changes are tracked in Git
- **Access Control:** Each developer can have different access levels

## Credential Management

### Storage Location

Credentials are stored in `shops/credentials/` directory:

```
project-root/
├── shops/
│   ├── shop-a.config.json          # Committed
│   ├── shop-b.config.json          # Committed
│   └── credentials/
│       ├── shop-a.credentials.json # .gitignored
│       └── shop-b.credentials.json # .gitignored
```

### File Permissions

Credential files are automatically protected:

**Unix/Linux/macOS:**
```bash
# Automatically set to 600 (owner read/write only)
-rw------- shop-a.credentials.json
```

**Windows:**
```bash
# Protected with appropriate ACLs
```

**Manual Fix (if needed):**
```bash
chmod 600 shops/credentials/*.credentials.json
```

### Git Protection

Credentials are automatically excluded from Git:

```gitignore
# .gitignore (created by init)
shops/credentials/
*.credentials.json
```

**Verify protection:**
```bash
git status
# Should NOT show credential files

git ls-files shops/credentials/
# Should return nothing
```

### Credential Format

**Theme Access App (Recommended):**
```json
{
  "developer": "john-doe",
  "shopify": {
    "stores": {
      "production": {
        "themeToken": "tkat_abc123xyz789"
      },
      "staging": {
        "themeToken": "tkat_def456uvw012"
      }
    }
  },
  "notes": "Theme access app credentials"
}
```

**Manual Tokens:**
```json
{
  "developer": "john-doe",
  "shopify": {
    "stores": {
      "production": {
        "themeToken": "shptka_1234567890abcdef"
      },
      "staging": {
        "themeToken": "shptka_fedcba0987654321"
      }
    }
  },
  "notes": "Manual theme passwords"
}
```

## Security Features

### 1. Path Traversal Protection

Prevents directory traversal attacks:

```typescript
// Blocked attempts:
loadConfig('../../../etc/passwd')     // ✗ Rejected
loadConfig('/etc/passwd')             // ✗ Rejected
loadConfig('../../.ssh/id_rsa')       // ✗ Rejected

// Valid usage:
loadConfig('shop-a')                  // ✓ Allowed
loadConfig('my-store')                // ✓ Allowed
```

**Implementation:**
- Shop IDs validated against strict pattern
- Absolute and relative paths rejected
- All file operations use safe path joins

### 2. Input Validation

All inputs validated before processing:

```typescript
// Shop ID validation
isValidShopId('shop-a')           // true
isValidShopId('../../passwd')     // false
isValidShopId('<script>')         // false

// Domain validation
isValidDomain('shop.myshopify.com')    // true
isValidDomain('evil.com')              // false
isValidDomain('shop.myshopify.com; curl evil.com')  // false

// Branch validation
isValidBranchName('shop-a/main')       // true
isValidBranchName('shop; rm -rf /')    // false
```

### 3. Credential Sanitization

Credentials never appear in logs or errors:

```typescript
// Safe error messages
try {
  await loadCredentials('shop-a');
} catch (error) {
  // Message: "Failed to load credentials"
  // Does NOT contain: actual tokens or passwords
}
```

### 4. Safe File Operations

All file operations use secure patterns:

```typescript
// Safe path construction
const configPath = path.join(shopsDir, `${shopId}.config.json`);

// Safe file reading (size limits)
const maxSize = 1024 * 1024;  // 1MB limit
const content = await fs.readFile(configPath, 'utf-8');

// Safe JSON parsing (validation)
const parsed = JSON.parse(content);
validateShopConfig(parsed);
```

### 5. Cross-Platform Security

Works securely across all platforms:

**Unix/Linux/macOS:**
- File permissions: 600 (owner only)
- Symbolic link protection
- Path traversal prevention

**Windows:**
- ACL-based protection
- Path separator handling
- Drive letter validation

## Content Protection System (v2.3.0+)

### What is Content Protection?

Content Protection prevents accidental overwrites of shop-specific customizations when syncing code changes across shops. It's a config-based safety system that detects content file modifications and blocks or warns before potentially destructive operations.

**Content files include:**
- `config/settings_data.json` - Theme settings (colors, fonts, layouts)
- `templates/*.json` - Page layouts and section configurations
- `locales/*.json` - Translations and text content

### Three Protection Modes

**Strict Mode** (recommended for production):
```bash
# Blocks cross-shop content syncs completely
# Requires typing 'OVERRIDE' to proceed
# Use when you want maximum protection
```

**Warn Mode** (default):
```bash
# Shows warning with content file list
# Requires confirmation (y/n)
# Good balance of safety and flexibility
```

**Off Mode**:
```bash
# No protection, content syncs freely
# Use for testing or when protection not needed
```

### Smart Cross-Shop Detection

Content Protection uses smart detection to distinguish between risky cross-shop operations and safe within-shop operations:

**Cross-Shop Sync (BLOCKED in strict mode):**
```bash
main → shop-a/staging           # ⛔ Different shops, strict protection
feature/test → shop-b/main      # ⛔ Different shops, strict protection
```

**Within-Shop Sync (INFO only):**
```bash
shop-a/main → shop-a/staging    # ✅ Same shop, just informational
shop-a/promo → shop-a/main      # ✅ Same shop, just informational
my-store/dev → my-store/test    # ✅ Same shop, just informational
```

This works for ANY shop name pattern - the system automatically detects the shop prefix and determines context.

### Configuration

**Per-Shop Settings:**

Each shop can have its own content protection settings in `shops/{shopId}.config.json`:

```json
{
  "shopId": "shop-a",
  "name": "Shop A",
  "contentProtection": {
    "enabled": true,
    "mode": "strict",
    "verbosity": "verbose"
  }
}
```

**Global Defaults:**

Set defaults for all shops in `shops/settings.json`:

```json
{
  "contentProtection": {
    "defaultMode": "warn",
    "defaultVerbosity": "verbose"
  }
}
```

### Using Content Protection Tools

**View Protection Status:**
```bash
pnpm run shop → Tools → Content Protection → Show Protection Status
# Shows protection status for all shops
```

**Configure Individual Shop:**
```bash
pnpm run shop → Tools → Content Protection → Configure Shop Protection
# → Select shop
# → Enable/Disable
# → Choose mode (strict/warn/off)
# → Choose verbosity (verbose/quiet)
```

**Enable All Shops:**
```bash
pnpm run shop → Tools → Content Protection → Enable All Shops
# Enables protection for every shop
```

**Disable All Shops:**
```bash
pnpm run shop → Tools → Content Protection → Disable All Shops
# Removes protection from every shop
```

**Configure Global Defaults:**
```bash
pnpm run shop → Tools → Content Protection → Global Settings
# Set default mode and verbosity for new shops
```

### Bypassing Strict Mode

When you encounter strict mode protection and need to proceed:

```bash
🚨 STRICT MODE: Content Protection Enabled

The following content files would be modified:
  - config/settings_data.json
  - templates/index.json

Type 'OVERRIDE' to bypass protection: OVERRIDE
```

This ensures you're making an intentional decision to sync content files.

### Best Practices

1. **Enable strict mode for production shops** - Maximum protection
2. **Use warn mode for staging** - Balance of safety and speed
3. **Review content files carefully** before syncing cross-shop
4. **Use within-shop syncs freely** - Protection is smart about context
5. **Configure global defaults** - Consistent protection across team

### Troubleshooting Content Protection

**"Content protection blocking my sync"**
- Check if it's a cross-shop sync (main → shop-a) vs within-shop (shop-a → shop-a)
- Review the content files listed - are they actually shop-specific?
- Consider changing mode to 'warn' if strict is too aggressive
- Type 'OVERRIDE' if you're certain the sync is safe

**"I want to disable protection temporarily"**
```bash
pnpm run shop → Tools → Content Protection → Configure Shop Protection
# → Select shop → Disable
```

**"How do I know if protection is working?"**
```bash
pnpm run shop → Tools → Health Check → Check Single Shop
# Shows content protection status in health report
```

## Security Audit

Run security audits to verify credential safety:

```bash
# Run security audit
npx multi-shop audit
```

**Audit Output:**
```
🔒 Security Audit Report

Checking credential files...

✓ shop-a
  - File permissions: 600 (secure)
  - Last modified: 2024-03-15
  - Production credentials: present
  - Staging credentials: present
  - Integrity: valid

✓ shop-b
  - File permissions: 600 (secure)
  - Last modified: 2024-03-18
  - Production credentials: present
  - Staging credentials: present
  - Integrity: valid

Summary:
- Total shops: 2
- Secure files: 2
- Issues found: 0
- Recommendations: All credentials secure

✅ Security audit passed
```

**Issue Detection:**
```
⚠ shop-c
  - File permissions: 644 (insecure)
  - Recommendation: Run chmod 600 shops/credentials/shop-c.credentials.json

❌ shop-d
  - File permissions: 777 (highly insecure!)
  - Recommendation: Run chmod 600 shops/credentials/shop-d.credentials.json

Summary:
- Total shops: 4
- Secure files: 2
- Issues found: 2
- Recommendations: Fix file permissions

⚠ Security audit found issues
```

## Best Practices

### 1. Never Commit Credentials

**Always check before committing:**
```bash
git status
# Ensure no .credentials.json files listed

git diff --staged
# Verify no credentials in diff
```

**Set up pre-commit hook:**
```bash
# .git/hooks/pre-commit
#!/bin/bash
if git diff --cached --name-only | grep -q "credentials"; then
  echo "Error: Attempting to commit credential files!"
  exit 1
fi
```

### 2. Use Theme Access App

Theme Access App is more secure than manual tokens:

**Advantages:**
- Tokens can be revoked
- Per-developer access control
- Audit trail of token usage
- Automatic token rotation

**Setup:**
1. Install Theme Access app in Shopify store
2. Generate tokens for each developer
3. Use tokens in credential files

### 3. Rotate Credentials Regularly

**Rotation Schedule:**
- Every 90 days (normal)
- Immediately after developer leaves team
- Immediately if credentials compromised

**Rotation Process:**
```bash
# 1. Generate new tokens in Shopify
# 2. Update credential file
vim shops/credentials/shop-a.credentials.json

# 3. Test new credentials
pnpm run dev

# 4. Confirm working, secure old credentials
```

### 4. Separate Production and Staging

Use different credentials for each environment:

```json
{
  "developer": "john-doe",
  "shopify": {
    "stores": {
      "production": {
        "themeToken": "prod_token_here"  // Different token
      },
      "staging": {
        "themeToken": "staging_token_here"  // Different token
      }
    }
  }
}
```

**Benefits:**
- Limit blast radius of compromised credentials
- Prevent accidental production changes
- Enable separate access control

### 5. Use Staging First

Always test on staging before production:

```bash
# Good practice
pnpm run dev
# → Select staging environment

# Avoid (unless necessary)
pnpm run dev
# → Select production environment
```

### 6. Secure Your Development Machine

Credential files are only as secure as your machine:

- **Use disk encryption** (FileVault, BitLocker)
- **Use strong passwords**
- **Enable firewall**
- **Keep OS updated**
- **Use antivirus software**
- **Lock screen when away**

### 7. Use .env for CI/CD

For CI/CD pipelines, use environment variables:

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [shop-a/main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to Shopify
        env:
          SHOPIFY_TOKEN: ${{ secrets.SHOP_A_THEME_TOKEN }}
          SHOPIFY_STORE: shop-a.myshopify.com
        run: |
          shopify theme push --store=$SHOPIFY_STORE
```

**Store secrets in GitHub:**
1. Repository Settings → Secrets and variables → Actions
2. Add `SHOP_A_THEME_TOKEN` (never in code)

## Security Checklist

Use this checklist for security review:

**Credential Protection:**
- [ ] Credentials in `shops/credentials/` directory
- [ ] Credentials excluded in `.gitignore`
- [ ] File permissions set to 600 (Unix/macOS/Linux)
- [ ] No credentials in configuration files
- [ ] No credentials in code or scripts

**Access Control:**
- [ ] Each developer has own credentials
- [ ] Production and staging use separate tokens
- [ ] Theme Access App used (not manual tokens)
- [ ] Credentials rotated every 90 days
- [ ] Old credentials revoked after rotation

**Development:**
- [ ] Staging environment used for testing
- [ ] No credentials in logs or errors
- [ ] Pre-commit hooks prevent credential commits
- [ ] Security audit runs regularly

**CI/CD:**
- [ ] GitHub Secrets used for deployment
- [ ] No credentials in workflow files
- [ ] Deployment tokens have minimum required permissions

## Security Incidents

### If Credentials Are Compromised

**Immediate Actions:**
1. **Revoke compromised credentials** in Shopify Admin
2. **Generate new credentials** for all affected developers
3. **Update credential files** with new tokens
4. **Test new credentials** work correctly
5. **Review Git history** for accidental commits
6. **Check access logs** in Shopify for suspicious activity

**Prevention:**
```bash
# Check if credentials were committed
git log --all --full-history -- "*.credentials.json"

# If found, remove from history (WARNING: rewrites history)
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch shops/credentials/*.credentials.json" \
  --prune-empty --tag-name-filter cat -- --all

# Force push (coordinate with team!)
git push --force --all
```

### If Credentials Leak in Logs

**Immediate Actions:**
1. **Rotate compromised credentials**
2. **Clear log files** containing credentials
3. **Update logging** to sanitize credentials
4. **Review other logs** for similar leaks

## NPM Security

Keep dependencies secure:

```bash
# Regular security audits
pnpm run security:audit

# Check for outdated dependencies
pnpm run security:outdated

# Update dependencies
pnpm update

# Fix vulnerabilities
npm audit fix
```

## Compliance

### GDPR Considerations

Credential files may contain personal information (developer names):

- Credentials stored locally only (not in cloud)
- Each developer controls their own credentials
- Credentials deleted when developer leaves (local files)

### SOC 2 Considerations

For SOC 2 compliance:

- Enable audit logging
- Implement credential rotation policy
- Document access control procedures
- Regular security audits
- Incident response plan

## Security Resources

### Documentation

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Shopify Security Best Practices](https://shopify.dev/docs/apps/best-practices/security)
- [Node.js Security Checklist](https://nodejs.org/en/docs/guides/security/)

### Tools

- **npm audit** - Dependency vulnerability scanning
- **Snyk** - Advanced security scanning
- **git-secrets** - Prevent committing secrets
- **truffleHog** - Find secrets in Git history

### Reporting Issues

Found a security issue? Report responsibly:

- **Email:** security@shopdevs.com
- **GitHub:** Security Advisory (private)
- **Do NOT:** Create public GitHub issues for security vulnerabilities

## See Also

- [Testing Guide](./testing-guide.md) - Security testing
- [API Documentation](../api/index.md) - API security features
- [Performance Guide](./performance.md) - Performance without security trade-offs
- [Troubleshooting](./troubleshooting.md) - Security-related issues
