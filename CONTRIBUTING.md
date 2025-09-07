# Contributing to ShopDevs Multi-Shop

> We welcome contributions from the Shopify development community!

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- Git
- Familiarity with Shopify theme development
- Understanding of multi-shop/multi-brand workflows

### Development Setup

```bash
# Clone the repository
git clone https://github.com/shopdevs/multi-shop.git
cd multi-shop

# Install dependencies
pnpm install

# Run tests to verify setup
pnpm test

# Start development mode
pnpm run dev
```

## 🛠️ Development Workflow

### 1. Create Feature Branch

```bash
git checkout main
git pull origin main  
git checkout -b feature/your-feature-name
```

### 2. Development

```bash
# Make your changes
# Add comprehensive tests
# Update documentation

# Validate your changes
pnpm run validate  # Runs lint, typecheck, and tests
```

### 3. Testing

```bash
# Unit tests
pnpm test

# E2E tests  
pnpm run test:e2e

# Security checks
pnpm run security:audit

# Performance validation
pnpm run test:performance
```

### 4. Submit Pull Request

```bash
git push origin feature/your-feature-name
# Then create PR via GitHub interface
```

## 📋 Pull Request Guidelines

### PR Checklist

- [ ] **Tests added/updated** - All new functionality has tests
- [ ] **Documentation updated** - README, JSDoc, guides updated
- [ ] **Type safety** - TypeScript types added for new APIs
- [ ] **Security reviewed** - No credential exposure, input validation added
- [ ] **Performance tested** - No performance regressions
- [ ] **Cross-platform tested** - Works on Windows, macOS, Linux
- [ ] **Breaking changes documented** - Migration guide provided if needed

### PR Description Template

```markdown
## What does this PR do?

Brief description of the changes

## Why is this change needed?

Context about the problem being solved

## How was this tested?

- [ ] Unit tests added/updated
- [ ] E2E tests pass
- [ ] Manually tested on [OS/environment]
- [ ] Performance impact assessed

## Breaking changes?

- [ ] No breaking changes
- [ ] Breaking changes (migration guide provided)

## Security considerations

- [ ] No new security risks introduced
- [ ] Input validation added where needed
- [ ] No credentials exposed in logs/errors
```

## 🧪 Testing Standards

### Test Coverage Requirements

- **Minimum 80% coverage** for all new code
- **100% coverage** for security-critical functions
- **Integration tests** for CLI workflows
- **Performance tests** for operations >1000ms

### Test Categories

#### **Unit Tests** (`__tests__/*.test.js`)
```javascript
describe('ShopManager', () => {
  test('should create shop configuration', () => {
    // Test individual methods
  });
});
```

#### **Integration Tests** (`__tests__/integration/*.test.js`)
```javascript
describe('Shop Creation Workflow', () => {
  test('should complete full shop setup', () => {
    // Test complete workflows
  });
});
```

#### **Security Tests** (`__tests__/security/*.test.js`)
```javascript
describe('Credential Security', () => {
  test('should never expose credentials', () => {
    // Test security measures
  });
});
```

#### **Performance Tests** (`__tests__/performance/*.test.js`)
```javascript
describe('Performance', () => {
  test('should complete operations within SLA', () => {
    // Test performance requirements
  });
});
```

## 📚 Documentation Standards

### Code Documentation

#### **JSDoc Requirements**
```javascript
/**
 * Creates a new shop configuration with validation
 * @param {string} shopId - Unique shop identifier
 * @param {Object} config - Shop configuration object
 * @param {Object} config.shopify - Shopify-specific settings
 * @returns {Promise<Object>} Created shop configuration
 * @throws {ShopValidationError} When configuration is invalid
 * @throws {ShopConfigurationError} When creation fails
 * @example
 * const config = await shopManager.createShop('my-shop', {
 *   name: 'My Shop',
 *   shopify: { stores: { ... } }
 * });
 */
async createShop(shopId, config) {
  // Implementation
}
```

#### **README Updates**
- Update feature sections for new capabilities
- Add examples for new commands
- Update installation instructions if needed
- Include migration notes for breaking changes

#### **Changelog** (`CHANGELOG.md`)
Follow [Conventional Changelog](https://conventionalcommits.org/):

```markdown
## [1.1.0] - 2025-01-25
### Added
- New campaign management features
- Enhanced security validation

### Changed  
- Improved error messages
- Updated CLI interface

### Fixed
- Credential validation edge case
- Performance issue with large shop lists

### Security
- Enhanced credential encryption
- Added audit logging
```

## 🔒 Security Guidelines

### Credential Handling

#### **✅ DO:**
- Use `SecurityManager` for all credential operations
- Validate all user inputs with schemas
- Log operations without sensitive data
- Use proper file permissions (600 for credentials)
- Implement integrity checks for credential files

#### **❌ DON'T:**
- Log or display actual theme tokens
- Store credentials in environment variables
- Use credentials in test fixtures (use mocks)
- Transmit credentials over network
- Include credentials in error messages

### Code Security

```javascript
// ✅ Correct: Validated input
const validator = new ShopConfigValidator();
const safeShopId = validator.validateShopId(userInput);

// ❌ Wrong: Unvalidated input
const shopId = userInput; // Potential injection vector
```

## 🚀 Performance Guidelines

### Performance Requirements

- **CLI startup**: <500ms cold start
- **Shop operations**: <2 seconds for complex operations  
- **Memory usage**: <100MB for typical workflows
- **File I/O**: Minimize filesystem operations

### Performance Testing

```javascript
test('should complete shop listing within performance SLA', () => {
  const startTime = performance.now();
  const shops = shopManager.listShops();
  const duration = performance.now() - startTime;
  
  expect(duration).toBeLessThan(100); // 100ms SLA
});
```

## 🏷️ Release Process

### Semantic Versioning

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR** (1.0.0 → 2.0.0): Breaking changes
- **MINOR** (1.0.0 → 1.1.0): New features (backwards compatible)
- **PATCH** (1.0.0 → 1.0.1): Bug fixes (backwards compatible)

### Release Checklist

- [ ] All tests passing on all supported platforms
- [ ] Security audit clean
- [ ] Performance benchmarks met
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] Version bumped appropriately
- [ ] GitHub release created with release notes

### Publishing

```bash
# Validate release
npm run validate

# Version bump and publish
npm run release
```

## 🤝 Community

### Communication Channels

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: General questions and community help
- **Email**: security@shopdevs.com (security issues only)

### Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn and grow
- Report security issues responsibly

## 📖 Resources

### Learning Materials
- [Shopify Theme Development](https://shopify.dev/docs/themes)
- [Git Flow Best Practices](https://www.atlassian.com/git/tutorials/comparing-workflows)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)

### Tools We Use
- **ESLint + Prettier**: Code formatting and linting
- **Jest**: Testing framework with coverage reporting
- **TypeScript**: Type safety and documentation
- **Commander.js**: CLI framework
- **@clack/prompts**: Beautiful CLI interfaces

---

Thank you for contributing to the Shopify development ecosystem! 🎉