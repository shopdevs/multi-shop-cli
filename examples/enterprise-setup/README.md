# Enterprise Setup Example

Complete example of enterprise multi-shop setup with 10+ shops, teams, and governance.

## Overview

This example demonstrates:
- Managing 10+ shops at enterprise scale
- Team-based shop ownership and access control
- Governance and approval workflows
- Automated syncing and deployment
- Performance optimization for large setups

## Scenario

**Company:** Global Fashion Group
**Shops:** 12 Shopify stores across regions
**Teams:** 4 regional teams
**Scale:** 50+ developers, hundreds of deployments per month

### Shops by Region

**North America (3 shops):**
- `fashion-us` - United States
- `fashion-ca` - Canada
- `fashion-mx` - Mexico

**Europe (4 shops):**
- `fashion-uk` - United Kingdom
- `fashion-de` - Germany
- `fashion-fr` - France
- `fashion-es` - Spain

**Asia Pacific (3 shops):**
- `fashion-au` - Australia
- `fashion-jp` - Japan
- `fashion-sg` - Singapore

**Special (2 shops):**
- `fashion-outlet` - Outlet store
- `fashion-wholesale` - Wholesale B2B

## Prerequisites

- Enterprise Shopify plan
- GitHub Teams for access control
- CI/CD infrastructure (GitHub Actions)
- Multiple developers per region
- Dedicated DevOps team

## Initial Setup

### 1. Initialize Project

```bash
cd global-fashion-theme
pnpm add -D @shopdevs/multi-shop-cli
npx multi-shop init
```

### 2. Create All Shop Configurations

Create shops systematically by region:

```bash
# North America
pnpm run shop → Create New Shop (fashion-us)
pnpm run shop → Create New Shop (fashion-ca)
pnpm run shop → Create New Shop (fashion-mx)

# Europe
pnpm run shop → Create New Shop (fashion-uk)
pnpm run shop → Create New Shop (fashion-de)
pnpm run shop → Create New Shop (fashion-fr)
pnpm run shop → Create New Shop (fashion-es)

# Asia Pacific
pnpm run shop → Create New Shop (fashion-au)
pnpm run shop → Create New Shop (fashion-jp)
pnpm run shop → Create New Shop (fashion-sg)

# Special
pnpm run shop → Create New Shop (fashion-outlet)
pnpm run shop → Create New Shop (fashion-wholesale)
```

### 3. Directory Organization

Organize shops by region for clarity:

```
shops/
├── north-america/
│   ├── fashion-us.config.json
│   ├── fashion-ca.config.json
│   └── fashion-mx.config.json
├── europe/
│   ├── fashion-uk.config.json
│   ├── fashion-de.config.json
│   ├── fashion-fr.config.json
│   └── fashion-es.config.json
├── asia-pacific/
│   ├── fashion-au.config.json
│   ├── fashion-jp.config.json
│   └── fashion-sg.config.json
├── special/
│   ├── fashion-outlet.config.json
│   └── fashion-wholesale.config.json
└── credentials/
    ├── fashion-us.credentials.json
    ├── fashion-ca.credentials.json
    └── ... (12 total credential files)
```

**Note:** Move config files to subdirectories manually after creation.

## Team Structure

### GitHub Teams

Create teams for access control:

**Regional Teams:**
- `@global-fashion/team-north-america` - North America shops
- `@global-fashion/team-europe` - Europe shops
- `@global-fashion/team-asia-pacific` - Asia Pacific shops
- `@global-fashion/team-special` - Special shops

**Functional Teams:**
- `@global-fashion/core-dev` - Core theme development
- `@global-fashion/qa` - Quality assurance
- `@global-fashion/devops` - CI/CD and infrastructure

### CODEOWNERS

Set up code ownership for approval workflows:

```bash
# .github/CODEOWNERS

# Core theme requires core-dev approval
/assets/** @global-fashion/core-dev
/layout/** @global-fashion/core-dev
/sections/** @global-fashion/core-dev
/snippets/** @global-fashion/core-dev
/templates/** @global-fashion/core-dev

# North America shops
/shops/north-america/** @global-fashion/team-north-america

# Europe shops
/shops/europe/** @global-fashion/team-europe

# Asia Pacific shops
/shops/asia-pacific/** @global-fashion/team-asia-pacific

# Special shops
/shops/special/** @global-fashion/team-special

# Credentials (no one should commit these)
/shops/credentials/** @global-fashion/devops

# CI/CD workflows
/.github/workflows/** @global-fashion/devops
```

## Branch Protection Rules

Set up protection for each shop's main branches:

### Core Branch (main)

```yaml
Branch: main
Rules:
  - Require pull request reviews: 2
  - Require review from Code Owners: Yes
  - Dismiss stale reviews: Yes
  - Require status checks: Yes
    - CI tests must pass
    - Lint must pass
    - Build must pass
  - Include administrators: Yes
```

### Shop Branches (fashion-*/main)

```yaml
Branch: fashion-*/main
Rules:
  - Require pull request reviews: 1
  - Require review from Code Owners: Yes
  - Require status checks: Yes
    - Shop-specific tests must pass
  - Restrict who can push: Regional team only
```

### Staging Branches (fashion-*/staging)

```yaml
Branch: fashion-*/staging
Rules:
  - Require pull request reviews: 1
  - Require status checks: Yes
    - Staging tests must pass
```

## Deployment Workflows

### Core Feature Deployment

1. **Feature Development** (core-dev team):
```bash
git checkout -b feature/new-checkout-flow
# Develop feature...
pnpm run dev  # Test across multiple shops
```

2. **Create PR to main**:
```bash
gh pr create --base main --title "New checkout flow"
# Requires: 2 approvals from core-dev team
# Requires: All CI checks pass
```

3. **Auto-deploy to staging** (after main merge):
```yaml
# .github/workflows/deploy-to-staging.yml
# Automatically creates PRs: main → fashion-*/staging
```

4. **Regional team testing**:
- North America team tests fashion-us/staging, fashion-ca/staging, fashion-mx/staging
- Europe team tests fashion-uk/staging, fashion-de/staging, etc.
- Asia Pacific team tests fashion-au/staging, fashion-jp/staging, etc.

5. **Regional approval and production deploy**:
```bash
# Each regional team creates production PRs
gh pr create --base fashion-us/main --head fashion-us/staging
# Requires: 1 approval from team-north-america
```

### Region-Specific Deployment

For region-specific features:

```bash
# 1. Create region branch
git checkout -b fashion-eu/gdpr-compliance

# 2. Test across Europe shops
pnpm run dev  # fashion-uk, fashion-de, fashion-fr, fashion-es

# 3. Create PR to Europe shops
gh pr create --base fashion-uk/staging --title "GDPR compliance"
gh pr create --base fashion-de/staging --title "GDPR compliance"
gh pr create --base fashion-fr/staging --title "GDPR compliance"
gh pr create --base fashion-es/staging --title "GDPR compliance"

# 4. After approval, deploy to production
```

## Automated Workflows

### Shop Sync Automation

```yaml
# .github/workflows/shop-sync.yml
name: Shop Sync

on:
  push:
    branches: [main]

jobs:
  create-shop-prs:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        shop: [
          fashion-us, fashion-ca, fashion-mx,
          fashion-uk, fashion-de, fashion-fr, fashion-es,
          fashion-au, fashion-jp, fashion-sg,
          fashion-outlet, fashion-wholesale
        ]
    steps:
      - uses: actions/checkout@v4

      - name: Create PR to staging
        run: |
          gh pr create \
            --base ${{ matrix.shop }}/staging \
            --head main \
            --title "Sync main to ${{ matrix.shop }}/staging" \
            --body "Auto-sync from main" \
            --label "auto-sync"
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Automated Testing

```yaml
# .github/workflows/test-shops.yml
name: Test Shops

on:
  pull_request:
    branches: ['fashion-*/staging', 'fashion-*/main']

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Run tests
        run: pnpm test

      - name: Theme check
        run: shopify theme check

      - name: Visual regression
        run: pnpm test:visual
```

### Deployment Tracking

```yaml
# .github/workflows/track-deployments.yml
name: Track Deployments

on:
  push:
    branches: ['fashion-*/main']

jobs:
  track:
    runs-on: ubuntu-latest
    steps:
      - name: Extract shop name
        id: shop
        run: echo "name=${GITHUB_REF#refs/heads/}" | cut -d/ -f1 >> $GITHUB_OUTPUT

      - name: Log deployment
        run: |
          echo "Deployed to ${{ steps.shop.outputs.name }} at $(date)"
          # Send to monitoring system
```

## Performance Optimization

### For 10+ Shops

**1. Shop Grouping:**
```bash
# Group by status
shops/
├── active/          # Currently used shops
├── staging-only/    # Test environments only
└── archived/        # Old/unused shops
```

**2. Lazy Loading:**
```typescript
// Only load shop configs when needed
const loadShopConfig = async (shopId: string) => {
  if (!cache.has(shopId)) {
    const config = await readShopConfig(shopId);
    cache.set(shopId, config);
  }
  return cache.get(shopId);
};
```

**3. Parallel Operations:**
```bash
# Test multiple shops in parallel
pnpm run test:shops --parallel=4
```

**4. Selective Syncing:**
```bash
# Only sync specific regions
pnpm run shop → Tools → Sync Shops → Select region
```

## Governance

### Approval Matrix

| Change Type | Approvals Required | Approvers |
|-------------|-------------------|-----------|
| Core theme | 2 | @core-dev |
| Shop config | 1 | Regional team |
| Shop styling | 1 | Regional team |
| Credentials | Never allowed | N/A |
| CI/CD | 2 | @devops |

### Change Review Process

**Core Changes:**
1. Feature branch → PR to main
2. 2 approvals from @core-dev
3. All CI checks pass
4. Merge to main
5. Auto-create staging PRs
6. Regional teams test
7. Regional teams approve production PRs

**Shop-Specific Changes:**
1. Shop branch → PR to shop/staging
2. 1 approval from regional team
3. CI checks pass
4. Merge to staging
5. Test in staging
6. Create PR to shop/main
7. 1 approval from regional team
8. Deploy to production

## Monitoring and Observability

### Deployment Metrics

Track key metrics:
- Deployments per shop per week
- Average time from main to production
- PR approval time by region
- Test failure rate
- Rollback frequency

### Dashboard Example

```typescript
// scripts/deployment-dashboard.ts
import { createMultiShopCLI } from '@shopdevs/multi-shop-cli';

async function generateDashboard() {
  const context = createMultiShopCLI();
  const shops = await context.shopOps.listShops();

  console.log('Deployment Dashboard');
  console.log('===================\n');

  for (const shopId of shops.data || []) {
    const lastDeploy = await getLastDeployment(shopId);
    const prCount = await getPendingPRs(shopId);

    console.log(`${shopId}:`);
    console.log(`  Last deploy: ${lastDeploy}`);
    console.log(`  Pending PRs: ${prCount}`);
    console.log(`  Status: ${getStatus(lastDeploy, prCount)}\n`);
  }
}
```

## Security at Scale

### Credential Management

**1. Separate credentials per developer:**
```bash
shops/credentials/
├── john-doe/
│   ├── fashion-us.credentials.json
│   ├── fashion-ca.credentials.json
│   └── fashion-mx.credentials.json
├── jane-smith/
│   ├── fashion-uk.credentials.json
│   └── fashion-de.credentials.json
└── ...
```

**2. Role-based access:**
- Developers only get credentials for their region
- QA team gets staging-only credentials
- DevOps team has production access for deployment

**3. Credential rotation:**
```bash
# Automated credential rotation every 90 days
# Send reminders via GitHub Issues or Slack
```

### Security Auditing

```bash
# Regular security audits
pnpm run security:audit

# Check credentials
npx multi-shop audit

# Review access logs
scripts/audit-access.sh
```

## Disaster Recovery

### Backup Strategy

**1. Configuration backups:**
```bash
# Daily backups of shop configs
.github/workflows/backup-configs.yml
```

**2. Branch protection:**
- All shop main branches protected
- Require PRs for all changes
- Maintain Git history

**3. Rollback procedures:**
```bash
# Rollback shop to previous version
git revert HEAD
gh pr create --base fashion-us/main --title "Rollback: Description"
```

### Incident Response

**1. Critical bug in production:**
```bash
# Create hotfix from affected shop/main
git checkout fashion-us/main
git checkout -b hotfix/critical-bug

# Fix and test
pnpm run dev

# Fast-track PR (emergency approval)
gh pr create --base fashion-us/main --title "HOTFIX: Critical bug"
```

**2. Multiple shops affected:**
```bash
# Create hotfix from main
git checkout main
git checkout -b hotfix/critical-bug

# Merge to main with expedited approval
# Auto-sync to all shops via workflow
```

## Team Communication

### Notifications

**Slack Integration:**
```yaml
# .github/workflows/notify-deployments.yml
- name: Notify Slack
  uses: slackapi/slack-github-action@v1
  with:
    payload: |
      {
        "text": "Deployed to ${{ matrix.shop }}/main",
        "channel": "#deployments"
      }
  env:
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

### Status Updates

**Weekly deployment reports:**
```bash
# scripts/weekly-report.sh
# Generate report of deployments, PRs, issues
# Email to stakeholders
```

## Scaling Beyond 12 Shops

For even larger setups (20+ shops):

**1. Microservice architecture:**
- Split shop configs into separate repos
- Use monorepo tools (Nx, Turborepo)

**2. Advanced caching:**
- Cache shop configs aggressively
- Use Redis for shared cache across teams

**3. Dedicated infrastructure:**
- Dedicated CI/CD runners per region
- Regional artifact registries

**4. Advanced tooling:**
- Custom CLI extensions
- Automated PR creation tools
- Dashboard for shop management

## Next Steps

- Review [CI Integration Example](../ci-integration/README.md)
- See [API Documentation](../../docs/api/index.md)
- Read [Performance Guide](../../docs/guides/performance.md)
- Check [Security Guide](../../docs/guides/security-guide.md)

## Support

- [Documentation](../../docs/)
- [GitHub Issues](https://github.com/shopdevs/multi-shop/issues)
- Enterprise Support: enterprise@shopdevs.com
