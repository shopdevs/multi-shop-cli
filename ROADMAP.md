# Product Roadmap - Multi-Shop CLI

**Last Updated:** 2025-10-28
**Current Version:** v2.2.4

---

## Vision

Eliminate the complexity and risk of managing multiple Shopify stores from a single theme codebase, enabling teams to ship faster with confidence.

**Aligned with Shopify's official recommendations:**
> "For events like sales, consider using non-main branches to customize your theme. Themes connected to these branches can be published temporarily."
> — [Shopify Theme Version Control Best Practices](https://shopify.dev/docs/storefronts/themes/best-practices/version-control)

Multi-shop CLI automates these workflows that Shopify recommends but doesn't provide tooling for.

---

## Problem Space Analysis

### The Core Challenge

Managing multiple Shopify stores from one theme codebase involves several competing concerns:

**1. Code Sharing** (✅ Working well)
- Bug fixes should propagate to all shops
- New features should be available everywhere
- Improvements benefit the entire fleet

**2. Content Isolation** (⚠️ Partially solved)
- Each shop has unique branding (colors, fonts, text)
- Settings should NOT sync across shops
- Accidental overwrites cause real damage
- Currently: Detection + warnings (not prevention)

**3. Campaign Management** (❌ Manual/undocumented)
- Time-sensitive promotions need isolated branches
- Promo content should eventually merge to shop main
- Cleanup after campaigns is manual and error-prone
- No tooling support currently

**4. Team Coordination** (⚠️ Minimal support)
- Multiple teams work on different shops
- Shop ownership unclear in tooling
- No notification system for cross-shop changes
- Manual coordination required

**5. Testing Complexity** (⚠️ Basic support)
- Need to test changes across multiple shop contexts
- Visual regression testing not integrated
- No automated cross-shop testing
- Preview link management is manual

---

## User Personas & Pain Points

### Persona 1: Solo Developer (2-5 shops)

**Current Pain Points:**
- 😤 Manually creating promo branches
- 😤 Remembering which shop has which customizations
- 😤 Testing same feature across all shops (repetitive)
- 😤 Cleaning up after campaigns

**What they need:**
- One-click promo branch creation
- Quick shop context switching
- Automated cleanup workflows
- Simple campaign lifecycle management

### Persona 2: Small Team (5-15 shops)

**Current Pain Points:**
- 😤 Coordinating who works on which shop
- 😤 Accidental content overwrites (detection helps but not prevents)
- 😤 No visibility into shop sync status
- 😤 Manual testing across all shops

**What they need:**
- Shop ownership tracking
- Content protection (not just warnings)
- Sync status dashboard
- Automated cross-shop testing

### Persona 3: Enterprise (15+ shops)

**Current Pain Points:**
- 😤 Shop sprawl (too many shops to manage)
- 😤 No audit trail for changes
- 😤 Complex approval workflows
- 😤 Deployment coordination across regions/teams

**What they need:**
- Shop grouping and organization
- Comprehensive audit logging
- Advanced approval workflows
- Deployment scheduling and coordination

---

## Feature Roadmap

### Immediate Priority (v2.3.0) - Next 2-4 weeks

**Theme: Campaign Management Automation**

#### Feature 1: Campaign Tools Menu ⭐⭐⭐⭐⭐

**Problem:** Promo/campaign workflows are entirely manual
**Impact:** High - Core use case, frequently needed
**Effort:** Medium (~8 hours)
**Shopify Validation:** ✅ Shopify explicitly recommends branch-per-campaign: "Connect one or more branches from a repository to easily develop and test new theme features or campaigns" ([Source](https://shopify.dev/docs/storefronts/themes/tools/github))

**Implementation:**
```typescript
// Add to cli.ts main menu:
{ value: "campaign", label: "Campaign Tools", hint: "Manage promos and campaigns" }

// Campaign submenu:
- Create Promo Branch (shop-a/main → shop-a/promo-NAME)
- Push Promo to Main (shop-a/promo-NAME → shop-a/main PR)
- End Promo (cleanup branch, optional content revert)
- List Active Promos (show all promo branches)
```

**User Story:**
```
As a marketer managing Shop A,
I want to create a promo branch with one command,
So I can quickly set up seasonal campaigns without manual git commands.
```

**Acceptance Criteria:**
- [ ] "Campaign Tools" appears in main menu
- [ ] Can create promo branch from shop/main
- [ ] Validates shop exists before creating promo
- [ ] Auto-pushes branch to GitHub
- [ ] Creates helpful commit message with promo name
- [ ] Shows next steps (connect to Shopify theme)

**Files to create:**
- `src/lib/core/campaign-tools.ts` (~150 lines)
- `src/lib/core/campaign-operations.ts` (~120 lines)
- `src/__tests__/unit/campaign-tools.test.ts` (~50 tests)

---

#### Feature 2: Content File Protection (Not Just Detection) ⭐⭐⭐⭐⭐

**Problem:** Current detection warns but doesn't prevent overwrites
**Impact:** Critical - Prevents data loss
**Effort:** Low (~3 hours)

**Implementation:**
```typescript
// Auto-create .gitattributes in shop branches
const setupContentProtection = (shopId: string) => {
  const gitattributes = `
# Shop-specific content files (always prefer shop version during merges)
config/settings_data.json merge=ours
templates/*.json merge=ours
locales/*.json merge=ours
config/markets.json merge=ours
  `.trim();

  writeFile(`${shopId}/main`, '.gitattributes', gitattributes);
};
```

**User Story:**
```
As a shop manager,
I want content files to automatically use shop version during merges,
So I never accidentally lose my shop's customizations.
```

**Acceptance Criteria:**
- [ ] Auto-creates .gitattributes on shop branch creation
- [ ] Documents merge=ours strategy in created file
- [ ] Updates existing shops with `pnpm run shop → Tools → Setup Content Protection`
- [ ] Warns if .gitattributes is missing
- [ ] Tests verify merge behavior

---

#### Feature 3: Shop Health Check ⭐⭐⭐⭐

**Problem:** No way to verify shop configuration is correct
**Impact:** Medium-High - Prevents issues
**Effort:** Low (~4 hours)

**Implementation:**
```typescript
// New menu option: Tools → Health Check
const healthCheck = async (shopId: string) => {
  const results = {
    configValid: await validateConfig(shopId),
    credentialsExist: await checkCredentials(shopId),
    branchesExist: await checkBranches(shopId),
    githubConnected: await checkGitHubIntegration(shopId),
    contentProtected: await checkGitAttributes(shopId)
  };

  displayHealthReport(results);
};
```

**Output:**
```
🏥 Shop Health Check: shop-a

✅ Configuration valid
✅ Credentials exist (production, staging)
✅ Branches exist (shop-a/main, shop-a/staging)
⚠️  GitHub integration not verified (check manually)
❌ Content protection not configured (.gitattributes missing)

Recommendations:
  1. Run: Tools → Setup Content Protection
  2. Verify GitHub connection in Shopify Admin
```

---

### Near-Term (v2.4.0) - 1-2 months

**Theme: Developer Experience & Testing**

#### Feature 4: Quick Shop Switcher in Dev Mode ⭐⭐⭐⭐

**Problem:** Must exit and restart dev server to switch shops
**Impact:** Medium - DX improvement, saves time
**Effort:** Medium (~6 hours)

**Implementation:**
```typescript
// During dev server, watch for keypress
process.stdin.on('data', async (key) => {
  if (key.toString() === 's') {  // 's' for switch
    console.log('\n🔄 Switch Shop');
    const newShop = await selectShop();
    restartDevServer(newShop);
  }
});
```

**User Story:**
```
As a developer testing a feature,
I want to switch between shops without exiting dev mode,
So I can quickly test across multiple shop contexts.
```

---

#### Feature 5: Shop Cloning ⭐⭐⭐⭐

**Problem:** Creating similar shops requires manual duplication
**Impact:** Medium - Saves time for new shop setup
**Effort:** Low (~3 hours)

**Implementation:**
```bash
pnpm run shop → Create New Shop → Clone from existing shop

# Copies config from shop-a, prompts for new values:
Source shop: shop-a
New shop ID: shop-b
New name: Shop B
New production domain: shop-b.myshopify.com
...
```

**Copies:**
- ✅ Authentication method
- ✅ Branch naming pattern
- ❌ NOT credentials (security)
- ❌ NOT content (shop-specific)

---

#### Feature 6: Preview Link Manager ⭐⭐⭐

**Problem:** Managing Shopify preview links across shops is manual
**Impact:** Medium - QA and sharing
**Effort:** Low (~3 hours)

**Implementation:**
```bash
pnpm run shop → Tools → Generate Preview Links

Generating preview links for all shops...

shop-a (staging):
  Preview: https://shop-a.myshopify.com/?preview_theme_id=123456
  Editor:  https://shop-a.myshopify.com/admin/themes/123456/editor

shop-b (staging):
  Preview: https://shop-b.myshopify.com/?preview_theme_id=789012
  ...

[Copy all] [Copy shop-a only] [Open in browser]
```

---

### Mid-Term (v2.5.0) - 2-3 months

**Theme: Content Management & Collaboration**

#### Feature 7: Content Snapshot & Restore ⭐⭐⭐⭐⭐

**Problem:** No way to backup/restore shop content before risky operations
**Impact:** High - Safety net for content changes
**Effort:** Medium (~8 hours)

**Implementation:**
```bash
pnpm run shop → Tools → Content Management

Options:
  → Create Content Snapshot (shop-a)
  → Restore Content Snapshot
  → Compare Content (shop-a vs shop-b)
  → Pull Content from Shopify
```

**Use Cases:**
1. **Before major sync:** Snapshot content, try sync, rollback if needed
2. **Clone shop content:** Copy shop-a settings to new shop-b
3. **Debug differences:** Compare why shop-a looks different than shop-b

**Implementation:**
```typescript
const createSnapshot = async (shopId: string) => {
  // Pull current content from Shopify
  execSync(`shopify theme pull --only=config/settings_data.json --only=templates/*.json`);

  // Save with timestamp
  const snapshot = {
    shopId,
    timestamp: new Date().toISOString(),
    files: {
      'config/settings_data.json': readFile(...),
      'templates/index.json': readFile(...),
      ...
    }
  };

  writeFile(`shops/snapshots/${shopId}-${timestamp}.json`, snapshot);
};
```

---

#### Feature 8: Shop Ownership & CODEOWNERS Automation ⭐⭐⭐⭐

**Problem:** No tracking of which team owns which shop
**Impact:** High for teams - Clear ownership
**Effort:** Low (~4 hours)

**Implementation:**
```bash
pnpm run shop → Edit Shop → Set Owner/Team

Shop: shop-a
Current owner: None
New owner: @marketing-team

# Auto-updates CODEOWNERS:
shops/shop-a.config.json @marketing-team
shops/shop-a/* @marketing-team
```

**Benefits:**
- Auto-requests review from shop team
- Clear responsibility
- GitHub notifications to right people

---

#### Feature 9: Bulk Shop Operations ⭐⭐⭐

**Problem:** Performing same operation across all shops is tedious
**Impact:** Medium - Efficiency for large fleets
**Effort:** Low (~3 hours)

**Implementation:**
```bash
pnpm run shop → Tools → Bulk Operations

Select operation:
  → Update all shop configs (batch edit)
  → Sync all shops at once
  → Health check all shops
  → Generate all preview links
  → Archive inactive shops

Select shops:
  [x] shop-a
  [x] shop-b
  [ ] shop-c (inactive)
  [x] Select all active
```

---

### Long-Term (v3.0.0) - 3-6 months

**Theme: Advanced Workflows & Enterprise Features**

#### Feature 10: Visual Regression Testing Integration ⭐⭐⭐⭐⭐

**Problem:** No way to catch visual changes when syncing code
**Impact:** Very High - Prevents broken UIs in production
**Effort:** High (~16 hours)

**Integration with:**
- Percy.io
- Chromatic
- Or custom screenshot comparison

**Implementation:**
```bash
pnpm run shop → Tools → Visual Testing

# Takes screenshots of key pages across all shops
# Compares before/after for PRs
# Flags visual differences for review
```

**User Story:**
```
As a developer syncing CSS changes,
I want to see visual diffs across all shops,
So I can catch unintended visual regressions before deployment.
```

---

#### Feature 11: Deployment Scheduling & Coordination ⭐⭐⭐⭐

**Problem:** No coordination for deploying to multiple shops
**Impact:** High for enterprises - Reduces deployment risk
**Effort:** High (~12 hours)

**Implementation:**
```bash
pnpm run shop → Tools → Schedule Deployment

Deploy: main → all shop staging branches
When: Tonight at 2 AM EST (low traffic)
Shops: shop-a, shop-b, shop-c (3 selected)
Rollback: Automatic if theme check fails

[Schedule] [Deploy now] [Cancel]
```

**Features:**
- Schedule deployments for low-traffic hours
- Staggered rollout (shop-a first, wait 1 hour, then shop-b)
- Automatic rollback if errors detected
- Notification when complete
- Deployment status dashboard

---

#### Feature 12: Shop Template System ⭐⭐⭐⭐

**Problem:** Setting up similar shops requires repetitive configuration
**Impact:** Medium-High - Accelerates shop creation
**Effort:** Medium (~6 hours)

**Implementation:**
```bash
# Save shop as template
pnpm run shop → Tools → Save as Template
Shop: shop-a
Template name: beauty-store-template
Description: Standard beauty store setup with reviews

# Create from template
pnpm run shop → Create New Shop → From Template
Template: beauty-store-template
New shop ID: shop-f
# Pre-fills auth method, branch pattern, structure
```

**Template includes:**
- Authentication method preference
- Branch naming convention
- Recommended GitHub workflow
- Does NOT include: credentials, content, domains

---

#### Feature 13: Sync Status Dashboard ⭐⭐⭐

**Problem:** No visibility into which shops are in sync with main
**Impact:** Medium - Operational visibility
**Effort:** Medium (~8 hours)

**Implementation:**
```bash
pnpm run shop → Tools → Sync Status

Sync Status Dashboard:

shop-a/staging:  ✅ Up to date (0 commits behind main)
shop-a/main:     ⚠️  2 commits behind staging
shop-b/staging:  ❌ 15 commits behind main (last sync: 7 days ago)
shop-b/main:     ✅ Up to date
shop-c/staging:  ✅ Up to date (0 commits behind main)

Recommendations:
  - Shop B needs sync (15 commits behind)
  - Shop A: Deploy staging to main

[Sync all outdated] [View details]
```

---

### Future Exploration (v3.1.0+) - 6+ months

**Theme: Advanced Features & Integrations**

#### Feature 14: Content Diffing & Smart Merge ⭐⭐⭐⭐⭐

**Problem:** No way to see content differences between shops
**Impact:** Very High - Understanding shop variations
**Effort:** Very High (~20 hours)

**Implementation:**
```bash
pnpm run shop → Tools → Content Diff

Compare: shop-a vs shop-b

config/settings_data.json:
  Colors:
    shop-a: #FF0000 (red)
    shop-b: #0000FF (blue)  ← Different

  Fonts:
    shop-a: "Helvetica"
    shop-b: "Helvetica"     ← Same

  Logo:
    shop-a: logo-fitness.png
    shop-b: logo-beauty.png ← Different

[Export diff] [Copy shop-a to shop-b] [Ignore differences]
```

**Smart Merge:**
- Identify which content differences are intentional
- Suggest which to sync, which to keep different
- One-click selective content sync

---

#### Feature 15: Multi-Shop Dev Server ⭐⭐⭐

**Problem:** Can only preview one shop at a time
**Impact:** Medium - Testing efficiency
**Effort:** High (~12 hours)

**Implementation:**
```bash
pnpm run dev --multi

Starting dev servers for all shops:
  shop-a: http://localhost:9292
  shop-b: http://localhost:9293
  shop-c: http://localhost:9294

[s] Switch focus  [r] Reload all  [q] Quit

Focus: shop-a
```

**Challenges:**
- Multiple Shopify CLI instances
- Port management
- Resource usage
- Terminal UI complexity

---

#### Feature 16: Deployment Pipeline Integration ⭐⭐⭐⭐

**Problem:** No integration with deployment tools
**Impact:** High for enterprises
**Effort:** Very High (~16 hours)

**Integrations:**
- Slack notifications on sync/deploy
- Datadog deployment tracking
- PagerDuty integration for failures
- Custom webhooks for deployment events

---

#### Feature 17: Shop Archiving & Lifecycle ⭐⭐⭐

**Problem:** No way to mark shops as inactive/archived
**Impact:** Medium - Organization
**Effort:** Low (~4 hours)

**Implementation:**
```bash
pnpm run shop → Archive Shop

Shop: shop-old
Archive reason: Store closed

Actions:
  ✅ Move config to shops/archived/
  ✅ Keep credentials (for reference)
  ✅ Add "archived: true" to config
  ✅ Exclude from sync operations
  ✅ Preserve git branches (read-only)

[Archive] [Cancel]
```

---

#### Feature 18: Interactive Onboarding Tour ⭐⭐⭐

**Problem:** New users don't know where to start
**Impact:** Medium - UX improvement
**Effort:** Medium (~6 hours)

**Implementation:**
```bash
# First time running:
npx multi-shop

🎉 Welcome to Multi-Shop!

This looks like your first time. Want a quick tour?
[Yes, show me around] [No, I'll explore myself]

→ Step 1/5: Creating your first shop
→ Step 2/5: Setting up credentials
→ Step 3/5: Running development server
→ Step 4/5: Creating a feature branch
→ Step 5/5: Syncing shops

[Skip] [Previous] [Next]
```

---

## Prioritization Framework

### Impact vs Effort Matrix

```
HIGH IMPACT, LOW EFFORT (Do First):
├─ Shop Health Check (v2.3.0)
├─ Content Protection (.gitattributes automation) (v2.3.0)
├─ Shop Cloning (v2.4.0)
└─ Shop Archiving (v2.4.0)

HIGH IMPACT, MEDIUM EFFORT (Core Features):
├─ Campaign Tools Menu (v2.3.0) ⭐ Priority
├─ Shop Ownership/CODEOWNERS (v2.4.0)
├─ Preview Link Manager (v2.4.0)
└─ Sync Status Dashboard (v2.4.0)

HIGH IMPACT, HIGH EFFORT (Major Features):
├─ Content Snapshot & Restore (v2.5.0)
├─ Visual Regression Testing (v3.0.0)
├─ Content Diffing & Smart Merge (v3.0.0)
└─ Deployment Pipeline Integration (v3.0.0)

MEDIUM IMPACT (Nice to Have):
├─ Quick Shop Switcher (v2.4.0)
├─ Bulk Shop Operations (v2.4.0)
├─ Interactive Onboarding (v2.5.0)
└─ Multi-Shop Dev Server (v3.0.0)
```

---

## Recommended v2.3.0 Scope (Next Release)

**Focus:** Campaign Management + Content Protection

**Features to include:**
1. ✅ Campaign Tools Menu (highest user demand)
2. ✅ Content Protection Automation (.gitattributes)
3. ✅ Shop Health Check (quick win)

**Why this combination:**
- Addresses biggest pain point (manual promo workflows)
- Strengthens content protection (moves from detection → prevention)
- Adds operational confidence (health checks)
- All deliverable in 2-3 weeks
- Clear value proposition for v2.3.0 release

**Estimated effort:** ~15 hours total

---

## Community-Requested Features (Track as they come in)

**Once open source, users will request features. Track here:**

- [ ] Feature request: [Issue #X] - Description
- [ ] Feature request: [Issue #Y] - Description

**Prioritization criteria:**
1. How many users request it?
2. Does it solve a real pain point?
3. Is it aligned with core mission?
4. Can it be implemented cleanly?

---

## What NOT to Build

**Features to avoid (scope creep):**

❌ **Custom build pipeline** - Use existing tools (Webpack, Vite)
❌ **Theme marketplace** - Out of scope
❌ **Shopify store management** - Admin API apps do this
❌ **Theme development framework** - Focus on multi-shop workflows
❌ **Version control system** - Use Git, don't reinvent
❌ **Deployment platform** - Integrate, don't replace
❌ **Analytics dashboard** - Out of scope (use Shopify analytics)

**Stick to the core mission:** Multi-shop workflow management

---

## Success Metrics

**Track these to validate feature impact:**

**Usage Metrics:**
- npm downloads per week
- GitHub stars
- Issues opened (engagement)
- PRs from community

**Feature Metrics (after release):**
- % of users using Campaign Tools
- % of shops with content protection enabled
- Number of health checks run
- Average shops per installation

**Quality Metrics:**
- Test coverage (maintain 80%+)
- Issue close rate (<7 days average)
- PR merge time (<48 hours)
- Security audit score (maintain A+)

---

## Version Planning

**v2.3.0** (Nov 2025) - Campaign Tools + Content Protection
**v2.4.0** (Dec 2025) - DX Improvements + Testing
**v2.5.0** (Jan 2026) - Content Management + Collaboration
**v3.0.0** (Mar 2026) - Advanced Features (if breaking changes needed)

---

## How to Use This Roadmap

**For planning:**
1. Review quarterly
2. Adjust based on user feedback
3. Community can comment on features (GitHub Discussions)
4. Tag issues with version milestones

**For contributors:**
- Pick features marked for current version
- Check "effort" estimate
- See acceptance criteria
- Reference user stories

**For users:**
- See what's coming
- Vote on features (GitHub reactions on issues)
- Suggest new features
- Understand direction

---

## Contributing to Roadmap

**Have ideas? We want to hear them!**

1. **Search existing issues** - Feature might already be requested
2. **Open discussion** - Discuss in GitHub Discussions first
3. **Create feature request** - Use issue template
4. **Vote on features** - React with 👍 on issues you want

**Maintainer reviews quarterly** and updates roadmap based on:
- User requests
- Real pain points
- Alignment with mission
- Implementation feasibility

---

**Roadmap is a living document** - Updated as we learn from users and the multi-shop ecosystem evolves.

Last updated: 2025-10-28 by @brandt
