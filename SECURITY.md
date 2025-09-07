# Security Policy

## Supported Versions

We actively support security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | ✅ Yes             |
| 0.x.x   | ❌ No (deprecated)  |

## Security Model

### Credential Protection

**shopdevs-multi-shop** implements enterprise-grade security for sensitive Shopify theme access credentials:

#### 🔐 **Local-Only Storage**
- Theme tokens stored in `shops/credentials/` (never committed)
- Automatic `.gitignore` configuration prevents accidental commits
- File permissions restricted to owner-only (600)

#### 🛡️ **Structured Validation**
- JSON schema validation for all configuration
- Input sanitization for user-provided data
- Credential format validation and corruption detection

#### 🔍 **Security Monitoring**
- Automatic security audits of credential files
- Detection of suspicious token patterns
- File permission monitoring and enforcement
- Credential age tracking for rotation recommendations

#### 🚨 **Threat Protection**
- Protection against credential injection attacks
- Validation of token formats and sources
- Sanitization of data before logging
- No sensitive data in error messages or logs

### Data Handling

#### **What We Store Locally:**
- Shop configuration (committed): Store domains, branch names, authentication method
- Developer credentials (local only): Personal theme access tokens/passwords

#### **What We Never Store:**
- Shopify customer data
- Payment information  
- Store analytics or sales data
- Shared/team credentials

#### **What We Never Transmit:**
- Credential data is never sent to external services
- No telemetry or analytics collection
- No remote logging of sensitive operations

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability, please follow responsible disclosure:

### 🚨 **For Critical Vulnerabilities**
- **Email**: security@shopdevs.com  
- **Subject**: [SECURITY] Critical vulnerability in shopdevs-multi-shop
- **Response Time**: Within 24 hours

### 📧 **For General Security Issues**
- **GitHub**: Create a private security advisory
- **Email**: security@shopdevs.com
- **Response Time**: Within 72 hours

### 📝 **What to Include**
- Detailed description of the vulnerability
- Steps to reproduce the issue
- Potential impact assessment
- Suggested fix (if available)
- Your contact information

### 🔄 **Our Response Process**
1. **Acknowledgment** - We confirm receipt within stated timeframes
2. **Investigation** - We validate and assess the vulnerability  
3. **Fix Development** - We develop and test a security patch
4. **Coordinated Disclosure** - We work with you on public disclosure timing
5. **Recognition** - We credit responsible reporters (unless anonymity requested)

## Security Best Practices

### For Users

#### ✅ **DO:**
- Keep the package updated to latest version
- Use Theme Access App (recommended) over manual tokens
- Rotate theme access credentials periodically (every 6 months)
- Use staging environments for development and testing
- Review credential audit results regularly: `multi-shop audit security`

#### ❌ **DON'T:**
- Share credential files between developers
- Commit `shops/credentials/` directory to Git
- Use production credentials for development
- Store credentials in environment variables or CI/CD systems
- Ignore security audit warnings

### For Developers

#### **Credential Handling:**
```javascript
// ✅ Correct: Use SecurityManager
const securityManager = new SecurityManager();
const token = securityManager.getThemeToken(shopId, env);

// ❌ Wrong: Direct file access
const rawCreds = fs.readFileSync('shops/credentials/shop.json');
```

#### **Error Handling:**
```javascript
// ✅ Correct: Structured error handling
try {
  const config = shopManager.loadShopConfig(shopId);
} catch (error) {
  if (error instanceof ShopConfigurationError) {
    logger.error('Configuration error', { 
      shopId, 
      code: error.code 
    });
  }
}

// ❌ Wrong: Exposing sensitive data in errors
catch (error) {
  console.log(`Error: ${JSON.stringify(credentials)}`); // Exposes secrets!
}
```

#### **Input Validation:**
```javascript
// ✅ Correct: Validate all inputs
const validator = new ShopConfigValidator();
const safeConfig = validator.validateConfig(userInput, shopId);

// ❌ Wrong: Using unvalidated input
const domain = userInput.domain; // Potential injection vector
```

## Security Features

### 🔐 **Credential Security**
- AES-256 encryption for sensitive data (future feature)
- Integrity validation with checksums
- Automatic permission enforcement (600)
- Credential rotation monitoring

### 🛡️ **Input Validation**
- JSON schema validation for all configuration
- Regular expression validation for shop IDs and domains  
- Command injection prevention in Git operations
- Path traversal protection for file operations

### 📊 **Audit & Monitoring**
- Comprehensive security audit command
- File permission monitoring
- Credential age tracking
- Suspicious activity detection

### 🚨 **Incident Response**
- Structured error logging without sensitive data
- Operation tracking for forensic analysis
- Automatic cleanup of temporary files
- Graceful degradation on security failures

## Compliance

This package is designed to help maintain compliance with:

- **SOC 2 Type II** - Security and availability controls
- **ISO 27001** - Information security management
- **GDPR** - Data protection and privacy (for EU merchants)
- **PCI DSS** - Payment card industry standards (theme-level)

## Security Changelog

### Version 1.0.0
- Initial security model implementation
- Credential protection and validation
- Structured error handling
- Comprehensive audit capabilities

---

## Contact

For security-related questions or concerns:
- **Security Team**: security@shopdevs.com
- **General Support**: support@shopdevs.com
- **Documentation**: https://github.com/shopdevs/multi-shop/security

---

_Last updated: January 25, 2025_