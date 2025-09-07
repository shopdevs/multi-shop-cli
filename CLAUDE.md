# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with the ShopDevs Multi-Shop NPM package.

## Package Overview

ShopDevs Multi-Shop is an enterprise-grade NPM package that adds contextual development and automated shop management capabilities to any Shopify theme. It enables teams to manage multiple Shopify stores from a single theme codebase using a sophisticated branch-per-shop architecture.

## Development Commands

### Essential Commands

```bash
# Build the package
npm run build                # TypeScript compilation to dist/

# Development mode
npm run dev                  # TypeScript watch mode

# Testing
npm run test                 # Vitest with coverage
npm run test:watch           # Vitest watch mode
npm run test:ui              # Beautiful Vitest UI

# Quality checks
npm run lint                 # ESLint with TypeScript and security rules
npm run typecheck           # TypeScript type checking
npm run format              # Prettier formatting
npm run validate            # Lint + typecheck + test (pre-publish gate)

# Package management
npm run clean               # Remove dist/ folder
npm run size-check          # Check package size
npm run docs:build          # Generate TypeDoc documentation
npm run release             # Automated release with np
```

### Security and Auditing

```bash
npm run security:audit      # NPM security audit
npm run security:outdated   # Check for outdated dependencies
```

## Architecture

### Package Structure

```
src/
├── bin/multi-shop.ts              # CLI entry point with Commander.js
├── lib/
│   ├── index.ts                   # Main package exports
│   ├── ShopManager.ts             # Core shop management functionality
│   ├── ContextualDev.ts           # Branch detection and routing
│   ├── ContextualShopManager.ts   # Feature branch development
│   ├── Initializer.ts             # Project initialization
│   ├── SyncMain.ts                # Git sync operations
│   ├── TestRunner.ts              # PR testing functionality
│   ├── core/
│   │   ├── SecurityManager.ts     # Credential security and auditing
│   │   ├── GitOperations.ts       # Git operations with error handling
│   │   ├── Logger.ts              # Structured logging system
│   │   └── PerformanceMonitor.ts  # Performance tracking and SLAs
│   ├── validators/
│   │   └── ShopConfigValidator.ts # JSON schema validation
│   └── errors/
│       └── ShopError.ts           # Custom error hierarchy
├── types/shop.ts                  # Comprehensive TypeScript definitions
└── __tests__/                     # Vitest test suite
```

### Technology Stack

- **TypeScript 5.3+** - Strict typing with enterprise configuration
- **Vitest** - Fast testing with native ES module support
- **Commander.js** - Professional CLI framework
- **@clack/prompts** - Beautiful interactive CLI interfaces
- **AJV** - JSON schema validation for security
- **ESLint** - Code quality with security and TypeScript rules

### Design Principles

1. **Type Safety First** - Every function, parameter, and return value is strictly typed
2. **Security by Design** - Credentials never exposed, comprehensive validation
3. **Performance Monitoring** - Built-in SLA tracking and memory monitoring
4. **Error Context** - Rich error information for debugging without exposing secrets
5. **Developer Experience** - Beautiful CLI with helpful prompts and guidance

## Key Implementation Details

### TypeScript Patterns

- **Branded Types** - ShopId, DomainName, ThemeToken for extra safety
- **Readonly Interfaces** - Immutable data structures throughout
- **Type Guards** - Runtime validation that matches compile-time constraints
- **Comprehensive Error Types** - Structured error hierarchy with context

### Security Model

- **Credential Isolation** - Local-only storage in shops/credentials/
- **Input Validation** - JSON schema validation for all user input
- **File Permissions** - Automatic enforcement of secure file permissions (600)
- **Audit Capabilities** - Built-in security scanning and reporting
- **No Secret Exposure** - Sanitized logging and error messages

### Performance Requirements

- **CLI Startup** - <500ms cold start
- **Shop Operations** - <2 seconds for complex operations
- **Memory Usage** - <100MB for typical workflows
- **File I/O** - Minimized filesystem operations with caching

## Workflow Integration

### Target Use Case

This package enables any Shopify theme to adopt the multi-shop workflow:

```bash
# Install in existing theme
npm install -D shopdevs-multi-shop

# Initialize multi-shop capabilities
npx multi-shop init

# Create shops
npm run shop → Create New Shop

# Contextual development
npm run dev  # Adapts to branch context automatically
```

### Branch Strategy

The package implements branch-per-shop architecture:

```
main (core theme code)
├── feature/WEB-123-carousel    # Contextual development
├── shop-a/main                 # Connected to shop-a.myshopify.com
├── shop-a/staging              # Connected to staging-shop-a.myshopify.com
├── shop-a/promo-spring-sale    # Campaign branches
└── shop-b/main                 # Connected to shop-b.myshopify.com
    └── shop-b/staging          # Connected to staging-shop-b.myshopify.com
```

### Development Workflows

#### Core Feature Development
1. Create feature branch from main: `git checkout -b WEB-123-feature`
2. Contextual development: `npm run dev` (select shop context)
3. Sync with main: `npm run sync-main` (interactive rebase/merge)
4. Create PR to main: `gh pr create --base main`
5. Auto-created shop sync PRs: `main → shop-a/staging, main → shop-b/staging`

#### Campaign Management
1. Create promo branch: `npm run shop → Campaign Tools → Create Promo Branch`
2. Connect to Shopify theme and customize
3. Launch promo theme directly in Shopify
4. Push content to main: `npm run shop → Campaign Tools → Push Promo to Main`
5. Republish main theme to keep current

## File Organization

### Configuration Files

- `shops/*.config.json` - Shop configurations (committed to repository)
- `shops/credentials/*.credentials.json` - Developer credentials (local only, .gitignored)
- `.github/workflows/shop-sync.yml` - Automated shop syncing workflow

### Important Files

- `src/types/shop.ts` - Comprehensive type definitions for the entire system
- `src/lib/core/SecurityManager.ts` - Credential security and audit functionality
- `src/validators/ShopConfigValidator.ts` - Input validation and security
- `vitest.config.ts` - Testing configuration with coverage requirements

## Testing Strategy

### Test Categories

1. **Unit Tests** - Individual class and method testing with mocks
2. **Integration Tests** - Complete workflow testing
3. **Security Tests** - Credential protection and validation
4. **Performance Tests** - SLA enforcement and memory usage
5. **Type Tests** - TypeScript constraint validation

### Coverage Requirements

- **80% minimum coverage** for all code
- **100% coverage** for security-critical functions
- **Performance SLAs** for all operations
- **Cross-platform testing** on Windows, macOS, Linux

## Security Considerations

### Credential Handling

- **Local Storage Only** - Credentials never transmitted or logged
- **File Permission Enforcement** - 600 permissions on credential files
- **Integrity Validation** - Checksum validation for credential files
- **Security Auditing** - Built-in audit capabilities

### Input Validation

- **JSON Schema Validation** - All configuration validated against strict schemas
- **Type Safety** - TypeScript prevents invalid data at compile time
- **Command Injection Prevention** - Safe Git and shell command execution
- **Path Traversal Protection** - Secure file operations

## Package Distribution

### Build Process

1. **TypeScript Compilation** - src/ → dist/ with declaration files
2. **Executable Permissions** - CLI binary made executable
3. **File Filtering** - Only dist/, templates/, examples/ published
4. **Size Optimization** - Minimal package size for fast installs

### Release Process

1. **Quality Gates** - lint + typecheck + test + security audit
2. **Version Management** - Semantic versioning with conventional commits
3. **Documentation** - Auto-generated API docs with TypeDoc
4. **CI/CD** - Automated testing across platforms and Node versions

## Integration Notes

### Theme Integration

The package is designed to work with any Shopify theme:
- No theme-specific dependencies
- Configurable paths and structure
- GitHub workflow templates included
- Comprehensive initialization process

### Community Focus

This package extracts the multi-shop innovations from Horizon Meyer to make them available to the broader Shopify development community. It serves as a standalone tool that can transform any theme into a sophisticated multi-shop system.

# important-instruction-reminders

This is an NPM package, not a theme. Focus on:
- Package functionality and TypeScript architecture
- CLI commands and developer experience
- Security and performance of the package itself
- Integration with existing Shopify themes
- Do NOT modify theme files (sections, blocks, assets) - this package works with existing themes

The package should be theme-agnostic and focused on providing tooling and workflow management for multi-shop development.