# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.3.0] - 2025-10-28

### Added

- **Campaign Tools Menu** - Automated campaign/promo branch management
  - Create Promo Branch: One-command promo branch creation from shop/main
  - Push Promo to Main: Automated PR creation to merge campaign content back
  - End Promo: Cleanup and delete campaign branches
  - List Active Promos: Show all active campaign branches across shops
  - Implements Shopify's recommended branch-per-campaign workflow
  - 11 comprehensive tests
- **Content Protection System** - Config-based content overwrite prevention
  - Per-shop content protection settings (strict/warn/off modes)
  - Global settings for default protection behavior (settings.json)
  - STRICT mode: Blocks cross-shop content sync, requires 'OVERRIDE' confirmation
  - WARN mode: Shows warning, requires explicit confirmation
  - Verbose/quiet verbosity controls
  - Tools → Content Protection menu for configuration
  - Show Protection Status for all shops
  - Enable/Disable protection per shop or for all shops
  - Smart detection: Only blocks cross-shop (main → shop-a), allows within-shop (shop-a → shop-a)
  - 14 comprehensive tests

### Changed

- **Content detection improved** - Now enforces protection based on shop config
  - Integrates with content protection settings
  - Shows appropriate warnings based on protection mode
  - Better UX messaging (explains protection is working, not broken)

## [2.2.4] - 2025-10-28

### Add npm package versioning badges to README.md

## [2.2.3] - 2025-10-28

### Bump version to 2.2.3 to catch up with npm package versioning.

## [2.2.1] - 2025-10-27

### Initial Public Release

Enterprise-grade CLI tool for contextual development and automated shop
management for multi-shop Shopify themes.

**Features:**

- Contextual development (adapts to branch context)
- Automated shop syncing with PR creation
- Automatic content detection (prevents accidental overwrites)
- Security audit command (`multi-shop audit`)
- Performance monitoring with budget tracking
- 543 comprehensive tests (90.9% branch coverage)
- 291 security tests
- Complete documentation (25,000+ words)
- Cross-platform support (Windows, macOS, Linux)

**Note:** Previous versions were private development and are not publicly
available.
