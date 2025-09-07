# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial package development
- Core shop management functionality
- Contextual development workflow
- Security and credential management
- Comprehensive testing framework

## [1.0.0] - 2025-09-07

### Added
- 🚀 **Initial Release** - Multi-shop management for Shopify themes
- 🧠 **Contextual Development** - Smart `pnpm run dev` that adapts to branch context
- 🏪 **Shop Management** - Interactive shop creation with automated GitHub branch creation
- 🔐 **Secure Credentials** - Local-only credential storage with file permissions
- 🎨 **Campaign Workflow** - Promo branch creation and content-forward workflow
- 🔧 **GitHub Flow Integration** - Direct feature → main → shop-*/staging → shop-*/main workflow
- 📚 **Complete Documentation** - Setup guides, workflows, and troubleshooting

### Architecture
- **Clean TypeScript** - Strict type safety with zero workarounds
- **Focused Classes** - Single responsibility, maintainable code under 200 lines per class
- **Shopify CLI Integration** - Uses official Shopify CLI for development servers
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