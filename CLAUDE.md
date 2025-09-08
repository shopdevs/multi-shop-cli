# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with the ShopDevs Multi-Shop NPM package.

## Package Overview

ShopDevs Multi-Shop is a clean, focused NPM package that adds contextual development and automated shop management capabilities to any Shopify theme. It enables teams to manage multiple Shopify stores from a single theme codebase using a GitHub Flow workflow with branch-per-shop architecture for shop-specific features and campaigns.

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
│   ├── ShopManager.ts             # Main coordinator (82 lines)
│   ├── ShopConfig.ts              # Configuration file operations (137 lines)
│   ├── ShopDev.ts                 # Shopify CLI integration (151 lines)
│   ├── ShopCRUD.ts                # Shop lifecycle management (163 lines)
│   ├── ShopCLI.ts                 # User interface (208 lines)
│   ├── ContextualDev.ts           # Branch detection and routing
│   ├── ContextualShopManager.ts   # Feature branch development
│   ├── WorkflowManager.ts         # Multi-shop workflow orchestration
│   ├── Initializer.ts             # Project initialization
│   ├── SyncMain.ts                # Git sync operations
│   ├── TestRunner.ts              # PR testing functionality
│   ├── core/
│   │   ├── SecurityManager.ts     # Credential security (476 lines)
│   │   ├── GitOperations.ts       # Git operations with error handling
│   │   ├── SimpleLogger.ts        # Simple CLI logging (57 lines)
│   │   ├── Config.ts              # Configuration management (100 lines)
│   │   └── SimplePerformanceMonitor.ts # Basic performance tracking (87 lines)
│   ├── validators/
│   │   └── ShopConfigValidator.ts # JSON schema validation
│   └── errors/
│       └── ShopError.ts           # Custom error hierarchy
├── types/shop.ts                  # Focused type definitions (169 lines)
└── __tests__/                     # Focused test suite (57 lines)
```

### Technology Stack

- **TypeScript 5.3+** - Strict typing with enterprise configuration
- **Vitest** - Fast testing with native ES module support
- **Commander.js** - Professional CLI framework
- **@clack/prompts** - Beautiful interactive CLI interfaces
- **AJV** - JSON schema validation for security
- **ESLint** - Code quality with security and TypeScript rules

### Design Principles

1. **Single Responsibility** - Each class has one clear purpose, under 200 lines where possible
2. **Type Safety** - Proper TypeScript throughout, no JavaScript masquerading as TS
3. **Real Security** - Path traversal protection, safe file operations, no security theater
4. **Cross-Platform** - Works reliably on Windows, macOS, and Linux
5. **Simple Solutions** - Use existing libraries or simple wrappers, avoid custom frameworks
6. **Clean Code** - Direct comments, no buzzwords, focused functionality
7. **Maintainability** - Easy for senior engineers to understand and modify

## Key Implementation Details

### TypeScript Patterns

- **Readonly Interfaces** - Immutable data structures throughout
- **Simple Type Guards** - Boolean validation functions for runtime checks
- **Focused Error Types** - Structured error hierarchy with context
- **Strict Type Safety** - All parameters and returns properly typed
- **Clean API** - Only export types that are actually used

### Security Model

- **Credential Isolation** - Local-only storage in shops/credentials/ (never committed)
- **Path Traversal Protection** - Shop ID validation prevents directory traversal attacks
- **Safe JSON Parsing** - Size limits and validation before parsing untrusted input
- **Cross-Platform File Permissions** - Secure file permissions (600) where supported
- **Input Validation** - JSON schema validation with reasonable limits
- **Audit Capabilities** - Security scanning and reporting for credentials
- **No Secret Exposure** - Sanitized logging and error messages

### Performance Requirements

- **CLI Startup** - Fast startup for responsive user experience
- **Shop Operations** - Efficient operations with configurable thresholds
- **Memory Usage** - Reasonable memory consumption for CLI tools
- **Cross-Platform** - Works reliably on Windows, macOS, and Linux

## Workflow Integration

### Target Use Case

This package enables any Shopify theme to adopt the multi-shop workflow:

```bash
# Install in existing theme and initialize
pnpm add -D @shopdevs/multi-shop-cli && pnpx multi-shop init

# Create shops
pnpm run shop → Create New Shop

# Contextual development
pnpm run dev  # Adapts to branch context automatically
```

### Branch Strategy

The package implements GitHub Flow for core features with branch-per-shop architecture for shop-specific work:

```
main (core theme code)
├── feature/carousel-fix        # Contextual development
├── hotfix/critical-bug         # Emergency fixes
│
├── shop-a/main                 # Connected to shop-a
│   ├── shop-a/staging          # Connected to staging-shop-a
│   └── shop-a/promo-spring     # Campaign branches
│
└── shop-b/main                 # Connected to shop-b
    ├── shop-b/staging          # Connected to staging-shop-b
    └── shop-b/promo-holiday    # Campaign branches
```

### Development Workflows

#### Core Feature Development (GitHub Flow)
1. Create feature branch from main: `git checkout -b feature/carousel-fix`
2. Contextual development: `pnpm run dev` (select shop context for testing)
3. Sync with main: `pnpm run sync-main` (if needed)
4. Create PR directly to main: `gh pr create --base main` (GitHub Flow)
5. Auto-created shop sync PRs: `main → shop-a/staging → shop-a/main, main → shop-b/staging → shop-b/main`

#### Campaign Management (Complex Promo Workflow)
1. Create promo branch: `pnpm run shop → Campaign Tools → Create Promo Branch` (shop-a/main → shop-a/promo-123)
2. Connect Shopify theme to promo branch via GitHub integration
3. Customize in Shopify admin (content syncs back to promo branch)
4. Launch promo theme (Launchpad app or manual publish)
5. Push content to main: `pnpm run shop → Campaign Tools → Push Promo to Main` (shop-a/promo-123 → shop-a/main)
6. Republish main theme to keep it current
7. Optional: Create end-promo branch for content cleanup (shop-a/main → shop-a/end-promo-123)

## File Organization

### Configuration Files

- `shops/*.config.json` - Shop configurations (committed to repository)
- `shops/credentials/*.credentials.json` - Developer credentials (local only, .gitignored)
- `.github/workflows/shop-sync.yml` - Automated shop syncing workflow

### Important Files

- `src/lib/ShopManager.ts` - Main coordinator (82 lines, clean composition)
- `src/lib/ShopConfig.ts` - Configuration file operations (137 lines, focused)
- `src/lib/ShopDev.ts` - Shopify CLI integration (151 lines, single purpose)
- `src/lib/ShopCRUD.ts` - Shop lifecycle management (163 lines, clear responsibility)
- `src/lib/ShopCLI.ts` - User interface (208 lines, UI only)
- `src/lib/core/SecurityManager.ts` - Credential security with real protections
- `src/lib/core/SimpleLogger.ts` - Simple CLI logging (57 lines, no framework bloat)
- `src/lib/core/Config.ts` - System constants (configurable, not hardcoded)
- `src/types/shop.ts` - Focused type definitions (169 lines, only used types)
- `WORKFLOWS.md` - Complete multi-shop workflow documentation

## Testing Strategy

### Focused Testing Approach

1. **Unit Tests** - Test individual classes with clear mocks (src/__tests__/ - 57 lines)
2. **Integration Tests** - Test complete workflows end-to-end
3. **Security Tests** - Validate credential protection and file operations

### Coverage Goals

- **Focus on critical paths** - shop config, credentials, CLI integration
- **Security coverage** - All file operations and validation logic
- **Cross-platform testing** - Ensure Windows, macOS, and Linux compatibility
- **Simple, maintainable tests** - Avoid overly complex test scenarios

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

### Code Quality Focus

This package demonstrates clean, maintainable enterprise code patterns:
- **Focused classes** - Single responsibility, reasonable size limits
- **Simple solutions** - Avoid custom frameworks, use simple wrappers where needed
- **Real functionality** - No security theater or placeholder methods
- **TypeScript best practices** - Proper typing without over-engineering
- **Senior engineer friendly** - Easy to understand, test, and modify

The multi-shop workflow complexity is managed through clean architecture, not code bloat.

# important-instruction-reminders

This is a clean, maintainable NPM package. When working on it:

## Code Quality Standards
- **Keep classes focused** - Single responsibility, under 200 lines where possible
- **Avoid custom frameworks** - Use existing libraries or simple solutions
- **Write direct comments** - No "enterprise-grade" buzzwords or AI jargon
- **Remove unused code** - Don't export types/functions that aren't used
- **Real functionality only** - No security theater or placeholder methods

## Package Focus
- **CLI tool architecture** - Clean command patterns, not menu systems
- **TypeScript best practices** - Proper typing without over-engineering
- **Cross-platform support** - File operations that work on Windows/macOS/Linux
- **Integration ready** - Works with existing Shopify themes, no theme modifications
- **Workflow management** - Focus on GitHub Flow and multi-shop branching

The complexity is in the workflow design, not the code implementation.
- Always update the changelog when we're ready for a new version