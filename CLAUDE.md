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
│   ├── ShopManager.ts             # Entry point compatibility layer
│   ├── ContextualDev.ts           # Branch detection and routing
│   ├── Initializer.ts             # Project initialization
│   ├── core/
│   │   ├── index.ts               # Core composition (32 lines)
│   │   ├── cli.ts                 # CLI coordination (153 lines)
│   │   ├── tools.ts               # Tools menu coordination (33 lines)
│   │   ├── shop-creation.ts       # Shop creation workflow (51 lines)
│   │   ├── shop-input.ts          # Input collection (100 lines)
│   │   ├── shop-setup.ts          # Resource setup (149 lines)
│   │   ├── shop-editing.ts        # Shop editing operations (153 lines)
│   │   ├── shop-operations.ts     # File operations (105 lines)
│   │   ├── shop-sync.ts           # PR creation operations (85 lines)
│   │   ├── theme-linking.ts       # Theme linking operations (70 lines)
│   │   ├── version-check.ts       # Version checking (67 lines)
│   │   ├── credential-operations.ts # Credential handling (101 lines)
│   │   ├── dev-operations.ts      # Development server (150 lines)
│   │   ├── validation.ts          # Validation functions (66 lines)
│   │   ├── logger.ts              # Simple logging (50 lines)
│   │   └── types.ts               # Core type definitions (43 lines)
│   ├── validators/
│   │   └── ShopConfigValidator.ts # JSON schema validation
│   └── errors/
│       └── ShopError.ts           # Error hierarchy
├── types/shop.ts                  # Type definitions (160 lines)
└── __tests__/                     # Test suite (47 lines)
```

### Technology Stack

- **TypeScript 5.3+** - Strict typing with enterprise configuration
- **Vitest** - Fast testing with native ES module support
- **Commander.js** - Professional CLI framework
- **@clack/prompts** - Beautiful interactive CLI interfaces
- **AJV** - JSON schema validation for security
- **ESLint** - Code quality with security and TypeScript rules

### Design Principles

1. **Pure Functions** - All operations are pure functions with clear inputs/outputs
2. **Immutable Data** - All data structures are readonly, no mutations
3. **Composition** - Complex operations built from simple, composable functions
4. **Type Safety** - Strict TypeScript throughout with Result types for error handling
5. **Single Responsibility** - Each function has one clear purpose, under 160 lines
6. **Real Security** - Path traversal protection, safe file operations
7. **Cross-Platform** - Works reliably on Windows, macOS, and Linux
8. **Maintainability** - Easy for developers to understand, test, and modify

## Key Implementation Details

### TypeScript Patterns

- **Pure Functions** - All operations as composable functions with clear contracts
- **Result Types** - Elegant error handling without exceptions
- **Readonly Interfaces** - Immutable data structures throughout
- **Dependency Injection** - Pure function factories for testability
- **Type Guards** - Boolean validation functions for runtime checks
- **Clean API** - Only export functions and types that are used

### Security Model

- **Credential Isolation** - Local-only storage in shops/credentials/ (never committed)
- **Path Traversal Protection** - Shop ID validation prevents directory traversal attacks
- **Safe JSON Parsing** - Size limits and validation before parsing untrusted input
- **Cross-Platform File Permissions** - Secure file permissions (600) where supported
- **Input Validation** - JSON schema validation with reasonable limits
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
5. Use Tools → Sync Shops: Create PRs `main → shop-a/staging, main → shop-b/staging`

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

1. **Quality Gates** - lint + typecheck + test
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
- **Pure functions only** - No mutable state, no side effects in core operations
- **Composition over inheritance** - Build complexity through function composition
- **Immutable data** - All data structures should be readonly
- **Result types** - Use Result<T> pattern instead of throwing exceptions
- **Single responsibility** - Each function has one clear purpose, under 160 lines
- **One function per file** - Each major operation gets its own focused file, coordination files just import and call
- **Write direct comments** - Describe purpose, not implementation paradigm
- **Remove unused code** - Don't export functions that aren't used
- **No fallback patterns** - Be declarative and clear, single approach
- **No backward compatibility** - This is a new package, always check before adding compatibility layers
- **No shortcuts or technical debt** - Always implement properly, never add temporary fixes or workarounds

## Package Focus
- **CLI tool architecture** - Clean command patterns, not menu systems
- **TypeScript best practices** - Proper typing without over-engineering
- **Cross-platform support** - File operations that work on Windows/macOS/Linux
- **Integration ready** - Works with existing Shopify themes, no theme modifications
- **Workflow management** - Focus on GitHub Flow and multi-shop branching
- **Scalable shop management** - Works with 1 shop (for promo workflow) to many shops (no practical limit)

## Important Context
- **Shop flexibility** - Tool works for any number of shops (1 to 50+), don't assume 4 shops in examples
- **Promo workflow value** - Even single-shop setups benefit from promo branch management
- **No backward compatibility** - This is a new package, always check before adding compatibility layers
- **Always update the changelog** when ready for a new version