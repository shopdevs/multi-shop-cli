---
name: Bug Report
about: Report a bug or issue with multi-shop CLI
title: '[Bug] '
labels: bug
assignees: ''
---

## Bug Description

A clear description of what the bug is.

## Steps to Reproduce

1. Run `pnpm run shop`
2. Select '...'
3. See error

## Expected Behavior

What you expected to happen.

## Actual Behavior

What actually happened (include error messages).

## Environment

- **OS:** [e.g., macOS 14.0, Windows 11, Ubuntu 22.04]
- **Node version:** [e.g., 20.10.0 - run `node --version`]
- **Package version:** [e.g., 2.2.1 - run `npx multi-shop --version`]
- **pnpm version:** [e.g., 9.0.0 - run `pnpm --version`]
- **Shopify CLI version:** [e.g., 3.50.0 - run `shopify version`]

## Configuration

```json
// Your shop config (remove sensitive info):
{
  "shopId": "example-shop",
  "name": "Example Shop",
  ...
}
```

## Logs/Output

```
Paste relevant error output or logs here
```

## Additional Context

Add any other context, screenshots, or information about the problem.

**Have you:**
- [ ] Checked existing issues for duplicates?
- [ ] Verified all dependencies are installed? (`pnpm install`)
- [ ] Tried with latest version? (`pnpm add -D @shopdevs/multi-shop-cli@latest`)
- [ ] Run `pnpm run validate` to check for issues?
