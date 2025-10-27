# CI/CD Integration Example

Complete examples of CI/CD integration with GitHub Actions for automated multi-shop workflows.

## Overview

This example demonstrates:
- Automated testing across all shops
- Automated PR creation for shop syncing
- Deployment workflows for each shop
- Quality gates and validation
- Performance monitoring
- Security scanning

## Prerequisites

- GitHub repository with GitHub Actions enabled
- Shop configurations set up
- GitHub Secrets configured for deployment
- Understanding of GitHub Actions workflows

## GitHub Secrets Setup

Configure these secrets in your repository:

```bash
# For each shop, add theme tokens as secrets:
# Settings → Secrets and variables → Actions → New repository secret

# Production tokens
FASHION_US_PROD_TOKEN=shptka_...
FASHION_CA_PROD_TOKEN=shptka_...

# Staging tokens
FASHION_US_STAGING_TOKEN=shptka_...
FASHION_CA_STAGING_TOKEN=shptka_...

# GitHub token for PR creation
GITHUB_TOKEN=ghp_...  # Automatically provided by GitHub Actions
```

## Complete Workflow Examples

### 1. Continuous Integration

Test every PR across all shops:

```yaml
# .github/workflows/ci.yml
name: CI

on:
  pull_request:
    branches: ['**']
  push:
    branches: [main]

jobs:
  # Code quality checks
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Run linter
        run: pnpm run lint

      - name: Type check
        run: pnpm run typecheck

      - name: Format check
        run: pnpm run format:check

  # Unit tests
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20, 22]
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Run tests
        run: pnpm test

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json

  # Shopify theme check
  theme-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Shopify CLI
        run: npm install -g @shopify/cli

      - name: Theme check
        run: shopify theme check

  # Build validation
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Build
        run: pnpm run build

      - name: Check package size
        run: pnpm run size-check

  # Security scanning
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Security audit
        run: pnpm run security:audit

      - name: Check for secrets
        uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          base: ${{ github.event.repository.default_branch }}
          head: HEAD
```

### 2. Automated Shop Sync

Automatically create PRs to sync main to shop staging branches:

```yaml
# .github/workflows/shop-sync.yml
name: Shop Sync

on:
  push:
    branches: [main]
  workflow_dispatch:  # Allow manual trigger
    inputs:
      shops:
        description: 'Comma-separated shop IDs to sync (leave empty for all)'
        required: false
        default: ''

jobs:
  sync-shops:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        shop: [fashion-us, fashion-ca, fashion-mx, fashion-uk]
      fail-fast: false
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Full history for proper diff

      - name: Check if shop should be synced
        id: should-sync
        run: |
          SHOPS_INPUT="${{ github.event.inputs.shops }}"
          if [ -z "$SHOPS_INPUT" ]; then
            echo "sync=true" >> $GITHUB_OUTPUT
          elif echo "$SHOPS_INPUT" | grep -q "${{ matrix.shop }}"; then
            echo "sync=true" >> $GITHUB_OUTPUT
          else
            echo "sync=false" >> $GITHUB_OUTPUT
          fi

      - name: Create sync PR
        if: steps.should-sync.outputs.sync == 'true'
        run: |
          gh pr create \
            --base ${{ matrix.shop }}/staging \
            --head main \
            --title "Sync main to ${{ matrix.shop }}/staging" \
            --body "$(cat <<'EOF'
          ## Auto-sync from main

          This PR syncs the latest changes from main to ${{ matrix.shop }}/staging.

          ### Changes
          $(git log --oneline ${{ matrix.shop }}/staging..main | head -10)

          ### Checklist
          - [ ] Review changes for ${{ matrix.shop }}
          - [ ] Test in staging environment
          - [ ] Approve and merge

          ---
          🤖 Auto-generated by shop-sync workflow
          EOF
          )" \
            --label "auto-sync" \
            --label "shop:${{ matrix.shop }}"
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        continue-on-error: true  # Don't fail if PR already exists
```

### 3. Deployment Workflows

Deploy themes to Shopify stores:

```yaml
# .github/workflows/deploy-staging.yml
name: Deploy to Staging

on:
  push:
    branches: ['fashion-*/staging']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Extract shop ID
        id: shop
        run: |
          BRANCH="${GITHUB_REF#refs/heads/}"
          SHOP_ID="${BRANCH%%/*}"
          echo "id=$SHOP_ID" >> $GITHUB_OUTPUT

      - name: Install Shopify CLI
        run: npm install -g @shopify/cli

      - name: Deploy to staging
        env:
          SHOPIFY_CLI_THEME_TOKEN: ${{ secrets[format('{0}_STAGING_TOKEN', steps.shop.outputs.id)] }}
        run: |
          shopify theme push \
            --store=${{ steps.shop.outputs.id }}.myshopify.com \
            --theme=staging \
            --unpublished

      - name: Comment on PR
        uses: actions/github-script@v7
        with:
          script: |
            const { repo, owner } = context.repo;
            const sha = context.sha;

            // Find PR for this commit
            const prs = await github.rest.pulls.list({
              owner,
              repo,
              state: 'open',
              head: `${owner}:${context.ref}`
            });

            if (prs.data.length > 0) {
              const pr = prs.data[0];
              await github.rest.issues.createComment({
                owner,
                repo,
                issue_number: pr.number,
                body: '✅ Deployed to staging: https://${{ steps.shop.outputs.id }}.myshopify.com'
              });
            }
```

```yaml
# .github/workflows/deploy-production.yml
name: Deploy to Production

on:
  push:
    branches: ['fashion-*/main']

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production  # Requires manual approval
    steps:
      - uses: actions/checkout@v4

      - name: Extract shop ID
        id: shop
        run: |
          BRANCH="${GITHUB_REF#refs/heads/}"
          SHOP_ID="${BRANCH%%/*}"
          echo "id=$SHOP_ID" >> $GITHUB_OUTPUT

      - name: Install Shopify CLI
        run: npm install -g @shopify/cli

      - name: Deploy to production
        env:
          SHOPIFY_CLI_THEME_TOKEN: ${{ secrets[format('{0}_PROD_TOKEN', steps.shop.outputs.id)] }}
        run: |
          shopify theme push \
            --store=${{ steps.shop.outputs.id }}.myshopify.com \
            --theme=production \
            --publish

      - name: Create deployment record
        uses: actions/github-script@v7
        with:
          script: |
            await github.rest.repos.createDeployment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              ref: context.sha,
              environment: 'production',
              description: 'Deploy to ${{ steps.shop.outputs.id }}'
            });

      - name: Notify Slack
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": "🚀 Deployed to production: ${{ steps.shop.outputs.id }}",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*Deployment Complete* 🚀\n\n*Shop:* ${{ steps.shop.outputs.id }}\n*Branch:* ${{ github.ref }}\n*Commit:* ${{ github.sha }}\n*Author:* ${{ github.actor }}"
                  }
                }
              ]
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

### 4. Performance Testing

Monitor performance across shops:

```yaml
# .github/workflows/performance.yml
name: Performance Testing

on:
  pull_request:
    branches: [main, 'fashion-*/staging']
  schedule:
    - cron: '0 0 * * 0'  # Weekly on Sunday

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        shop: [fashion-us, fashion-ca]
    steps:
      - uses: actions/checkout@v4

      - name: Run Lighthouse CI
        uses: treosh/lighthouse-ci-action@v10
        with:
          urls: |
            https://${{ matrix.shop }}.myshopify.com
          uploadArtifacts: true
          temporaryPublicStorage: true

      - name: Comment results
        uses: actions/github-script@v7
        if: github.event_name == 'pull_request'
        with:
          script: |
            // Post Lighthouse results to PR
            const fs = require('fs');
            const results = JSON.parse(fs.readFileSync('.lighthouseci/manifest.json'));
            // Format and post comment...

  bundle-size:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Check bundle size
        uses: andresz1/size-limit-action@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
```

### 5. Visual Regression Testing

Catch visual changes:

```yaml
# .github/workflows/visual-regression.yml
name: Visual Regression

on:
  pull_request:
    branches: ['fashion-*/staging']

jobs:
  visual-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install dependencies
        run: pnpm install

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: Run visual tests
        run: pnpm test:visual

      - name: Upload screenshots
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: visual-diff
          path: test-results/
```

### 6. Automated Rollback

Automatically rollback on errors:

```yaml
# .github/workflows/rollback.yml
name: Rollback

on:
  workflow_dispatch:
    inputs:
      shop:
        description: 'Shop to rollback'
        required: true
        type: choice
        options:
          - fashion-us
          - fashion-ca
          - fashion-mx
      commit:
        description: 'Commit SHA to rollback to (leave empty for previous)'
        required: false

jobs:
  rollback:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Determine rollback target
        id: target
        run: |
          if [ -z "${{ github.event.inputs.commit }}" ]; then
            COMMIT=$(git log --format=%H -n 2 ${{ github.event.inputs.shop }}/main | tail -1)
          else
            COMMIT="${{ github.event.inputs.commit }}"
          fi
          echo "commit=$COMMIT" >> $GITHUB_OUTPUT

      - name: Create rollback PR
        run: |
          git checkout ${{ steps.target.outputs.commit }}
          git checkout -b rollback-${{ github.event.inputs.shop }}-$(date +%s)
          git push -u origin HEAD

          gh pr create \
            --base ${{ github.event.inputs.shop }}/main \
            --title "ROLLBACK: ${{ github.event.inputs.shop }}" \
            --body "Rolling back to commit ${{ steps.target.outputs.commit }}" \
            --label "rollback"
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Quality Gates

Set up required checks in branch protection:

```yaml
# .github/workflows/quality-gate.yml
name: Quality Gate

on:
  pull_request:
    branches: [main, 'fashion-*/main']

jobs:
  quality-gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - name: Install
        run: pnpm install

      - name: Validate
        run: pnpm run validate  # lint + typecheck + test

      - name: Check coverage
        run: |
          pnpm test --coverage
          COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')
          if (( $(echo "$COVERAGE < 80" | bc -l) )); then
            echo "Coverage $COVERAGE% is below 80%"
            exit 1
          fi

      - name: Check for breaking changes
        run: |
          # Add logic to detect breaking changes
          echo "Checking for breaking changes..."
```

## Monitoring and Alerts

### Deployment Monitoring

```yaml
# .github/workflows/monitor-deployments.yml
name: Monitor Deployments

on:
  push:
    branches: ['fashion-*/main']

jobs:
  monitor:
    runs-on: ubuntu-latest
    steps:
      - name: Check deployment health
        run: |
          # Wait for deployment to complete
          sleep 60

          # Check store health
          SHOP_ID="${GITHUB_REF#refs/heads/}"
          SHOP_ID="${SHOP_ID%%/*}"

          STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
            "https://$SHOP_ID.myshopify.com")

          if [ "$STATUS" -ne 200 ]; then
            echo "Store health check failed: $STATUS"
            exit 1
          fi

      - name: Alert on failure
        if: failure()
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": "🚨 Deployment health check failed for ${{ github.ref }}"
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

## Best Practices

### 1. Use Matrix Strategy

Test across multiple shops in parallel:

```yaml
strategy:
  matrix:
    shop: [fashion-us, fashion-ca, fashion-mx]
    node-version: [18, 20]
  fail-fast: false  # Continue testing other shops if one fails
```

### 2. Cache Dependencies

Speed up workflows:

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: 20
    cache: 'pnpm'  # Automatically caches pnpm store
```

### 3. Conditional Execution

Only run when needed:

```yaml
- name: Deploy
  if: github.ref == 'refs/heads/main' && github.event_name == 'push'
  run: pnpm run deploy
```

### 4. Use Environments

Require approval for production:

```yaml
jobs:
  deploy-prod:
    environment: production  # Requires approval in Settings
    steps:
      - name: Deploy
        run: pnpm run deploy:prod
```

### 5. Artifact Management

Save build artifacts:

```yaml
- name: Build theme
  run: pnpm run build

- name: Upload artifact
  uses: actions/upload-artifact@v3
  with:
    name: theme-${{ matrix.shop }}
    path: dist/
```

## Troubleshooting CI/CD

### Workflow not triggering

**Check:**
- Workflow file syntax (use `yamllint`)
- Branch name matches trigger pattern
- Workflow is enabled in Settings

### Secret not found

**Solution:**
```bash
# Verify secret exists
# Settings → Secrets and variables → Actions

# Use uppercase and underscores
# Good: FASHION_US_PROD_TOKEN
# Bad: fashion-us-prod-token
```

### Permission denied

**Solution:**
```yaml
permissions:
  contents: write
  pull-requests: write
  issues: write
```

## Example Repository Structure

```
your-theme/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml
│   │   ├── shop-sync.yml
│   │   ├── deploy-staging.yml
│   │   ├── deploy-production.yml
│   │   ├── performance.yml
│   │   ├── visual-regression.yml
│   │   └── rollback.yml
│   └── CODEOWNERS
├── shops/
│   ├── fashion-us.config.json
│   ├── fashion-ca.config.json
│   └── credentials/
│       └── .gitkeep
├── scripts/
│   ├── deploy.sh
│   ├── rollback.sh
│   └── health-check.sh
└── package.json
```

## Next Steps

- Review [Enterprise Setup Example](../enterprise-setup/README.md)
- See [Testing Guide](../../docs/guides/testing-guide.md)
- Read [Security Guide](../../docs/guides/security-guide.md)
- Check [Performance Guide](../../docs/guides/performance.md)

## Support

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Shopify CLI Documentation](https://shopify.dev/docs/themes/tools/cli)
- [Project Documentation](../../docs/)
- Email: support@shopdevs.com
