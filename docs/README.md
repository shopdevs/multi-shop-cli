# ShopDevs Multi-Shop Documentation

Complete documentation for the ShopDevs Multi-Shop CLI package.

## Quick Links

- **[Getting Started](./guides/getting-started.md)** - Install and set up multi-shop
- **[API Reference](./api/index.md)** - Complete API documentation
- **[Examples](../examples/)** - Real-world setup examples
- **[GitHub Repository](https://github.com/shopdevs/multi-shop-cli)** - Source code and issues

## Documentation Structure

### 📚 Guides

Comprehensive guides for using multi-shop:

- **[Getting Started](./guides/getting-started.md)** - Installation, setup, and first development session
- **[Testing Guide](./guides/testing-guide.md)** - Testing strategies and examples
- **[Security Guide](./guides/security-guide.md)** - Credential management and security best practices
- **[Performance Guide](./guides/performance.md)** - Optimization and monitoring
- **[Troubleshooting](./guides/troubleshooting.md)** - Common issues and solutions

### 🔧 API Reference

Complete API documentation:

- **[API Overview](./api/index.md)** - Main exports and usage
- **[Shop Manager API](./api/shop-manager.md)** - Shop operations, credentials, and development
- **[Validation API](./api/validation.md)** - Validation rules and type guards
- **[Types Reference](./api/types.md)** - TypeScript type definitions

### 💡 Examples

Real-world examples:

- **[Basic Setup](../examples/basic-setup/README.md)** - 2 shops example
- **[Enterprise Setup](../examples/enterprise-setup/README.md)** - 10+ shops with teams and governance
- **[CI/CD Integration](../examples/ci-integration/README.md)** - GitHub Actions workflows

## What is Multi-Shop?

ShopDevs Multi-Shop transforms any Shopify theme into a sophisticated multi-shop system with:

- **Contextual Development** - One command adapts to your branch context
- **Automated Shop Syncing** - PRs auto-created when main updates
- **Campaign Tools** (v2.3.0+) - One-command campaign lifecycle management
- **Content Protection** (v2.3.0+) - Config-based safeguards against content overwrites
- **Health Check** (v2.3.0+) - Diagnostic tool for shop configuration verification
- **Secure Credentials** - Developer-specific tokens stored locally only
- **Shop Isolation** - Complete separation between shop customizations
- **Modern GitHub Flow** - Simple, PR-based development workflow

## Quick Start

```bash
# Install and initialize
cd your-shopify-theme
pnpm add -D @shopdevs/multi-shop-cli && npx multi-shop init

# Create your first shop
pnpm run shop

# Start contextual development
pnpm run dev
```

## ⚠️ Critical: Content vs Code Separation

**READ THIS FIRST:** Shopify themes contain both **code** (structure) and **content** (settings, text). Multi-shop workflows require careful separation.

### ✨ Built-In Protection

**Good news!** The CLI automatically detects content file changes and warns you:

**🚨 Cross-Shop Sync** (strict warnings + confirmation):
- Syncing `main` → `shop-a/staging`: **BLOCKS** and requires confirmation
- Syncing `feature/test` → `my-store/staging`: **BLOCKS** and requires confirmation
- Shows which content files would be overwritten
- Requires explicit confirmation to proceed

**ℹ️ Within-Shop Sync** (informational only):
- Syncing `shop-a/main` → `shop-a/staging`: Just **INFO**, no blocking
- Syncing `my-awesome-shop/promo` → `my-awesome-shop/main`: Just **INFO**
- Content changes are expected and safe

**Works for ANY shop name!** Automatically detects shop context.

### The Challenge

When you sync changes from `main` to shop branches, you risk overwriting shop-specific customizations:

**Content Files (Shop-Specific - DO NOT sync from main):**
- `config/settings_data.json` - Colors, fonts, layouts set in Theme Editor
- `templates/*.json` - Page layouts and section configurations
- `locales/*.json` - Translations and text content

**Code Files (Shared - SAFE to sync):**
- `.liquid` files - Templates, sections, snippets
- `.css`, `.js` files - Styling and interactivity
- `config/settings_schema.json` - Settings schema (not values)

### What To Do

**When you see STRICT warning (cross-shop):**
1. **Review PR carefully** before merging
2. **DO NOT merge** changes to content files
3. **ONLY merge** code file updates (.liquid, .css, .js)
4. Consider using `.gitattributes` merge strategy (see below)

**When you see SOFT info (within-shop):**
- ✅ Normal workflow, proceed as usual
- Content changes are expected within the same shop

**See:** [CONTENT-PHILOSOPHY.md](../CONTENT-PHILOSOPHY.md) for complete guide, detection logic, and advanced strategies.

---

## Core Concepts

### Contextual Development

The CLI automatically adapts to your branch context:

**Feature Branches** (`feature/name`):
- Prompts for shop selection
- Test across multiple shops
- Code stays on feature branch

**Shop Branches** (`shop-a/name`):
- Auto-detects shop context
- Starts immediately
- Shop-specific development

### Branch Strategy

```
main (core theme)
├── feature/carousel-fix         # Contextual development
├── hotfix/critical-bug          # Emergency fixes
│
├── shop-a/main                  # Connected to shop-a
│   ├── shop-a/staging           # Connected to staging-shop-a
│   └── shop-a/promo-summer      # Campaign branches
│
└── shop-b/main                  # Connected to shop-b
    ├── shop-b/staging           # Connected to staging-shop-b
    └── shop-b/promo-holiday     # Campaign branches
```

### Security Model

**Configuration** (committed):
- Shop ID, name, domains
- Branch names
- Authentication method
- NO credentials

**Credentials** (local only):
- Developer name
- Theme access tokens
- Never committed
- 600 permissions (Unix/macOS/Linux)

## Common Use Cases

### Core Feature Development

Build features that apply to all shops:

1. Create feature branch from main
2. Test across different shop contexts
3. Create PR directly to main (GitHub Flow)
4. Use Tools → Sync Shops to deploy to all shops

### Shop-Specific Customization

Build features for one shop only:

1. Create shop-specific branch
2. Auto-detected contextual development
3. Create PR to shop's main branch
4. Deploy to that shop only

### Campaign Management (v2.3.0+)

Run promotions and campaigns with automated tools:

1. **Create Promo Branch** - One command creates campaign branch
2. **Connect to Shopify** - Link branch to preview theme
3. **Customize** - Edit in Shopify admin (auto-syncs)
4. **Launch** - Publish campaign theme
5. **Push to Main** - One command creates PR to merge content back
6. **List Promos** - See all active campaigns across shops
7. **End Promo** - Clean up after campaign completes

## Architecture

### Package Structure

- **Pure Functions** - All operations as composable functions
- **Immutable Data** - Readonly interfaces throughout
- **Result Types** - Elegant error handling without exceptions
- **Dependency Injection** - Testable, maintainable design
- **Type Safety** - Strict TypeScript with full type coverage

### Technology Stack

- **TypeScript 5.3+** - Strict typing with enterprise configuration
- **Vitest** - Fast testing with native ES module support
- **Commander.js** - Professional CLI framework
- **@clack/prompts** - Beautiful interactive CLI interfaces
- **AJV** - JSON schema validation for security

## Documentation Standards

All documentation follows these principles:

1. **Clear Examples** - Every concept includes working code examples
2. **Practical Focus** - Real-world scenarios and workflows
3. **Complete Coverage** - Every feature and API documented
4. **Cross-Referenced** - Easy navigation between related topics
5. **Actionable** - Step-by-step instructions you can follow

## Getting Help

### Documentation

Start with the guides based on your needs:

- **New to multi-shop?** Start with [Getting Started](./guides/getting-started.md)
- **Setting up CI/CD?** See [CI Integration Example](../examples/ci-integration/README.md)
- **Large team?** Check [Enterprise Setup Example](../examples/enterprise-setup/README.md)
- **Hitting issues?** Read [Troubleshooting Guide](./guides/troubleshooting.md)
- **API usage?** Browse [API Reference](./api/index.md)

### Community

- **GitHub Issues** - [Report bugs](https://github.com/shopdevs/multi-shop-cli/issues)
- **GitHub Discussions** - [Ask questions](https://github.com/shopdevs/multi-shop-cli/discussions)
- **Examples** - Real-world setups in `/examples` directory

### Support

- **Email Support** - support@shopdevs.com
- **Security Issues** - security@shopdevs.com
- **Enterprise Support** - enterprise@shopdevs.com

## Contributing

We welcome contributions! See [CONTRIBUTING.md](../CONTRIBUTING.md) for:

- Code of conduct
- Development setup
- Coding standards
- Pull request process
- Testing requirements

## License

MIT License - see [LICENSE](../LICENSE) file for details.

## Changelog

See [CHANGELOG.md](../CHANGELOG.md) for version history and release notes.

## Related Documentation

- **[README.md](../README.md)** - Main package readme
- **[WORKFLOWS.md](../WORKFLOWS.md)** - Complete workflow documentation
- **[CLAUDE.md](../CLAUDE.md)** - Development guidance for Claude Code
- **[VERSIONING.md](../VERSIONING.md)** - Version management
- **[SECURITY.md](../SECURITY.md)** - Security policy

---

**Need something specific?** Use the search function or browse by topic:

- [Installation & Setup](./guides/getting-started.md#installation)
- [Shop Configuration](./guides/getting-started.md#create-your-first-shop)
- [Credential Management](./guides/security-guide.md#credential-management)
- [Development Workflows](./guides/getting-started.md#development-workflows)
- [Testing Strategies](./guides/testing-guide.md)
- [Performance Optimization](./guides/performance.md)
- [API Reference](./api/index.md)
- [Type Definitions](./api/types.md)
- [Validation Rules](./api/validation.md)

---

**Version:** 2.0.10
**Last Updated:** 2025-10-27
**Status:** Complete A+ Documentation
