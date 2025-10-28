# Pull Request

## Description

Brief description of changes and why they're needed.

Fixes # (issue number, if applicable)

## Type of Change

- [ ] Bug fix (non-breaking change fixing an issue)
- [ ] New feature (non-breaking change adding functionality)
- [ ] Breaking change (fix or feature causing existing functionality to change)
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Code refactoring

## How Has This Been Tested?

Describe the tests you ran to verify your changes.

- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Tested on macOS
- [ ] Tested on Linux
- [ ] Tested on Windows
- [ ] Manual testing completed

## Test Results

```bash
# Paste output from:
pnpm test
```

## Checklist

- [ ] My code follows the project's style guidelines
- [ ] I have performed a self-review of my code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
- [ ] Any dependent changes have been merged and published

## Quality Gates

- [ ] `pnpm run lint` passes (0 errors)
- [ ] `pnpm run typecheck` passes
- [ ] `pnpm test` passes (all tests)
- [ ] `pnpm run build` succeeds
- [ ] `pnpm run validate` passes (full quality check)

## Documentation

- [ ] README.md updated (if user-facing changes)
- [ ] CHANGELOG.md updated in [Unreleased] section
- [ ] API docs updated (if API changes)
- [ ] Examples updated (if workflow changes)

## Breaking Changes

If this PR introduces breaking changes, describe:

- What breaks?
- Migration path for users?
- Updated version (should be MAJOR bump)?

---

**Additional Notes:**

Add any other context, screenshots, or information about the PR.
