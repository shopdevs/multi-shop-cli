# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Automatic content detection** - Smart safeguard for content vs code separation
  - Detects cross-shop sync (main → shop-a) vs within-shop sync (shop-a/main → shop-a/staging)
  - STRICT warnings for cross-shop syncs that could overwrite shop customizations
  - SOFT info for within-shop syncs where content changes are expected
  - Works dynamically with ANY shop name
  - Prevents accidental content overwrites
  - See CONTENT-PHILOSOPHY.md for complete guide
- **Comprehensive test suite** - 543 tests (+520 from baseline of 23)
  - Unit tests for all core modules (12 files)
  - Integration tests for workflows (4 files)
  - Security tests (3 files, 291 tests)
  - E2E tests (2 files, 62 tests)
  - Performance tests (14 tests)
  - Coverage: 86.24% statements, 90.90% branches
- **Security audit command** - `multi-shop audit` for automated security checks
  - Credential permission verification
  - Gitignore pattern checking
  - Git history leak detection
  - Metadata integrity validation
  - JSON and formatted output options
- **Performance monitoring** - Built-in performance tracking
  - Performance budgets for all operation types
  - Budget violation detection
  - Memory leak prevention tests
  - Performance test suite
- **Validation consolidation** - Single source of truth for validation
  - Centralized validation-schemas.ts module
  - Consistent patterns across codebase
  - Standardized error messages
- **CI/CD pipeline** - Full automation
  - Tests on Node 18, 20, 22
  - Tests on Ubuntu, macOS, Windows (9 combinations)
  - Coverage upload to Codecov
  - Security audit in CI
  - Automated release workflow
- **Comprehensive documentation structure** - Created complete A+ documentation
  - API Reference: index, shop-manager, validation, types
  - Guides: getting-started, testing, security, performance, troubleshooting
  - Examples: basic-setup, enterprise-setup, ci-integration
  - Quick reference guide
  - 20,000+ words of documentation

### Changed

- **Refactored CLI to state machine** - Removed recursion for cleaner stack traces
- **Removed ShopManager class** - Simplified to functional API only
- **Enhanced ESLint** - Strict TypeScript rules, security rules active
- **Testing grade** - Improved from C to A+
- **Code quality grade** - Improved from A- to A+
- **Architecture grade** - Improved from A to A+

### Fixed

- **Validation regex inconsistency** - 3 different patterns unified to 1 correct pattern
- **Domain validation edge case** - Single-character subdomains now properly validated
- **37 linting errors** - Removed unused imports, non-null assertions, explicit any types
- **Path traversal protection** - Comprehensive security tests verify protection
- **CI failures** - Fixed pnpm lockfile, deprecated GitHub Actions (upload-artifact v3→v4)
- **Shopify authentication docs** - Corrected token prefix docs (shptka_ → tkat_/shpat_)

## [2.0.10] - 2025-09-10

### Fixed

- **Shop Sync status accuracy** - Now shows correct status based on actual
  results instead of always "PR creation completed"
- **GitHub CLI command completeness** - Added required --body flag to prevent
  "must provide title and body" errors
- **GitHub CLI error detail capture** - Now shows actual stderr/stdout from
  GitHub CLI commands instead of generic error messages

## [2.0.9] - 2025-09-10

### Fixed

- **GitHub CLI error capture** - Shop Sync now shows actual detailed error
  messages from GitHub CLI instead of generic "Command failed"

## [2.0.8] - 2025-09-10

### Added

- **Enhanced PR creation debugging** - Show error logs and complete manual
  instructions when automation fails

### Fixed

- **Shop Sync error handling** - Now captures and displays GitHub CLI error
  details
- **Manual instruction completeness** - Shows both CLI commands and web
  interface methods

## [2.0.7] - 2025-09-09

### Fixed

- **Fix incorrect upgrade commands** - Upgrade commands were incorrect

## [2.0.6] - 2025-09-09

### Fixed

- **Consolidate functions to files** - Move tools functions into their own files
  and update the plan so that functions have their own files.

## [2.0.5] - 2025-09-09

### Added

- **Blank bump just to test version check** - Version checking test irl

## [2.0.4] - 2025-09-09

### Fixed

- **Fix version checking tool** - Fixed a bug in self reporting the version

## [2.0.3] - 2025-09-09

### Fixed

- **Fix version checking tool** - It should now use the same function for all
  packages for consistent results

## [2.0.2] - 2025-09-09

### Added

- **More Test Coverage on common functions** - Test coverage for shop related
  functions

## [2.0.1] - 2025-09-09

### Fixed

- **Start Dev Server** - The starting of this has been broken

## [2.0.0] - 2025-09-09

### Changed

- **Architecture transformation** - Converted from class-based to pure
  functional programming
- **Reduced complexity** - 56% code reduction (4,668 → 2,094 lines)
- **Enhanced maintainability** - All functions under 160 lines, single
  responsibility

### Added

- **Tools menu** - Sync Shops, Link Themes, Version Check functionality
- **Complete credential workflow** - Collect theme access passwords during shop
  creation
- **Enhanced .gitignore management** - Comprehensive patterns for development
- **Automated changelog workflow** - Release scripts now prompt for CHANGELOG.md
  updates

### Fixed

- **Staging domain validation** - Allow same domain as production
- **Package name consistency** - All references updated to
  @shopdevs/multi-shop-cli
- **Shopify CLI termination** - Proper signal handling for development server

## [1.0.7] - 2025-09-07

### Fixed

- Various bug fixes and stability improvements

## [1.0.0] - 2025-09-07

### Added

- 🚀 **Initial Release** - Multi-shop management for Shopify themes
- 🧠 **Contextual Development** - Smart `pnpm run dev` that adapts to branch
  context
- 🏪 **Shop Management** - Interactive shop creation with automated GitHub
  branch creation
- 🔐 **Secure Credentials** - Local-only credential storage with file
  permissions
- 🎨 **Campaign Workflow** - Promo branch creation and content-forward workflow
- 🔧 **GitHub Flow Integration** - Direct feature → main → shop-_/staging →
  shop-_/main workflow
- 📚 **Complete Documentation** - Setup guides, workflows, and troubleshooting

### Architecture

- **Clean TypeScript** - Strict type safety with zero workarounds
- **Focused Classes** - Single responsibility, maintainable code under 200 lines
  per class
- **Shopify CLI Integration** - Uses official Shopify CLI for development
  servers
- **Simple Solutions** - No custom frameworks, focused on real needs
- **Cross-Platform** - Works on Windows, macOS, and Linux

### Security

- **Path traversal protection** - Shop ID validation prevents directory attacks
- **Safe JSON parsing** - Size limits and validation before parsing
- **Credential isolation** - Local-only storage, never committed
- **File permissions** - Secure file permissions where supported
- **Security audit** - Built-in credential security checking

### Developer Experience

- **One command works everywhere** - `pnpm run dev` adapts to branch context
- **Automated branch creation** - GitHub branches created during shop setup
- **Clean error messages** - Actionable guidance without jargon
- **Simple CLI** - Direct commands, not complex menu systems

---

## Development Guidelines

### Commit Message Format

We follow [Conventional Commits](https://conventionalcommits.org/):

```
feat: add new campaign management features
fix: resolve credential validation edge case
docs: update installation guide
perf: optimize shop listing performance
security: enhance credential encryption
test: add comprehensive security tests
ci: update GitHub Actions workflow
```

### Version Bumping

- **feat**: Minor version bump (1.0.0 → 1.1.0)
- **fix**: Patch version bump (1.0.0 → 1.0.1)
- **BREAKING CHANGE**: Major version bump (1.0.0 → 2.0.0)
- **security**: Patch version bump with security notation

### Release Notes

Each release includes:

- **Summary of changes** with impact assessment
- **Migration guide** for breaking changes
- **Security updates** with severity ratings
- **Performance improvements** with benchmarks
- **Known issues** and workarounds
